// messlauf-erheben.ts — CLI `npm run messlauf-erheben` (Messkorpus, Prioritaet 1).
//
// Fuehrt die in einer Messdefinition festgeschriebene Abfrage aus und legt
// JEDEN Treffer als "ungeklaert" in messkorpus/laeufe/<ML-ID>/lauf.json ab.
// Das Werkzeug urteilt nicht: es schliesst nichts ein und nichts aus. Die
// Zuordnung eingeschlossen/ausgeschlossen ist menschliche Arbeit nach den
// vorher festgelegten Kriterien der Definition.
//
// Warum die Erhebung hier liegt und nicht in messkorpus/: Netzzugriff ist
// laut CLAUDE.md ausschliesslich den Redaktionswerkzeugen erlaubt und nur
// bei der im Auftrag benannten Quelle (entscheidsuche.ch, gedrosselt, nur
// Metadaten). messkorpus/ bleibt vollstaendig offline.
//
// Der Redaktionstrichter wird bewusst NICHT benutzt: sieb.json bewertet
// Storywert und wuerde den Nenner verzerren. Dieses Werkzeug importiert ihn
// nicht — messkorpus/tests/trennung.test.ts sichert das ab.
//
// Aufruf:
//   npm run messlauf-erheben -- --definition MD-001-... .json --lauf ML-001

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SEITEN_GROESSE, SUCH_ENDPUNKT, USER_AGENT, baueAbfrage } from "./abruf.js";
import { VIEW_BASIS } from "./format.js";
import {
  alsMesslaufTreffer,
  definitionsHash,
  gehoertZuGericht,
  jahresfenster,
  monatsfenster,
  relationAus,
  teile,
  vereinige,
  type AbrufProtokoll,
  type Fenster,
  type MesslaufTreffer,
} from "./messlauf.js";

/** Obergrenze je Fenster. Wird sie erreicht, wird geteilt statt gekappt. */
const FENSTER_GRENZE = 1000;
const PAUSE_MS = 1000;

interface Messdefinition {
  id: string;
  version: string;
  status: string;
  quelle: { name: string; endpunkt: string; abrufart: string };
  abfrage: { suchanfrage: string; gerichtsfilter: string[] };
  zeitraum: { von: string; bis: string };
}

function repoWurzel(): string {
  // dist/messlauf-erheben.js -> redaktion/ -> Repo
  return dirname(dirname(dirname(fileURLToPath(import.meta.url))));
}

function heuteISO(): string {
  const jetzt = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${jetzt.getFullYear()}-${pad(jetzt.getMonth() + 1)}-${pad(jetzt.getDate())}`;
}

function argument(name: string): string | null {
  const stelle = process.argv.indexOf(`--${name}`);
  if (stelle === -1 || stelle + 1 >= process.argv.length) return null;
  return process.argv[stelle + 1] ?? null;
}

function pause(ms: number): Promise<void> {
  return new Promise((aufloesen) => setTimeout(aufloesen, ms));
}

/** Holt ein Fenster vollstaendig; meldet Gesamtzahl UND deren Relation mit. */
async function holeFenster(
  suchanfrage: string,
  fenster: Fenster,
): Promise<{ roh: unknown[]; gesamt: number; relation: "eq" | "gte" | "unbekannt" }> {
  const roh: unknown[] = [];
  let gesamt = 0;
  let relation: "eq" | "gte" | "unbekannt" = "unbekannt";
  for (let from = 0; from < FENSTER_GRENZE; from += SEITEN_GROESSE) {
    if (from > 0) await pause(PAUSE_MS);
    const antwort = await fetch(SUCH_ENDPUNKT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify(baueAbfrage(suchanfrage, fenster.von, fenster.bis, from, SEITEN_GROESSE)),
    });
    if (!antwort.ok) {
      throw new Error(
        `entscheidsuche.ch antwortet mit HTTP ${antwort.status} — Erhebung sauber abgebrochen, nichts geschrieben.`,
      );
    }
    const daten = (await antwort.json()) as { hits?: { hits?: unknown; total?: unknown } };
    const seite = Array.isArray(daten.hits?.hits) ? (daten.hits?.hits as unknown[]) : [];
    const total = daten.hits?.total;
    if (typeof (total as { value?: unknown })?.value === "number") {
      gesamt = (total as { value: number }).value;
    }
    relation = relationAus(total);
    roh.push(...seite);
    if (seite.length < SEITEN_GROESSE) break;
  }
  return { roh, gesamt, relation };
}

/**
 * Erhebt ein Fenster; ist es fuer die Quelle zu gross, wird es geteilt statt
 * gekappt. Nur ein einzelner Tag mit zu vielen Treffern bricht ab — dann
 * fehlt der Quelle die Aufloesung, und das muss sichtbar werden.
 */
async function erhebeFenster(
  suchanfrage: string,
  gerichtsfilter: readonly string[],
  fenster: Fenster,
  melde: (text: string) => void,
): Promise<{ treffer: MesslaufTreffer[]; abrufe: AbrufProtokoll[] }> {
  const { roh, gesamt, relation } = await holeFenster(suchanfrage, fenster);

  // Fail-closed: eine Untergrenze statt einer exakten Zahl heisst, dass die
  // Quelle selbst nicht sagt, wie viele Treffer es gibt. Dann laesst sich
  // Vollstaendigkeit nicht behaupten — also teilen, bis sie es sagt.
  const unklar = relation !== "eq";
  if (gesamt > FENSTER_GRENZE || unklar) {
    const haelften = teile(fenster);
    if (!haelften) {
      throw new Error(
        unklar
          ? `Fenster ${fenster.von}: die Quelle meldet die Trefferzahl als "${relation}" statt exakt und der Tag laesst sich nicht weiter teilen — ` +
            `Vollstaendigkeit nicht belegbar, Erhebung abgebrochen.`
          : `Fenster ${fenster.von} meldet ${gesamt} Treffer und laesst sich nicht weiter teilen — ` +
            `die Quelle kann diesen Tag nicht vollstaendig ausliefern. Abfrage praezisieren.`,
      );
    }
    melde(
      `  ${fenster.von}…${fenster.bis}: ${gesamt} Treffer gemeldet (relation ${relation}) — Fenster wird geteilt.`,
    );
    const links = await erhebeFenster(suchanfrage, gerichtsfilter, haelften[0], melde);
    await pause(PAUSE_MS);
    const rechts = await erhebeFenster(suchanfrage, gerichtsfilter, haelften[1], melde);
    return {
      treffer: [...links.treffer, ...rechts.treffer],
      abrufe: [...links.abrufe, ...rechts.abrufe],
    };
  }

  // Erst abbilden, dann filtern — Treffer ohne Bezeichner werden gezaehlt,
  // nicht stillschweigend uebergangen.
  const abgebildet = roh.map((eintrag) => ({
    roh: eintrag,
    treffer: alsMesslaufTreffer(eintrag, VIEW_BASIS),
  }));
  const ohneId = abgebildet.filter((e) => e.treffer === null).length;
  const mitId = abgebildet.filter((e): e is { roh: unknown; treffer: MesslaufTreffer } => e.treffer !== null);
  const passend = mitId.filter((e) => gehoertZuGericht(e.roh, gerichtsfilter));

  const protokoll: AbrufProtokoll = {
    von: fenster.von,
    bis: fenster.bis,
    gemeldet_total: gesamt,
    gemeldet_relation: relation,
    empfangen: roh.length,
    ohne_id: ohneId,
    vor_gerichtsfilter: mitId.length,
    nach_gerichtsfilter: passend.length,
  };
  melde(
    `  ${fenster.von}…${fenster.bis}: gemeldet ${gesamt} (${relation}), empfangen ${roh.length}, ` +
      `ohne ID ${ohneId}, nach Gerichtsfilter ${passend.length}.`,
  );
  return { treffer: passend.map((e) => e.treffer), abrufe: [protokoll] };
}

async function haupt(): Promise<void> {
  const wurzel = repoWurzel();
  const definitionsName = argument("definition");
  const laufId = argument("lauf");
  if (!definitionsName || !laufId) {
    throw new Error(
      "Aufruf: npm run messlauf-erheben -- --definition <datei.json> --lauf ML-001",
    );
  }
  if (!/^ML-\d{3}$/.test(laufId)) throw new Error(`--lauf muss die Form ML-001 haben, erhalten: "${laufId}"`);

  const definitionsPfad = join(wurzel, "messkorpus", "definitionen", definitionsName);
  const definition = JSON.parse(readFileSync(definitionsPfad, "utf8")) as Messdefinition;
  const hash = definitionsHash(definition);

  // Fail-closed statt stillschweigend woanders holen: die Definition nennt
  // ihren Endpunkt, und ihr Hash behauptet spaeter, von dort erhoben worden
  // zu sein. Weicht er ab, wird nicht erhoben. Der abweichende Endpunkt wird
  // auch NICHT einfach benutzt — Beschaffung ist nur bei der im Auftrag
  // benannten Quelle erlaubt (CLAUDE.md), nicht bei jeder, die in einer
  // Datei steht.
  if (definition.quelle.endpunkt !== SUCH_ENDPUNKT) {
    throw new Error(
      `${definition.id} nennt den Endpunkt ${definition.quelle.endpunkt}, dieses Werkzeug beschafft ausschliesslich bei ${SUCH_ENDPUNKT}. ` +
        `Nichts erhoben. Entweder die Definition korrigieren oder die Quelle im Auftrag ausdruecklich benennen.`,
    );
  }

  const ziel = join(wurzel, "messkorpus", "laeufe", laufId);
  if (existsSync(join(ziel, "lauf.json"))) {
    throw new Error(
      `${laufId} existiert bereits. Ein Messlauf wird nie ueberschrieben — neue ID waehlen (die alte Population bleibt nachvollziehbar).`,
    );
  }

  console.log(`Messlauf ${laufId} nach ${definition.id} v${definition.version} [${definition.status}]`);
  console.log(`Definitions-Hash: ${hash}`);
  console.log(`Zeitraum ${definition.zeitraum.von} bis ${definition.zeitraum.bis}`);
  console.log(`Gerichtsfilter: ${definition.abfrage.gerichtsfilter.join(", ") || "(keiner)"}`);
  console.log("Nur Metadaten und Links — keine Volltexte. Abruf gedrosselt (1 Seite/Sekunde).");
  console.log("Das Werkzeug urteilt nicht: jeder Treffer wird als 'ungeklaert' abgelegt.\n");

  const fensterArt = argument("fenster") ?? "jahr";
  if (fensterArt !== "jahr" && fensterArt !== "monat") {
    throw new Error(`--fenster muss "jahr" oder "monat" sein, erhalten: "${fensterArt}"`);
  }
  const startfenster =
    fensterArt === "monat" ? monatsfenster(definition.zeitraum) : jahresfenster(definition.zeitraum);

  const teileErgebnis: MesslaufTreffer[][] = [];
  const abrufe: AbrufProtokoll[] = [];
  for (const fenster of startfenster) {
    const ergebnis = await erhebeFenster(
      definition.abfrage.suchanfrage,
      definition.abfrage.gerichtsfilter,
      fenster,
      (t) => console.log(t),
    );
    teileErgebnis.push(ergebnis.treffer);
    abrufe.push(...ergebnis.abrufe);
    await pause(PAUSE_MS);
  }

  const { treffer, duplikate } = vereinige(teileErgebnis);
  const heute = heuteISO();
  const lauf = {
    id: laufId,
    messdefinition: { id: definition.id, version: definition.version, sha256: hash },
    durchgefuehrt_am: heute,
    datenstand: heute,
    abrufe: abrufe.sort((a, b) => (a.von < b.von ? -1 : a.von > b.von ? 1 : 0)),
    duplikate,
    roh_treffer: treffer.length,
    gekappt: false,
    treffer,
  };

  mkdirSync(ziel, { recursive: true });
  writeFileSync(join(ziel, "lauf.json"), `${JSON.stringify(lauf, null, 2)}\n`);
  console.log(`\n${treffer.length} Treffer geschrieben nach messkorpus/laeufe/${laufId}/lauf.json`);
  console.log("Naechster Schritt: jeden Treffer nach den Kriterien der Definition zuordnen, dann `npm run pruefen` in messkorpus/.");
}

haupt().catch((fehler: unknown) => {
  console.error(fehler instanceof Error ? fehler.message : String(fehler));
  process.exitCode = 1;
});

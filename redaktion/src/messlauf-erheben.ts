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
  teile,
  vereinige,
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

/** Holt ein Fenster vollstaendig; meldet die von der Quelle genannte Gesamtzahl mit. */
async function holeFenster(
  suchanfrage: string,
  fenster: Fenster,
): Promise<{ roh: unknown[]; gesamt: number }> {
  const roh: unknown[] = [];
  let gesamt = 0;
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
    const daten = (await antwort.json()) as { hits?: { hits?: unknown; total?: { value?: unknown } } };
    const seite = Array.isArray(daten.hits?.hits) ? (daten.hits?.hits as unknown[]) : [];
    if (typeof daten.hits?.total?.value === "number") gesamt = daten.hits.total.value;
    roh.push(...seite);
    if (seite.length < SEITEN_GROESSE) break;
  }
  return { roh, gesamt };
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
): Promise<MesslaufTreffer[]> {
  const { roh, gesamt } = await holeFenster(suchanfrage, fenster);
  if (gesamt > FENSTER_GRENZE) {
    const haelften = teile(fenster);
    if (!haelften) {
      throw new Error(
        `Fenster ${fenster.von} meldet ${gesamt} Treffer und laesst sich nicht weiter teilen — ` +
          `die Quelle kann diesen Tag nicht vollstaendig ausliefern. Abfrage praezisieren.`,
      );
    }
    melde(`  ${fenster.von}…${fenster.bis}: ${gesamt} Treffer gemeldet — Fenster wird geteilt.`);
    const links = await erhebeFenster(suchanfrage, gerichtsfilter, haelften[0], melde);
    await pause(PAUSE_MS);
    const rechts = await erhebeFenster(suchanfrage, gerichtsfilter, haelften[1], melde);
    return vereinige([links, rechts]);
  }

  const passend = roh.filter((eintrag) => gehoertZuGericht(eintrag, gerichtsfilter));
  const treffer = passend
    .map((eintrag) => alsMesslaufTreffer(eintrag, VIEW_BASIS))
    .filter((t): t is MesslaufTreffer => t !== null);
  melde(
    `  ${fenster.von}…${fenster.bis}: ${roh.length} geholt, ${treffer.length} nach Gerichtsfilter (gemeldet ${gesamt}).`,
  );
  return treffer;
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

  const teileErgebnis: MesslaufTreffer[][] = [];
  for (const fenster of jahresfenster(definition.zeitraum)) {
    teileErgebnis.push(
      await erhebeFenster(definition.abfrage.suchanfrage, definition.abfrage.gerichtsfilter, fenster, (t) =>
        console.log(t),
      ),
    );
    await pause(PAUSE_MS);
  }

  const treffer = vereinige(teileErgebnis);
  const heute = heuteISO();
  const lauf = {
    id: laufId,
    messdefinition: { id: definition.id, version: definition.version, sha256: hash },
    durchgefuehrt_am: heute,
    datenstand: heute,
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

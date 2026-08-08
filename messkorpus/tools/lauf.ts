// lauf.ts — Messlauf: Invarianten der Trefferliste.
//
// Der Lauf ist der Nachweis, dass nichts still verschwunden ist. "roh_treffer
// = Laenge der Liste" allein beweist das NICHT — beide Zahlen entstehen am
// selben Ende der Verarbeitung, die Pruefung waere zirkulaer. Der Nachweis
// steht deshalb in `abrufe`: je Zeitfenster die von der Quelle gemeldete
// Zahl samt Relation, die empfangenen Treffer, die ohne Quelle-ID und die
// Zahl nach Gerichtsfilter. Daraus laesst sich die gespeicherte Population
// nachrechnen.
//
// Zweite Trennung, die hier zaehlt: Rechtskraft ist nicht Fallabschluss.
// Ein Bundesgerichtsentscheid ist ab Ausfaellung rechtskraeftig (Art. 61 BGG)
// und kann die Sache trotzdem zurueckweisen — dann ist die gemessene
// Rechtsfrage offen. Beides wird getrennt gefuehrt.
//
// Rein und deterministisch: keine Systemzeit, kein Netz.

import { createHash } from "node:crypto";
import { kanonisch, type Messdefinition } from "./definition.ts";
import { definitionsHash } from "./definition.ts";

export type TrefferStatus = "eingeschlossen" | "ausgeschlossen" | "ungeklaert";
export type AbschlussStatus = "abgeschlossen" | "rueckweisung_offen" | "zwischenentscheid" | "ungeklaert";
export type MessausgangWert = "durchgesetzt" | "teilweise" | "nicht_durchgesetzt" | "nicht_anwendbar";

export interface Messausgang {
  messdefinition_id: string;
  messdefinition_version: string;
  wert: MessausgangWert;
  beleg: string;
  quelle?: string;
}

export interface Treffer {
  quelle_id: string;
  aktenzeichen?: string;
  datum?: string;
  gericht?: string;
  link?: string;
  metadaten_fingerprint: string;
  status: TrefferStatus;
  ausschlussgrund?: string;
  notiz?: string;
  story_id?: string;
  zaehleinheit?: string;
  abschluss_status?: AbschlussStatus;
  messausgang?: Messausgang;
}

export interface Abruf {
  von: string;
  bis: string;
  gemeldet_total: number;
  gemeldet_relation: "eq" | "gte" | "unbekannt";
  empfangen: number;
  ohne_id: number;
  vor_gerichtsfilter: number;
  nach_gerichtsfilter: number;
}

export interface Messlauf {
  id: string;
  messdefinition: { id: string; version: string; sha256: string };
  durchgefuehrt_am: string;
  datenstand: string;
  abrufe: Abruf[];
  duplikate: number;
  roh_treffer: number;
  gekappt: boolean;
  treffer: Treffer[];
}

export interface Befund {
  ok: boolean;
  fehler: string[];
}

/**
 * Gehoert ein Normausgang zu dieser Messdefinition? Geprueft wird ID UND
 * Fassung: eine neue Version kann Messfrage oder Kriterien geaendert haben,
 * dann ist eine unter der alten Fassung kodierte Aussage nicht mehr dieselbe.
 */
export function gehoertZu(messausgang: Messausgang, definition: Messdefinition): boolean {
  return (
    messausgang.messdefinition_id === definition.id &&
    messausgang.messdefinition_version === definition.version
  );
}

/* ---------- Fingerprint der Quellmetadaten ---------- */

/** Genau die Felder, die der Lauf aus der Quelle uebernimmt. */
export interface Quellmetadaten {
  quelle_id: string;
  aktenzeichen?: string;
  datum?: string;
  gericht?: string;
  link?: string;
}

/**
 * SHA-256 ueber die kanonische Form der gespeicherten Quellmetadaten.
 * Aendert die Quelle spaeter etwas daran, faellt der Vergleich auf.
 */
export function metadatenFingerprint(metadaten: Quellmetadaten): string {
  return createHash("sha256")
    .update(
      kanonisch({
        quelle_id: metadaten.quelle_id,
        aktenzeichen: metadaten.aktenzeichen,
        datum: metadaten.datum,
        gericht: metadaten.gericht,
        link: metadaten.link,
      }),
      "utf8",
    )
    .digest("hex");
}

/* ---------- Pruefung ---------- */

function pruefeAbrufe(lauf: Messlauf, definition: Messdefinition): string[] {
  const fehler: string[] = [];
  if (lauf.abrufe.length === 0) {
    fehler.push(`Lauf ${lauf.id}: kein einziger Abruf protokolliert — die Vollstaendigkeit ist damit unbelegt.`);
    return fehler;
  }

  for (const abruf of lauf.abrufe) {
    const fenster = `${abruf.von}…${abruf.bis}`;
    if (abruf.gemeldet_relation !== "eq") {
      fehler.push(
        `Lauf ${lauf.id}, Fenster ${fenster}: die Quelle meldet ihre Trefferzahl als "${abruf.gemeldet_relation}", nicht als exakt. ` +
          `Eine Untergrenze ist keine vollstaendige Population — Fenster verkleinern oder Lauf verwerfen.`,
      );
    }
    if (abruf.empfangen !== abruf.gemeldet_total) {
      fehler.push(
        `Lauf ${lauf.id}, Fenster ${fenster}: Quelle meldet ${abruf.gemeldet_total} Treffer, empfangen wurden ${abruf.empfangen}. ` +
          `Differenz ${abruf.gemeldet_total - abruf.empfangen}.`,
      );
    }
    if (abruf.ohne_id > 0) {
      fehler.push(
        `Lauf ${lauf.id}, Fenster ${fenster}: ${abruf.ohne_id} Treffer ohne Quelle-ID. ` +
          `Sie liessen sich nicht ablegen — der Lauf ist damit nachweislich unvollstaendig.`,
      );
    }
    if (abruf.vor_gerichtsfilter !== abruf.empfangen - abruf.ohne_id) {
      fehler.push(
        `Lauf ${lauf.id}, Fenster ${fenster}: vor_gerichtsfilter (${abruf.vor_gerichtsfilter}) passt nicht zu empfangen minus ohne_id (${
          abruf.empfangen - abruf.ohne_id
        }).`,
      );
    }
    if (abruf.nach_gerichtsfilter > abruf.vor_gerichtsfilter) {
      fehler.push(`Lauf ${lauf.id}, Fenster ${fenster}: nach dem Filter mehr Treffer als davor.`);
    }
  }

  /* Decken die Fenster den Zeitraum lueckenlos und ueberschneidungsfrei ab? */
  const sortiert = [...lauf.abrufe].sort((a, b) => (a.von < b.von ? -1 : a.von > b.von ? 1 : 0));
  const erstes = sortiert[0];
  const letztes = sortiert[sortiert.length - 1];
  if (erstes && erstes.von !== definition.zeitraum.von) {
    fehler.push(
      `Lauf ${lauf.id}: erstes Fenster beginnt am ${erstes.von}, die Definition am ${definition.zeitraum.von}.`,
    );
  }
  if (letztes && letztes.bis !== definition.zeitraum.bis) {
    fehler.push(`Lauf ${lauf.id}: letztes Fenster endet am ${letztes.bis}, die Definition am ${definition.zeitraum.bis}.`);
  }
  for (let i = 1; i < sortiert.length; i += 1) {
    const vorher = sortiert[i - 1]!;
    const jetzt = sortiert[i]!;
    const erwartet = naechsterTag(vorher.bis);
    if (jetzt.von !== erwartet) {
      fehler.push(
        `Lauf ${lauf.id}: zwischen ${vorher.bis} und ${jetzt.von} klafft eine Luecke oder eine Ueberschneidung ` +
          `(erwartet ${erwartet}). Die Fenster muessen den Zeitraum genau abdecken.`,
      );
    }
  }

  /* Rechnet die gespeicherte Population aus dem Protokoll nach? */
  const nachFilter = lauf.abrufe.reduce((summe, a) => summe + a.nach_gerichtsfilter, 0);
  if (nachFilter - lauf.duplikate !== lauf.treffer.length) {
    fehler.push(
      `Lauf ${lauf.id}: ${nachFilter} Treffer nach Gerichtsfilter minus ${lauf.duplikate} Duplikate ergibt ${
        nachFilter - lauf.duplikate
      }, gespeichert sind ${lauf.treffer.length}. Die Bilanz geht nicht auf.`,
    );
  }

  return fehler;
}

function naechsterTag(iso: string): string {
  const tag = Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) + 86_400_000;
  const datum = new Date(tag);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${datum.getUTCFullYear()}-${pad(datum.getUTCMonth() + 1)}-${pad(datum.getUTCDate())}`;
}

/**
 * Prueft einen Lauf gegen seine Messdefinition. Fehlerhafte Laeufe sind
 * kein Messkorpus — sie werden nicht "bereinigt", sondern abgelehnt.
 */
export function pruefeLauf(lauf: Messlauf, definition: Messdefinition): Befund {
  const fehler: string[] = [];

  /* Definition: Identitaet und Unveraendertheit */
  if (lauf.messdefinition.id !== definition.id) {
    fehler.push(`Lauf ${lauf.id} verweist auf ${lauf.messdefinition.id}, geprueft wurde gegen ${definition.id}.`);
  }
  if (lauf.messdefinition.version !== definition.version) {
    fehler.push(
      `Lauf ${lauf.id} wurde gegen Version ${lauf.messdefinition.version} erhoben, die Definition steht auf ${definition.version}. ` +
        `Alte Laeufe bleiben gueltig — sie gehoeren zu ihrer damaligen Fassung, nicht zur neuen.`,
    );
  }
  const hash = definitionsHash(definition);
  if (lauf.messdefinition.sha256 !== hash) {
    fehler.push(
      `Lauf ${lauf.id}: Definitions-Hash weicht ab (Lauf ${lauf.messdefinition.sha256.slice(0, 12)}…, Datei ${hash.slice(0, 12)}…). ` +
        `Die Messdefinition wurde nach dem Lauf inhaltlich geaendert.`,
    );
  }

  /* Kein stiller Verlust */
  if (lauf.gekappt) {
    fehler.push(
      `Lauf ${lauf.id} ist gekappt (Obergrenze der Quelle erreicht) — als Messkorpus unbrauchbar, weil unbekannt viele Treffer fehlen. ` +
        `Zeitraum verkleinern oder Abfrage praezisieren und neu erheben.`,
    );
  }
  if (lauf.roh_treffer !== lauf.treffer.length) {
    fehler.push(
      `Lauf ${lauf.id}: roh_treffer ${lauf.roh_treffer}, gespeicherte Treffer ${lauf.treffer.length} — Differenz ${
        lauf.roh_treffer - lauf.treffer.length
      }. Jeder Treffer muss stehen bleiben.`,
    );
  }
  fehler.push(...pruefeAbrufe(lauf, definition));

  /* Treffer: Eindeutigkeit, Status, Fingerprint */
  const gesehen = new Set<string>();
  const ausschlussCodes = new Set(definition.ausschluss.map((k) => k.code));
  for (const treffer of lauf.treffer) {
    if (gesehen.has(treffer.quelle_id)) {
      fehler.push(`Lauf ${lauf.id}: Treffer ${treffer.quelle_id} kommt mehrfach vor.`);
    }
    gesehen.add(treffer.quelle_id);

    const fingerprint = metadatenFingerprint(treffer);
    if (treffer.metadaten_fingerprint !== fingerprint) {
      fehler.push(
        `Lauf ${lauf.id}: Treffer ${treffer.quelle_id} traegt den Fingerprint ${treffer.metadaten_fingerprint.slice(0, 12)}…, ` +
          `die gespeicherten Metadaten ergeben ${fingerprint.slice(0, 12)}… — die Metadaten wurden nachtraeglich geaendert.`,
      );
    }

    if (treffer.status === "ausgeschlossen") {
      if (!treffer.ausschlussgrund) {
        fehler.push(`Lauf ${lauf.id}: Treffer ${treffer.quelle_id} ist ausgeschlossen, nennt aber keinen Grund.`);
      } else if (!ausschlussCodes.has(treffer.ausschlussgrund)) {
        fehler.push(
          `Lauf ${lauf.id}: Treffer ${treffer.quelle_id} nennt den Ausschlussgrund "${treffer.ausschlussgrund}", ` +
            `der in ${definition.id} nicht vorher deklariert ist. Gruende werden vor der Sichtung festgelegt.`,
        );
      }
    } else if (treffer.ausschlussgrund) {
      fehler.push(
        `Lauf ${lauf.id}: Treffer ${treffer.quelle_id} hat Status "${treffer.status}", traegt aber einen Ausschlussgrund.`,
      );
    }

    if (treffer.messausgang && !gehoertZu(treffer.messausgang, definition)) {
      fehler.push(
        `Lauf ${lauf.id}: Treffer ${treffer.quelle_id} traegt einen Messausgang zu ${treffer.messausgang.messdefinition_id}@${treffer.messausgang.messdefinition_version}, ` +
          `der Lauf gehoert aber zu ${definition.id}@${definition.version}. Ein Normausgang gilt nur fuer seine eigene Messdefinition ` +
          `UND deren Fassung — mit einer neuen Version koennen sich Messfrage und Kriterien geaendert haben, dann ist die alte Kodierung nicht mehr dieselbe Aussage.`,
      );
    }
  }

  return { ok: fehler.length === 0, fehler };
}

/* ---------- Bilanz ---------- */

export interface Bilanz {
  roh: number;
  eingeschlossen: number;
  ausgeschlossen: number;
  ungeklaert: number;
  duplikate: number;
  gemeldet_gesamt: number;
  ausschluesse: { grund: string; anzahl: number }[];
}

/** Vollstaendige Bilanz eines Laufs — die Zahlen, die jede Quote mitfuehren muss. */
export function bilanz(lauf: Messlauf): Bilanz {
  const zaehler = new Map<string, number>();
  let eingeschlossen = 0;
  let ausgeschlossen = 0;
  let ungeklaert = 0;

  for (const treffer of lauf.treffer) {
    if (treffer.status === "eingeschlossen") eingeschlossen += 1;
    else if (treffer.status === "ungeklaert") ungeklaert += 1;
    else {
      ausgeschlossen += 1;
      const grund = treffer.ausschlussgrund ?? "(ohne Grund)";
      zaehler.set(grund, (zaehler.get(grund) ?? 0) + 1);
    }
  }

  return {
    roh: lauf.treffer.length,
    eingeschlossen,
    ausgeschlossen,
    ungeklaert,
    duplikate: lauf.duplikate,
    gemeldet_gesamt: lauf.abrufe.reduce((summe, a) => summe + a.gemeldet_total, 0),
    ausschluesse: [...zaehler.entries()]
      .map(([grund, anzahl]) => ({ grund, anzahl }))
      .sort((a, b) => b.anzahl - a.anzahl || (a.grund < b.grund ? -1 : 1)),
  };
}

/* ---------- Zaehleinheiten ---------- */

export interface Zaehleinheit {
  id: string;
  treffer: Treffer[];
  story_id?: string;
  abschluss_status: AbschlussStatus;
  messausgang?: Messausgang;
}

export interface Zaehleinheiten {
  einheiten: Zaehleinheit[];
  fehler: string[];
}

/**
 * Fasst die eingeschlossenen Treffer zu Zaehleinheiten zusammen. Mehrere
 * Entscheide desselben Rechtsstreits (Rueckweisung, Folgeentscheid,
 * Revision) sind EINE Einheit und zaehlen einmal — sonst zaehlt ein
 * langer Streit mehrfach und verzerrt die Quote.
 *
 * Widersprueche innerhalb einer Einheit werden nicht aufgeloest, sondern
 * gemeldet: sie sperren die Quote.
 */
export function zaehleinheiten(lauf: Messlauf, definition: Messdefinition): Zaehleinheiten {
  const fehler: string[] = [];
  const nachEinheit = new Map<string, Treffer[]>();

  for (const treffer of lauf.treffer) {
    if (treffer.status !== "eingeschlossen") continue;
    if (treffer.zaehleinheit === undefined || treffer.zaehleinheit === "") {
      fehler.push(
        `Treffer ${treffer.quelle_id} ist eingeschlossen, nennt aber keine Zaehleinheit. ` +
          `Ohne Zuordnung ist unklar, ob er ein eigener Fall ist oder zu einem schon gezaehlten gehoert.`,
      );
      continue;
    }
    const liste = nachEinheit.get(treffer.zaehleinheit) ?? [];
    liste.push(treffer);
    nachEinheit.set(treffer.zaehleinheit, liste);
  }

  const einheiten: Zaehleinheit[] = [];
  const storyZuEinheit = new Map<string, string>();

  for (const [id, treffer] of [...nachEinheit.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const storyIds = new Set(treffer.map((t) => t.story_id).filter((s): s is string => s !== undefined));
    if (storyIds.size > 1) {
      fehler.push(`Zaehleinheit ${id} verweist auf mehrere Faelle (${[...storyIds].join(", ")}).`);
    }
    const storyId = [...storyIds][0];
    if (storyId !== undefined) {
      const schon = storyZuEinheit.get(storyId);
      if (schon !== undefined && schon !== id) {
        fehler.push(
          `Fall ${storyId} haengt an zwei Zaehleinheiten (${schon}, ${id}) — er wuerde doppelt in den Nenner gehen.`,
        );
      }
      storyZuEinheit.set(storyId, id);
    }

    const ausgaenge = treffer
      .map((t) => t.messausgang)
      .filter((m): m is Messausgang => m !== undefined && gehoertZu(m, definition));
    const werte = new Set(ausgaenge.map((m) => m.wert));
    if (werte.size > 1) {
      fehler.push(
        `Zaehleinheit ${id} traegt widersprechende Normausgaenge (${[...werte].join(", ")}) — nicht automatisch aufloesbar.`,
      );
    }

    /* Der Abschluss der Einheit ist der guenstigste Stand ihrer Entscheide:
       ein spaeterer Endentscheid schliesst eine fruehere Rueckweisung ab. */
    const abschluss: AbschlussStatus = treffer.some((t) => t.abschluss_status === "abgeschlossen")
      ? "abgeschlossen"
      : (treffer.find((t) => t.abschluss_status !== undefined)?.abschluss_status ?? "ungeklaert");

    einheiten.push({ id, treffer, story_id: storyId, abschluss_status: abschluss, messausgang: ausgaenge[0] });
  }

  return { einheiten, fehler };
}

/* ---------- Reproduzierbarkeit ---------- */

/**
 * Die Population eines Laufs: sortierte Liste der Treffer-IDs mit Status.
 * Zwei Laeufe derselben Definition auf demselben Datenstand muessen exakt
 * dieselbe Population ergeben — das ist die pruefbare Fassung von
 * "reproduzierbar".
 */
export function population(lauf: Messlauf): string {
  return lauf.treffer
    .map((t) => `${t.quelle_id}\t${t.status}\t${t.ausschlussgrund ?? ""}`)
    .sort()
    .join("\n");
}

/** Gleiche Population? Vergleicht nur, was die Messung ausmacht. */
export function gleichePopulation(a: Messlauf, b: Messlauf): boolean {
  return population(a) === population(b);
}

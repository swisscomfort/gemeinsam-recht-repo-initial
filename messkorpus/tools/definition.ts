// definition.ts — Messdefinition: Typen, kanonischer Hash und die
// inhaltlichen Pruefungen, die Selektionsverzerrung technisch verhindern.
//
// Warum es dieses Modul gibt: Doppelkodierung schuetzt gegen Kodierfehler,
// nicht gegen Selektionsverzerrung. Wer den Nenner nach Storywert oder gar
// nach dem Verfahrensausgang bildet, misst nichts — er bestaetigt sich.
// Der Redaktionstrichter (redaktion/sieb.json) tut genau das: er wertet
// Nichteintreten, Kostenentscheide und Fristwiederherstellungen ab, weil sie
// schlechte Geschichten ergeben. Als Nenner einer Durchsetzungsquote wuerde
// er sie nach oben verzerren, denn Nichteintreten ist ueberwiegend eine
// gescheiterte Durchsetzung. Deshalb prueft dieses Modul jedes Kriterium
// gegen zwei Vokabulare und lehnt es ab, wenn es den Ausgang oder den
// Storywert kennt.
//
// Rein und deterministisch: keine Systemzeit, kein Netz.

import { createHash } from "node:crypto";

export type Bezug = "verfahrensgegenstand" | "formal" | "datenlage";
export type Pruefstand = "fachlich_zu_verifizieren" | "fachlich_bestaetigt";

export interface Kriterium {
  code: string;
  beschreibung: string;
  bezug: Bezug;
}

/**
 * Ableitung der Rechtskraft. "bundesgericht_art61_bgg" gilt ausschliesslich
 * fuer Entscheide des Schweizerischen Bundesgerichts (Art. 61 BGG: Rechtskraft
 * am Tag der Ausfaellung). Eine allgemeine Regel "letztinstanzlich" gibt es
 * bewusst NICHT — ein letztinstanzlicher kantonaler Entscheid ist etwas
 * anderes und kann ans Bundesgericht weitergezogen werden.
 *
 * "bundesgericht_uebergangsrecht_art132_bgg" ist die historische Fassung
 * derselben Frage. Art. 61 BGG traegt die Rechtskraft nur fuer ein Verfahren,
 * das dem BGG tatsaechlich untersteht; nach dem Uebergangsrecht von
 * Art. 132 BGG ist das bei einem Beschwerdeverfahren nur der Fall, wenn auch
 * der angefochtene Entscheid nach dem Inkrafttreten des BGG ergangen ist. Aus
 * der Gerichtssignatur allein folgt das nicht. Wer diese Art waehlt, sagt
 * damit: das anwendbare Verfahrensrecht ist je Treffer eigens zu belegen, und
 * ohne diesen Beleg wird nichts abgeleitet.
 */
export type RechtskraftArt =
  | "bundesgericht_art61_bgg"
  | "bundesgericht_uebergangsrecht_art132_bgg"
  | "quellenangabe";

/**
 * Nach welchem Modell wird der Messausgang bestimmt?
 *
 * - `materielle_pruefung`: gezaehlt wird, was das Gericht zur gemessenen Norm
 *   materiell entschieden hat. Eine prozessuale Erledigung liefert dann keinen
 *   Messausgang.
 * - `endwirkung`: gezaehlt wird die endgueltige Rechtswirkung auf den
 *   gemessenen Sachverhalt, unabhaengig davon, ob sie materiell oder
 *   prozessual zustande kam (CR-03, angenommen am 9. August 2026).
 *
 * Das Modell steht AUSDRUECKLICH in der Definition. Es wird nie aus der id,
 * der Versionsnummer oder dem Dateinamen erschlossen — eine Messdefinition
 * sagt selbst, wie sie ausgewertet wird, sonst haengt die Bedeutung alter
 * Daten daran, wie spaetere Fassungen numeriert werden.
 */
export type Auswertungsmodell = "materielle_pruefung" | "endwirkung";

/**
 * Modell einer Definition, die das Feld nicht fuehrt. Alle vor CR-03
 * erhobenen Definitionen sind so zu lesen — sie verhalten sich unveraendert.
 */
export const LEGACY_AUSWERTUNGSMODELL: Auswertungsmodell = "materielle_pruefung";

export interface Messdefinition {
  id: string;
  version: string;
  status: "entwurf" | "eingefroren";
  stand: string;
  messfrage: string;
  /** Fehlt das Feld, gilt {@link LEGACY_AUSWERTUNGSMODELL}. */
  auswertungsmodell?: Auswertungsmodell;
  norm: { regel_id?: string; norm_fundstelle: string; pruefstand: Pruefstand };
  quelle: { name: string; endpunkt: string; abrufart: "metadaten" };
  abfrage: { suchanfrage: string; gerichtsfilter: string[] };
  zeitraum: { von: string; bis: string };
  einschluss: Kriterium[];
  ausschluss: Kriterium[];
  rechtskraft_regel: { art: RechtskraftArt; rechtsquelle: string; begruendung: string; pruefstand: Pruefstand };
  /** Fallabschluss ist nicht Rechtskraft — siehe Schema. */
  abschluss_regel: { art: "endentscheid_zur_messfrage"; begruendung: string; pruefstand: Pruefstand };
  zaehleinheit: { art: "streitigkeit"; beschreibung: string };
  selektionsneutralitaet: string;
}

/** Gerichtssignaturen, fuer die Art. 61 BGG die Rechtskraft traegt. */
export const BUNDESGERICHT_SIGNATUREN = ["CH_BGer", "CH_BGE"] as const;

/**
 * Traegt die Instanz die Rechtskraft nach der Regel der Definition? Nur
 * Bundesgerichtsentscheide; eine kantonale Signatur ergibt false, auch wenn
 * das kantonale Gericht dort letzte Instanz war.
 *
 * Gesteuert wird ausschliesslich ueber `rechtskraft_regel.art`. Eine
 * Fallunterscheidung nach id, Versionsnummer, Dateiname oder Zeitraum gibt es
 * hier so wenig wie beim Auswertungsmodell — sonst entschiede die Numerierung
 * spaeterer Fassungen darueber, wie alte Daten zu lesen sind.
 */
export function rechtskraftAusInstanz(definition: Messdefinition, gericht: string | undefined): boolean {
  const art = definition.rechtskraft_regel.art;

  if (art === "bundesgericht_art61_bgg") {
    // Unveraendert seit v2.0.0: die Signatur allein traegt die Aussage, weil
    // die Definition erklaert, dass ihr Korpus dem BGG untersteht.
    if (gericht === undefined) return false;
    return (BUNDESGERICHT_SIGNATUREN as readonly string[]).includes(gericht);
  }

  if (art === "bundesgericht_uebergangsrecht_art132_bgg") {
    // Fail closed, und zwar ausdruecklich: unter dem Uebergangsrecht sagt eine
    // Bundesgerichtssignatur NICHT, welches Verfahrensrecht auf dieses
    // Verfahren anwendbar war. Die Ableitung aus der Instanz steht deshalb
    // nicht zur Verfuegung — der Beleg gehoert an den einzelnen Treffer.
    // Diese Zeile ist der Grund, warum die Art ueberhaupt existiert; sie darf
    // nicht durch einen Rueckfall auf die Signaturliste ersetzt werden.
    return false;
  }

  // "quellenangabe" und jede spaeter ergaenzte Art: nichts wird abgeleitet,
  // solange die Semantik nicht hier ausdruecklich steht.
  return false;
}

/**
 * Das Auswertungsmodell einer Definition — ausschliesslich aus ihrem eigenen
 * Feld, mit dem Legacy-Wert als Vorgabe. Eine Fallunterscheidung nach `id`
 * oder Versionsnummer gibt es bewusst nirgends: sonst entschiede die
 * Numerierung ueber die Bedeutung der Daten.
 */
export function auswertungsmodell(definition: Messdefinition): Auswertungsmodell {
  return definition.auswertungsmodell ?? LEGACY_AUSWERTUNGSMODELL;
}

/** Wird nach endgueltiger Rechtswirkung ausgewertet (CR-03)? */
export function istEndwirkungsmodell(definition: Messdefinition): boolean {
  return auswertungsmodell(definition) === "endwirkung";
}

/* ---------- Vokabulare ---------- */

/**
 * Woerter, die den Verfahrensausgang bezeichnen. Ein Ein- oder
 * Ausschlusskriterium, das eines davon enthaelt, entscheidet ueber die
 * Zugehoerigkeit zur Population anhand dessen, was gemessen werden soll —
 * und ist damit ungueltig.
 */
export const AUSGANG_WOERTER = [
  "gutgeheissen",
  "gutheissung",
  "abgewiesen",
  "abweisung",
  "obsiegt",
  "obsiegen",
  "unterlegen",
  "unterliegen",
  "erfolglos",
  "erfolgreich",
  "nichteintreten",
  "nicht eingetreten",
  "gescheitert",
  "durchgesetzt",
  "gewonnen",
  "verloren",
  "stattgegeben",
  "aufgehoben",
  "gegenstandslos",
  "abgeschrieben",
  "abschreibung",
  "rueckzug",
  "zurueckgezogen",
  "vergleich",
  "saeumnis",
  "verzichtet",
] as const;

/**
 * Woerter des Redaktionstrichters. Storywert darf die Zugehoerigkeit zum
 * Messkorpus nie beeinflussen — Redaktion waehlt aus dem Messkorpus aus,
 * nie umgekehrt.
 */
export const REDAKTIONS_WOERTER = [
  "storywert",
  "story",
  "geschichte",
  "verstaendlich",
  "verstaendlichkeit",
  "attraktiv",
  "spannend",
  "lehrreich",
  "interessant",
  "sieb",
  "sieb.json",
  "mappe",
  "top",
] as const;

/**
 * Woerter der Sprachselektion. Die Schweiz spricht drei Amtssprachen; wer
 * nach Sprache aussortiert, misst die Rechtswirklichkeit eines Sprachgebiets
 * und nennt sie schweizerisch. Falschpositive Treffer sind harmlos — sie
 * fallen ueber die inhaltlichen Kriterien wieder heraus. Falschnegative
 * fehlen im Nenner und fallen niemandem auf.
 */
export const SPRACH_WOERTER = [
  "deutschsprachig",
  "deutsch",
  "franzoesisch",
  "franzoesischsprachig",
  "italienisch",
  "italienischsprachig",
  "romanisch",
  "sprache",
  "amtssprache",
  "landessprache",
] as const;

/** Normalisiert wie das Redaktions-Sieb: klein, ae/oe/ue, ohne Akzente. */
export function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function enthaeltWort(text: string, wort: string): boolean {
  const muster = new RegExp(`(^|[^a-z0-9])${wort.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
  return muster.test(text);
}

/* ---------- Pruefungen ---------- */

export interface Befund {
  ok: boolean;
  fehler: string[];
}

/**
 * Prueft ein einzelnes Kriterium gegen beide Vokabulare. Geprueft werden
 * Code UND Beschreibung — der Code allein liesse sich harmlos benennen.
 */
export function pruefeKriterium(kriterium: Kriterium, feld: string): string[] {
  const fehler: string[] = [];
  const text = normalisiere(`${kriterium.code} ${kriterium.beschreibung}`);
  for (const wort of AUSGANG_WOERTER) {
    if (enthaeltWort(text, normalisiere(wort))) {
      fehler.push(
        `${feld}/${kriterium.code}: Kriterium nennt den Verfahrensausgang ("${wort}"). ` +
          `Ein Kriterium, das den Ausgang kennt, verzerrt den Nenner und ist unzulaessig.`,
      );
    }
  }
  for (const wort of REDAKTIONS_WOERTER) {
    if (enthaeltWort(text, normalisiere(wort))) {
      fehler.push(
        `${feld}/${kriterium.code}: Kriterium nennt ein Merkmal des Redaktionstrichters ("${wort}"). ` +
          `Storywert darf die Zugehoerigkeit zum Messkorpus nicht beeinflussen.`,
      );
    }
  }
  for (const wort of SPRACH_WOERTER) {
    if (enthaeltWort(text, normalisiere(wort))) {
      fehler.push(
        `${feld}/${kriterium.code}: Kriterium sortiert nach Sprache ("${wort}"). ` +
          `Die Schweiz hat drei Amtssprachen — eine Sprachauswahl erzeugt einen Nenner, der nur ein Sprachgebiet abbildet.`,
      );
    }
  }
  return fehler;
}

/** Inhaltliche Pruefung der ganzen Definition (Schema-Pruefung siehe validierung.ts). */
export function pruefeDefinitionInhalt(definition: Messdefinition): Befund {
  const fehler: string[] = [];

  for (const kriterium of definition.einschluss) {
    fehler.push(...pruefeKriterium(kriterium, "einschluss"));
  }
  for (const kriterium of definition.ausschluss) {
    fehler.push(...pruefeKriterium(kriterium, "ausschluss"));
  }

  const codes = [...definition.einschluss, ...definition.ausschluss].map((k) => k.code);
  const doppelt = codes.filter((code, stelle) => codes.indexOf(code) !== stelle);
  for (const code of new Set(doppelt)) {
    fehler.push(`Kriteriencode "${code}" ist mehrfach vergeben — Ausschlussgruende muessen eindeutig sein.`);
  }

  if (definition.zeitraum.von > definition.zeitraum.bis) {
    fehler.push(`Zeitraum verkehrt: von (${definition.zeitraum.von}) liegt nach bis (${definition.zeitraum.bis}).`);
  }

  return { ok: fehler.length === 0, fehler };
}

/* ---------- Kanonischer Hash ---------- */

/** Stabile Serialisierung: Schluessel sortiert, keine Leerzeichen. */
export function kanonisch(wert: unknown): string {
  if (wert === null || typeof wert !== "object") return JSON.stringify(wert) ?? "null";
  if (Array.isArray(wert)) return `[${wert.map(kanonisch).join(",")}]`;
  const eintraege = Object.entries(wert as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${eintraege.map(([k, v]) => `${JSON.stringify(k)}:${kanonisch(v)}`).join(",")}}`;
}

/**
 * SHA-256 ueber die kanonische Form. Formatierung der Datei aendert den Hash
 * nicht, jede inhaltliche Aenderung schon — genau das braucht die
 * Reproduzierbarkeit alter Quoten.
 */
export function definitionsHash(definition: unknown): string {
  return createHash("sha256").update(kanonisch(definition), "utf8").digest("hex");
}

/* ---------- Auflösung einer Fassung ---------- */

/**
 * Kanonischer Schluessel einer Messdefinitions-FASSUNG.
 *
 * Eine Messdefinition ist nicht durch ihre `id` bestimmt, sondern durch
 * `id` UND `version`: MD-001 v2.0.0 und MD-001 v3.0.0 sind zwei verschiedene
 * Messungen, die nebeneinander bestehen duerfen — der alte Lauf gehoert zu
 * seiner damaligen Fassung, nicht zur neuen (siehe pruefeLauf in lauf.ts).
 * Wer nur ueber `id` aufloest, laesst die Dateireihenfolge entscheiden,
 * welche Fassung "gilt", und macht damit einen unveraenderten alten Lauf
 * ungueltig, sobald eine neue Fassung danebenliegt.
 */
export function definitionsSchluessel(id: string, version: string): string {
  return `${id}@${version}`;
}

/** Ergebnis der Auflösung — die Mehrdeutigkeit ist ein eigener Fall, kein "nicht gefunden". */
export type Fassungsauflösung =
  | { art: "gefunden"; definition: Messdefinition }
  | { art: "mehrdeutig"; dateien: readonly string[] }
  | { art: "fehlt" };

export interface Fassungsregister {
  /** Eindeutige Fassungen nach `id@version`. Mehrdeutige fehlen hier bewusst. */
  fassungen: ReadonlyMap<string, Messdefinition>;
  /** `id@version`, die mehr als eine Datei belegt — je Schluessel die Dateinamen. */
  doppelte: ReadonlyMap<string, readonly string[]>;
}

/**
 * Baut das Register aus gelesenen Definitionsdateien.
 *
 * Zwei Dateien mit derselben `id` UND derselben `version` sind ein
 * Widerspruch, kein Sortierproblem — sie werden NICHT nach Dateireihenfolge
 * aufgeloest, sondern aus `fassungen` herausgehalten und in `doppelte`
 * ausgewiesen. Analog MANIFEST v2.1 §4: zwei Fassungen derselben Liste sind
 * ein Bruch.
 */
export function sammleFassungen(
  dateien: readonly { datei: string; inhalt: Messdefinition }[],
): Fassungsregister {
  const nachSchluessel = new Map<string, { datei: string; inhalt: Messdefinition }[]>();
  for (const eintrag of dateien) {
    const schluessel = definitionsSchluessel(eintrag.inhalt.id, eintrag.inhalt.version);
    const bisher = nachSchluessel.get(schluessel);
    if (bisher) bisher.push(eintrag);
    else nachSchluessel.set(schluessel, [eintrag]);
  }

  const fassungen = new Map<string, Messdefinition>();
  const doppelte = new Map<string, readonly string[]>();
  for (const [schluessel, eintraege] of nachSchluessel) {
    if (eintraege.length === 1) fassungen.set(schluessel, eintraege[0]!.inhalt);
    else doppelte.set(schluessel, eintraege.map((e) => e.datei).sort());
  }
  return { fassungen, doppelte };
}

/** Loest die Fassung auf, die ein Lauf ausdruecklich nennt — id UND version. */
export function findeFassung(
  register: Fassungsregister,
  verweis: { id: string; version: string },
): Fassungsauflösung {
  const schluessel = definitionsSchluessel(verweis.id, verweis.version);
  const doppelt = register.doppelte.get(schluessel);
  if (doppelt) return { art: "mehrdeutig", dateien: doppelt };
  const definition = register.fassungen.get(schluessel);
  return definition ? { art: "gefunden", definition } : { art: "fehlt" };
}

/** Einheitlicher Fehlertext, damit pruefen und messquote nicht auseinanderlaufen. */
export function auflösungsFehler(
  verweis: { id: string; version: string },
  auflösung: Fassungsauflösung,
): string | null {
  if (auflösung.art === "gefunden") return null;
  const schluessel = definitionsSchluessel(verweis.id, verweis.version);
  if (auflösung.art === "mehrdeutig") {
    return (
      `Messdefinition ${schluessel} liegt mehrfach vor (${auflösung.dateien.join(", ")}). ` +
      `Zwei Dateien mit derselben id und derselben Version sind ein Widerspruch — welche gilt, darf nicht ` +
      `die Dateireihenfolge entscheiden. Eine der beiden entfernen oder ihre Version erhoehen.`
    );
  }
  return `Messdefinition ${schluessel} nicht gefunden.`;
}

/**
 * Darf aus dieser Definition eine Quote materialisiert werden?
 * Vier Bedingungen, alle menschlich verantwortet: eingefroren, und die drei
 * Pruefstaende (Norm, Rechtskraft-Regel, Abschlussregel) bestaetigt.
 */
export function darfQuoteMaterialisieren(definition: Messdefinition): Befund {
  const fehler: string[] = [];
  if (definition.status !== "eingefroren") {
    fehler.push(`Messdefinition ${definition.id} ist "${definition.status}" — nur eingefrorene Definitionen tragen eine Quote.`);
  }
  const pruefstaende: [string, Pruefstand][] = [
    ["norm.pruefstand", definition.norm.pruefstand],
    ["rechtskraft_regel.pruefstand", definition.rechtskraft_regel.pruefstand],
    ["abschluss_regel.pruefstand", definition.abschluss_regel.pruefstand],
  ];
  for (const [feld, stand] of pruefstaende) {
    if (stand !== "fachlich_bestaetigt") {
      fehler.push(`Messdefinition ${definition.id}: ${feld} ist "${stand}" — fachliche Bestaetigung fehlt.`);
    }
  }
  return { ok: fehler.length === 0, fehler };
}

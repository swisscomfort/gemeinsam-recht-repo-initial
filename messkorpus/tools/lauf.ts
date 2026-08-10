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
import {
  auswertungsmodell,
  belegtRegime,
  istEndwirkungsmodell,
  kanonisch,
  type Messdefinition,
  type VerfahrensrechtNachweis,
} from "./definition.ts";
import { definitionsHash } from "./definition.ts";

export type TrefferStatus = "eingeschlossen" | "ausgeschlossen" | "ungeklaert";
export type AbschlussStatus = "abgeschlossen" | "rueckweisung_offen" | "zwischenentscheid" | "ungeklaert";

/**
 * Ausgang bezueglich der gemessenen Norm.
 *
 * "offen" ist kein Ergebnis, sondern dessen ausdrueckliches Fehlen: die
 * endgueltige Rechtswirkung auf den gemessenen Sachverhalt steht noch aus
 * (typischerweise nach einer Rueckweisung). Der Wert wird nie als Erfolg oder
 * Misserfolg gezaehlt und sperrt jede Quote — er existiert, damit dieser
 * Zustand benannt werden kann, statt als "nicht durchgesetzt" zu erscheinen.
 */
export type MessausgangWert = "durchgesetzt" | "teilweise" | "nicht_durchgesetzt" | "nicht_anwendbar" | "offen";

/** Die zaehlbaren Ausgaenge — alles ausser "offen". */
export const ZAEHLBARE_MESSAUSGAENGE = [
  "durchgesetzt",
  "teilweise",
  "nicht_durchgesetzt",
  "nicht_anwendbar",
] as const satisfies readonly MessausgangWert[];

export function istZaehlbar(wert: MessausgangWert): boolean {
  return (ZAEHLBARE_MESSAUSGAENGE as readonly MessausgangWert[]).includes(wert);
}

/**
 * Die Werte, die CR-03 fuer das Endwirkungsmodell festlegt. "teilweise"
 * gehoert nicht dazu: gemessen wird die endgueltige Rechtswirkung auf eine
 * konkrete Kuendigung, und die ist eingetreten oder nicht. Ein "teilweise"
 * waere dort keine Beobachtung, sondern eine Zwischenkategorie, ueber die
 * niemand entschieden hat. Im Modell "materielle_pruefung" bleibt der Wert
 * unveraendert gueltig.
 */
export const ENDWIRKUNG_MESSAUSGAENGE = [
  "durchgesetzt",
  "nicht_durchgesetzt",
  "nicht_anwendbar",
  "offen",
] as const satisfies readonly MessausgangWert[];

function kenntMessausgangsmodell(wert: MessausgangWert): boolean {
  return (ENDWIRKUNG_MESSAUSGAENGE as readonly MessausgangWert[]).includes(wert);
}

/** Kennt das Modell dieser Definition den Wert ueberhaupt? */
export function kenntMessausgang(wert: MessausgangWert, definition: Messdefinition): boolean {
  return istEndwirkungsmodell(definition) ? kenntMessausgangsmodell(wert) : wert !== "offen";
}

export interface Messausgang {
  messdefinition_id: string;
  messdefinition_version: string;
  wert: MessausgangWert;
  beleg: string;
  quelle?: string;
}

/**
 * Wie die Streitigkeit erledigt wurde — zweiachsig (CR-03 Auflage E1):
 * `modus` nennt die Form der Erledigung, `prozessgrund` nur bei prozessualer
 * Erledigung deren Ursache. Ein flaches Enum wuerde beides vermischen.
 */
export type Erledigungsmodus = "materiell_entschieden" | "prozessual_erledigt" | "rueckweisung_offen";

export type Prozessgrund =
  | "rechtsmittelbegruendung_unzureichend"
  | "aktivlegitimation_fehlte"
  | "klagebewilligung_fehlte_oder_ungueltig"
  | "anfechtungsfrist_verwirkt"
  | "instanzverwirkung"
  | "nichteintreten_sonstiger_grund"
  | "sonstiger_prozessgrund";

export interface Erledigungsweg {
  modus: Erledigungsmodus;
  /** Nur bei `prozessual_erledigt` belegt, sonst ausdruecklich `null`. */
  prozessgrund: Prozessgrund | null;
  /** Konkrete Textstelle oder praeziser Fundstellenhinweis aus der Primaerquelle. */
  beleg: string;
  /**
   * Datum des Entscheids oder Verfahrensakts, der DEN HIER KODIERTEN STAND
   * begruendet (JJJJ-MM-TT).
   *
   * Nicht dasselbe wie `treffer.datum`: das ist das Rohmetadatum des
   * urspruenglichen Suchtreffers. Stammt der Endzustand aus einem nach CR-03
   * E2 zulaessigen verknuepften Folgeentscheid, ist dessen Datum massgeblich —
   * sonst ordnete die Kette nach dem Datum des falschen Entscheids.
   *
   * Im Endwirkungsmodell Pflicht fuer eingeschlossene Treffer; im Modell
   * "materielle_pruefung" ohne Bedeutung.
   */
  stand_datum?: string;
  /**
   * Primaerquelle des kodierten Standes: der Roh-Treffer selbst oder ein nach
   * CR-03 E2 zulaessiger, ausdruecklich verknuepfter Folgeentscheid derselben
   * Verfahrenskette. Im Endwirkungsmodell Pflicht fuer eingeschlossene
   * Treffer — sonst bliebe offen, welcher Entscheid Standdatum, Weg und
   * Endzustand traegt.
   */
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
  /** Getrennt vom Messausgang: derselbe Weg kann verschieden ausgehen. */
  erledigungsweg?: Erledigungsweg;
  messausgang?: Messausgang;
  /**
   * Welches Verfahrensrecht galt fuer GENAU DIESES Verfahren, mit Beleg und
   * Primaerquelle.
   *
   * Optional und allgemein: unter einer Definition, deren Korpus einheitlich
   * dem BGG untersteht (`rechtskraft_regel.art` = `bundesgericht_art61_bgg`),
   * wird er nicht verlangt und aendert nichts. Unter dem Uebergangsrecht
   * (`bundesgericht_uebergangsrecht_art132_bgg`) ist er der einzige Weg, die
   * Art.-61-Wirkung zu oeffnen — dort sagt die Gerichtssignatur allein nichts
   * ueber das anwendbare Verfahrensrecht.
   *
   * Er gehoert zur Klassifikation, nicht zu den Rohmetadaten, und geht
   * deshalb NICHT in `metadaten_fingerprint` ein.
   */
  verfahrensrecht_nachweis?: VerfahrensrechtNachweis;
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

/* ---------- Erledigungsweg und Endwirkung ---------- */

/**
 * Ist das ein echtes ISO-Kalenderdatum?
 *
 * Das Muster JJJJ-MM-TT allein genuegt nicht: "2026-02-30" und "2026-13-01"
 * passen darauf, bezeichnen aber keinen Tag. Ein solches Datum wuerde still
 * in die Chronologie eingehen und dort sortiert, als gaebe es ihn.
 *
 * Rein und deterministisch: gerechnet wird in UTC, ohne Systemzeit.
 */
export function istKalenderdatum(iso: string): boolean {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(iso)) return false;
  const jahr = Number(iso.slice(0, 4));
  const monat = Number(iso.slice(5, 7));
  const tag = Number(iso.slice(8, 10));
  const datum = new Date(Date.UTC(jahr, monat - 1, tag));
  return (
    datum.getUTCFullYear() === jahr && datum.getUTCMonth() + 1 === monat && datum.getUTCDate() === tag
  );
}

/**
 * Innere Stimmigkeit des Erledigungswegs. Gilt ueberall, wo er gefuehrt wird,
 * unabhaengig vom Auswertungsmodell: `prozessgrund` ist genau dann belegt,
 * wenn prozessual erledigt wurde. Sonst entstuende ein Grund ohne Erledigung
 * oder eine prozessuale Erledigung ohne Ursache — beides waere nicht
 * auswertbar.
 */
export function pruefeErledigungsweg(weg: Erledigungsweg, wo: string): string[] {
  const fehler: string[] = [];

  if (weg.modus === "prozessual_erledigt") {
    if (weg.prozessgrund === null) {
      fehler.push(
        `${wo}: Erledigungsweg "prozessual_erledigt" ohne prozessgrund. ` +
          `Welcher prozessuale Grund die Sache erledigt hat, ist die eigentliche Aussage — ohne ihn ist der Modus leer.`,
      );
    }
  } else if (weg.prozessgrund !== null) {
    fehler.push(
      `${wo}: Erledigungsweg "${weg.modus}" traegt den prozessgrund "${weg.prozessgrund}". ` +
        `Ein Prozessgrund gehoert ausschliesslich zu "prozessual_erledigt"; sonst ist er auf null zu setzen.`,
    );
  }

  if (weg.beleg.trim() === "") {
    fehler.push(`${wo}: Erledigungsweg ohne Beleg. Der Modus ist eine Behauptung ueber den Primaertext und braucht dessen Stelle.`);
  }

  return fehler;
}

/**
 * Die Pflichten des Endwirkungsmodells fuer einen EINGESCHLOSSENEN Treffer
 * (CR-03). Ein `ungeklaert` gebliebener Treffer faellt nicht hierunter — dort
 * wird ausdruecklich nichts erfunden (Auflage E2 Ziff. 6).
 *
 * `erledigungsweg.modus`, `abschluss_status` und `messausgang` beschreiben
 * denselben Sachverhalt aus drei Richtungen. Sie werden deshalb in BEIDE
 * Richtungen gekoppelt: nicht nur "eine Rueckweisung laesst die Messfrage
 * offen", sondern ebenso "eine offene Messfrage kommt nur aus einer
 * Rueckweisung". Ohne die Gegenrichtung waeren Datensaetze gueltig, in denen
 * der Erledigungsweg etwas anderes behauptet als die beiden anderen Felder —
 * dann bezeichnete er nicht mehr den Zustand, den sie ausdruecken.
 *
 *   rueckweisung_offen    ⟺  abschluss_status rueckweisung_offen ⟺ messausgang "offen"
 *   materiell_entschieden  ⇒  abschluss_status abgeschlossen, zaehlbarer Messausgang
 *   prozessual_erledigt    ⇒  abschluss_status abgeschlossen, zaehlbarer Messausgang
 */
export function pruefeEndwirkung(laufId: string, datenstand: string, treffer: Treffer): string[] {
  const fehler: string[] = [];
  const wo = `Lauf ${laufId}: Treffer ${treffer.quelle_id}`;

  if (treffer.status !== "eingeschlossen") return fehler;

  /* Standdatum und Provenienz: welcher Entscheid traegt den kodierten Stand? */
  const stand = treffer.erledigungsweg?.stand_datum;
  if (treffer.erledigungsweg && stand === undefined) {
    fehler.push(
      `${wo} ist eingeschlossen, nennt aber kein erledigungsweg.stand_datum. ` +
        `Welcher Entscheid den kodierten Stand traegt, muss feststehen — das Datum des Roh-Treffers ist es nicht ` +
        `zwingend, wenn der Endzustand aus einem verknuepften Folgeentscheid stammt.`,
    );
  } else if (stand !== undefined) {
    if (!istKalenderdatum(stand)) {
      fehler.push(
        `${wo}: erledigungsweg.stand_datum "${stand}" ist kein gueltiges Kalenderdatum (JJJJ-MM-TT). ` +
          `Ein Datum, das es nicht gibt, wuerde in der Chronologie trotzdem einsortiert.`,
      );
    } else if (stand > datenstand) {
      fehler.push(
        `${wo}: erledigungsweg.stand_datum ${stand} liegt nach dem Datenstand des Laufs (${datenstand}). ` +
          `Ein Entscheid, den es am Datenstand noch nicht gab, darf diesen Lauf nicht bestimmen — sonst zoege ` +
          `spaeteres Wissen in eine historische Messung ein. Fuer diesen Lauf bleibt der Treffer "ungeklaert".`,
      );
    }
  }
  if (treffer.erledigungsweg && (treffer.erledigungsweg.quelle ?? "").trim() === "") {
    fehler.push(
      `${wo} ist eingeschlossen, nennt aber keine erledigungsweg.quelle. ` +
        `Nachvollziehbar sein muss, aus welchem Entscheid der kodierte Stand stammt: aus dem Treffer selbst oder ` +
        `aus einem nach CR-03 E2 zulaessigen verknuepften Entscheid derselben Verfahrenskette.`,
    );
  }

  /* "teilweise" ist im Endwirkungsmodell nicht definiert. */
  if (treffer.messausgang && !kenntMessausgangsmodell(treffer.messausgang.wert)) {
    fehler.push(
      `${wo}: Messausgang "${treffer.messausgang.wert}" ist im Endwirkungsmodell nicht definiert. ` +
        `Gemessen wird die endgueltige Rechtswirkung auf eine konkrete Kuendigung; CR-03 kennt dafuer ` +
        `${ENDWIRKUNG_MESSAUSGAENGE.join(", ")}.`,
    );
  }

  if (!treffer.erledigungsweg) {
    fehler.push(
      `${wo} ist eingeschlossen, nennt aber keinen Erledigungsweg. ` +
        `Im Endwirkungsmodell gehoert zu jedem gezaehlten Fall, auf welchem Weg er endete.`,
    );
  }
  if (treffer.zaehleinheit === undefined || treffer.zaehleinheit === "") {
    fehler.push(`${wo} ist eingeschlossen, nennt aber keine Zaehleinheit.`);
  }
  if (treffer.abschluss_status === undefined) {
    fehler.push(`${wo} ist eingeschlossen, nennt aber keinen Abschlussstatus.`);
  }
  if (!treffer.messausgang) {
    fehler.push(
      `${wo} ist eingeschlossen, traegt aber keinen Messausgang. ` +
        `Steht die endgueltige Rechtswirkung noch aus, ist sie als "offen" zu benennen, nicht wegzulassen.`,
    );
  }

  /* Abgeschlossen heisst: die Rechtswirkung steht fest. */
  if (treffer.abschluss_status === "abgeschlossen" && treffer.messausgang?.wert === "offen") {
    fehler.push(
      `${wo} ist abgeschlossen, traegt aber den Messausgang "offen". ` +
        `Beides zusammen ist ein Widerspruch: entweder steht die endgueltige Rechtswirkung fest, dann ist sie zu benennen, ` +
        `oder sie steht aus, dann ist der Fall nicht abgeschlossen.`,
    );
  }

  /* Rueckweisung: die gemessene Rechtsfrage ist gerade nicht entschieden. */
  if (treffer.erledigungsweg?.modus === "rueckweisung_offen") {
    if (treffer.abschluss_status !== "rueckweisung_offen") {
      fehler.push(
        `${wo}: Erledigungsweg "rueckweisung_offen", Abschlussstatus aber "${treffer.abschluss_status ?? "(fehlt)"}". ` +
          `Eine Rueckweisung laesst die gemessene Rechtsfrage offen.`,
      );
    }
    if (treffer.messausgang && treffer.messausgang.wert !== "offen") {
      fehler.push(
        `${wo}: Erledigungsweg "rueckweisung_offen", Messausgang aber "${treffer.messausgang.wert}". ` +
          `Nach einer Rueckweisung ist die endgueltige Rechtswirkung noch nicht bestimmbar — sie heisst dann "offen".`,
      );
    }
  }

  /* Gegenrichtung: ein offener Stand kommt nur aus einer Rueckweisung. Ohne
     diese Richtung koennte der Erledigungsweg eine Erledigung behaupten,
     waehrend die beiden anderen Felder die Sache offen halten. */
  const weg = treffer.erledigungsweg;
  if (weg && weg.modus !== "rueckweisung_offen") {
    if (treffer.messausgang?.wert === "offen") {
      fehler.push(
        `${wo}: Messausgang "offen", Erledigungsweg aber "${weg.modus}". ` +
          `Ein offener Messausgang heisst, dass die endgueltige Rechtswirkung aussteht — das ist keine Erledigung. ` +
          `Entweder ist der Weg "rueckweisung_offen", oder der Messausgang benennt die eingetretene Wirkung.`,
      );
    }
    if (treffer.abschluss_status === "rueckweisung_offen") {
      fehler.push(
        `${wo}: Abschlussstatus "rueckweisung_offen", Erledigungsweg aber "${weg.modus}". ` +
          `Beide Felder beschreiben denselben Sachverhalt; hier sagen sie Verschiedenes.`,
      );
    }
    /* materiell_entschieden und prozessual_erledigt sind Endzustaende. */
    if (treffer.abschluss_status !== undefined && treffer.abschluss_status !== "abgeschlossen") {
      fehler.push(
        `${wo}: Erledigungsweg "${weg.modus}", Abschlussstatus aber "${treffer.abschluss_status}". ` +
          `Eine Erledigung schliesst die gemessene Rechtsfrage ab — sonst ist sie keine.`,
      );
    }
  }

  /* Zwischenstaende sind kein Endzustand. Sie werden NICHT still einem der
     drei Erledigungsmodi zugeschlagen: fuer sie ist bisher keiner definiert,
     und einen zu erfinden waere eine fachliche Entscheidung, keine
     technische. Ist die Sachlage wirklich noch nicht klassifizierbar, bleibt
     der Treffer "ungeklaert" — dann verlangt das Modell gar keine Felder. */
  if (treffer.abschluss_status === "zwischenentscheid" || treffer.abschluss_status === "ungeklaert") {
    fehler.push(
      `${wo} ist eingeschlossen, traegt aber den Abschlussstatus "${treffer.abschluss_status}". ` +
        `Die drei Erledigungsmodi beschreiben nur Endzustaende; fuer einen Zwischenstand ist keiner definiert. ` +
        `Ist die Sachlage noch nicht klassifizierbar, bleibt der Treffer "ungeklaert" statt eingeschlossen.`,
    );
  }

  return fehler;
}

/**
 * Der Nachweis des anwendbaren Verfahrensrechts — zwei getrennte Fragen.
 *
 * 1. STRUKTUR: liegt einer vor, muss er etwas nennen. Ein leerer Beleg oder
 *    eine leere Quelle machen aus einer Feststellung eine Behauptung. Das
 *    gilt unter jeder Definition, auch wenn sie den Nachweis nicht verlangt.
 * 2. PFLICHT: nur unter dem Uebergangsrecht, und nur fuer einen Treffer, der
 *    als eingeschlossen UND abgeschlossen gefuehrt wird — er behauptet damit
 *    einen endgueltigen Rechtszustand. Ohne belegtes `regime: "bgg"` steht
 *    die Art.-61-Wirkung nicht zur Verfuegung; "og" und "ungeklaert" fuehren
 *    hier gleichermassen nicht weiter, "og" mangels hinterlegter
 *    Rechtskraftregel mit belegter Normgrundlage. Der Treffer bleibt dann
 *    "ungeklaert" — es wird nichts erfunden (CR-03 Auflage E2 Ziff. 6).
 *
 * Ein ungeklaerter oder ausgeschlossener Treffer braucht nie einen Nachweis.
 */
export function pruefeVerfahrensrechtNachweis(
  definition: Messdefinition,
  treffer: Treffer,
  wo: string,
): string[] {
  const fehler: string[] = [];
  const nachweis = treffer.verfahrensrecht_nachweis;

  if (nachweis) {
    if (nachweis.beleg.trim() === "") {
      fehler.push(
        `${wo}: verfahrensrecht_nachweis nennt keinen Beleg. ` +
          `Welches Verfahrensrecht galt, muss nachlesbar sein — sonst ist es eine Behauptung.`,
      );
    }
    if (nachweis.quelle.trim() === "") {
      fehler.push(
        `${wo}: verfahrensrecht_nachweis nennt keine Quelle. ` +
          `Die Feststellung braucht die Primaerquelle, aus der sie stammt.`,
      );
    }
  }

  if (definition.rechtskraft_regel.art !== "bundesgericht_uebergangsrecht_art132_bgg") return fehler;
  if (treffer.status !== "eingeschlossen" || treffer.abschluss_status !== "abgeschlossen") return fehler;

  if (!nachweis) {
    fehler.push(
      `${wo} ist eingeschlossen und abgeschlossen, nennt aber keinen verfahrensrecht_nachweis. ` +
        `${definition.id} v${definition.version} wertet nach dem Uebergangsrecht aus (Art. 132 BGG): dort sagt die ` +
        `Gerichtssignatur allein nicht, welches Verfahrensrecht galt. Ohne belegten Nachweis bleibt der Treffer "ungeklaert".`,
    );
  } else if (!belegtRegime(nachweis, "bgg")) {
    fehler.push(
      `${wo} ist eingeschlossen und abgeschlossen, sein verfahrensrecht_nachweis traegt aber nicht das belegte ` +
        `Regime "bgg" (angegeben: "${nachweis.regime}"). Nur fuer ein Verfahren, das dem BGG untersteht, steht die ` +
        `Rechtskraftwirkung nach Art. 61 BGG zur Verfuegung. Fuer "og" ist in dieser Fassung bewusst keine ` +
        `Rechtskraftregel mit belegter Normgrundlage hinterlegt, und "ungeklaert" ist gerade keine Feststellung — ` +
        `beides fuehrt hier nicht zu einem Einschluss, sondern zu "ungeklaert".`,
    );
  }

  return fehler;
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
  const endwirkung = istEndwirkungsmodell(definition);
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

    if (treffer.erledigungsweg) {
      fehler.push(...pruefeErledigungsweg(treffer.erledigungsweg, `Lauf ${lauf.id}: Treffer ${treffer.quelle_id}`));
    }

    fehler.push(
      ...pruefeVerfahrensrechtNachweis(definition, treffer, `Lauf ${lauf.id}: Treffer ${treffer.quelle_id}`),
    );

    /* "offen" ist eine Aussage des Endwirkungsmodells. Unter einer Definition,
       die materiell prueft, hat der Wert keine festgelegte Bedeutung. */
    if (!endwirkung && treffer.messausgang?.wert === "offen") {
      fehler.push(
        `Lauf ${lauf.id}: Treffer ${treffer.quelle_id} traegt den Messausgang "offen", ` +
          `${definition.id} v${definition.version} wertet aber nach dem Modell "${auswertungsmodell(definition)}" aus. ` +
          `Der Wert "offen" ist nur im Endwirkungsmodell definiert.`,
      );
    }

    if (endwirkung) fehler.push(...pruefeEndwirkung(lauf.id, lauf.datenstand, treffer));

    if (treffer.messausgang && !gehoertZu(treffer.messausgang, definition)) {
      fehler.push(
        `Lauf ${lauf.id}: Treffer ${treffer.quelle_id} traegt einen Messausgang zu ${treffer.messausgang.messdefinition_id}@${treffer.messausgang.messdefinition_version}, ` +
          `der Lauf gehoert aber zu ${definition.id}@${definition.version}. Ein Normausgang gilt nur fuer seine eigene Messdefinition ` +
          `UND deren Fassung — mit einer neuen Version koennen sich Messfrage und Kriterien geaendert haben, dann ist die alte Kodierung nicht mehr dieselbe Aussage.`,
      );
    }
  }

  /* Terminal offen heisst: noch nicht einschliessbar.
     CR-03 verlangt fuer den Einschluss, dass der endgueltige rechtliche
     Zustand der Kuendigung bestimmbar ist. Steht der TERMINALE Stand einer
     Zaehleinheit noch auf "offen", ist genau dieses Merkmal nicht erfuellt —
     die Streitigkeit gehoert bis zur Klaerung nicht in den Nenner, sondern
     bleibt "ungeklaert" (Auflage E2 Ziff. 6). Ein frueherer offener Entscheid
     INNERHALB einer spaeter abgeschlossenen Kette bleibt davon unberuehrt. */
  if (endwirkung) {
    for (const einheit of zaehleinheiten(lauf, definition).einheiten) {
      if (!einheit.offen) continue;
      fehler.push(
        `Lauf ${lauf.id}: Zaehleinheit ${einheit.id} ist eingeschlossen, ihr terminaler Stand ist aber "offen" ` +
          `(${einheit.treffer.map((t) => t.quelle_id).join(", ")}). Der endgueltige Zustand ist am Datenstand ` +
          `${lauf.datenstand} nicht bestimmbar; die Streitigkeit muss nach CR-03 E2 als "ungeklaert" gefuehrt werden, ` +
          `bis ein zulaessiger Folgeentscheid den Endzustand bestimmt.`,
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

/** Der Stand, den ein einzelner Entscheid zur Messfrage hinterlaesst. */
interface Kettenstand {
  abschluss_status?: AbschlussStatus;
  messausgang?: Messausgang;
}

/** Das Aggregat einer ganzen Zaehleinheit. */
interface Einheitsstand {
  abschluss_status: AbschlussStatus;
  messausgang?: Messausgang;
  offen: boolean;
}

/** Kein auswertbarer Stand — die Einheit zaehlt nicht und sperrt jede Quote. */
const UNBESTIMMT: Einheitsstand = { abschluss_status: "ungeklaert", messausgang: undefined, offen: false };

/**
 * Aggregation der Zaehleinheit im Modell "materielle_pruefung" — Wort fuer
 * Wort die Regel, die vor dem Endwirkungsmodell galt.
 *
 * Sie wird hier NICHT nachtraeglich verbessert. Alte Messdefinitionen tragen
 * ihre Bedeutung mit sich; wer die Aggregation unter ihnen aendert, aendert
 * rueckwirkend, was ihre Laeufe aussagen, und macht frueher berechnete Quoten
 * unreproduzierbar. Die Chronologie des Endwirkungsmodells bleibt deshalb
 * draussen: ein Widerspruch zweier Endausgaenge wird hier gemeldet und nicht
 * nach Datum aufgeloest, und ein "abgeschlossen" irgendwo in der Einheit
 * schliesst sie ab, gleich wann es faellt.
 */
function bisherigerStand(
  id: string,
  treffer: readonly Treffer[],
  definition: Messdefinition,
): { stand: Einheitsstand; fehler: string[] } {
  const fehler: string[] = [];

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
  const abschluss_status: AbschlussStatus = treffer.some((t) => t.abschluss_status === "abgeschlossen")
    ? "abgeschlossen"
    : (treffer.find((t) => t.abschluss_status !== undefined)?.abschluss_status ?? "ungeklaert");

  // "offen" gibt es in diesem Modell nicht; pruefeLauf lehnt den Wert dort ab.
  return { stand: { abschluss_status, messausgang: ausgaenge[0], offen: false }, fehler };
}

/**
 * Traegt dieser Treffer ueberhaupt eine Aussage zum Stand der Messfrage?
 * Ein Messausgang zu einer anderen Fassung zaehlt nicht mit — er ist eine
 * Aussage ueber eine andere Messung.
 */
function standDesTreffers(treffer: Treffer, definition: Messdefinition): Kettenstand | null {
  const messausgang =
    treffer.messausgang !== undefined && gehoertZu(treffer.messausgang, definition) ? treffer.messausgang : undefined;
  if (treffer.abschluss_status === undefined && messausgang === undefined) return null;
  return { abschluss_status: treffer.abschluss_status, messausgang };
}

/** Vergleichsschluessel eines Standes — zwei gleiche Schluessel sagen dasselbe. */
function standSchluessel(stand: Kettenstand): string {
  return `${stand.abschluss_status ?? "(ohne)"}/${stand.messausgang?.wert ?? "(ohne)"}`;
}

/**
 * Bestimmt den terminalen Stand einer Verfahrenskette. Gilt AUSSCHLIESSLICH
 * im Modell "endwirkung" — im Legacy-Modell aggregiert `bisherigerStand`.
 *
 * Der Sinn: "offen" ist ein Zwischenzustand. Eine Rueckweisung von 2019, die
 * ein Endentscheid von 2020 erledigt hat, darf die Einheit nicht dauerhaft
 * offen halten — und ein Endentscheid von 2019, den ein Entscheid von 2020
 * wieder aufgemacht hat, darf sie nicht als abgeschlossen ausweisen. Gezaehlt
 * wird der letzte Stand, nicht der guenstigste und nicht der erste.
 *
 * Vier Faelle:
 *   1. Alle Entscheide sagen dasselbe (z. B. ein BGE/BGer-Paar desselben
 *      Entscheids) — die Reihenfolge ist dann ohne Belang.
 *   2. Die Staende unterscheiden sich und lassen sich nach Datum ordnen —
 *      der spaeteste gilt.
 *   3. Am spaetesten Datum stehen unvereinbare Staende nebeneinander — nicht
 *      aufloesbar, Fehler.
 *   4. Die Staende unterscheiden sich, aber es fehlt ein Datum — die
 *      Reihenfolge waere noetig und ist unbekannt. Es wird nicht geraten.
 */
function terminalerStand(
  id: string,
  treffer: readonly Treffer[],
  definition: Messdefinition,
): { stand: Einheitsstand; fehler: string[] } {
  const alsEinheit = (stand: Kettenstand): Einheitsstand => ({
    abschluss_status: stand.abschluss_status ?? "ungeklaert",
    messausgang: stand.messausgang,
    offen: stand.messausgang?.wert === "offen",
  });

  const kette = treffer
    .map((t) => ({ treffer: t, stand: standDesTreffers(t, definition) }))
    .filter((e): e is { treffer: Treffer; stand: Kettenstand } => e.stand !== null);

  if (kette.length === 0) return { stand: UNBESTIMMT, fehler: [] };

  const schluessel = new Set(kette.map((e) => standSchluessel(e.stand)));
  if (schluessel.size === 1) return { stand: alsEinheit(kette[0]!.stand), fehler: [] };

  /* Geordnet wird nach dem Standdatum, nicht nach `treffer.datum`: stammt der
     kodierte Stand aus einem verknuepften Folgeentscheid, ist dessen Datum
     massgeblich, nicht das des urspruenglichen Suchtreffers. */
  const standDatum = (e: { treffer: Treffer }): string | undefined => e.treffer.erledigungsweg?.stand_datum;

  const ohneDatum = kette.filter((e) => standDatum(e) === undefined);
  if (ohneDatum.length > 0) {
    return {
      stand: UNBESTIMMT,
      fehler: [
        `Zaehleinheit ${id} wechselt den Stand (${[...schluessel].sort().join(" / ")}), aber ` +
          `${ohneDatum.map((e) => e.treffer.quelle_id).join(", ")} traegt kein Standdatum ` +
          `(erledigungsweg.stand_datum). Welcher Stand der letzte ist, laesst sich damit nicht bestimmen — ` +
          `und wird nicht geraten.`,
      ],
    };
  }

  const spaetestes = kette.reduce((bisher, e) => (standDatum(e)! > bisher ? standDatum(e)! : bisher), "");
  const letzte = kette.filter((e) => standDatum(e) === spaetestes);
  const letzteSchluessel = new Set(letzte.map((e) => standSchluessel(e.stand)));
  if (letzteSchluessel.size > 1) {
    return {
      stand: UNBESTIMMT,
      fehler: [
        `Zaehleinheit ${id} traegt am ${spaetestes} widersprechende Normausgaenge bzw. Abschlussstaende ` +
          `(${[...letzteSchluessel].sort().join(" / ")}) — nicht automatisch aufloesbar. ` +
          `Gleichzeitige Entscheide duerfen denselben Stand mehrfach abbilden, aber keine zwei verschiedenen.`,
      ],
    };
  }

  return { stand: alsEinheit(letzte[0]!.stand), fehler: [] };
}

export interface Zaehleinheit {
  id: string;
  treffer: Treffer[];
  story_id?: string;
  /**
   * Im Endwirkungsmodell der terminale Abschlussstand der Kette; im Modell
   * "materielle_pruefung" wie bisher ihr guenstigster.
   */
  abschluss_status: AbschlussStatus;
  /**
   * Im Endwirkungsmodell der Messausgang des letzten Entscheids; im Modell
   * "materielle_pruefung" wie bisher der erste vorhandene.
   */
  messausgang?: Messausgang;
  /**
   * Der TERMINALE Zustand der Kette laesst die endgueltige Rechtswirkung offen.
   * Eine fruehere Rueckweisung, die ein spaeterer Endentscheid abgeschlossen
   * hat, ergibt hier `false` — sie war ein Zwischenzustand. Im Modell
   * "materielle_pruefung" immer `false`: dort gibt es den Wert "offen" nicht.
   */
  offen: boolean;
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
 * Wie aggregiert wird, entscheidet allein das erklaerte Auswertungsmodell der
 * Definition. Ohne `auswertungsmodell` gilt unveraendert die Regel von vor dem
 * Endwirkungsmodell (`bisherigerStand`): der guenstigste Abschlussstand, der
 * erste Messausgang, und zwei verschiedene Endausgaenge sind ein Widerspruch,
 * den keine Chronologie aufloest. Alte Definitionen behalten damit ihre
 * Bedeutung, und alte Quoten bleiben reproduzierbar.
 *
 * Im Endwirkungsmodell dagegen ist der TERMINALE Zustand der Verfahrenskette
 * massgeblich, nicht die Vereinigung aller je aufgetretenen Zustaende. Eine Rueckweisung beschreibt
 * den Stand zu ihrem Zeitpunkt; ein spaeterer Endentscheid derselben Kette
 * entscheidet die Messfrage abschliessend. Umgekehrt kann ein spaeterer
 * Entscheid eine schon entschiedene Frage wieder oeffnen. Geordnet wird nach
 * dem gespeicherten Standdatum (`erledigungsweg.stand_datum`) — nie nach dem
 * Datum des Rohtreffers und nie nach der Reihenfolge im Array, die keine
 * juristische Chronologie ist.
 *
 * Widersprueche innerhalb eines Standes werden nicht aufgeloest, sondern
 * gemeldet: sie sperren die Quote. Ebenso, wenn die Reihenfolge fuer die
 * Aufloesung noetig waere, die Datumsangaben dafuer aber fehlen — dann wird
 * nicht geraten.
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

    /* Die Aggregation richtet sich allein nach dem erklaerten Modell der
       Definition — nie nach id, Version oder Dateiname. Eine Definition ohne
       `auswertungsmodell` wird exakt so aggregiert wie vor dem
       Endwirkungsmodell. */
    const auflösung = istEndwirkungsmodell(definition)
      ? terminalerStand(id, treffer, definition)
      : bisherigerStand(id, treffer, definition);
    fehler.push(...auflösung.fehler);

    einheiten.push({
      id,
      treffer,
      story_id: storyId,
      abschluss_status: auflösung.stand.abschluss_status,
      messausgang: auflösung.stand.messausgang,
      offen: auflösung.stand.offen,
    });
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

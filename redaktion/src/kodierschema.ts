// kodierschema.ts — das gemeinsame Antwortschema der Doppelkodierung
// (gemeinsam-recht.ml003.kodierung.v1) und dessen Pruefung.
//
// EIN Schema fuer beide Kodierer, mit denselben Feldnamen. Bei ML-002 war das
// nicht so: das Artefakt von Lauf A fuehrte `status_a`, das von Lauf B2
// `status_b`. Zwei Formen derselben Aussage muessen vor jedem Vergleich von
// Hand aufeinander abgebildet werden — bei sieben Faellen laestig, bei 129
// eine Fehlerquelle, und jede Abbildung ist eine Gelegenheit, das Ergebnis zu
// beeinflussen. Wer kodiert hat, steht deshalb AUSSCHLIESSLICH im Kopf des
// Artefakts (`kodierer.rolle`, `kodierer.modell`) und in keinem Feldnamen und
// in keinem Wert eines Eintrags.
//
// Zweite Trennung: Klassifikationsfelder tragen feste Wertelisten oder
// Bezeichner und sind maschinell vergleichbar; Freitext (Belege,
// Begruendungen) ist es nicht — zwei Kodierer zitieren nie wortgleich.
// WELCHE der vergleichbaren Felder den Konsens blockieren, entscheidet
// AUFTRAG-ML003-DOPPELKODIERUNG §4 und nicht diese Datei; hier steht nur, was
// ueberhaupt vergleichbar ist.
//
// Rein und deterministisch: kein Netz, keine Systemzeit, keine Ein- oder
// Ausgabe. Diese Datei kodiert nichts und vergleicht nichts.

export const KODIERSCHEMA_ID = "gemeinsam-recht.ml003.kodierung.v1";

/* ---------- Wertelisten (aus MD-001@3.1.0 und CR-03) ---------- */

export const STATUS_WERTE = ["eingeschlossen", "ausgeschlossen", "ungeklaert"] as const;
export const ABSCHLUSS_WERTE = ["abgeschlossen", "rueckweisung_offen"] as const;
export const ERLEDIGUNGSMODI = ["materiell_entschieden", "prozessual_erledigt", "rueckweisung_offen"] as const;
export const PROZESSGRUENDE = [
  "rechtsmittelbegruendung_unzureichend",
  "aktivlegitimation_fehlte",
  "klagebewilligung_fehlte_oder_ungueltig",
  "anfechtungsfrist_verwirkt",
  "instanzverwirkung",
  "nichteintreten_sonstiger_grund",
  "sonstiger_prozessgrund",
] as const;
/** Endwirkungsmodell (CR-03): "teilweise" ist hier nicht definiert. */
export const MESSAUSGANG_WERTE = ["durchgesetzt", "nicht_durchgesetzt", "nicht_anwendbar", "offen"] as const;
export const VERFAHRENSREGIME = ["bgg", "og", "ungeklaert"] as const;
export const KODIERER_ROLLEN = ["A", "B"] as const;

/**
 * Felder mit fester Werteliste oder Bezeichnercharakter — maschinell
 * vergleichbar. Die Liste sagt NICHT, welche davon konsensblockierend sind;
 * das steht in §4 des Auftrags.
 */
export const KLASSIFIKATIONSFELDER = [
  "status",
  "ausschlussgrund",
  "zaehleinheit",
  "abschluss_status",
  "erledigungsweg.modus",
  "erledigungsweg.prozessgrund",
  "erledigungsweg.stand_datum",
  "erledigungsweg.quelle",
  "messausgang.wert",
  "messausgang.quelle",
  "verfahrensrecht_nachweis.regime",
  "verfahrensrecht_nachweis.quelle",
] as const;

/**
 * Freitext. Wird auf Vorhandensein geprueft, nie auf Wortgleichheit: zwei
 * Kodierer belegen dieselbe Feststellung nie mit demselben Satz.
 */
export const FREITEXTFELDER = [
  "begruendung",
  "offene_frage",
  "erledigungsweg.beleg",
  "messausgang.beleg",
  "verfahrensrecht_nachweis.beleg",
] as const;

/* ---------- Die kanonische Zaehleinheit-Regel ---------- */

/**
 * Steht als Text im Kodierpaket, damit beide Kodierer sie WOERTLICH gleich
 * anwenden: abweichende Bezeichner waeren nach §4 ein Feldkonflikt und
 * liessen den ganzen Treffer ungeklaert.
 *
 * Die Regel ist rein mechanisch. Sie kennt den Ausgang nicht und laesst sich
 * nachtraeglich nicht so waehlen, dass ein Ergebnis passt.
 *
 * Die bei ML-002 beobachteten Bezeichner entsprachen zufaellig den
 * Aktenzeichen. Das war eine Beobachtung, keine Regel, und wird hier
 * ausdruecklich NICHT fortgeschrieben: 13 der 129 ML-003-Treffer sind
 * BGE-Publikationsauszuege, die in den Rohmetadaten ueberhaupt kein
 * Aktenzeichen tragen. Eine Aktenzeichenregel muesste dort aus dem Volltext
 * lesen — also aus dem Entscheid, den zu beurteilen erst die Aufgabe ist.
 */
export const ZAEHLEINHEIT_REGEL = [
  "Zaehleinheit ist die zugrunde liegende Streitigkeit, nicht der einzelne Entscheid.",
  "",
  "Kanonische Ableitung, rein mechanisch und ohne Kenntnis des Ausgangs:",
  "1. Ordne jeden Roh-Treffer dieses Laufs der Streitigkeit zu, zu der er gehoert.",
  "2. Die zaehleinheit ist die lexikographisch kleinste quelle_id ALLER Roh-Treffer",
  "   dieses Laufs, die du derselben Streitigkeit zuordnest — unveraendert und",
  "   ohne Zusatz uebernommen, genau so, wie sie im Paket steht.",
  "3. Gehoert zu einer Streitigkeit nur ein einziger Roh-Treffer, ist die zaehleinheit",
  "   dessen eigene quelle_id.",
  "4. Nur Roh-Treffer dieses Laufs bestimmen den Bezeichner. Ein nach CR-03 E2",
  "   zulaessiger Folgeentscheid ausserhalb der Rohpopulation darf den Endzustand",
  "   belegen, aendert den Bezeichner aber nicht.",
  "5. Der Bezeichner wird nie aus dem Ausgang abgeleitet und spaeter nie von Hand",
  "   umbenannt.",
  "6. Laesst sich die Zuordnung nicht sicher treffen, wird keine erfunden: der",
  "   Treffer bleibt ungeklaert (CR-03 Auflage E2 Ziff. 6).",
  "",
  "Lexikographisch heisst: Vergleich der Zeichenketten Zeichen fuer Zeichen,",
  "nicht nach Datum, Aktenzeichen oder Fallnummer.",
].join("\n");

/* ---------- Das Artefakt ---------- */

export interface Erledigungsweg {
  modus: string;
  /** Schluessel IMMER vorhanden; ausserhalb von "prozessual_erledigt" `null`. */
  prozessgrund: string | null;
  beleg: string;
  stand_datum: string;
  quelle: string;
}

export interface Messausgang {
  wert: string;
  beleg: string;
  quelle: string;
}

export interface VerfahrensrechtNachweis {
  regime: string;
  beleg: string;
  quelle: string;
}

export interface Kodiereintrag {
  quelle_id: string;
  status: string;
  begruendung: string;
  offene_frage?: string;
  ausschlussgrund?: string;
  zaehleinheit?: string;
  abschluss_status?: string;
  erledigungsweg?: Erledigungsweg;
  messausgang?: Messausgang;
  verfahrensrecht_nachweis?: VerfahrensrechtNachweis;
}

/** Wer kodiert hat — die EINZIGE Stelle, an der das steht. */
export interface Kodierer {
  rolle: string;
  modell: string;
}

export interface Kodierartefakt {
  schema: string;
  kodierer: Kodierer;
  messlauf: string;
  messdefinition: { id: string; version: string; sha256: string };
  kodierstoff_sha256: string;
  eintraege: Kodiereintrag[];
}

/** Woran eine Antwort gemessen wird — alles aus Lauf, Definition und Paket. */
export interface KodierKontext {
  messlauf: string;
  datenstand: string;
  messdefinition: { id: string; version: string; sha256: string };
  kodierstoff_sha256: string;
  quelle_ids: readonly string[];
  ausschlussgruende: readonly string[];
  /**
   * Verlangt die Rechtskraftregel der Definition je eingeschlossenem und
   * abgeschlossenem Treffer ein belegtes `regime: "bgg"`? Wahr unter
   * `bundesgericht_uebergangsrecht_art132_bgg` (MD-001@3.1.0).
   */
  verlangt_verfahrensrecht_nachweis: boolean;
}

/* ---------- Hilfen ---------- */

function alsObjekt(wert: unknown): Record<string, unknown> | null {
  if (wert === null || typeof wert !== "object" || Array.isArray(wert)) return null;
  return wert as Record<string, unknown>;
}

function text(wert: unknown): string | null {
  return typeof wert === "string" ? wert : null;
}

function gefuellt(wert: unknown): boolean {
  return typeof wert === "string" && wert.trim() !== "";
}

/**
 * Ist das ein echtes ISO-Kalenderdatum? Zweitfassung von
 * `messkorpus/tools/lauf.ts` — das Redaktionspaket darf von dort nicht
 * importieren. Gebunden durch `messkorpus/tests/konsistenz.test.ts`.
 *
 * Das Muster JJJJ-MM-TT allein genuegt nicht: "2013-02-30" passt darauf,
 * bezeichnet aber keinen Tag und wuerde in der Chronologie trotzdem
 * einsortiert.
 */
export function istKalenderdatum(iso: string): boolean {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(iso)) return false;
  const jahr = Number(iso.slice(0, 4));
  const monat = Number(iso.slice(5, 7));
  const tag = Number(iso.slice(8, 10));
  const datum = new Date(Date.UTC(jahr, monat - 1, tag));
  return datum.getUTCFullYear() === jahr && datum.getUTCMonth() + 1 === monat && datum.getUTCDate() === tag;
}

/* ---------- Die Zaehleinheit-Pruefung ---------- */

/**
 * Prueft die kanonische Regel, soweit sie aus der Antwort allein pruefbar ist.
 *
 * Sichtbar ist die Gruppierung des Kodierers nur ueber den gemeinsamen
 * Bezeichner: alle Eintraege mit derselben `zaehleinheit` gehoeren fuer ihn zur
 * selben Streitigkeit. Daraus folgen zwei notwendige Bedingungen:
 *
 *   1. Der Bezeichner ist eine `quelle_id` DIESES Laufs. Damit ist mechanisch
 *      ausgeschlossen, dass ein Folgeentscheid ausserhalb der Rohpopulation
 *      oder ein frei gewaehlter Name zum Bezeichner wird.
 *   2. Der Bezeichner ist lexikographisch nicht groesser als die kleinste
 *      `quelle_id` seiner Gruppe.
 *
 * Warum in (2) nicht auf Gleichheit geprueft wird: die kleinste quelle_id der
 * Streitigkeit kann selbst ausgeschlossen oder ungeklaert sein und traegt dann
 * gar keine `zaehleinheit`. Die Regel bezieht sich auf ALLE Roh-Treffer der
 * Streitigkeit, nicht nur auf die eingeschlossenen — ein Gleichheitstest
 * wuerde genau diesen zulaessigen Fall verwerfen.
 *
 * Die Pruefung ist damit notwendig, nicht hinreichend: sie faengt jeden
 * Bezeichner ab, der die Regel verletzt, kann aber nicht beweisen, dass die
 * Zuordnung zur Streitigkeit fachlich richtig war. Das bleibt Sache des
 * A/B-Abgleichs und der beiden Kodierer.
 */
export function pruefeZaehleinheiten(
  eintraege: readonly Kodiereintrag[],
  quelleIds: readonly string[],
): string[] {
  const fehler: string[] = [];
  const bekannt = new Set(quelleIds);
  const gruppen = new Map<string, string[]>();

  for (const eintrag of eintraege) {
    const einheit = eintrag.zaehleinheit;
    if (einheit === undefined) continue;
    if (!bekannt.has(einheit)) {
      fehler.push(
        `${eintrag.quelle_id}: zaehleinheit "${einheit}" ist keine quelle_id dieses Laufs. ` +
          `Nur Roh-Treffer dieses Laufs bestimmen den Bezeichner — ein Folgeentscheid ausserhalb der ` +
          `Rohpopulation belegt den Endzustand, benennt die Streitigkeit aber nicht.`,
      );
      continue;
    }
    const gruppe = gruppen.get(einheit);
    if (gruppe) gruppe.push(eintrag.quelle_id);
    else gruppen.set(einheit, [eintrag.quelle_id]);
  }

  for (const [einheit, mitglieder] of gruppen) {
    let kleinste = mitglieder[0] as string;
    for (const id of mitglieder) if (id < kleinste) kleinste = id;
    if (einheit > kleinste) {
      fehler.push(
        `zaehleinheit "${einheit}" ist groesser als die kleinste ihr zugeordnete quelle_id "${kleinste}" ` +
          `(zugeordnet: ${mitglieder.join(", ")}). Kanonisch ist die lexikographisch kleinste quelle_id ` +
          `aller Roh-Treffer derselben Streitigkeit.`,
      );
    }
  }

  return fehler;
}

/* ---------- Die Pruefung eines Artefakts ---------- */

function pruefeErledigungsweg(weg: Record<string, unknown>, wo: string, datenstand: string): string[] {
  const fehler: string[] = [];
  const modus = text(weg.modus);

  if (modus === null || !(ERLEDIGUNGSMODI as readonly string[]).includes(modus)) {
    fehler.push(`${wo}: erledigungsweg.modus "${String(weg.modus)}" ist keiner von ${ERLEDIGUNGSMODI.join(", ")}.`);
  }

  /* Der Schluessel ist immer da: ein fehlendes Feld und ein ausdrueckliches
     null sind verschiedene Aussagen — "nicht beantwortet" und "es gibt
     keinen Prozessgrund". */
  if (!("prozessgrund" in weg)) {
    fehler.push(
      `${wo}: erledigungsweg.prozessgrund fehlt. Der Schluessel gehoert immer dazu; ` +
        `ausserhalb von "prozessual_erledigt" ausdruecklich null.`,
    );
  } else {
    const grund = weg.prozessgrund;
    if (modus === "prozessual_erledigt") {
      if (typeof grund !== "string" || !(PROZESSGRUENDE as readonly string[]).includes(grund)) {
        fehler.push(
          `${wo}: erledigungsweg.modus "prozessual_erledigt" verlangt einen prozessgrund aus ` +
            `${PROZESSGRUENDE.join(", ")}, angegeben ist "${String(grund)}". Welcher prozessuale Grund die ` +
            `Sache erledigt hat, ist die eigentliche Aussage.`,
        );
      }
    } else if (grund !== null) {
      fehler.push(
        `${wo}: erledigungsweg.modus "${String(modus)}" traegt den prozessgrund "${String(grund)}". ` +
          `Ein Prozessgrund gehoert ausschliesslich zu "prozessual_erledigt".`,
      );
    }
  }

  if (!gefuellt(weg.beleg)) {
    fehler.push(`${wo}: erledigungsweg.beleg fehlt oder ist leer. Der Modus ist eine Behauptung ueber den Primaertext.`);
  }
  if (!gefuellt(weg.quelle)) {
    fehler.push(
      `${wo}: erledigungsweg.quelle fehlt oder ist leer. Nachvollziehbar sein muss, aus welchem Entscheid ` +
        `der kodierte Stand stammt.`,
    );
  }

  const stand = text(weg.stand_datum);
  if (stand === null) {
    fehler.push(`${wo}: erledigungsweg.stand_datum fehlt. Welcher Entscheid den kodierten Stand traegt, muss feststehen.`);
  } else if (!istKalenderdatum(stand)) {
    fehler.push(`${wo}: erledigungsweg.stand_datum "${stand}" ist kein gueltiges Kalenderdatum (JJJJ-MM-TT).`);
  } else if (stand > datenstand) {
    fehler.push(
      `${wo}: erledigungsweg.stand_datum ${stand} liegt nach dem Datenstand des Laufs (${datenstand}). ` +
        `Ein Entscheid, den es am Datenstand noch nicht gab, darf diesen Lauf nicht bestimmen.`,
    );
  }

  return fehler;
}

function pruefeMessausgang(ausgang: Record<string, unknown>, wo: string): string[] {
  const fehler: string[] = [];
  const wert = text(ausgang.wert);
  if (wert === null || !(MESSAUSGANG_WERTE as readonly string[]).includes(wert)) {
    fehler.push(
      `${wo}: messausgang.wert "${String(ausgang.wert)}" ist keiner von ${MESSAUSGANG_WERTE.join(", ")}. ` +
        `Im Endwirkungsmodell ist "teilweise" nicht definiert.`,
    );
  }
  if (!gefuellt(ausgang.beleg)) fehler.push(`${wo}: messausgang.beleg fehlt oder ist leer.`);
  if (!gefuellt(ausgang.quelle)) fehler.push(`${wo}: messausgang.quelle fehlt oder ist leer.`);
  return fehler;
}

function pruefeNachweis(nachweis: Record<string, unknown>, wo: string): string[] {
  const fehler: string[] = [];
  const regime = text(nachweis.regime);
  if (regime === null || !(VERFAHRENSREGIME as readonly string[]).includes(regime)) {
    fehler.push(
      `${wo}: verfahrensrecht_nachweis.regime "${String(nachweis.regime)}" ist keiner von ${VERFAHRENSREGIME.join(", ")}.`,
    );
  }
  if (!gefuellt(nachweis.beleg)) {
    fehler.push(
      `${wo}: verfahrensrecht_nachweis.beleg fehlt oder ist leer. Welches Verfahrensrecht galt, muss nachlesbar ` +
        `sein — sonst ist es eine Behauptung.`,
    );
  }
  if (!gefuellt(nachweis.quelle)) fehler.push(`${wo}: verfahrensrecht_nachweis.quelle fehlt oder ist leer.`);
  return fehler;
}

/** Die Felder, die nur ein eingeschlossener Treffer traegt. */
const EINSCHLUSSFELDER = [
  "zaehleinheit",
  "abschluss_status",
  "erledigungsweg",
  "messausgang",
  "verfahrensrecht_nachweis",
] as const;

function pruefeEintrag(roh: unknown, kontext: KodierKontext, stelle: string): { fehler: string[]; eintrag: Kodiereintrag | null } {
  const objekt = alsObjekt(roh);
  if (!objekt) return { fehler: [`${stelle}: kein Objekt.`], eintrag: null };

  const id = text(objekt.quelle_id);
  if (id === null || id === "") return { fehler: [`${stelle}: ohne quelle_id.`], eintrag: null };

  const wo = `Eintrag ${id}`;
  const fehler: string[] = [];
  const status = text(objekt.status);

  if (status === null || !(STATUS_WERTE as readonly string[]).includes(status)) {
    fehler.push(`${wo}: status "${String(objekt.status)}" ist keiner von ${STATUS_WERTE.join(", ")}.`);
    return { fehler, eintrag: null };
  }

  if (!gefuellt(objekt.begruendung)) {
    fehler.push(`${wo}: begruendung fehlt oder ist leer. Jede Zuordnung traegt ihren Grund.`);
  }

  /* ausgeschlossen: genau ein deklarierter Code, sonst nichts. */
  if (status === "ausgeschlossen") {
    const grund = text(objekt.ausschlussgrund);
    if (grund === null || !kontext.ausschlussgruende.includes(grund)) {
      fehler.push(
        `${wo}: ausschlussgrund "${String(objekt.ausschlussgrund)}" ist keiner der deklarierten Codes ` +
          `(${kontext.ausschlussgruende.join(", ")}).`,
      );
    }
  } else if (objekt.ausschlussgrund !== undefined) {
    fehler.push(`${wo}: ausschlussgrund bei status "${status}". Ein Ausschlussgrund gehoert nur zu "ausgeschlossen".`);
  }

  /* ungeklaert: die offene Frage benennen — und sonst nichts behaupten. */
  if (status === "ungeklaert" && !gefuellt(objekt.offene_frage)) {
    fehler.push(
      `${wo}: offene_frage fehlt oder ist leer. "ungeklaert" ist eine Feststellung ueber das, was offen ` +
        `geblieben ist, und benennt es.`,
    );
  }
  if (status !== "ungeklaert" && objekt.offene_frage !== undefined) {
    fehler.push(`${wo}: offene_frage bei status "${status}". Sie gehoert nur zu "ungeklaert".`);
  }

  /* Kein Feld des Einschlusses ausserhalb des Einschlusses. Bei "ungeklaert"
     wird ausdruecklich nichts erfunden (CR-03 Auflage E2 Ziff. 6), und ein
     Feld, das keine Regel liest, wuerde im spaeteren Abgleich nur Gewicht
     vortaeuschen. */
  if (status !== "eingeschlossen") {
    for (const feld of EINSCHLUSSFELDER) {
      if (objekt[feld] !== undefined) {
        fehler.push(
          `${wo}: ${feld} bei status "${status}". Diese Felder gehoeren ausschliesslich zu "eingeschlossen".`,
        );
      }
    }
    return { fehler, eintrag: fehler.length === 0 ? (objekt as unknown as Kodiereintrag) : null };
  }

  /* eingeschlossen: alle Pflichtfelder, und sie muessen zueinander passen. */
  if (!gefuellt(objekt.zaehleinheit)) {
    fehler.push(`${wo}: zaehleinheit fehlt oder ist leer.`);
  }

  const abschluss = text(objekt.abschluss_status);
  if (abschluss === null || !(ABSCHLUSS_WERTE as readonly string[]).includes(abschluss)) {
    fehler.push(`${wo}: abschluss_status "${String(objekt.abschluss_status)}" ist keiner von ${ABSCHLUSS_WERTE.join(", ")}.`);
  }

  const weg = alsObjekt(objekt.erledigungsweg);
  if (!weg) fehler.push(`${wo}: erledigungsweg fehlt. Zu jedem gezaehlten Fall gehoert, auf welchem Weg er endete.`);
  else fehler.push(...pruefeErledigungsweg(weg, wo, kontext.datenstand));

  const ausgang = alsObjekt(objekt.messausgang);
  if (!ausgang) {
    fehler.push(
      `${wo}: messausgang fehlt. Steht die endgueltige Rechtswirkung noch aus, ist sie als "offen" zu benennen, ` +
        `nicht wegzulassen.`,
    );
  } else fehler.push(...pruefeMessausgang(ausgang, wo));

  /* Die Kopplungen aus pruefeEndwirkung: Erledigungsweg, Abschlussstatus und
     Messausgang beschreiben denselben Sachverhalt aus drei Richtungen. */
  const modus = weg ? text(weg.modus) : null;
  const wert = ausgang ? text(ausgang.wert) : null;

  if (modus === "rueckweisung_offen") {
    if (abschluss !== "rueckweisung_offen") {
      fehler.push(
        `${wo}: erledigungsweg.modus "rueckweisung_offen", abschluss_status aber "${String(abschluss)}". ` +
          `Eine Rueckweisung laesst die gemessene Rechtsfrage offen.`,
      );
    }
    if (wert !== null && wert !== "offen") {
      fehler.push(
        `${wo}: erledigungsweg.modus "rueckweisung_offen", messausgang.wert aber "${wert}". ` +
          `Nach einer Rueckweisung ist die endgueltige Rechtswirkung noch nicht bestimmbar.`,
      );
    }
  } else if (modus !== null) {
    if (wert === "offen") {
      fehler.push(
        `${wo}: messausgang.wert "offen", erledigungsweg.modus aber "${modus}". Ein offener Messausgang heisst, ` +
          `dass die endgueltige Rechtswirkung aussteht — das ist keine Erledigung.`,
      );
    }
    if (abschluss !== null && abschluss !== "abgeschlossen") {
      fehler.push(
        `${wo}: erledigungsweg.modus "${modus}", abschluss_status aber "${abschluss}". ` +
          `Eine Erledigung schliesst die gemessene Rechtsfrage ab — sonst ist sie keine.`,
      );
    }
  }

  if (abschluss === "abgeschlossen" && wert === "offen") {
    fehler.push(
      `${wo}: abgeschlossen und zugleich messausgang.wert "offen". Entweder steht die endgueltige Rechtswirkung ` +
        `fest, dann ist sie zu benennen, oder sie steht aus, dann ist der Fall nicht abgeschlossen.`,
    );
  }

  /* Der Nachweis des Verfahrensrechts — der Angelpunkt dieses historischen
     Laufs. Nur belegtes "bgg" oeffnet die Wirkung nach Art. 61 BGG. */
  const nachweis = alsObjekt(objekt.verfahrensrecht_nachweis);
  if (objekt.verfahrensrecht_nachweis !== undefined && !nachweis) {
    fehler.push(`${wo}: verfahrensrecht_nachweis ist kein Objekt.`);
  } else if (nachweis) {
    fehler.push(...pruefeNachweis(nachweis, wo));
  }

  if (kontext.verlangt_verfahrensrecht_nachweis && abschluss === "abgeschlossen") {
    if (!nachweis) {
      fehler.push(
        `${wo}: eingeschlossen und abgeschlossen, aber ohne verfahrensrecht_nachweis. ` +
          `${kontext.messdefinition.id} v${kontext.messdefinition.version} wertet nach dem Uebergangsrecht aus ` +
          `(Art. 132 BGG): dort sagt die Gerichtssignatur allein nicht, welches Verfahrensrecht galt. ` +
          `Ohne belegten Nachweis bleibt der Treffer "ungeklaert".`,
      );
    } else if (text(nachweis.regime) !== "bgg") {
      fehler.push(
        `${wo}: eingeschlossen und abgeschlossen, aber verfahrensrecht_nachweis.regime ist ` +
          `"${String(nachweis.regime)}" statt "bgg". Nur fuer ein Verfahren, das dem BGG untersteht, steht die ` +
          `Rechtskraftwirkung nach Art. 61 BGG zur Verfuegung; "og" und "ungeklaert" fuehren hier zu "ungeklaert".`,
      );
    }
  }

  return { fehler, eintrag: fehler.length === 0 ? (objekt as unknown as Kodiereintrag) : null };
}

/**
 * Prueft ein Kodierartefakt fuer sich allein gegen die Definition — Kopf,
 * Deckung, jeden Eintrag und die Zaehleinheit-Regel. Ein leeres Ergebnis
 * heisst: die Antwort ist ueberhaupt vergleichbar. Verglichen wird hier
 * nichts; das ist Sache des A/B-Abgleichs.
 *
 * Beide Kodierer werden mit DERSELBEN Funktion und DEMSELBEN Kontext
 * geprueft. Wer geantwortet hat, aendert an der Pruefung nichts.
 */
export function pruefeKodierartefakt(artefakt: unknown, kontext: KodierKontext): string[] {
  const objekt = alsObjekt(artefakt);
  if (!objekt) return ["Das Kodierartefakt ist kein Objekt."];

  const fehler: string[] = [];

  if (objekt.schema !== KODIERSCHEMA_ID) {
    fehler.push(`schema ist "${String(objekt.schema)}", erwartet "${KODIERSCHEMA_ID}".`);
  }
  if (objekt.messlauf !== kontext.messlauf) {
    fehler.push(`messlauf ist "${String(objekt.messlauf)}", erwartet "${kontext.messlauf}".`);
  }
  if (objekt.kodierstoff_sha256 !== kontext.kodierstoff_sha256) {
    fehler.push(
      `kodierstoff_sha256 ist "${String(objekt.kodierstoff_sha256)}", das ausgelieferte Paket hat ` +
        `"${kontext.kodierstoff_sha256}". Es wurde gegen anderen Stoff kodiert.`,
    );
  }

  const md = alsObjekt(objekt.messdefinition);
  if (
    !md ||
    md.id !== kontext.messdefinition.id ||
    md.version !== kontext.messdefinition.version ||
    md.sha256 !== kontext.messdefinition.sha256
  ) {
    fehler.push(
      `messdefinition nennt nicht ${kontext.messdefinition.id}@${kontext.messdefinition.version} ` +
        `(${kontext.messdefinition.sha256}).`,
    );
  }

  /* Rolle und Modell — die einzige Stelle, an der der Kodierer vorkommt. */
  const kodierer = alsObjekt(objekt.kodierer);
  if (!kodierer) {
    fehler.push(`kodierer fehlt. Rolle und Modell gehoeren in den Kopf des Artefakts — und nur dorthin.`);
  } else {
    const rolle = text(kodierer.rolle);
    if (rolle === null || !(KODIERER_ROLLEN as readonly string[]).includes(rolle)) {
      fehler.push(`kodierer.rolle ist "${String(kodierer.rolle)}", erwartet ${KODIERER_ROLLEN.join(" oder ")}.`);
    }
    if (!gefuellt(kodierer.modell)) {
      fehler.push(`kodierer.modell fehlt oder ist leer. MANIFEST v2.1 §5 verlangt zwei verschiedene Modelle — welche, muss festgehalten sein.`);
    }
  }

  if (!Array.isArray(objekt.eintraege)) {
    fehler.push("eintraege fehlt oder ist keine Liste.");
    return fehler;
  }

  const eintraege: Kodiereintrag[] = [];
  const gesehen = new Set<string>();
  for (const [i, roh] of (objekt.eintraege as unknown[]).entries()) {
    const ergebnis = pruefeEintrag(roh, kontext, `eintraege[${i}]`);
    fehler.push(...ergebnis.fehler);
    const id = alsObjekt(roh) ? text((alsObjekt(roh) as Record<string, unknown>).quelle_id) : null;
    if (id !== null && id !== "") {
      if (gesehen.has(id)) fehler.push(`quelle_id ${id} kommt mehrfach vor.`);
      gesehen.add(id);
    }
    if (ergebnis.eintrag) eintraege.push(ergebnis.eintrag);
  }

  /* Deckung in beide Richtungen: ein zusaetzlicher Bezeichner ist ebenso ein
     Befund wie ein fehlender — er stammt nicht aus dem Paket. */
  const erwartet = new Set(kontext.quelle_ids);
  const fehlend = kontext.quelle_ids.filter((id) => !gesehen.has(id));
  const unerwartet = [...gesehen].filter((id) => !erwartet.has(id));
  if (fehlend.length > 0) {
    fehler.push(`${fehlend.length} Bezeichner des Pakets fehlen in der Antwort: ${fehlend.slice(0, 5).join(", ")}${fehlend.length > 5 ? " …" : ""}.`);
  }
  if (unerwartet.length > 0) {
    fehler.push(`${unerwartet.length} Bezeichner stehen in der Antwort, aber nicht im Paket: ${unerwartet.slice(0, 5).join(", ")}${unerwartet.length > 5 ? " …" : ""}.`);
  }

  fehler.push(...pruefeZaehleinheiten(eintraege, kontext.quelle_ids));

  return fehler;
}

/* ---------- Die Beschreibung, die ins Kodierpaket geht ---------- */

/**
 * Das Antwortschema als Text fuer die Kodierer — aus denselben Konstanten
 * gebaut wie die Pruefung. Waeren es zwei Quellen, koennte das Verlangte vom
 * Gepruef­ten abweichen, und der Kodierer traege die Folge.
 */
export function antwortschema(): object {
  return {
    schema: KODIERSCHEMA_ID,
    hinweis:
      "Beide Kodierer antworten in GENAU diesem Schema, mit denselben Feldnamen. Rolle und Modell stehen " +
      "ausschliesslich im Kopf unter kodierer; in keinem Eintrag und in keinem Feldnamen. Ein Eintrag je " +
      "quelle_id des Pakets, keiner mehr und keiner weniger.",
    kopf: {
      schema: KODIERSCHEMA_ID,
      kodierer: { rolle: `${KODIERER_ROLLEN.join(" | ")}`, modell: "<Modellbezeichnung>" },
      messlauf: "<Messlauf-ID aus dem Paket>",
      messdefinition: "<Block messdefinition aus dem Paket, unveraendert>",
      kodierstoff_sha256: "<sha256 des ausgelieferten Kodierpakets>",
      eintraege: ["<je ein Eintrag nach dem folgenden Muster>"],
    },
    eintrag: {
      quelle_id: "<Bezeichner aus dem Paket>",
      status: STATUS_WERTE.join(" | "),
      begruendung: "<kurz, sachlich; immer>",
      offene_frage: "<nur bei ungeklaert: was offen geblieben ist>",
      ausschlussgrund: "<nur bei ausgeschlossen: einer der deklarierten Codes>",
      zaehleinheit: "<nur bei eingeschlossen: nach der kanonischen Regel>",
      abschluss_status: `<nur bei eingeschlossen: ${ABSCHLUSS_WERTE.join(" | ")}>`,
      erledigungsweg: {
        modus: ERLEDIGUNGSMODI.join(" | "),
        prozessgrund: `<Schluessel immer vorhanden; bei prozessual_erledigt einer von ${PROZESSGRUENDE.join(", ")}, sonst ausdruecklich null>`,
        beleg: "<konkrete Textstelle>",
        stand_datum: "<JJJJ-MM-TT, nie nach dem Datenstand des Laufs>",
        quelle: "<Primaerquelle: der Treffer selbst oder ein nach CR-03 E2 verknuepfter Folgeentscheid>",
      },
      messausgang: {
        wert: MESSAUSGANG_WERTE.join(" | "),
        beleg: "<konkrete Textstelle>",
        quelle: "<Primaerquelle>",
      },
      verfahrensrecht_nachweis: {
        regime: VERFAHRENSREGIME.join(" | "),
        beleg: "<konkrete Textstelle zum anwendbaren Verfahrensrecht>",
        quelle: "<Primaerquelle>",
      },
    },
    felder: {
      klassifikation: KLASSIFIKATIONSFELDER,
      freitext: FREITEXTFELDER,
      hinweis:
        "Klassifikationsfelder tragen feste Wertelisten oder Bezeichner und werden maschinell verglichen. " +
        "Freitext wird auf Vorhandensein geprueft, nie auf Wortgleichheit.",
    },
    pflichten: [
      "status ist immer gesetzt, begruendung immer gefuellt.",
      "Bei ausgeschlossen: genau ein deklarierter ausschlussgrund, sonst keines der Einschlussfelder.",
      "Bei ungeklaert: offene_frage gefuellt, sonst keines der Einschlussfelder — es wird nichts erfunden (CR-03 Auflage E2 Ziff. 6).",
      "Bei eingeschlossen: zaehleinheit, abschluss_status, erledigungsweg und messausgang vollstaendig.",
      "erledigungsweg.prozessgrund ist genau dann gesetzt, wenn modus = prozessual_erledigt; sonst null.",
      "rueckweisung_offen <=> abschluss_status rueckweisung_offen <=> messausgang.wert offen.",
      "materiell_entschieden oder prozessual_erledigt => abschluss_status abgeschlossen und messausgang.wert nicht offen.",
      "eingeschlossen UND abgeschlossen => verfahrensrecht_nachweis mit belegtem regime bgg; og und ungeklaert tragen keinen Einschluss.",
      "erledigungsweg.stand_datum ist ein echtes Kalenderdatum und nie nach dem Datenstand des Laufs.",
    ],
  };
}

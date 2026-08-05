/**
 * Deterministisches Ampel-Mapping (AUFTRAG-S2 §1 A).
 *
 * Abschliessende Zuordnung gemaess Auftragstabelle, in dieser Reihenfolge:
 *   1. status=LUECKE                                  -> keine Ampel, Liste der fehlenden Punkte
 *   2. OK und frist_abgelaufen                        -> ROT
 *   3. OK und nichtig_* / sperrfrist_271a_moeglich /
 *      rachekuendigung_indiz                          -> GRUEN
 *   4. OK sonst (inkl. befristetes_verhaeltnis_
 *      sonderfall -> Zusatzhinweis, keine Fristaussage
 *      im Text)                                       -> GELB
 *
 * Alle Texte sind unverbindlich formuliert ("deutet darauf hin", "kann");
 * zitierte Artikel stammen ausschliesslich aus dem Quellenregister
 * (quellen.ts). Alle Textbausteine tragen pruefstand
 * "fachlich_zu_verifizieren", bis ein Mensch sie fachlich geprueft hat.
 * Kein LLM, kein Netzwerk, keine Systemzeit.
 */
import { QUELLEN, QUELLENSTAND } from "./quellen.js";
import { FLAG_QUELLE, REGELVERSION } from "./regeln.js";
import type {
  Ergebnis,
  FlagId,
  IsoDate,
  Pruefstand,
  Quelle,
  QuelleId,
} from "./types.js";

export type Ampel = "GRUEN" | "GELB" | "ROT";

export interface EinschaetzungOption {
  id: "BRIEF_M2" | "BRIEF_M1" | "BERATUNGSSTELLE";
  /** Fixe Optionsformulierung gemaess Auftrag (Platzhalter gefuellt, sofern zulaessig). */
  text: string;
  /** Zugehoerige Briefvorlage, falls vorhanden. */
  brief: "M1" | "M2" | null;
}

export interface FlagBegruendung {
  flag: FlagId;
  text: string;
  /** Artikel-Zitat aus dem Quellenregister (nie frei formuliert). */
  artikel: string;
  quelle_id: QuelleId;
}

interface EinschaetzungBasis {
  regelversion: string;
  quellenstand: IsoDate;
  /** Alle Textbausteine sind bis zur menschlichen Pruefung fachlich zu verifizieren. */
  pruefstand: Pruefstand;
}

export interface EinschaetzungLuecke extends EinschaetzungBasis {
  status: "LUECKE";
  ampel: null;
  textbaustein: string;
  /** Fehlende bzw. widerspruechliche Punkte (aus dem Ergebnis uebernommen). */
  fehlende_punkte: string[];
  zusatzhinweise: string[];
  begruendungen: [];
  artikel: [];
  optionen: [];
  frist_datum: null;
}

export interface EinschaetzungOk extends EinschaetzungBasis {
  status: "OK";
  ampel: Ampel;
  textbaustein: string;
  zusatzhinweise: string[];
  /** Je gesetztem Flag ein Begruendungssatz mit Artikel aus dem Quellenregister. */
  begruendungen: FlagBegruendung[];
  /** Alle herangezogenen Quellen (vollstaendige Registereintraege). */
  artikel: Quelle[];
  optionen: EinschaetzungOption[];
  /**
   * Deterministisch berechnetes Fristdatum fuer die Textausgabe.
   * null beim Sonderfall befristetes Mietverhaeltnis: dort enthaelt der
   * Text keine Fristaussage (Auftragstabelle), die berechnete Frist ist
   * gemaess S1-Trace keine Anfechtungsfrist-Aussage.
   */
  frist_datum: IsoDate | null;
  frist_abgelaufen: boolean;
}

export type Einschaetzung = EinschaetzungLuecke | EinschaetzungOk;

const NICHTIG_FLAGS: readonly FlagId[] = [
  "nichtig_formular_fehlt",
  "nichtig_unterschrift_fehlt",
  "nichtig_familienwohnung_zustellung",
];

const GRUEN_FLAGS: readonly FlagId[] = [
  ...NICHTIG_FLAGS,
  "sperrfrist_271a_moeglich",
  "rachekuendigung_indiz",
];

/** Unverbindlicher Begruendungssatz je Flag; Artikel wird aus dem Register eingesetzt. */
const FLAG_TEXT: Partial<Record<FlagId, (artikel: string) => string>> = {
  nichtig_formular_fehlt: (a) =>
    `Die Kuendigung wurde nach Ihren Angaben nicht auf dem amtlichen Formular ausgesprochen; das deutet darauf hin, dass sie nichtig sein kann (${a}).`,
  nichtig_unterschrift_fehlt: (a) =>
    `Die Kuendigung ist nach Ihren Angaben nicht unterschrieben; das deutet darauf hin, dass sie nichtig sein kann (${a}).`,
  nichtig_familienwohnung_zustellung: (a) =>
    `Bei einer Familienwohnung muss die Kuendigung beiden Partnern separat zugestellt werden; nach Ihren Angaben ist das nicht geschehen, was darauf hindeuten kann, dass die Kuendigung nichtig ist (${a}).`,
  sperrfrist_271a_moeglich: (a) =>
    `Wegen eines Verfahrens aus dem Mietverhaeltnis kann eine Sperrfrist bestehen; die Kuendigung kann in diesem Fall anfechtbar sein (${a}).`,
  rachekuendigung_indiz: (a) =>
    `Sie haben kurz vor der Kuendigung Rechte aus dem Mietverhaeltnis geltend gemacht; das kann ein Hinweis auf eine anfechtbare Rachekuendigung sein (${a}).`,
};

const ZUSATZ_BEFRISTET =
  "Sonderfall befristetes Mietverhaeltnis: Ob und wie die Anfechtungsfrist hier gilt, ist fachlich zu klaeren; diese Einschaetzung enthaelt deshalb keine Fristaussage.";

const HINWEIS_UNVERBINDLICH =
  "Diese Einschaetzung ist unverbindlich und ersetzt keine Rechtsberatung.";

function artikelVon(quelleId: QuelleId): string {
  return QUELLEN[quelleId].artikel;
}

function begruendungenAus(flags: readonly FlagId[]): FlagBegruendung[] {
  const liste: FlagBegruendung[] = [];
  for (const flag of flags) {
    const vorlage = FLAG_TEXT[flag];
    if (!vorlage) continue;
    const quelleId = FLAG_QUELLE[flag];
    liste.push({
      flag,
      text: vorlage(artikelVon(quelleId)),
      artikel: artikelVon(quelleId),
      quelle_id: quelleId,
    });
  }
  return liste;
}

function quellenListe(ids: readonly QuelleId[]): Quelle[] {
  return ids.map((id) => QUELLEN[id]);
}

/** Fixe Optionsformulierungen gemaess Auftrag §1 A. */
const OPTION_M2: EinschaetzungOption = {
  id: "BRIEF_M2",
  text: "Nichtigkeit gegenueber Vermieter geltend machen (Brief M2)",
  brief: "M2",
};
const OPTION_M1_GRUEN: EinschaetzungOption = {
  id: "BRIEF_M1",
  text: "Anfechtung einreichen (Brief M1)",
  brief: "M1",
};
const OPTION_ROT: EinschaetzungOption = {
  id: "BERATUNGSSTELLE",
  text: "Frist verpasst – weitere Moeglichkeiten mit Beratungsstelle klaeren; keine neuen Rechtsbehauptungen",
  brief: null,
};

function optionM1Gelb(fristDatum: IsoDate | null): EinschaetzungOption {
  // Fixe Formulierung "Anfechtung bei der Schlichtungsbehoerde bis
  // {{frist_datum}} (Brief M1)"; beim Sonderfall befristet bleibt die
  // Fristangabe offen (keine Fristaussage, Auftragstabelle).
  const datum = fristDatum ?? "((Fristdatum fachlich zu klaeren))";
  return {
    id: "BRIEF_M1",
    text: `Anfechtung bei der Schlichtungsbehoerde bis ${datum} (Brief M1)`,
    brief: "M1",
  };
}

/**
 * Erstellt aus einem Ergebnis von bewerteFall die deterministische
 * Ampel-Einschaetzung. Es werden keine Werte berechnet oder hergeleitet;
 * saemtliche Fristen und Flags stammen aus dem deterministischen Kern (S1).
 */
export function erstelleEinschaetzung(ergebnis: Ergebnis): Einschaetzung {
  const basis: EinschaetzungBasis = {
    regelversion: REGELVERSION,
    quellenstand: QUELLENSTAND,
    pruefstand: "fachlich_zu_verifizieren",
  };

  // 1. LUECKE -> keine Ampel, fehlende Punkte benennen (Invariante 3).
  if (ergebnis.status === "LUECKE") {
    return {
      ...basis,
      status: "LUECKE",
      ampel: null,
      textbaustein:
        "Es wird keine Einschaetzung ausgegeben, weil entscheidende Angaben fehlen oder widerspruechlich sind. Bitte klaeren Sie die aufgefuehrten Punkte; danach kann die Pruefung wiederholt werden. " +
        HINWEIS_UNVERBINDLICH,
      fehlende_punkte: [...ergebnis.fehlend],
      zusatzhinweise: [],
      begruendungen: [],
      artikel: [],
      optionen: [],
      frist_datum: null,
    };
  }

  const flags = ergebnis.flags;
  const befristet = flags.includes("befristetes_verhaeltnis_sonderfall");
  const fristDatum: IsoDate | null = befristet
    ? null
    : ergebnis.fristen.anfechtungsfrist_bis;
  const zusatzhinweise = befristet ? [ZUSATZ_BEFRISTET] : [];
  const artikel = quellenListe(ergebnis.quellen);

  // 2. OK und frist_abgelaufen -> ROT.
  if (ergebnis.fristen.frist_abgelaufen) {
    const fristSatz =
      fristDatum === null
        ? "Die fuer den Regelfall berechnete Frist ist nach den erfassten Angaben abgelaufen."
        : `Die berechnete Anfechtungsfrist (bis ${fristDatum}, ${artikelVon("P1")}) ist nach den erfassten Angaben abgelaufen.`;
    return {
      ...basis,
      status: "OK",
      ampel: "ROT",
      textbaustein:
        `${fristSatz} Eine Anfechtung bei der Schlichtungsbehoerde kommt damit in der Regel nicht mehr in Frage. ` +
        "Welche Moeglichkeiten es noch geben kann, klaeren Sie am besten mit einer Beratungsstelle. " +
        HINWEIS_UNVERBINDLICH,
      zusatzhinweise,
      begruendungen: begruendungenAus(flags),
      artikel,
      optionen: [OPTION_ROT],
      frist_datum: fristDatum,
      frist_abgelaufen: true,
    };
  }

  // 3. OK und Nichtigkeits-/Sperrfrist-/Rache-Flag -> GRUEN.
  const gruenFlags = flags.filter((f) => GRUEN_FLAGS.includes(f));
  if (gruenFlags.length > 0) {
    const hatNichtig = flags.some((f) => NICHTIG_FLAGS.includes(f));
    const fristSatz =
      fristDatum === null
        ? ""
        : ` Eine Anfechtung ist nach der deterministischen Berechnung bis ${fristDatum} moeglich (${artikelVon("P1")}).`;
    const optionen: EinschaetzungOption[] = hatNichtig
      ? [OPTION_M2, OPTION_M1_GRUEN]
      : [OPTION_M1_GRUEN];
    return {
      ...basis,
      status: "OK",
      ampel: "GRUEN",
      textbaustein:
        "Die erfassten Angaben deuten darauf hin, dass die Kuendigung mangelhaft sein kann. " +
        "Das kann bedeuten, dass sie nichtig ist oder sich gut anfechten laesst." +
        fristSatz +
        " " +
        HINWEIS_UNVERBINDLICH,
      zusatzhinweise,
      begruendungen: begruendungenAus(flags),
      artikel,
      optionen,
      frist_datum: fristDatum,
      frist_abgelaufen: false,
    };
  }

  // 4. OK sonst -> GELB (inkl. Sonderfall befristet: keine Fristaussage im Text).
  const fristSatz =
    fristDatum === null
      ? ""
      : ` Eine Anfechtung bei der Schlichtungsbehoerde kann bis ${fristDatum} eingereicht werden (${artikelVon("P1")}).`;
  return {
    ...basis,
    status: "OK",
    ampel: "GELB",
    textbaustein:
      "Aus den erfassten Angaben ergibt sich kein besonderer Hinweis auf Nichtigkeit oder eine Sperrfrist. " +
      "Eine Anfechtung der Kuendigung kann dennoch moeglich sein; ob sie Aussicht auf Erfolg hat, kann nur eine fachliche Pruefung klaeren." +
      fristSatz +
      " " +
      HINWEIS_UNVERBINDLICH,
    zusatzhinweise,
    begruendungen: begruendungenAus(flags),
    artikel,
    optionen: [optionM1Gelb(fristDatum)],
    frist_datum: fristDatum,
    frist_abgelaufen: false,
  };
}

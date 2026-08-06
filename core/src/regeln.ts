/**
 * Regel-Flags (AUFTRAG-S1 §4 — abschliessender Katalog), je mit quelle_id.
 * Deterministische Auswertung; keine LLM-Beteiligung.
 */
import { REGISTER_REGELVERSION } from "./register.gen.js";
import type { FlagId, IsoDate, QuelleId, Zustellart } from "./types.js";

/** Regelversion aus dem Wissens-Register (eine Quelle der Wahrheit, W0 Teil B). */
export const REGELVERSION = REGISTER_REGELVERSION;

/** Kanonische Reihenfolge des Flag-Katalogs (Auftrag §4). */
export const FLAG_REIHENFOLGE: readonly FlagId[] = [
  "nichtig_formular_fehlt",
  "nichtig_unterschrift_fehlt",
  "nichtig_familienwohnung_zustellung",
  "sperrfrist_271a_moeglich",
  "rachekuendigung_indiz",
  "frist_abgelaufen",
  "befristetes_verhaeltnis_sonderfall",
  "ausserhalb_m1_scope",
];

/** quelle_id je Flag. */
export const FLAG_QUELLE: Readonly<Record<FlagId, QuelleId>> = {
  nichtig_formular_fehlt: "P5",
  nichtig_unterschrift_fehlt: "P5",
  nichtig_familienwohnung_zustellung: "P6",
  sperrfrist_271a_moeglich: "P7",
  rachekuendigung_indiz: "P8",
  frist_abgelaufen: "P1",
  befristetes_verhaeltnis_sonderfall: "Q_BEFRISTET",
  ausserhalb_m1_scope: "Q_SCOPE",
};

/** Fuer die Regelpruefung validierte, entscheidende Angaben eines Falls. */
export interface ValidierterFall {
  kanton: "LU";
  kuendigung: {
    zustellart: Zustellart;
    amtliches_formular: boolean;
    unterschrieben: boolean;
  };
  empfang: {
    effektiv: IsoDate;
    /** true, wenn P4 (Zustellfiktion Ende Abholfrist) angewandt wurde. */
    zustellfiktion: boolean;
  };
  wohnung: {
    familienwohnung: boolean;
    separate_zustellung_beide: boolean | null;
  };
  vertrag: {
    befristet: boolean;
  };
  sperrfrist: {
    verfahren_letzte_3_jahre: boolean;
    verfahren_haengig: boolean;
    /** Optional im Schema; fehlend = unbekannt, kein Flag. */
    rechte_geltend_gemacht: boolean | null;
  };
}

export function sortiereFlags(flags: FlagId[]): FlagId[] {
  return [...flags].sort(
    (a, b) => FLAG_REIHENFOLGE.indexOf(a) - FLAG_REIHENFOLGE.indexOf(b),
  );
}

/**
 * Prueft die Regel-Flags P5–P8 sowie den Sonderfall befristetes Verhaeltnis.
 * `frist_abgelaufen` wird nach der Fristberechnung ergaenzt (index.ts),
 * `ausserhalb_m1_scope` betrifft nur den Trace von Scope-Luecken.
 *
 * Offene fachliche Frage (dokumentiert, fachlich_zu_verifizieren):
 * `verfahren_haengig=true` wird ebenfalls als moeglicher Sperrfrist-Fall
 * nach Art. 271a OR behandelt (P7), da ein haengiges Verfahren den
 * 3-Jahres-Zeitraum einschliesst.
 */
export function pruefeRegeln(fall: ValidierterFall): FlagId[] {
  const flags: FlagId[] = [];

  if (!fall.kuendigung.amtliches_formular) {
    flags.push("nichtig_formular_fehlt"); // P5
  }
  if (!fall.kuendigung.unterschrieben) {
    flags.push("nichtig_unterschrift_fehlt"); // P5
  }
  if (
    fall.wohnung.familienwohnung &&
    fall.wohnung.separate_zustellung_beide === false
  ) {
    flags.push("nichtig_familienwohnung_zustellung"); // P6
  }
  if (
    fall.sperrfrist.verfahren_letzte_3_jahre ||
    fall.sperrfrist.verfahren_haengig
  ) {
    flags.push("sperrfrist_271a_moeglich"); // P7
  }
  if (fall.sperrfrist.rechte_geltend_gemacht === true) {
    flags.push("rachekuendigung_indiz"); // P8
  }
  if (fall.vertrag.befristet) {
    flags.push("befristetes_verhaeltnis_sonderfall"); // Q_BEFRISTET
  }

  return sortiereFlags(flags);
}

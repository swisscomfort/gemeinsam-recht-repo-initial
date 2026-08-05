/**
 * Feiertagsliste Kanton Luzern — als Daten, nicht berechnet.
 * Quelle: QUELLEN.FEIERTAGE_LU (pruefstand: fachlich_zu_verifizieren).
 *
 * Bewegliche Feiertage sind als konkrete Daten vorberechnet hinterlegt
 * (deterministisch, keine Kalenderberechnung zur Laufzeit).
 *
 * OFFENE FACHLICHE FRAGEN (bei Abnahme durch Menschen zu klaeren):
 *  - Gelten Berchtoldstag (2.1.) und Josefstag (19.3.) im Kanton LU als
 *    gesetzliche Feiertage? Hier NICHT enthalten.
 *  - Status des Leodegarstags (2.10., Stadt Luzern): hier NICHT enthalten
 *    (konsistent mit FX-001 des Auftrags: Fristende 2026-10-02 ohne Verschiebung).
 */
import type { IsoDate, QuelleId } from "./types.js";

export const FEIERTAGE_LU_QUELLE: QuelleId = "FEIERTAGE_LU";

/** Jahre, fuer die die Liste vollstaendig hinterlegt ist. */
export const FEIERTAGE_LU_JAHRE: readonly number[] = [2025, 2026, 2027];

export const FEIERTAGE_LU: Readonly<Record<IsoDate, string>> = {
  "2025-01-01": "Neujahr",
  "2025-04-18": "Karfreitag",
  "2025-04-21": "Ostermontag",
  "2025-05-29": "Auffahrt",
  "2025-06-09": "Pfingstmontag",
  "2025-06-19": "Fronleichnam",
  "2025-08-01": "Bundesfeiertag",
  "2025-08-15": "Mariae Himmelfahrt",
  "2025-11-01": "Allerheiligen",
  "2025-12-08": "Mariae Empfaengnis",
  "2025-12-25": "Weihnachten",
  "2025-12-26": "Stephanstag",

  "2026-01-01": "Neujahr",
  "2026-04-03": "Karfreitag",
  "2026-04-06": "Ostermontag",
  "2026-05-14": "Auffahrt",
  "2026-05-25": "Pfingstmontag",
  "2026-06-04": "Fronleichnam",
  "2026-08-01": "Bundesfeiertag",
  "2026-08-15": "Mariae Himmelfahrt",
  "2026-11-01": "Allerheiligen",
  "2026-12-08": "Mariae Empfaengnis",
  "2026-12-25": "Weihnachten",
  "2026-12-26": "Stephanstag",

  "2027-01-01": "Neujahr",
  "2027-03-26": "Karfreitag",
  "2027-03-29": "Ostermontag",
  "2027-05-06": "Auffahrt",
  "2027-05-17": "Pfingstmontag",
  "2027-05-27": "Fronleichnam",
  "2027-08-01": "Bundesfeiertag",
  "2027-08-15": "Mariae Himmelfahrt",
  "2027-11-01": "Allerheiligen",
  "2027-12-08": "Mariae Empfaengnis",
  "2027-12-25": "Weihnachten",
  "2027-12-26": "Stephanstag",
};

export function istFeiertagLu(datum: IsoDate): boolean {
  return Object.prototype.hasOwnProperty.call(FEIERTAGE_LU, datum);
}

export function jahrAbgedeckt(jahr: number): boolean {
  return FEIERTAGE_LU_JAHRE.includes(jahr);
}

/**
 * Quellenregister (AUFTRAG-S1 §3).
 *
 * Jeder Rechtsparameter traegt Quelle, Zeitstand und Pruefstand.
 * Bis zur fachlichen Abnahme durch einen Menschen gilt fuer alle
 * Rechtsparameter `pruefstand: "fachlich_zu_verifizieren"` (Auftrag §3).
 * Die Artikel-Angaben entsprechen woertlich der Parametertabelle des
 * Auftrags; sie sind bewusst nicht durch eigene Recherche "praezisiert".
 */
import type { IsoDate, Quelle, QuelleId } from "./types.js";

/** Zeitstand aller Quellenangaben (Datum des Plan-Freeze / Auftragserteilung). */
export const QUELLENSTAND: IsoDate = "2026-08-05";

export const QUELLEN: Record<QuelleId, Quelle> = {
  P1: {
    id: "P1",
    artikel: "Art. 273 Abs. 1 OR",
    fundstelle: "OR (SR 220)",
    zeitstand: QUELLENSTAND,
    pruefstand: "fachlich_zu_verifizieren",
  },
  P2: {
    id: "P2",
    artikel: "Fristenrecht OR",
    fundstelle: "OR (SR 220), allgemeines Fristenrecht",
    zeitstand: QUELLENSTAND,
    pruefstand: "fachlich_zu_verifizieren",
  },
  P3: {
    id: "P3",
    artikel: "Fristenrecht/ZPO",
    fundstelle: "OR (SR 220) / ZPO (SR 272)",
    zeitstand: QUELLENSTAND,
    pruefstand: "fachlich_zu_verifizieren",
  },
  P4: {
    id: "P4",
    artikel: "Zustellrecht",
    fundstelle: "Zustellrecht (Zustellfiktion Einschreiben, 7-taegige Abholfrist)",
    zeitstand: QUELLENSTAND,
    pruefstand: "fachlich_zu_verifizieren",
  },
  P5: {
    id: "P5",
    artikel: "Art. 266l / 266o OR",
    fundstelle: "OR (SR 220)",
    zeitstand: QUELLENSTAND,
    pruefstand: "fachlich_zu_verifizieren",
  },
  P6: {
    id: "P6",
    artikel: "Art. 266n / 266o OR",
    fundstelle: "OR (SR 220)",
    zeitstand: QUELLENSTAND,
    pruefstand: "fachlich_zu_verifizieren",
  },
  P7: {
    id: "P7",
    artikel: "Art. 271a OR",
    fundstelle: "OR (SR 220)",
    zeitstand: QUELLENSTAND,
    pruefstand: "fachlich_zu_verifizieren",
  },
  P8: {
    id: "P8",
    artikel: "Art. 271a OR",
    fundstelle: "OR (SR 220)",
    zeitstand: QUELLENSTAND,
    pruefstand: "fachlich_zu_verifizieren",
  },
  FEIERTAGE_LU: {
    id: "FEIERTAGE_LU",
    artikel: "Gesetzliche Feiertage Kanton Luzern",
    fundstelle: "kantonales Recht LU (Feiertagsliste, siehe feiertage_lu.ts)",
    zeitstand: QUELLENSTAND,
    pruefstand: "fachlich_zu_verifizieren",
  },
  // Der Flag-Katalog des Auftrags (§4) enthaelt `befristetes_verhaeltnis_sonderfall`,
  // die Parametertabelle (§3) nennt dafuer aber keine Quelle. Offene fachliche
  // Frage — bis zur Klaerung ohne Artikelangabe gefuehrt (nichts erfinden).
  Q_BEFRISTET: {
    id: "Q_BEFRISTET",
    artikel: "offen — Sonderrechtslage befristetes Mietverhaeltnis, fachlich zu klaeren",
    fundstelle: "AUFTRAG-S1 §4 (Flag-Katalog); keine Quellenangabe im Auftrag",
    zeitstand: QUELLENSTAND,
    pruefstand: "fachlich_zu_verifizieren",
  },
  // Scope-Grenze ist eine Projektentscheidung, kein Rechtsparameter.
  Q_SCOPE: {
    id: "Q_SCOPE",
    artikel: "M1-Scope: nur Kanton Luzern produktiv",
    fundstelle: "DER_PLAN_v1.0_FROZEN.md §3; ADR-0002",
    zeitstand: QUELLENSTAND,
    pruefstand: "technisch_validiert",
  },
};

/** Alle Quellen mit pruefstand=fachlich_zu_verifizieren (offene Punkte fuer die menschliche Pruefung). */
export function offeneRechtsparameter(): Quelle[] {
  return Object.values(QUELLEN).filter(
    (q) => q.pruefstand === "fachlich_zu_verifizieren",
  );
}

/**
 * Quellenregister (AUFTRAG-S1 §3, seit AUFTRAG-W0 aus dem Wissens-Register).
 *
 * Jeder Rechtsparameter traegt Quelle, Zeitstand und Pruefstand.
 * Quelle der Wahrheit ist das Wissens-Register (wissen/register/*.json);
 * dessen Inhalt liegt hier als generiertes Modul register.gen.ts vor
 * (eine Quelle der Wahrheit, kein Laufzeit-Dateizugriff — W0 Teil B).
 * Die Werte sind unveraendert die der Parametertabelle aus AUFTRAG-S1;
 * bis zur fachlichen Abnahme gilt fuer alle Rechtsparameter
 * `pruefstand: "fachlich_zu_verifizieren"`.
 */
import {
  QUELLE_ZU_REGEL,
  REGISTER,
  REGISTER_ZEITSTAND,
  type RegisterEintrag,
} from "./register.gen.js";
import type { IsoDate, Quelle, QuelleId } from "./types.js";

/** Zeitstand aller Quellenangaben (aus dem Wissens-Register). */
export const QUELLENSTAND: IsoDate = REGISTER_ZEITSTAND;

function registerEintrag(regelId: string): RegisterEintrag {
  const eintrag = REGISTER.find((e) => e.id === regelId);
  if (!eintrag) {
    throw new Error(`Wissens-Register: Eintrag ${regelId} fehlt in register.gen.ts`);
  }
  return eintrag;
}

function quelleAus(id: QuelleId): Quelle {
  const eintrag = registerEintrag(QUELLE_ZU_REGEL[id]);
  const quelle = eintrag.quellen[0];
  if (!quelle) {
    throw new Error(`Wissens-Register: Eintrag ${eintrag.id} ohne Quellen`);
  }
  return {
    id,
    artikel: quelle.artikel,
    fundstelle: quelle.fundstelle,
    zeitstand: eintrag.zeitstand,
    pruefstand: eintrag.pruefstand,
  };
}

export const QUELLEN: Record<QuelleId, Quelle> = Object.fromEntries(
  (Object.keys(QUELLE_ZU_REGEL) as QuelleId[]).map((id) => [id, quelleAus(id)]),
) as Record<QuelleId, Quelle>;

/** Alle Quellen mit pruefstand=fachlich_zu_verifizieren (offene Punkte fuer die menschliche Pruefung). */
export function offeneRechtsparameter(): Quelle[] {
  return Object.values(QUELLEN).filter(
    (q) => q.pruefstand === "fachlich_zu_verifizieren",
  );
}

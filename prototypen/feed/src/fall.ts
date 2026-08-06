// fall.ts — private Fallkarte "Mein Fall" (AUFTRAG-F1 §3).
//
// Nach abgeschlossenem Fragebaum wird hier ein kompakter Status-Auszug der
// deterministischen Einschaetzung gehalten — mehr nicht: keine Antworten,
// kein Fallobjekt, keine Freitexte. Alles bleibt ausschliesslich im Browser
// (Invariante 1); "Fall entfernen" loescht rueckstandsfrei. Keine
// automatische Story-Werdung (Phase S bleibt Vision, wird nicht gebaut).

import type { Einschaetzung } from "@core/index";
import { baueRechenweg, type RechenwegSchritt } from "./rechenweg";

export const PRIVAT_BADGE = "PRIVAT — nur auf diesem Gerät";
export const PHASE_S_HINWEIS = "Später: als anonyme Geschichte teilen (Phase S)";

export interface MeinFall {
  /** Simuliertes Ausgabedatum, an dem der Fragebaum abgeschlossen wurde. */
  erstelltAm: string;
  status: "OK" | "LUECKE";
  ampel: "GRUEN" | "GELB" | "ROT" | null;
  fristDatum: string | null;
  fristAbgelaufen: boolean;
  briefBereit: boolean;
  /** Regelversion der Einschaetzung (E3; null bei Altbestand vor W0). */
  regelversion: string | null;
  /** Verwendete Register-Regel-IDs — Grundlage des Versionsabgleichs (E2/E3). */
  regelIds: string[];
  /** Laienlesbarer Rechenweg (E3); leer bei LUECKE und Altbestand. */
  rechenweg: RechenwegSchritt[];
}

/** Status-Auszug aus einer abgeschlossenen Einschaetzung (nur Wiedergabe). */
export function fallStatusAus(einschaetzung: Einschaetzung, datumISO: string): MeinFall {
  const rechenweg = baueRechenweg(einschaetzung);
  const basis = {
    regelversion: einschaetzung.regelversion,
    regelIds: rechenweg.map((schritt) => schritt.regelId),
    rechenweg,
  };
  if (einschaetzung.status === "LUECKE") {
    return {
      erstelltAm: datumISO,
      status: "LUECKE",
      ampel: null,
      fristDatum: null,
      fristAbgelaufen: false,
      briefBereit: false,
      ...basis,
    };
  }
  return {
    erstelltAm: datumISO,
    status: "OK",
    ampel: einschaetzung.ampel,
    fristDatum: einschaetzung.frist_datum,
    fristAbgelaufen: einschaetzung.frist_abgelaufen,
    briefBereit: einschaetzung.optionen.some((o) => o.brief !== null),
    ...basis,
  };
}

/** Statuszeilen fuer die Karte (reine Wiedergabe berechneter Werte). */
export function fallStatusZeilen(fall: MeinFall): string[] {
  const zeilen: string[] = [];
  if (fall.status === "LUECKE") {
    zeilen.push("Keine Einschätzung möglich — es fehlen noch Angaben.");
    return zeilen;
  }
  if (fall.ampel === "GRUEN") zeilen.push("Ampel: Grün — Hinweis auf einen möglichen Mangel der Kündigung.");
  if (fall.ampel === "GELB") zeilen.push("Ampel: Gelb — kein besonderer Hinweis, Anfechtung kann möglich sein.");
  if (fall.ampel === "ROT") zeilen.push("Ampel: Rot — die berechnete Frist ist abgelaufen.");
  if (fall.fristDatum !== null && !fall.fristAbgelaufen) {
    zeilen.push(`Frist läuft bis ${fall.fristDatum} (berechnet, Prüfstand: fachlich zu verifizieren).`);
  }
  if (fall.briefBereit) {
    zeilen.push("Brief bereit — Vorlage im Werkzeug verfügbar.");
  }
  return zeilen;
}

export function exportiereFall(fall: MeinFall): string {
  return JSON.stringify(fall, null, 2);
}

const PFLICHT_SCHLUESSEL = [
  "erstelltAm",
  "status",
  "ampel",
  "fristDatum",
  "fristAbgelaufen",
  "briefBereit",
];

/** Neue Schluessel seit E3 — optional, damit Altbestand ladbar bleibt. */
const OPTIONALE_SCHLUESSEL = ["regelversion", "regelIds", "rechenweg"];

const SCHRITT_SCHLUESSEL = ["schritt", "regelId", "quelle", "zeitstand"].sort().join(",");

function istRechenweg(wert: unknown): wert is RechenwegSchritt[] {
  if (!Array.isArray(wert)) return false;
  return wert.every((schritt) => {
    if (typeof schritt !== "object" || schritt === null || Array.isArray(schritt)) return false;
    const s = schritt as Record<string, unknown>;
    if (Object.keys(s).sort().join(",") !== SCHRITT_SCHLUESSEL) return false;
    return ["schritt", "regelId", "quelle", "zeitstand"].every(
      (feld) => typeof s[feld] === "string",
    );
  });
}

/** Laedt einen gespeicherten Fall-Status; bei jeder Abweichung: kein Fall. */
export function ladeFall(rohJson: string | null): MeinFall | null {
  if (rohJson === null) return null;
  try {
    const geparst = JSON.parse(rohJson) as unknown;
    if (typeof geparst !== "object" || geparst === null || Array.isArray(geparst)) {
      return null;
    }
    const kandidat = geparst as Record<string, unknown>;
    const schluessel = Object.keys(kandidat);
    if (PFLICHT_SCHLUESSEL.some((s) => !schluessel.includes(s))) return null;
    if (
      schluessel.some(
        (s) => !PFLICHT_SCHLUESSEL.includes(s) && !OPTIONALE_SCHLUESSEL.includes(s),
      )
    ) {
      return null;
    }
    const status = kandidat["status"];
    const ampel = kandidat["ampel"];
    if (status !== "OK" && status !== "LUECKE") return null;
    if (ampel !== null && ampel !== "GRUEN" && ampel !== "GELB" && ampel !== "ROT") return null;
    if (typeof kandidat["erstelltAm"] !== "string") return null;
    if (kandidat["fristDatum"] !== null && typeof kandidat["fristDatum"] !== "string") return null;
    if (typeof kandidat["fristAbgelaufen"] !== "boolean") return null;
    if (typeof kandidat["briefBereit"] !== "boolean") return null;
    const regelversion = kandidat["regelversion"] ?? null;
    if (regelversion !== null && typeof regelversion !== "string") return null;
    const regelIds = kandidat["regelIds"] ?? [];
    if (!Array.isArray(regelIds) || regelIds.some((id) => typeof id !== "string")) return null;
    const rechenweg = kandidat["rechenweg"] ?? [];
    if (!istRechenweg(rechenweg)) return null;
    return {
      erstelltAm: kandidat["erstelltAm"],
      status,
      ampel: ampel as MeinFall["ampel"],
      fristDatum: kandidat["fristDatum"] as string | null,
      fristAbgelaufen: kandidat["fristAbgelaufen"],
      briefBereit: kandidat["briefBereit"],
      regelversion,
      regelIds: regelIds as string[],
      rechenweg,
    };
  } catch {
    return null;
  }
}

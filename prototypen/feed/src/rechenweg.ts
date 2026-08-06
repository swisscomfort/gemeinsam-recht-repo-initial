// rechenweg.ts — Fehler-Rueckkanal des Feed-Prototyps (AUFTRAG-W0, Ergaenzung E3).
//
// Drei reine Bausteine, alle ohne Netzwerk und ohne eigene Rechtslogik:
//  1. baueRechenweg: laienlesbare Wiedergabe des vorhandenen DTM-Trace-Inhalts
//     (Schritt, Regel-ID, Quelle, Zeitstand) — reine Wiedergabe der vom
//     deterministischen Kern herangezogenen Quellen, nichts wird berechnet.
//  2. baueFehlermeldung: erzeugt lokal eine fehlermeldung-Kandidatendatei nach
//     wissen/schema/kandidat.schema.json (E1) — ohne jegliche Falldaten;
//     Datumsangaben im Freitext werden abgewiesen. Export via Werkbank;
//     Pruefung und Uebernahme geschehen ausschliesslich durch Menschen.
//  3. regelAktualisiert: prueft lokal gegen wissen/dist/versionen.json (E2),
//     ob eine im Fall verwendete Regel inzwischen eine neue Version traegt.

import {
  P1_ANFECHTUNGSFRIST_TAGE,
  QUELLE_ZU_REGEL,
  type Einschaetzung,
  type QuelleId,
} from "@core/index";

export interface RechenwegSchritt {
  /** Laienlesbare Beschreibung des Schritts. */
  schritt: string;
  /** Regel-ID im Wissens-Register (R-<KANTON|CH>-####). */
  regelId: string;
  /** Quellenangabe (Artikel + Fundstelle) aus dem Register. */
  quelle: string;
  /** Zeitstand der Quelle. */
  zeitstand: string;
}

/** Fehlermeldung nach wissen/schema/kandidat.schema.json, Typ fehlermeldung (E1). */
export interface RegelMeldung {
  status: "fehlermeldung";
  regel_id: string;
  begruendung: string;
  regelversion: string;
}

export const REGEL_UPDATE_HINWEIS =
  "Eine Regel deines Falls wurde aktualisiert — prüfe deine Frist neu.";

export const MELDE_HINWEIS_OHNE_FALLDATEN =
  "Bitte ohne Namen, Adressen oder Datumsangaben deines Falls — die Meldung betrifft die Regel, nicht deinen Fall.";

/** Laienlesbare Schritt-Texte je herangezogener Quelle (reine Wiedergabe). */
const SCHRITT_TEXT: Readonly<Record<QuelleId, string>> = {
  P1: `Die Anfechtungsfrist von ${P1_ANFECHTUNGSFRIST_TAGE} Tagen wurde ab dem Empfang der Kündigung gezählt.`,
  P2: "Der Tag des Empfangs zählt nicht mit — die Frist beginnt am Folgetag.",
  P3: "Geprüft wurde, ob das Fristende auf ein Wochenende oder einen Feiertag fällt; dann gilt der nächste Werktag.",
  P4: "Da das Einschreiben nicht abgeholt wurde, gilt es am Ende der Abholfrist als zugestellt.",
  P5: "Geprüft wurde, ob die Kündigung auf dem amtlichen Formular erfolgte und unterschrieben ist.",
  P6: "Bei einer Familienwohnung wurde geprüft, ob beiden Partnern separat zugestellt wurde.",
  P7: "Geprüft wurde, ob wegen eines Verfahrens aus dem Mietverhältnis eine Sperrfrist bestehen kann.",
  P8: "Geprüft wurde, ob ein Hinweis auf eine Rachekündigung vorliegt.",
  FEIERTAGE_LU: "Für die Fristverschiebung wurde die Feiertagsliste des Kantons Luzern verwendet.",
  Q_BEFRISTET: "Sonderfall befristetes Mietverhältnis: Die Fristaussage ist fachlich zu klären.",
  Q_SCOPE: "Geprüft wurde nur der Kanton Luzern (Projektumfang M1).",
};

/**
 * Laienlesbarer Rechenweg aus einer abgeschlossenen Einschaetzung —
 * ein Schritt je herangezogener Quelle, in der Reihenfolge des Kerns.
 * Bei einer LUECKE gibt es keinen Rechenweg (es wurde nichts berechnet).
 */
export function baueRechenweg(einschaetzung: Einschaetzung): RechenwegSchritt[] {
  if (einschaetzung.status === "LUECKE") return [];
  return einschaetzung.artikel.map((quelle) => ({
    schritt: SCHRITT_TEXT[quelle.id] ?? quelle.artikel,
    regelId: QUELLE_ZU_REGEL[quelle.id],
    quelle: `${quelle.artikel} — ${quelle.fundstelle}`,
    zeitstand: quelle.zeitstand,
  }));
}

/* ---------- Fehlermeldung (E1) ---------- */

const REGEL_ID_MUSTER = /^R-[A-Z]{2}-\d{4}$/;
// Dieselben Muster wie in kandidat.schema.json (Datumsangaben eines
// konkreten Falls sind im Freitext verboten).
const DATUM_MUSTER = [/\d{4}-\d{2}-\d{2}/, /\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4}/];

export function enthaeltDatum(text: string): boolean {
  return DATUM_MUSTER.some((muster) => muster.test(text));
}

/**
 * Erzeugt eine Fehlermeldung nach E1-Schema. Wirft bei leerer Begruendung,
 * bei Datumsangaben im Freitext (Falldaten-Schutz) und bei ungueltiger
 * Regel-ID — es wird nie ein unglueltiger Eintrag erzeugt.
 */
export function baueFehlermeldung(
  regelId: string,
  begruendung: string,
  regelversion: string,
): RegelMeldung {
  if (!REGEL_ID_MUSTER.test(regelId)) {
    throw new Error(`Ungültige Regel-ID: "${regelId}"`);
  }
  const text = begruendung.trim();
  if (text === "") {
    throw new Error("Bitte kurz begründen, was nicht zu stimmen scheint.");
  }
  if (enthaeltDatum(text)) {
    throw new Error(
      "Bitte keine Datumsangaben deines Falls in der Meldung — sie betrifft die Regel, nicht deinen Fall.",
    );
  }
  if (regelversion.trim() === "") {
    throw new Error("Regelversion fehlt.");
  }
  return {
    status: "fehlermeldung",
    regel_id: regelId,
    begruendung: text,
    regelversion,
  };
}

/* ---------- lokaler Meldungs-Speicher (Export ueber die Werkbank) ---------- */

const MELDUNG_SCHLUESSEL = ["status", "regel_id", "begruendung", "regelversion"]
  .sort()
  .join(",");

export function exportiereMeldungen(meldungen: readonly RegelMeldung[]): string {
  return JSON.stringify(meldungen, null, 2);
}

/** Laedt gespeicherte Meldungen; bei jeder Abweichung: leere Liste. */
export function ladeMeldungen(rohJson: string | null): RegelMeldung[] {
  if (rohJson === null) return [];
  try {
    const geparst = JSON.parse(rohJson) as unknown;
    if (!Array.isArray(geparst)) return [];
    const meldungen: RegelMeldung[] = [];
    for (const eintrag of geparst) {
      if (typeof eintrag !== "object" || eintrag === null || Array.isArray(eintrag)) return [];
      const kandidat = eintrag as Record<string, unknown>;
      if (Object.keys(kandidat).sort().join(",") !== MELDUNG_SCHLUESSEL) return [];
      if (kandidat["status"] !== "fehlermeldung") return [];
      if (typeof kandidat["regel_id"] !== "string" || !REGEL_ID_MUSTER.test(kandidat["regel_id"])) {
        return [];
      }
      if (typeof kandidat["begruendung"] !== "string" || kandidat["begruendung"] === "") return [];
      if (typeof kandidat["regelversion"] !== "string" || kandidat["regelversion"] === "") return [];
      meldungen.push({
        status: "fehlermeldung",
        regel_id: kandidat["regel_id"],
        begruendung: kandidat["begruendung"],
        regelversion: kandidat["regelversion"],
      });
    }
    return meldungen;
  } catch {
    return [];
  }
}

/* ---------- Versionsabgleich (E2) ---------- */

/**
 * true, wenn eine im Fall verwendete Regel in versionen.json inzwischen eine
 * andere (korrigierte) Regelversion traegt als die lokal verwendete.
 * Unbekannte Regel-IDs loesen keinen Hinweis aus (kein Urteil ohne Basis).
 */
export function regelAktualisiert(
  fall: { regelversion: string | null; regelIds: readonly string[] },
  versionen: Readonly<Record<string, string>>,
): boolean {
  if (fall.regelversion === null) return false;
  return fall.regelIds.some((regelId) => {
    const aktuell = versionen[regelId];
    return aktuell !== undefined && aktuell !== fall.regelversion;
  });
}

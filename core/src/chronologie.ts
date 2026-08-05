/**
 * Fallchronologie (AUFTRAG-S2 §1 C).
 *
 * Fallakte mit Eintraegen {zeitpunkt, typ, beschreibung, dokument_hash?}.
 * Dokumente werden ausschliesslich lokal gehasht (SHA-256 aus trace.ts);
 * es werden nie Dateiinhalte gespeichert oder uebertragen. Zeitpunkte
 * werden injiziert (keine Systemzeit in der Fachlogik).
 *
 * Export als JSON und Markdown, jeweils mit regelversion, quellenstand
 * und fallobjekt_hash.
 */
import { QUELLENSTAND } from "./quellen.js";
import { REGELVERSION } from "./regeln.js";
import { hashFallobjekt, sha256HexBytes } from "./trace.js";

export const EINTRAG_TYPEN = [
  "erfassung",
  "kuendigung_erhalten",
  "brief_erstellt",
  "dokument_hinzugefuegt",
  "export",
] as const;

export type EintragTyp = (typeof EINTRAG_TYPEN)[number];

export interface ChronikEintrag {
  /** ISO-8601 (Datum oder Datum+Zeit), injiziert von der aufrufenden Schicht. */
  zeitpunkt: string;
  typ: EintragTyp;
  beschreibung: string;
  /** SHA-256 (hex) eines lokal gehashten Dokuments. */
  dokument_hash?: string;
}

export interface Chronologie {
  fallobjekt_hash: string;
  regelversion: string;
  quellenstand: string;
  eintraege: ChronikEintrag[];
}

const ZEITPUNKT_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

function pruefeEintrag(eintrag: ChronikEintrag): void {
  if (!ZEITPUNKT_RE.test(eintrag.zeitpunkt)) {
    throw new Error(
      `Chronologie: zeitpunkt muss ISO-8601 sein (YYYY-MM-DD[Thh:mm...]), erhalten: ${String(eintrag.zeitpunkt)}`,
    );
  }
  if (!EINTRAG_TYPEN.includes(eintrag.typ)) {
    throw new Error(`Chronologie: unbekannter Eintragstyp: ${String(eintrag.typ)}`);
  }
  if (typeof eintrag.beschreibung !== "string" || eintrag.beschreibung.trim() === "") {
    throw new Error("Chronologie: beschreibung darf nicht leer sein.");
  }
}

/** Neue, leere Chronologie zu einem Fallobjekt (Hash wie im DTM-Trace). */
export function neueChronologie(fallobjekt: unknown): Chronologie {
  return {
    fallobjekt_hash: hashFallobjekt(fallobjekt),
    regelversion: REGELVERSION,
    quellenstand: QUELLENSTAND,
    eintraege: [],
  };
}

/** Haengt einen Eintrag an (immutabel: liefert eine neue Chronologie). */
export function mitEintrag(
  chronologie: Chronologie,
  eintrag: ChronikEintrag,
): Chronologie {
  pruefeEintrag(eintrag);
  return {
    ...chronologie,
    eintraege: [...chronologie.eintraege, { ...eintrag }],
  };
}

/** SHA-256 (hex) ueber rohe Dokument-Bytes — laeuft vollstaendig lokal. */
export function hashDokument(daten: Uint8Array | readonly number[]): string {
  return sha256HexBytes(daten);
}

function mitExportEintrag(
  chronologie: Chronologie,
  exportZeitpunkt: string,
  format: "JSON" | "Markdown",
): Chronologie {
  return mitEintrag(chronologie, {
    zeitpunkt: exportZeitpunkt,
    typ: "export",
    beschreibung: `Chronologie exportiert (${format})`,
  });
}

/** Export als JSON (mit abschliessendem export-Eintrag). */
export function exportiereChronologieJson(
  chronologie: Chronologie,
  exportZeitpunkt: string,
): string {
  const voll = mitExportEintrag(chronologie, exportZeitpunkt, "JSON");
  return JSON.stringify(voll, null, 2) + "\n";
}

/** Export als Markdown (mit abschliessendem export-Eintrag). */
export function exportiereChronologieMarkdown(
  chronologie: Chronologie,
  exportZeitpunkt: string,
): string {
  const voll = mitExportEintrag(chronologie, exportZeitpunkt, "Markdown");
  const zeilen: string[] = [
    "# Fallchronologie — Mietkuendigung",
    "",
    `- Fallobjekt-Hash (SHA-256): \`${voll.fallobjekt_hash}\``,
    `- Regelversion: ${voll.regelversion}`,
    `- Quellenstand: ${voll.quellenstand}`,
    "",
    "| Zeitpunkt | Typ | Beschreibung | Dokument-Hash (SHA-256) |",
    "|---|---|---|---|",
  ];
  for (const e of voll.eintraege) {
    const besch = e.beschreibung.replace(/\|/g, "\\|");
    zeilen.push(
      `| ${e.zeitpunkt} | ${e.typ} | ${besch} | ${e.dokument_hash ? `\`${e.dokument_hash}\`` : "—"} |`,
    );
  }
  zeilen.push("");
  return zeilen.join("\n");
}

// volltexte.ts — reine Logik der Volltextbeschaffung zu einem Messlauf.
//
// Der Netzabruf steht in volltexte-holen.ts; hier steht nur, was ohne Netz
// entscheidbar ist: welche Bezeichner beschafft werden, wie die Antwort der
// Quelle gelesen wird, wie Hashes und Manifest entstehen und wann ein Lauf
// als vollstaendig gilt. Kein Netz, keine Systemzeit.
//
// Zwei Dinge sind hier bewusst streng:
//
//   1. Die Auswahl kommt AUSSCHLIESSLICH aus dem eingefrorenen Rohlauf. Es
//      wird nicht gesucht, nicht gefiltert, nicht ergaenzt — sonst waere die
//      Volltextmenge nicht mehr dieselbe Population wie der Raw-Checkpoint.
//   2. Laesst sich aus einer Antwort kein Volltext bestimmen, wird KEINER
//      erfunden. Der Bezeichner gilt dann als nicht beschafft, und der Lauf
//      ist unvollstaendig. Ein halbes Bundle darf nicht wie ein ganzes
//      aussehen.

import { createHash } from "node:crypto";

/* ---------- Hashes ---------- */

export function sha256(inhalt: string): string {
  return createHash("sha256").update(inhalt, "utf8").digest("hex");
}

export function bytes(inhalt: string): number {
  return Buffer.byteLength(inhalt, "utf8");
}

/* ---------- Auswahl aus dem Rohlauf ---------- */

/** Ein zu beschaffender Bezeichner, so wie er im Rohlauf steht. */
export interface RohTreffer {
  quelle_id: string;
  aktenzeichen?: string;
  datum?: string;
  gericht?: string;
  link?: string;
}

/**
 * Liest die zu beschaffenden Bezeichner aus einem Messlauf — alle, in
 * stabiler Reihenfolge, ohne Auswahl. Doppelte Bezeichner sind ein Fehler:
 * sie wuerden die Bilanz zwischen Rohlauf und Bundle verschieben.
 */
export function trefferAusLauf(lauf: unknown): RohTreffer[] {
  const daten = lauf as { id?: unknown; treffer?: unknown };
  if (typeof daten.id !== "string" || !Array.isArray(daten.treffer)) {
    throw new Error("Die Laufdatei nennt keine id oder keine Trefferliste — kein gueltiger Messlauf.");
  }
  const gesehen = new Set<string>();
  const treffer: RohTreffer[] = [];
  for (const eintrag of daten.treffer as Array<Record<string, unknown>>) {
    const id = eintrag.quelle_id;
    if (typeof id !== "string" || id === "") {
      throw new Error(`Lauf ${daten.id}: ein Treffer ohne quelle_id — die Auswahl waere nicht reproduzierbar.`);
    }
    if (gesehen.has(id)) {
      throw new Error(`Lauf ${daten.id}: Bezeichner ${id} kommt mehrfach vor.`);
    }
    gesehen.add(id);
    treffer.push({
      quelle_id: id,
      aktenzeichen: typeof eintrag.aktenzeichen === "string" ? eintrag.aktenzeichen : undefined,
      datum: typeof eintrag.datum === "string" ? eintrag.datum : undefined,
      gericht: typeof eintrag.gericht === "string" ? eintrag.gericht : undefined,
      link: typeof eintrag.link === "string" ? eintrag.link : undefined,
    });
  }
  return treffer.sort((a, b) => (a.quelle_id < b.quelle_id ? -1 : a.quelle_id > b.quelle_id ? 1 : 0));
}

/* ---------- Antwort der Quelle lesen ---------- */

/**
 * Feldnamen, unter denen eine Quelle den Volltext fuehren kann. Die Liste ist
 * bewusst kurz und wird der Reihe nach geprueft; findet sich keiner, wird
 * NICHTS zurueckgegeben statt irgendetwas Naheliegendes.
 */
export const VOLLTEXT_FELDER = ["text", "volltext", "fulltext", "content", "body", "plain_text"] as const;

/**
 * Bestimmt den Volltext aus dem strukturierten Dokument und den Textteilen
 * der Antwort. `null` heisst: nicht bestimmbar — der Aufrufer behandelt das
 * als Fehlschlag, nicht als leeren Text.
 */
export function volltextAus(dokument: unknown, textTeile: readonly string[]): string | null {
  if (dokument !== null && typeof dokument === "object" && !Array.isArray(dokument)) {
    const felder = dokument as Record<string, unknown>;
    for (const name of VOLLTEXT_FELDER) {
      const wert = felder[name];
      if (typeof wert === "string" && wert.trim() !== "") return wert;
    }
  }
  const zusammen = textTeile.join("\n").trim();
  return zusammen === "" ? null : zusammen;
}

/** Liest ein Zeichenkettenfeld aus dem Dokument, wenn es dort steht. */
export function feldAus(dokument: unknown, name: string): string | null {
  if (dokument === null || typeof dokument !== "object" || Array.isArray(dokument)) return null;
  const wert = (dokument as Record<string, unknown>)[name];
  return typeof wert === "string" && wert !== "" ? wert : null;
}

/**
 * Ermittelt aus dem InputSchema des Quellwerkzeugs, wie der Bezeichner heisst.
 * Geraten wird nicht: nur wenn genau ein Pflichtfeld vom Typ string uebrig
 * bleibt, ist der Name eindeutig. Sonst `null` — dann muss er beim Aufruf
 * ausdruecklich genannt werden.
 */
export function argumentName(inputSchema: unknown): string | null {
  if (inputSchema === null || typeof inputSchema !== "object") return null;
  const schema = inputSchema as { required?: unknown; properties?: unknown };
  const eigenschaften = (schema.properties ?? {}) as Record<string, { type?: unknown }>;
  const pflicht = Array.isArray(schema.required)
    ? (schema.required as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const kandidaten = pflicht.filter((name) => {
    const typ = eigenschaften[name]?.type;
    return typ === undefined || typ === "string";
  });
  if (kandidaten.length === 1) return kandidaten[0] ?? null;
  // Kein Pflichtfeld deklariert: eine einzige Eigenschaft ist noch eindeutig.
  if (pflicht.length === 0) {
    const namen = Object.keys(eigenschaften);
    if (namen.length === 1) return namen[0] ?? null;
  }
  return null;
}

/* ---------- Bilanz und Manifest ---------- */

/** Was zu einem beschafften Dokument festgehalten wird — ohne den Text selbst. */
export interface DokumentBefund {
  quelle_id: string;
  aktenzeichen?: string;
  raw_datum?: string;
  document_url: string | null;
  original_url: string | null;
  text_sha256: string;
  text_bytes: number;
  document_json_sha256: string;
  document_json_bytes: number;
  raw_mcp_sha256: string;
  raw_mcp_bytes: number;
}

export interface Vollstaendigkeit {
  erwartet: number;
  beschafft: number;
  fehlend: string[];
  unerwartet: string[];
  vollstaendig: boolean;
}

/**
 * Vergleicht die beschafften Bezeichner mit den erwarteten. Vollstaendig ist
 * nur, was genau uebereinstimmt — ein zusaetzlicher Bezeichner ist ebenso ein
 * Befund wie ein fehlender, weil er nicht aus dem Raw-Checkpoint stammt.
 */
export function vollstaendigkeit(erwartet: readonly string[], beschafft: readonly string[]): Vollstaendigkeit {
  const da = new Set(beschafft);
  const soll = new Set(erwartet);
  const fehlend = erwartet.filter((id) => !da.has(id));
  const unerwartet = beschafft.filter((id) => !soll.has(id));
  return {
    erwartet: erwartet.length,
    beschafft: beschafft.length,
    fehlend,
    unerwartet,
    vollstaendig: fehlend.length === 0 && unerwartet.length === 0 && beschafft.length === erwartet.length,
  };
}

export interface ManifestAngaben {
  laufId: string;
  rawCheckpoint: string;
  messdefinition: { id: string; version: string; sha256: string };
  bundleDatei: string;
  bundleSha256: string | null;
  quelle: { provider: string; mcp_endpoint: string; tool: string };
  stand: string;
}

/**
 * Baut den Provenienzanker: nur Bezeichner, URLs, Groessen und SHA-256-Werte.
 * Der Volltext selbst gehoert nicht hinein und nicht ins Repository.
 */
export function baueManifest(angaben: ManifestAngaben, dokumente: readonly DokumentBefund[]): object {
  return {
    id: `${angaben.laufId}-volltext-bundle`,
    messlauf: angaben.laufId,
    raw_checkpoint: angaben.rawCheckpoint,
    stand: angaben.stand,
    messdefinition: angaben.messdefinition,
    bundle: {
      filename: angaben.bundleDatei,
      sha256: angaben.bundleSha256,
      storage: "external_to_git",
      fulltexts_committed: false,
    },
    source: {
      provider: angaben.quelle.provider,
      mcp_endpoint: angaben.quelle.mcp_endpoint,
      tool: angaben.quelle.tool,
      selection: `exact document IDs from ${angaben.laufId} raw checkpoint; no search`,
    },
    documents: [...dokumente].sort((a, b) =>
      a.quelle_id < b.quelle_id ? -1 : a.quelle_id > b.quelle_id ? 1 : 0,
    ),
    classification_status_at_anchor: "none",
    note:
      "Dieser Eintrag enthaelt nur Provenienz, Bezeichner, URLs, Groessen und SHA-256-Werte. " +
      "Die Volltexte und die Rohantworten der Quelle bleiben ausserhalb von Git.",
  };
}

/** Kanonische, deterministische Serialisierung einer Manifestdatei. */
export function alsDatei(inhalt: unknown): string {
  return `${JSON.stringify(inhalt, null, 2)}\n`;
}

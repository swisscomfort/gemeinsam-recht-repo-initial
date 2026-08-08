// kodierung.ts — Doppelkodierung der Scheiterpunkte (MANIFEST v2.1 §3/§5).
// Reine Funktionen, kein Netz, keine Systemzeit (Datum wird injiziert).
//
// Bewusst KEIN Import aus prototypen/feed/src/story.ts: Der CLI-Rand dieses
// Pakets wird mit `tsc -p tsconfig.build.json` (rootDir "src") kompiliert,
// das verbietet Importe ausserhalb von redaktion/src. Das Zeilenformat
// "lauf|datum|wert1,wert2|textstelle" von kodierung_quellen sowie das
// Listen-Subset ([a, "b, c"]) sind deshalb hier ABSICHTLICH dupliziert —
// exakt gleich zur kanonischen Definition in prototypen/feed/src/story.ts
// (parseKodierungsLauf/kodiereKodierungsLauf, LISTEN_SCHLUESSEL). Die
// Gleichheit sichert redaktion/tests/kodierung.test.ts ab (Konsistenztest,
// analog wissen/tests/konsistenz.test.ts).

export interface KodierungsLauf {
  lauf: string;
  datum: string;
  wert: string[];
  textstelle: string;
}

/** Zerlegt einen kodierung_quellen-Listeneintrag; null bei Formfehler. */
export function parseKodierungsLauf(eintrag: string): KodierungsLauf | null {
  const teile = eintrag.split("|");
  if (teile.length < 4) return null;
  const [lauf, datum, wertRoh, ...rest] = teile as [string, string, string, ...string[]];
  const wert = wertRoh
    .split(",")
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
  return { lauf: lauf.trim(), datum: datum.trim(), wert, textstelle: rest.join("|").trim() };
}

export function kodiereKodierungsLauf(eintrag: KodierungsLauf): string {
  return `${eintrag.lauf}|${eintrag.datum}|${eintrag.wert.join(",")}|${eintrag.textstelle}`;
}

/** Liest einen Skalar-Schluessel aus rohem meta.yaml-Text; null wenn nicht vorhanden. */
export function leseSkalar(roh: string, schluessel: string): string | null {
  const treffer = new RegExp(`^${schluessel}:\\s*(.+)$`, "m").exec(roh);
  if (!treffer) return null;
  let wert = treffer[1]!.trim();
  if (wert.length >= 2 && wert.startsWith('"') && wert.endsWith('"')) wert = wert.slice(1, -1);
  return wert;
}

function parseListenInhalt(inhalt: string): string[] {
  const eintraege: string[] = [];
  let aktuell = "";
  let inAnfuehrung = false;
  for (const zeichen of inhalt) {
    if (zeichen === '"') {
      inAnfuehrung = !inAnfuehrung;
      continue;
    }
    if (zeichen === "," && !inAnfuehrung) {
      eintraege.push(aktuell.trim());
      aktuell = "";
      continue;
    }
    aktuell += zeichen;
  }
  eintraege.push(aktuell.trim());
  return eintraege.filter((e) => e.length > 0);
}

/** Liest einen Listen-Schluessel ([a, "b, c"]) aus rohem meta.yaml-Text. */
export function leseListe(roh: string, schluessel: string): string[] | null {
  const treffer = new RegExp(`^${schluessel}:\\s*\\[(.*)\\]\\s*$`, "m").exec(roh);
  if (!treffer) return null;
  return parseListenInhalt(treffer[1]!);
}

/** Liest kodierung_quellen als geparste Laeufe (leer, wenn Schluessel fehlt). */
export function leseKodierungsQuellen(roh: string): KodierungsLauf[] {
  const rohEintraege = leseListe(roh, "kodierung_quellen") ?? [];
  return rohEintraege
    .map((e) => parseKodierungsLauf(e))
    .filter((e): e is KodierungsLauf => e !== null);
}

/* ---------- Export fuer den Zweitlauf (§5: "verschiedene Modelle, nicht derselbe Lauf zweimal") ---------- */

export interface ExportEintrag {
  id: string;
  textauszug: string;
}

export interface ZweitlaufExport {
  batch: string;
  erzeugt: string;
  kodierliste_version: string;
  werteliste: string[];
  hinweis: string;
  stories: ExportEintrag[];
}

/**
 * Baut EINE Exportdatei pro Stapel — ohne den Lauf-1-Vorschlag, damit der
 * Zweitlauf unbeeinflusst bleibt (§5: "verschiedene Modelle, nicht derselbe
 * Lauf zweimal").
 */
export function baueZweitlaufExport(
  stories: readonly ExportEintrag[],
  werteliste: readonly string[],
  kodierlisteVersion: string,
  batch: string,
  erzeugt: string,
): ZweitlaufExport {
  return {
    batch,
    erzeugt,
    kodierliste_version: kodierlisteVersion,
    werteliste: [...werteliste],
    hinweis:
      "Unabhaengiger Zweitlauf (anderes Modell als Lauf 1): je Story mindestens einen Wert aus " +
      "werteliste waehlen und mit einer woertlichen Textstelle belegen. Format der Antwortdatei: " +
      '[{ "id": "FS-...", "lauf": "<Modellbezeichnung>", "datum": "JJJJ-MM-TT", ' +
      '"wert": ["code1", "code2"], "textstelle": "..." }, ...]',
    stories: [...stories].sort((a, b) => (a.id < b.id ? -1 : 1)),
  };
}

/* ---------- Import des Zweitlaufs ---------- */

export interface ZweitlaufAntwort extends KodierungsLauf {
  id: string;
}

export interface AktuelleKodierung {
  id: string;
  ersterLauf: KodierungsLauf;
}

export interface ImportEintrag {
  id: string;
  kodierung_status: "doppelt_bestaetigt" | "strittig";
  kodierung_quellen: KodierungsLauf[];
}

export interface ImportErgebnis {
  ergebnisse: ImportEintrag[];
  strittig: ImportEintrag[];
  ohneZweitlauf: string[];
}

function gleicheWerte(a: readonly string[], b: readonly string[]): boolean {
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.length === sb.length && sa.every((wert, i) => wert === sb[i]);
}

/**
 * Vergleicht je Story den bisherigen (Lauf 1) mit dem importierten Zweitlauf.
 * Gleich (gleiche Wertemenge) -> doppelt_bestaetigt. Ungleich -> strittig,
 * mit beiden Laeufen in kodierung_quellen. Stories ohne Zweitlauf-Eintrag
 * bleiben unveraendert (ohneZweitlauf, kein Ergebnis-Eintrag).
 */
export function vergleicheZweitlauf(
  aktuelle: readonly AktuelleKodierung[],
  zweitlauf: readonly ZweitlaufAntwort[],
): ImportErgebnis {
  const zweitlaufProId = new Map(zweitlauf.map((z) => [z.id, z]));
  const ergebnisse: ImportEintrag[] = [];
  const strittig: ImportEintrag[] = [];
  const ohneZweitlauf: string[] = [];

  for (const { id, ersterLauf } of aktuelle) {
    const antwort = zweitlaufProId.get(id);
    if (!antwort) {
      ohneZweitlauf.push(id);
      continue;
    }
    const { id: _weg, ...zweiterLauf } = antwort;
    const gleich = gleicheWerte(ersterLauf.wert, zweiterLauf.wert);
    const eintrag: ImportEintrag = {
      id,
      kodierung_status: gleich ? "doppelt_bestaetigt" : "strittig",
      kodierung_quellen: [ersterLauf, zweiterLauf],
    };
    ergebnisse.push(eintrag);
    if (!gleich) strittig.push(eintrag);
  }

  return { ergebnisse, strittig, ohneZweitlauf };
}

/**
 * Schreibt kodierung_status und kodierung_quellen in rohen meta.yaml-Text
 * zurueck (gezielte Zeilenersetzung, der Rest der Datei bleibt byte-gleich).
 * Setzt voraus, dass beide Zeilen bereits existieren (bei allen migrierten
 * Geschichten der Fall, §3).
 */
export function schreibeAktualisiertesMeta(
  metaRoh: string,
  status: "doppelt_bestaetigt" | "strittig",
  quellen: readonly KodierungsLauf[],
): string {
  const quellenZeile = `kodierung_quellen: [${quellen.map((q) => `"${kodiereKodierungsLauf(q)}"`).join(", ")}]`;
  let neu = metaRoh.replace(/^kodierung_status:.*$/m, `kodierung_status: ${status}`);
  neu = neu.replace(/^kodierung_quellen:.*$/m, quellenZeile);
  return neu;
}

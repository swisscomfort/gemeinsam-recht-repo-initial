// format.ts — deterministische Aufbereitung der Kandidatenliste (AUFTRAG-R0 §2).
//
// Dieses Modul ist rein: Es liest keine Uhr, macht keinen Netzabruf und
// erhaelt alles injiziert. Aus einer Elasticsearch-Antwort von
// entscheidsuche.ch (nur Metadaten-Felder, siehe abruf.ts) entstehen
// Monatslisten redaktion/kandidaten/JJJJ-MM.md — je Zeile:
// Entscheiddatum · Gericht · Aktenzeichen · Betreff-Einzeiler · Link.
// Volltexte werden weder gelesen noch gespeichert.

export const VIEW_BASIS = "https://entscheidsuche.ch/view/";
export const OHNE_BETREFF = "(kein Betreff in den Metadaten)";
export const OHNE_AKTENZEICHEN = "(ohne Aktenzeichen)";
export const BETREFF_MAX_LAENGE = 160;

export interface Kandidat {
  entscheidDatum: string;
  gericht: string;
  aktenzeichen: string;
  betreff: string;
  link: string;
}

interface RohTreffer {
  _id: string;
  _source: {
    date?: unknown;
    hierarchy?: unknown;
    abstract?: unknown;
    title?: unknown;
    reference?: unknown;
  };
}

function istRohTreffer(wert: unknown): wert is RohTreffer {
  return (
    typeof wert === "object" &&
    wert !== null &&
    typeof (wert as RohTreffer)._id === "string" &&
    typeof (wert as RohTreffer)._source === "object" &&
    (wert as RohTreffer)._source !== null
  );
}

/** "JJJJ-MM-TT" -> "TT.MM.JJJJ" (so erscheint das Datum in den Titeln der Quelle). */
function alsSchweizerDatum(isoDatum: string): string {
  const [jahr, monat, tag] = isoDatum.split("-");
  return `${tag}.${monat}.${jahr}`;
}

function sprachfeld(wert: unknown): string | null {
  if (typeof wert !== "object" || wert === null) return null;
  const felder = wert as Record<string, unknown>;
  for (const sprache of ["de", "fr", "it"]) {
    const inhalt = felder[sprache];
    if (typeof inhalt === "string" && inhalt.trim() !== "") return inhalt;
  }
  return null;
}

/** Einzeiler aus dem Abstract: erster Teil vor ";;", Weissraum kollabiert, gekappt. */
export function betreffEinzeiler(abstract: unknown): string {
  const roh = sprachfeld(abstract);
  if (roh === null) return OHNE_BETREFF;
  const einzeiler = (roh.split(";;")[0] ?? "").replace(/\s+/g, " ").trim();
  if (einzeiler === "") return OHNE_BETREFF;
  if (einzeiler.length > BETREFF_MAX_LAENGE) {
    return `${einzeiler.slice(0, BETREFF_MAX_LAENGE - 1).trimEnd()}…`;
  }
  return einzeiler;
}

/**
 * Gerichtsname aus dem Quelltitel: Der Titel der Quelle traegt stets
 * "<Gericht> TT.MM.JJJJ <Aktenzeichen>"; abgeschnitten wird am formatierten
 * Entscheiddatum. Ist das nicht moeglich, dient die Hierarchie-Signatur
 * (z. B. "NW_OG") als Rueckfallwert — nie wird etwas erfunden.
 */
export function gerichtAus(titel: unknown, hierarchy: unknown, isoDatum: string): string {
  const titelText = sprachfeld(titel);
  if (titelText !== null) {
    const datumsstelle = titelText.indexOf(alsSchweizerDatum(isoDatum));
    if (datumsstelle > 0) {
      const davor = titelText.slice(0, datumsstelle).trim();
      if (davor !== "") return davor;
    }
  }
  if (Array.isArray(hierarchy) && hierarchy.length > 0) {
    const letzte = hierarchy[hierarchy.length - 1];
    if (typeof letzte === "string" && letzte.trim() !== "") return letzte;
  }
  return titelText ?? "(Gericht unbekannt)";
}

/** Wandelt einen Roh-Treffer in einen Kandidaten; unbrauchbare Treffer -> null. */
export function kandidatAus(treffer: unknown): Kandidat | null {
  if (!istRohTreffer(treffer)) return null;
  const quelle = treffer._source;
  const datum = quelle.date;
  if (typeof datum !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) return null;

  let aktenzeichen = OHNE_AKTENZEICHEN;
  if (Array.isArray(quelle.reference)) {
    const erstes = quelle.reference.find((r) => typeof r === "string" && r.trim() !== "");
    if (typeof erstes === "string") aktenzeichen = erstes.trim();
  }

  return {
    entscheidDatum: datum,
    gericht: gerichtAus(quelle.title, quelle.hierarchy, datum),
    aktenzeichen,
    betreff: betreffEinzeiler(quelle.abstract),
    link: `${VIEW_BASIS}${treffer._id}`,
  };
}

/** Liest die Treffer einer gespeicherten/abgerufenen Elasticsearch-Antwort. */
export function trefferAus(antwort: unknown): unknown[] {
  if (typeof antwort !== "object" || antwort === null) return [];
  const hits = (antwort as { hits?: { hits?: unknown } }).hits?.hits;
  return Array.isArray(hits) ? hits : [];
}

/** Antwort -> Kandidaten, dedupliziert ueber den Link, unbrauchbare Treffer verworfen. */
export function kandidatenAus(antwort: unknown): Kandidat[] {
  const gesehen = new Set<string>();
  const kandidaten: Kandidat[] = [];
  for (const treffer of trefferAus(antwort)) {
    const kandidat = kandidatAus(treffer);
    if (kandidat === null || gesehen.has(kandidat.link)) continue;
    gesehen.add(kandidat.link);
    kandidaten.push(kandidat);
  }
  return kandidaten;
}

export function formatiereZeile(k: Kandidat): string {
  return `- ${k.entscheidDatum} · ${k.gericht} · ${k.aktenzeichen} · ${k.betreff} · ${k.link}`;
}

/**
 * Gruppiert Kandidaten nach Entscheid-Monat und erzeugt je Monat den
 * Markdown-Inhalt fuer redaktion/kandidaten/JJJJ-MM.md. Sortierung im
 * Monat: Entscheiddatum absteigend, dann Link — vollstaendig deterministisch.
 * `abrufDatum` und `rechtsgebiete` werden injiziert (keine Systemzeit hier).
 */
export function monatsListen(
  kandidaten: Kandidat[],
  abrufDatum: string,
  rechtsgebiete: string[],
): Map<string, string> {
  const proMonat = new Map<string, Kandidat[]>();
  for (const kandidat of kandidaten) {
    const monat = kandidat.entscheidDatum.slice(0, 7);
    const liste = proMonat.get(monat) ?? [];
    liste.push(kandidat);
    proMonat.set(monat, liste);
  }

  const dateien = new Map<string, string>();
  for (const monat of [...proMonat.keys()].sort()) {
    const liste = [...(proMonat.get(monat) ?? [])].sort(
      (a, b) => b.entscheidDatum.localeCompare(a.entscheidDatum) || a.link.localeCompare(b.link),
    );
    const zeilen = [
      `# Kandidaten ${monat} — öffentlich publizierte Entscheide`,
      "",
      `Quelle: entscheidsuche.ch · Abruf vom ${abrufDatum} · Rechtsgebiete: ${rechtsgebiete.join(", ")}.`,
      "Nur Metadaten und Links — es werden keine Volltexte archiviert (AUFTRAG-R0 §2).",
      "Zeilenformat: Entscheiddatum · Gericht · Aktenzeichen · Betreff · Link",
      "",
      ...liste.map(formatiereZeile),
      "",
    ];
    dateien.set(monat, zeilen.join("\n"));
  }
  return dateien;
}

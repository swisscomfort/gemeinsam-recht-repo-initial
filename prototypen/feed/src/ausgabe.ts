// ausgabe.ts — deterministische Komposition der Morgenausgabe (AUFTRAG-F0, Teil B).
//
// 3–5 Karten, endet immer mit "Fertig für heute". Kein Endlos-Scrollen,
// kein Nachladen, keine Autoplay-Fortsetzung. Das Datum wird injiziert;
// keine Systemzeit, kein Zufall.

import type { Story } from "./story";

export const ABSCHLUSS = "Fertig für heute";
export const BADGE = "FIKTIVES LEHRSTÜCK";
export const BADGE_NACHERZAEHLT_PRAEFIX = "Nach einem echten, öffentlich publizierten Entscheid";
export const MIN_KARTEN = 3;
export const MAX_KARTEN = 5;

/**
 * Sichtbare Kennzeichnung jeder Karte (R0 §1): FIKTIV-Karten tragen das
 * Lehrstueck-Badge, NACHERZAEHLT_OEFFENTLICH-Karten den Hinweis
 * "Nach einem echten, öffentlich publizierten Entscheid · <quelle>".
 */
export function badgeFuer(story: Story): string {
  if (story.meta.kennzeichnung === "NACHERZAEHLT_OEFFENTLICH" && story.meta.quelle) {
    return `${BADGE_NACHERZAEHLT_PRAEFIX} · ${story.meta.quelle}`;
  }
  return BADGE;
}

export interface Karte {
  id: string;
  storyId: string;
  storyTitel: string;
  etappeNr: number;
  etappenTotal: number;
  etappeTitel: string;
  text: string;
  missionsStatus: string;
  prinzipien: string[];
  badge: string;
}

export interface Morgenausgabe {
  datum: string;
  karten: Karte[];
  abschluss: string;
  wenigerAlsDrei: boolean;
}

/** FNV-1a, 32 Bit — stabiler Hash fuer die deterministische Rotation. */
export function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function kartenAusStory(story: Story): Karte[] {
  return story.etappen.map((etappe) => ({
    id: `${story.meta.id}-E${etappe.nr}`,
    storyId: story.meta.id,
    storyTitel: story.meta.titel,
    etappeNr: etappe.nr,
    etappenTotal: story.meta.etappen,
    etappeTitel: etappe.titel,
    text: etappe.text,
    missionsStatus: story.meta.missions_status[etappe.nr - 1] ?? "",
    prinzipien: [...story.meta.prinzipien],
    badge: badgeFuer(story),
  }));
}

/**
 * Erzeugt die Morgenausgabe fuer ein injiziertes Datum (JJJJ-MM-TT).
 * Auswahl: Stories nach ID sortiert, Startpunkt deterministisch aus dem
 * Datums-Hash rotiert, Etappen-Karten in Story-Reihenfolge, hart bei
 * MAX_KARTEN gekappt. Bei weniger als MIN_KARTEN wird nichts erfunden,
 * sondern der Hinweis gesetzt (Invariante 12).
 */
export function morgenausgabe(stories: Story[], datumISO: string): Morgenausgabe {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datumISO)) {
    throw new Error("Datum muss injiziert werden und die Form JJJJ-MM-TT haben");
  }
  const sortiert = [...stories].sort((a, b) => a.meta.id.localeCompare(b.meta.id));
  const rotation = sortiert.length > 0 ? fnv1a(datumISO) % sortiert.length : 0;
  const reihenfolge = [...sortiert.slice(rotation), ...sortiert.slice(0, rotation)];

  const karten = reihenfolge.flatMap(kartenAusStory).slice(0, MAX_KARTEN);

  return {
    datum: datumISO,
    karten,
    abschluss: ABSCHLUSS,
    wenigerAlsDrei: karten.length < MIN_KARTEN,
  };
}

// definition.ts — Messdefinition: Typen, kanonischer Hash und die
// inhaltlichen Pruefungen, die Selektionsverzerrung technisch verhindern.
//
// Warum es dieses Modul gibt: Doppelkodierung schuetzt gegen Kodierfehler,
// nicht gegen Selektionsverzerrung. Wer den Nenner nach Storywert oder gar
// nach dem Verfahrensausgang bildet, misst nichts — er bestaetigt sich.
// Der Redaktionstrichter (redaktion/sieb.json) tut genau das: er wertet
// Nichteintreten, Kostenentscheide und Fristwiederherstellungen ab, weil sie
// schlechte Geschichten ergeben. Als Nenner einer Durchsetzungsquote wuerde
// er sie nach oben verzerren, denn Nichteintreten ist ueberwiegend eine
// gescheiterte Durchsetzung. Deshalb prueft dieses Modul jedes Kriterium
// gegen zwei Vokabulare und lehnt es ab, wenn es den Ausgang oder den
// Storywert kennt.
//
// Rein und deterministisch: keine Systemzeit, kein Netz.

import { createHash } from "node:crypto";

export type Bezug = "verfahrensgegenstand" | "formal" | "datenlage";
export type Pruefstand = "fachlich_zu_verifizieren" | "fachlich_bestaetigt";

export interface Kriterium {
  code: string;
  beschreibung: string;
  bezug: Bezug;
}

export interface Messdefinition {
  id: string;
  version: string;
  status: "entwurf" | "eingefroren";
  stand: string;
  messfrage: string;
  norm: { regel_id?: string; norm_fundstelle: string; pruefstand: Pruefstand };
  quelle: { name: string; endpunkt: string; abrufart: "metadaten" };
  abfrage: { suchanfrage: string; gerichtsfilter: string[] };
  zeitraum: { von: string; bis: string };
  einschluss: Kriterium[];
  ausschluss: Kriterium[];
  rechtskraft_regel: { art: "letztinstanzlich" | "quellenangabe"; begruendung: string; pruefstand: Pruefstand };
  selektionsneutralitaet: string;
}

/* ---------- Vokabulare ---------- */

/**
 * Woerter, die den Verfahrensausgang bezeichnen. Ein Ein- oder
 * Ausschlusskriterium, das eines davon enthaelt, entscheidet ueber die
 * Zugehoerigkeit zur Population anhand dessen, was gemessen werden soll —
 * und ist damit ungueltig.
 */
export const AUSGANG_WOERTER = [
  "gutgeheissen",
  "gutheissung",
  "abgewiesen",
  "abweisung",
  "obsiegt",
  "obsiegen",
  "unterlegen",
  "unterliegen",
  "erfolglos",
  "erfolgreich",
  "nichteintreten",
  "nicht eingetreten",
  "gescheitert",
  "durchgesetzt",
  "gewonnen",
  "verloren",
  "stattgegeben",
  "aufgehoben",
  "gegenstandslos",
  "abgeschrieben",
  "abschreibung",
  "rueckzug",
  "zurueckgezogen",
  "vergleich",
  "saeumnis",
  "verzichtet",
] as const;

/**
 * Woerter des Redaktionstrichters. Storywert darf die Zugehoerigkeit zum
 * Messkorpus nie beeinflussen — Redaktion waehlt aus dem Messkorpus aus,
 * nie umgekehrt.
 */
export const REDAKTIONS_WOERTER = [
  "storywert",
  "story",
  "geschichte",
  "verstaendlich",
  "verstaendlichkeit",
  "attraktiv",
  "spannend",
  "lehrreich",
  "interessant",
  "sieb",
  "sieb.json",
  "mappe",
  "top",
] as const;

/** Normalisiert wie das Redaktions-Sieb: klein, ae/oe/ue, ohne Akzente. */
export function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function enthaeltWort(text: string, wort: string): boolean {
  const muster = new RegExp(`(^|[^a-z0-9])${wort.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
  return muster.test(text);
}

/* ---------- Pruefungen ---------- */

export interface Befund {
  ok: boolean;
  fehler: string[];
}

/**
 * Prueft ein einzelnes Kriterium gegen beide Vokabulare. Geprueft werden
 * Code UND Beschreibung — der Code allein liesse sich harmlos benennen.
 */
export function pruefeKriterium(kriterium: Kriterium, feld: string): string[] {
  const fehler: string[] = [];
  const text = normalisiere(`${kriterium.code} ${kriterium.beschreibung}`);
  for (const wort of AUSGANG_WOERTER) {
    if (enthaeltWort(text, normalisiere(wort))) {
      fehler.push(
        `${feld}/${kriterium.code}: Kriterium nennt den Verfahrensausgang ("${wort}"). ` +
          `Ein Kriterium, das den Ausgang kennt, verzerrt den Nenner und ist unzulaessig.`,
      );
    }
  }
  for (const wort of REDAKTIONS_WOERTER) {
    if (enthaeltWort(text, normalisiere(wort))) {
      fehler.push(
        `${feld}/${kriterium.code}: Kriterium nennt ein Merkmal des Redaktionstrichters ("${wort}"). ` +
          `Storywert darf die Zugehoerigkeit zum Messkorpus nicht beeinflussen.`,
      );
    }
  }
  return fehler;
}

/** Inhaltliche Pruefung der ganzen Definition (Schema-Pruefung siehe validierung.ts). */
export function pruefeDefinitionInhalt(definition: Messdefinition): Befund {
  const fehler: string[] = [];

  for (const kriterium of definition.einschluss) {
    fehler.push(...pruefeKriterium(kriterium, "einschluss"));
  }
  for (const kriterium of definition.ausschluss) {
    fehler.push(...pruefeKriterium(kriterium, "ausschluss"));
  }

  const codes = [...definition.einschluss, ...definition.ausschluss].map((k) => k.code);
  const doppelt = codes.filter((code, stelle) => codes.indexOf(code) !== stelle);
  for (const code of new Set(doppelt)) {
    fehler.push(`Kriteriencode "${code}" ist mehrfach vergeben — Ausschlussgruende muessen eindeutig sein.`);
  }

  if (definition.zeitraum.von > definition.zeitraum.bis) {
    fehler.push(`Zeitraum verkehrt: von (${definition.zeitraum.von}) liegt nach bis (${definition.zeitraum.bis}).`);
  }

  return { ok: fehler.length === 0, fehler };
}

/* ---------- Kanonischer Hash ---------- */

/** Stabile Serialisierung: Schluessel sortiert, keine Leerzeichen. */
export function kanonisch(wert: unknown): string {
  if (wert === null || typeof wert !== "object") return JSON.stringify(wert) ?? "null";
  if (Array.isArray(wert)) return `[${wert.map(kanonisch).join(",")}]`;
  const eintraege = Object.entries(wert as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${eintraege.map(([k, v]) => `${JSON.stringify(k)}:${kanonisch(v)}`).join(",")}}`;
}

/**
 * SHA-256 ueber die kanonische Form. Formatierung der Datei aendert den Hash
 * nicht, jede inhaltliche Aenderung schon — genau das braucht die
 * Reproduzierbarkeit alter Quoten.
 */
export function definitionsHash(definition: unknown): string {
  return createHash("sha256").update(kanonisch(definition), "utf8").digest("hex");
}

/**
 * Darf aus dieser Definition eine Quote materialisiert werden?
 * Drei Bedingungen, alle menschlich verantwortet:
 * eingefroren + Norm fachlich bestaetigt + Rechtskraft-Regel fachlich bestaetigt.
 */
export function darfQuoteMaterialisieren(definition: Messdefinition): Befund {
  const fehler: string[] = [];
  if (definition.status !== "eingefroren") {
    fehler.push(`Messdefinition ${definition.id} ist "${definition.status}" — nur eingefrorene Definitionen tragen eine Quote.`);
  }
  if (definition.norm.pruefstand !== "fachlich_bestaetigt") {
    fehler.push(`Messdefinition ${definition.id}: norm.pruefstand ist "${definition.norm.pruefstand}" — fachliche Bestaetigung fehlt.`);
  }
  if (definition.rechtskraft_regel.pruefstand !== "fachlich_bestaetigt") {
    fehler.push(
      `Messdefinition ${definition.id}: rechtskraft_regel.pruefstand ist "${definition.rechtskraft_regel.pruefstand}" — fachliche Bestaetigung fehlt.`,
    );
  }
  return { ok: fehler.length === 0, fehler };
}

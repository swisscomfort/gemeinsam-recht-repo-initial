// kodierung-quoten.ts — Zaehllogik ueber die kodierten Felder der Geschichten
// (MANIFEST v2.1 §3/§5: ausgang, rechtskraft_status, scheiterpunkt,
// Doppelkodierung). Rein, deterministisch, kein Netz, keine Systemzeit —
// operiert ausschliesslich auf injizierten Daten (Story-Meta wird von aussen
// gelesen und uebergeben).
//
// Ausschlussregeln (§5):
// - kennzeichnung FIKTIV oder PLATZHALTER zaehlt nie mit.
// - rechtskraft_status ungleich "rechtskraeftig" zaehlt nie mit.
// - fuer die Scheiterpunkt-Auswertung zusaetzlich: kodierung_status ist
//   "vorschlag" oder "strittig" — gezaehlt wird ausschliesslich, was
//   "doppelt_bestaetigt" oder "mensch_bestaetigt" traegt.
//
// Jede Zaehlung gibt Zaehler, Nenner und die Zahl der ausgeschlossenen Faelle
// je Ausschlussgrund aus — nichts wird still weggelassen. Die
// Scheiterpunkt-Auswertung gibt zusaetzlich die Uebereinstimmungsquote der
// Kodierlaeufe aus (§5 letzter Absatz).
//
// Mindestfallzahl (§5): unterhalb von MINDESTFALLZAHL wird keine Quote
// dargestellt, nur die Fallzahl mit einem Hinweis. Die Konstante ist NICHT
// hier neu definiert, sondern aus quoten-sicht.ts (AUFTRAG-W0) importiert —
// eine einzige Definition im ganzen Projekt, nicht verstreut.

import { MINDESTFALLZAHL } from "./quoten-sicht.ts";

export { MINDESTFALLZAHL };

export type KodierungStatus = "vorschlag" | "doppelt_bestaetigt" | "mensch_bestaetigt" | "strittig";

export interface KodierteStory {
  id: string;
  kennzeichnung: string;
  rechtskraft_status?: string;
  kodierung_status?: KodierungStatus;
  ausgang?: string;
  scheiterpunkt?: readonly string[];
}

export type Ausschlussgrund =
  | "kennzeichnung_fiktiv_oder_platzhalter"
  | "nicht_rechtskraeftig"
  | "kodierung_nicht_bestaetigt";

export interface Ausschluss {
  grund: Ausschlussgrund;
  anzahl: number;
}

/** Zaehler/Nenner der Uebereinstimmung: wie viele Kodierlaeufe deckungsgleich waren. */
export interface Uebereinstimmungsquote {
  zaehler: number;
  nenner: number;
}

export interface Quote {
  zaehler: number;
  nenner: number;
  ausschluesse: Ausschluss[];
}

export interface ScheiterpunktQuote extends Quote {
  uebereinstimmungsquote: Uebereinstimmungsquote;
}

const KENNZEICHNUNGEN_AUSGESCHLOSSEN = new Set(["FIKTIV", "PLATZHALTER"]);

interface Basis {
  zaehlbar: KodierteStory[];
  ausschluesse: Ausschluss[];
}

/** Rechtskraeftige, nicht-fiktive Faelle; zaehlt beide Ausschlussgruende. */
function zaehlbareFaelle(stories: readonly KodierteStory[]): Basis {
  let fiktivOderPlatzhalter = 0;
  let nichtRechtskraeftig = 0;
  const zaehlbar: KodierteStory[] = [];

  for (const story of stories) {
    if (KENNZEICHNUNGEN_AUSGESCHLOSSEN.has(story.kennzeichnung)) {
      fiktivOderPlatzhalter += 1;
      continue;
    }
    if (story.rechtskraft_status !== "rechtskraeftig") {
      nichtRechtskraeftig += 1;
      continue;
    }
    zaehlbar.push(story);
  }

  const ausschluesse: Ausschluss[] = [];
  if (fiktivOderPlatzhalter > 0) {
    ausschluesse.push({ grund: "kennzeichnung_fiktiv_oder_platzhalter", anzahl: fiktivOderPlatzhalter });
  }
  if (nichtRechtskraeftig > 0) {
    ausschluesse.push({ grund: "nicht_rechtskraeftig", anzahl: nichtRechtskraeftig });
  }
  return { zaehlbar, ausschluesse };
}

/** Allgemeine Zaehlung: Anteil der zaehlbaren Faelle mit einem bestimmten Ausgang. */
export function ausgangQuote(stories: readonly KodierteStory[], ausgang: string): Quote {
  const { zaehlbar, ausschluesse } = zaehlbareFaelle(stories);
  return {
    zaehler: zaehlbar.filter((s) => s.ausgang === ausgang).length,
    nenner: zaehlbar.length,
    ausschluesse,
  };
}

const BESTAETIGT: ReadonlySet<KodierungStatus> = new Set(["doppelt_bestaetigt", "mensch_bestaetigt"]);

/**
 * Uebereinstimmungsquote der Kodierlaeufe (§5 letzter Absatz): Anteil der
 * verglichenen Faelle (doppelt_bestaetigt oder strittig), bei denen beide
 * Laeufe denselben Wert vergaben. "mensch_bestaetigt" ist eine nachtraegliche
 * menschliche Entscheidung ueber einen strittigen Fall, keine
 * Lauf-Uebereinstimmung, und zaehlt hier bewusst nicht mit.
 */
function uebereinstimmungsquote(stories: readonly KodierteStory[]): Uebereinstimmungsquote {
  const verglichen = stories.filter(
    (s) => s.kodierung_status === "doppelt_bestaetigt" || s.kodierung_status === "strittig",
  );
  return {
    zaehler: verglichen.filter((s) => s.kodierung_status === "doppelt_bestaetigt").length,
    nenner: verglichen.length,
  };
}

/**
 * Scheiterpunkt-Auswertung: wie ausgangQuote, zusaetzlich ausgeschlossen sind
 * Faelle mit kodierung_status "vorschlag" oder "strittig" (§5) — gezaehlt
 * wird ausschliesslich "doppelt_bestaetigt" oder "mensch_bestaetigt". Gibt
 * zusaetzlich die Uebereinstimmungsquote der Kodierlaeufe aus (§5).
 */
export function scheiterpunktQuote(stories: readonly KodierteStory[], code: string): ScheiterpunktQuote {
  const { zaehlbar, ausschluesse } = zaehlbareFaelle(stories);
  const bestaetigt = zaehlbar.filter((s) => s.kodierung_status !== undefined && BESTAETIGT.has(s.kodierung_status));
  const nichtBestaetigt = zaehlbar.length - bestaetigt.length;
  const alleAusschluesse = [...ausschluesse];
  if (nichtBestaetigt > 0) {
    alleAusschluesse.push({ grund: "kodierung_nicht_bestaetigt", anzahl: nichtBestaetigt });
  }
  return {
    zaehler: bestaetigt.filter((s) => (s.scheiterpunkt ?? []).includes(code)).length,
    nenner: bestaetigt.length,
    ausschluesse: alleAusschluesse,
    uebereinstimmungsquote: uebereinstimmungsquote(zaehlbar),
  };
}

/** Hinweistext unterhalb der Mindestfallzahl (§5) — kein Anteil, keine Prozentzahl. */
export const FALLZAHL_REICHT_NICHT_HINWEIS = `Fallzahl reicht fuer eine Quote nicht aus (Mindestfallzahl ${MINDESTFALLZAHL})`;

export interface QuoteDarstellung {
  ausreichend: boolean;
  nenner: number;
  anzeige: string;
  ausschluesse: Ausschluss[];
}

/**
 * Darstellungsschicht ueber einer rohen Quote (§5): ab MINDESTFALLZAHL
 * gezaehlten Faellen wird Zaehler/Nenner gezeigt, darunter nur die Fallzahl
 * mit Hinweis, dass sie fuer eine Quote nicht ausreicht — der Zaehler wird
 * dann nicht einmal mitgegeben (kein "3 von 4", keine Prozentzahl, §6).
 */
export function mitMindestfallzahl(quote: Quote): QuoteDarstellung {
  const ausreichend = quote.nenner >= MINDESTFALLZAHL;
  return {
    ausreichend,
    nenner: quote.nenner,
    anzeige: ausreichend
      ? `${quote.zaehler} von ${quote.nenner} Faellen`
      : `${quote.nenner} Faelle — ${FALLZAHL_REICHT_NICHT_HINWEIS}`,
    ausschluesse: quote.ausschluesse,
  };
}

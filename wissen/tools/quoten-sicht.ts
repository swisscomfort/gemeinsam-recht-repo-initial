// quoten-sicht.ts — Anzeige-Sicht der Quoten (AUFTRAG-W0 Teil D).
//
// Erfolgsquoten erst ab Mindestfallzahl (Plan §2, Invariante 11): alles
// darunter wird als "noch zu wenige Faelle" ausgeblendet — auch die
// Zaehlwerte selbst erscheinen dann nicht in der Sicht.

import { istDirektAufruf, leseJson, wissenPfad } from "./umgebung.ts";
import { pruefeQuote } from "./validierung.ts";

export const MINDESTFALLZAHL = 10;
export const ZU_WENIGE_FAELLE = "noch zu wenige Faelle";

export interface QuoteEintrag {
  vorgehen: string;
  wenn: string[];
  n: number;
  positiv: number;
  zeitstand: string;
}

export interface QuotenSichtEintrag {
  vorgehen: string;
  wenn: string[];
  anzeige: string;
  zeitstand: string;
}

/** Erzeugt die Anzeige-Sicht; unter der Mindestfallzahl ohne Zaehlwerte. */
export function quotenSicht(quoten: readonly QuoteEintrag[]): QuotenSichtEintrag[] {
  return quoten.map((quote) => {
    const schema = pruefeQuote(quote);
    if (!schema.ok) {
      throw new Error(`Quote ungueltig (${quote.vorgehen ?? "?"}): ${schema.fehler.join("; ")}`);
    }
    if (quote.positiv > quote.n) {
      throw new Error(
        `Quote widerspruechlich (${quote.vorgehen}): positiv (${quote.positiv}) > n (${quote.n})`,
      );
    }
    return {
      vorgehen: quote.vorgehen,
      wenn: [...quote.wenn],
      anzeige:
        quote.n < MINDESTFALLZAHL
          ? ZU_WENIGE_FAELLE
          : `${quote.positiv} von ${quote.n} Faellen positiv`,
      zeitstand: quote.zeitstand,
    };
  });
}

/* ---------- CLI ---------- */

if (istDirektAufruf(import.meta.url)) {
  const quoten = leseJson(wissenPfad("quoten", "quoten.json")) as QuoteEintrag[];
  console.log(JSON.stringify(quotenSicht(quoten), null, 2));
}

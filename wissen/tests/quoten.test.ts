// Tests des Quoten-Fundaments (AUFTRAG-W0 Teil D): Mindestfallzahl 10,
// Sicht blendet alles darunter als "noch zu wenige Faelle" aus.
// Keine echten Daten in W0 — alle Eintraege sind synthetisch (Invariante 2).

import { describe, expect, it } from "vitest";
import { leseJson, wissenPfad } from "../tools/umgebung.ts";
import { pruefeQuote } from "../tools/validierung.ts";
import {
  MINDESTFALLZAHL,
  ZU_WENIGE_FAELLE,
  quotenSicht,
  type QuoteEintrag,
} from "../tools/quoten-sicht.ts";

function quote(n: number, positiv: number): QuoteEintrag {
  return {
    vorgehen: "brief_m2",
    wenn: ["mietrecht_kuendigung", "kanton=LU"],
    n,
    positiv,
    zeitstand: "2026-08-05",
  };
}

describe("quoten.json", () => {
  it("ist in W0 leer (keine echten Daten)", () => {
    expect(leseJson(wissenPfad("quoten", "quoten.json"))).toEqual([]);
  });
});

describe("quote.schema.json", () => {
  it("akzeptiert einen vollstaendigen Eintrag und weist fehlende Felder ab", () => {
    expect(pruefeQuote(quote(12, 9)).ok).toBe(true);
    const { n: _weg, ...ohneN } = quote(12, 9);
    expect(pruefeQuote(ohneN).ok).toBe(false);
    expect(pruefeQuote({ ...quote(12, 9), extra: true }).ok).toBe(false);
    expect(pruefeQuote({ ...quote(12, 9), n: -1 }).ok).toBe(false);
  });
});

describe("quotenSicht", () => {
  it("MINDESTFALLZAHL ist 10", () => {
    expect(MINDESTFALLZAHL).toBe(10);
  });

  it("blendet Eintraege unter der Mindestfallzahl aus — auch die Zaehlwerte", () => {
    const [sicht] = quotenSicht([quote(9, 9)]);
    expect(sicht?.anzeige).toBe(ZU_WENIGE_FAELLE);
    expect(JSON.stringify(sicht)).not.toContain('"n"');
    expect(JSON.stringify(sicht)).not.toContain("positiv");
  });

  it("zeigt ab der Mindestfallzahl die Quote als Zaehlwert-Wiedergabe", () => {
    const [sicht] = quotenSicht([quote(10, 7)]);
    expect(sicht?.anzeige).toBe("7 von 10 Faellen positiv");
    expect(sicht?.zeitstand).toBe("2026-08-05");
  });

  it("weist widerspruechliche Eintraege ab (positiv > n)", () => {
    expect(() => quotenSicht([quote(10, 11)])).toThrow(/widerspruechlich/);
  });
});

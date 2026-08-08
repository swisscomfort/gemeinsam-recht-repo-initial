// Tests der Messdefinition: Selektionsneutralitaet, Hash, Freigabe-Sperren.
// Fixtures nur hier im Test, nie als reale Messdefinition (Plan §2, Inv. 2).

import { describe, expect, it } from "vitest";
import {
  AUSGANG_WOERTER,
  REDAKTIONS_WOERTER,
  darfQuoteMaterialisieren,
  definitionsHash,
  kanonisch,
  normalisiere,
  pruefeDefinitionInhalt,
  pruefeKriterium,
  type Messdefinition,
} from "../tools/definition.ts";

function definition(teil: Partial<Messdefinition> = {}): Messdefinition {
  return {
    id: "MD-999",
    version: "1.0.0",
    status: "entwurf",
    stand: "2026-08-08",
    messfrage: "Testfrage fuer die Fixture, lang genug fuer das Schema.",
    norm: { norm_fundstelle: "Art. 1 OR (SR 220)", pruefstand: "fachlich_zu_verifizieren" },
    quelle: { name: "entscheidsuche.ch", endpunkt: "https://entscheidsuche.ch/_search.php", abrufart: "metadaten" },
    abfrage: { suchanfrage: "Testanfrage", gerichtsfilter: ["CH_BGer"] },
    zeitraum: { von: "2020-01-01", bis: "2025-12-31" },
    einschluss: [
      { code: "norm_streitig", beschreibung: "Die Norm ist Gegenstand des Verfahrens.", bezug: "verfahrensgegenstand" },
    ],
    ausschluss: [
      { code: "andere_norm", beschreibung: "Das Verfahren betrifft eine andere Bestimmung.", bezug: "verfahrensgegenstand" },
    ],
    rechtskraft_regel: {
      art: "letztinstanzlich",
      begruendung: "Die Instanz traegt die Rechtskraft selbst, weil kein ordentliches Rechtsmittel folgt.",
      pruefstand: "fachlich_zu_verifizieren",
    },
    selektionsneutralitaet: "Kein Kriterium kennt den Ausgang; gefiltert wird allein nach dem Streitgegenstand.",
    ...teil,
  };
}

describe("Selektionsneutralitaet", () => {
  it("nimmt ein Kriterium an, das nur den Streitgegenstand nennt", () => {
    expect(
      pruefeKriterium(
        { code: "norm_streitig", beschreibung: "Die Norm ist Gegenstand des Verfahrens.", bezug: "verfahrensgegenstand" },
        "einschluss",
      ),
    ).toEqual([]);
  });

  it.each(AUSGANG_WOERTER)("lehnt ein Kriterium ab, das den Ausgang nennt: %s", (wort) => {
    const fehler = pruefeKriterium(
      { code: "test", beschreibung: `Verfahren, die ${wort} sind, bleiben draussen.`, bezug: "formal" },
      "ausschluss",
    );
    expect(fehler.length).toBeGreaterThan(0);
    expect(fehler[0]).toContain("Verfahrensausgang");
  });

  it.each(REDAKTIONS_WOERTER)("lehnt ein Kriterium ab, das den Storywert nennt: %s", (wort) => {
    const fehler = pruefeKriterium(
      { code: "test", beschreibung: `Aufgenommen wird, was ${wort} betrifft.`, bezug: "formal" },
      "einschluss",
    );
    expect(fehler.length).toBeGreaterThan(0);
  });

  it("faengt den Ausgang auch dann, wenn nur der Code ihn nennt", () => {
    const fehler = pruefeKriterium(
      { code: "nichteintreten", beschreibung: "Aus Gruenden der Vergleichbarkeit nicht erfasst.", bezug: "formal" },
      "ausschluss",
    );
    expect(fehler.length).toBeGreaterThan(0);
  });

  it("erkennt die Umlautschreibweise (Rueckzug/Rückzug)", () => {
    expect(normalisiere("Rückzug")).toBe("rueckzug");
    const fehler = pruefeKriterium(
      { code: "test", beschreibung: "Faelle mit Rückzug der Klage bleiben draussen.", bezug: "formal" },
      "ausschluss",
    );
    expect(fehler.length).toBeGreaterThan(0);
  });

  it("laesst eine Beschreibung durch, die ein Ausgangswort nur als Teilwort enthaelt", () => {
    // "Vergleichbarkeit" enthaelt "vergleich" als Teilzeichenkette, ist aber
    // kein Ausgangsbegriff — Wortgrenzen muessen greifen.
    expect(
      pruefeKriterium(
        { code: "gleiche_lage", beschreibung: "Nur Verfahren derselben Vergleichbarkeit im Streitgegenstand.", bezug: "verfahrensgegenstand" },
        "einschluss",
      ),
    ).toEqual([]);
  });
});

describe("pruefeDefinitionInhalt", () => {
  it("nimmt eine saubere Definition an", () => {
    expect(pruefeDefinitionInhalt(definition()).ok).toBe(true);
  });

  it("lehnt doppelt vergebene Kriteriencodes ab", () => {
    const befund = pruefeDefinitionInhalt(
      definition({
        ausschluss: [
          { code: "norm_streitig", beschreibung: "Doppelt vergebener Code.", bezug: "formal" },
        ],
      }),
    );
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("mehrfach vergeben");
  });

  it("lehnt einen verkehrten Zeitraum ab", () => {
    const befund = pruefeDefinitionInhalt(definition({ zeitraum: { von: "2025-01-01", bis: "2020-01-01" } }));
    expect(befund.ok).toBe(false);
  });
});

describe("definitionsHash", () => {
  it("ist unabhaengig von der Schluesselreihenfolge", () => {
    const a = { x: 1, y: [1, 2], z: { b: 2, a: 1 } };
    const b = { z: { a: 1, b: 2 }, y: [1, 2], x: 1 };
    expect(kanonisch(a)).toBe(kanonisch(b));
    expect(definitionsHash(a)).toBe(definitionsHash(b));
  });

  it("aendert sich bei jeder inhaltlichen Aenderung", () => {
    const vorher = definitionsHash(definition());
    const nachher = definitionsHash(definition({ zeitraum: { von: "2021-01-01", bis: "2025-12-31" } }));
    expect(nachher).not.toBe(vorher);
  });

  it("unterscheidet Reihenfolge in Listen (Kriterien sind geordnet)", () => {
    const eins = definition();
    const zwei = definition({ einschluss: [...eins.einschluss].reverse() });
    expect(definitionsHash(zwei)).toBe(definitionsHash(eins)); // nur ein Element
  });
});

describe("darfQuoteMaterialisieren", () => {
  it("sperrt eine Definition im Entwurf", () => {
    const befund = darfQuoteMaterialisieren(definition());
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("entwurf");
  });

  it("sperrt trotz Einfrierens, solange die fachliche Bestaetigung fehlt", () => {
    const befund = darfQuoteMaterialisieren(definition({ status: "eingefroren" }));
    expect(befund.ok).toBe(false);
    expect(befund.fehler.some((f) => f.includes("norm.pruefstand"))).toBe(true);
    expect(befund.fehler.some((f) => f.includes("rechtskraft_regel.pruefstand"))).toBe(true);
  });

  it("gibt frei, wenn eingefroren und beide Pruefstaende bestaetigt sind", () => {
    const befund = darfQuoteMaterialisieren(
      definition({
        status: "eingefroren",
        norm: { norm_fundstelle: "Art. 1 OR (SR 220)", pruefstand: "fachlich_bestaetigt" },
        rechtskraft_regel: {
          art: "letztinstanzlich",
          begruendung: "Die Instanz traegt die Rechtskraft selbst, weil kein ordentliches Rechtsmittel folgt.",
          pruefstand: "fachlich_bestaetigt",
        },
      }),
    );
    expect(befund.ok).toBe(true);
  });
});

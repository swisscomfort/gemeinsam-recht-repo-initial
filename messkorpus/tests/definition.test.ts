// Tests der Messdefinition: Selektionsneutralitaet, Hash, Freigabe-Sperren.
// Fixtures nur hier im Test, nie als reale Messdefinition (Plan §2, Inv. 2).

import { describe, expect, it } from "vitest";
import {
  AUSGANG_WOERTER,
  BUNDESGERICHT_SIGNATUREN,
  REDAKTIONS_WOERTER,
  SPRACH_WOERTER,
  darfQuoteMaterialisieren,
  definitionsHash,
  kanonisch,
  normalisiere,
  pruefeDefinitionInhalt,
  pruefeKriterium,
  rechtskraftAusInstanz,
  type Messdefinition,
} from "../tools/definition.ts";
import { DEFINITION } from "./fixtures.ts";

function definition(teil: Partial<Messdefinition> = {}): Messdefinition {
  return {
    ...DEFINITION,
    status: "entwurf",
    norm: { norm_fundstelle: "Art. 1 OR (SR 220)", pruefstand: "fachlich_zu_verifizieren" },
    rechtskraft_regel: { ...DEFINITION.rechtskraft_regel, pruefstand: "fachlich_zu_verifizieren" },
    abschluss_regel: { ...DEFINITION.abschluss_regel, pruefstand: "fachlich_zu_verifizieren" },
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

describe("Sprachselektion", () => {
  it.each(SPRACH_WOERTER)("lehnt ein Kriterium ab, das nach Sprache sortiert: %s", (wort) => {
    const fehler = pruefeKriterium(
      { code: "test", beschreibung: `Nur Entscheide, die ${wort} sind.`, bezug: "datenlage" },
      "ausschluss",
    );
    expect(fehler.length).toBeGreaterThan(0);
    expect(fehler.join(" ")).toContain("drei Amtssprachen");
  });

  it("laesst ein Kriterium durch, das nur den Streitgegenstand nennt", () => {
    expect(
      pruefeKriterium(
        { code: "norm_streitig", beschreibung: "Die Norm ist Gegenstand des Verfahrens.", bezug: "verfahrensgegenstand" },
        "einschluss",
      ),
    ).toEqual([]);
  });
});

describe("rechtskraftAusInstanz", () => {
  const bgg = definition();

  it.each(BUNDESGERICHT_SIGNATUREN)("traegt die Rechtskraft fuer %s (Art. 61 BGG)", (signatur) => {
    expect(rechtskraftAusInstanz(bgg, signatur)).toBe(true);
  });

  it("traegt sie NICHT fuer ein kantonales Gericht, auch wenn es dort letzte Instanz war", () => {
    // Gegen einen kantonalen letztinstanzlichen Entscheid steht die Beschwerde
    // ans Bundesgericht offen — seine Rechtskraft folgt nicht aus der Instanz.
    expect(rechtskraftAusInstanz(bgg, "ZH_OG")).toBe(false);
    expect(rechtskraftAusInstanz(bgg, "LU_KG")).toBe(false);
    expect(rechtskraftAusInstanz(bgg, "ZH_MG")).toBe(false);
  });

  it("traegt sie nicht ohne bekanntes Gericht", () => {
    expect(rechtskraftAusInstanz(bgg, undefined)).toBe(false);
  });

  it("greift nicht, wenn die Definition sich auf die Quellenangabe stuetzt", () => {
    const ueberQuelle = definition({
      rechtskraft_regel: {
        art: "quellenangabe",
        rechtsquelle: "Publikationshinweis der Quelle",
        begruendung: "Die Publikation nennt die Rechtskraft ausdruecklich, etwa mit dem Vermerk unangefochten.",
        pruefstand: "fachlich_zu_verifizieren",
      },
    });
    expect(rechtskraftAusInstanz(ueberQuelle, "CH_BGer")).toBe(false);
  });
});

describe("rechtskraftAusInstanz unter dem Uebergangsrecht (Art. 132 BGG)", () => {
  // Fuer einen historischen Korpus sagt die Bundesgerichtssignatur nicht, ob
  // das Verfahren dem BGG untersteht. Die Ableitung aus der Instanz steht
  // deshalb nicht zur Verfuegung — sonst wuerde die Maschine genau die
  // Pruefung ueberspringen, die die Definition im Text verlangt.
  const uebergangsregel = {
    art: "bundesgericht_uebergangsrecht_art132_bgg",
    rechtsquelle: "Art. 61 BGG und Art. 132 BGG (SR 173.110)",
    begruendung:
      "Art. 61 BGG traegt die Rechtskraft nur fuer ein Verfahren, das nach Art. 132 BGG dem BGG untersteht.",
    pruefstand: "fachlich_zu_verifizieren",
  } as const;

  it.each(BUNDESGERICHT_SIGNATUREN)("leitet aus %s NICHTS ab — fail closed", (signatur) => {
    expect(rechtskraftAusInstanz(definition({ rechtskraft_regel: uebergangsregel }), signatur)).toBe(false);
  });

  it("verhaelt sich unabhaengig von id und Version — allein die Art steuert", () => {
    // Zwei kuenstliche Definitionen, verschiedene id und Version, gleiche Art.
    const eine = definition({ id: "MD-777", version: "1.0.0", rechtskraft_regel: uebergangsregel });
    const andere = definition({ id: "MD-888", version: "9.42.7", rechtskraft_regel: uebergangsregel });
    for (const gericht of [...BUNDESGERICHT_SIGNATUREN, "ZH_OG", undefined]) {
      expect(rechtskraftAusInstanz(eine, gericht)).toBe(rechtskraftAusInstanz(andere, gericht));
      expect(rechtskraftAusInstanz(eine, gericht)).toBe(false);
    }
    // Dieselben beiden Kennungen mit der Art. 61-Art verhalten sich ebenso
    // gleich — und dort eben nicht fail closed. Der Unterschied liegt allein
    // in der Art, nicht in der Numerierung.
    const alt61 = definition({ id: "MD-777", version: "1.0.0" });
    const alt61Andere = definition({ id: "MD-888", version: "9.42.7" });
    expect(rechtskraftAusInstanz(alt61, "CH_BGer")).toBe(true);
    expect(rechtskraftAusInstanz(alt61Andere, "CH_BGer")).toBe(true);
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

  it("sperrt trotz Einfrierens, solange eine fachliche Bestaetigung fehlt", () => {
    const befund = darfQuoteMaterialisieren(definition({ status: "eingefroren" }));
    expect(befund.ok).toBe(false);
    expect(befund.fehler.some((f) => f.includes("norm.pruefstand"))).toBe(true);
    expect(befund.fehler.some((f) => f.includes("rechtskraft_regel.pruefstand"))).toBe(true);
    expect(befund.fehler.some((f) => f.includes("abschluss_regel.pruefstand"))).toBe(true);
  });

  it("sperrt auch, wenn nur die Abschlussregel noch offen ist", () => {
    const befund = darfQuoteMaterialisieren({ ...DEFINITION, abschluss_regel: { ...DEFINITION.abschluss_regel, pruefstand: "fachlich_zu_verifizieren" } });
    expect(befund.ok).toBe(false);
    expect(befund.fehler).toHaveLength(1);
  });

  it("gibt frei, wenn eingefroren und alle drei Pruefstaende bestaetigt sind", () => {
    expect(darfQuoteMaterialisieren(DEFINITION).ok).toBe(true);
  });
});

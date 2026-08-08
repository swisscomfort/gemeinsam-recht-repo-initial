// Tests der Lauf-Invarianten: kein stiller Verlust, genau ein Status je
// Treffer, vorher deklarierte Ausschlussgruende, Reproduzierbarkeit.

import { describe, expect, it } from "vitest";
import { definitionsHash, type Messdefinition } from "../tools/definition.ts";
import { bilanz, gleichePopulation, population, pruefeLauf, type Messlauf, type Treffer } from "../tools/lauf.ts";

const DEFINITION: Messdefinition = {
  id: "MD-999",
  version: "1.0.0",
  status: "eingefroren",
  stand: "2026-08-08",
  messfrage: "Testfrage fuer die Fixture, lang genug fuer das Schema.",
  norm: { norm_fundstelle: "Art. 1 OR (SR 220)", pruefstand: "fachlich_bestaetigt" },
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
    pruefstand: "fachlich_bestaetigt",
  },
  selektionsneutralitaet: "Kein Kriterium kennt den Ausgang; gefiltert wird allein nach dem Streitgegenstand.",
};

function lauf(treffer: Treffer[], teil: Partial<Messlauf> = {}): Messlauf {
  return {
    id: "ML-999",
    messdefinition: { id: "MD-999", version: "1.0.0", sha256: definitionsHash(DEFINITION) },
    durchgefuehrt_am: "2026-08-08",
    datenstand: "2026-08-08",
    roh_treffer: treffer.length,
    gekappt: false,
    treffer,
    ...teil,
  };
}

const EINS: Treffer = { quelle_id: "a1", status: "eingeschlossen", story_id: "FS-101" };
const ZWEI: Treffer = { quelle_id: "a2", status: "ausgeschlossen", ausschlussgrund: "andere_norm" };
const DREI: Treffer = { quelle_id: "a3", status: "ungeklaert" };

describe("pruefeLauf", () => {
  it("nimmt einen vollstaendigen Lauf an", () => {
    expect(pruefeLauf(lauf([EINS, ZWEI, DREI]), DEFINITION).ok).toBe(true);
  });

  it("meldet stillen Verlust, wenn roh_treffer nicht zur Liste passt", () => {
    const befund = pruefeLauf(lauf([EINS, ZWEI], { roh_treffer: 5 }), DEFINITION);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("Differenz 3");
  });

  it("lehnt einen gekappten Abruf als Messkorpus ab", () => {
    const befund = pruefeLauf(lauf([EINS], { gekappt: true }), DEFINITION);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("gekappt");
  });

  it("lehnt einen Ausschluss ohne Grund ab", () => {
    const befund = pruefeLauf(lauf([{ quelle_id: "a9", status: "ausgeschlossen" }]), DEFINITION);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("keinen Grund");
  });

  it("lehnt einen nachtraeglich erfundenen Ausschlussgrund ab", () => {
    const befund = pruefeLauf(
      lauf([{ quelle_id: "a9", status: "ausgeschlossen", ausschlussgrund: "passt_nicht_ins_bild" }]),
      DEFINITION,
    );
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("nicht vorher deklariert");
  });

  it("lehnt einen Ausschlussgrund an einem eingeschlossenen Treffer ab", () => {
    const befund = pruefeLauf(
      lauf([{ quelle_id: "a9", status: "eingeschlossen", ausschlussgrund: "andere_norm" }]),
      DEFINITION,
    );
    expect(befund.ok).toBe(false);
  });

  it("lehnt doppelte Treffer ab", () => {
    const befund = pruefeLauf(lauf([EINS, { ...EINS }]), DEFINITION);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("mehrfach");
  });

  it("erkennt eine nachtraeglich geaenderte Messdefinition am Hash", () => {
    const geaendert: Messdefinition = { ...DEFINITION, zeitraum: { von: "2021-01-01", bis: "2025-12-31" } };
    const befund = pruefeLauf(lauf([EINS]), geaendert);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("nach dem Lauf inhaltlich geaendert");
  });

  it("erkennt einen Lauf gegen eine andere Version der Definition", () => {
    const neu: Messdefinition = { ...DEFINITION, version: "2.0.0" };
    const befund = pruefeLauf(lauf([EINS]), neu);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("Version");
  });
});

describe("bilanz", () => {
  it("zaehlt jeden Treffer genau einmal", () => {
    const b = bilanz(lauf([EINS, ZWEI, DREI, { quelle_id: "a4", status: "ausgeschlossen", ausschlussgrund: "andere_norm" }]));
    expect(b.roh).toBe(4);
    expect(b.eingeschlossen + b.ausgeschlossen + b.ungeklaert).toBe(b.roh);
    expect(b.ausschluesse).toEqual([{ grund: "andere_norm", anzahl: 2 }]);
  });
});

describe("Reproduzierbarkeit", () => {
  it("ergibt dieselbe Population unabhaengig von der Reihenfolge der Treffer", () => {
    const a = lauf([EINS, ZWEI, DREI]);
    const b = lauf([DREI, EINS, ZWEI]);
    expect(gleichePopulation(a, b)).toBe(true);
  });

  it("erkennt eine geaenderte Population", () => {
    const a = lauf([EINS, ZWEI]);
    const b = lauf([EINS, { ...ZWEI, status: "eingeschlossen", ausschlussgrund: undefined }]);
    expect(gleichePopulation(a, b)).toBe(false);
    expect(population(a)).not.toBe(population(b));
  });
});

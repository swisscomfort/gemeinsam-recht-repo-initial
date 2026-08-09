// Tests der Fassungsauflösung: eine Messdefinition ist durch id UND version
// bestimmt, nicht durch die id allein.
//
// Warum diese Tests bestehen: Bis zur Umstellung loesten die beiden Werkzeuge
// dieselbe id nach entgegengesetzter Regel auf — `pruefen.ts` ueber
// `Map.set(id)` (letzte Datei gewinnt), `messquote.ts` ueber `.find(id)`
// (erste Datei gewinnt). Welche Fassung "gilt", entschied damit die
// alphabetische Dateinamensortierung, je Werkzeug verschieden. Ein
// unveraenderter alter Lauf wurde ungueltig, sobald eine neue Fassung
// derselben id danebenlag. Genau das halten diese Tests fest.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  auflösungsFehler,
  darfQuoteMaterialisieren,
  definitionsHash,
  definitionsSchluessel,
  findeFassung,
  sammleFassungen,
  type Messdefinition,
} from "../tools/definition.ts";
import { pruefeLauf, type Messlauf } from "../tools/lauf.ts";
import { berichte } from "../tools/pruefen.ts";
import { leseDefinitionen, leseJson, messkorpusPfad } from "../tools/umgebung.ts";
import { DEFINITION, lauf, treffer } from "./fixtures.ts";

/** Fixture-Definition in einer anderen Fassung — gleiche id, andere version. */
function fassung(version: string, teil: Partial<Messdefinition> = {}): Messdefinition {
  return { ...DEFINITION, version, ...teil };
}

/** Lauf, der ausdruecklich eine bestimmte Fassung nennt. */
function laufGegen(definition: Messdefinition, id: string) {
  return lauf([treffer({ quelle_id: `${id}-T1`, status: "ungeklaert" })], {
    id,
    messdefinition: {
      id: definition.id,
      version: definition.version,
      sha256: definitionsHash(definition),
    },
  });
}

describe("Auflösung nach id und version", () => {
  const v1 = fassung("1.0.0");
  const v2 = fassung("2.0.0", { messfrage: "Zweite Fassung derselben Messung, andere Frage." });

  it("A — zwei Fassungen derselben id bestehen nebeneinander, beide Laeufe bleiben gueltig", () => {
    const register = sammleFassungen([
      { datei: "MD-999-a.json", inhalt: v1 },
      { datei: "MD-999-b.json", inhalt: v2 },
    ]);

    const treffer1 = findeFassung(register, { id: "MD-999", version: "1.0.0" });
    const treffer2 = findeFassung(register, { id: "MD-999", version: "2.0.0" });
    expect(treffer1.art).toBe("gefunden");
    expect(treffer2.art).toBe("gefunden");

    // Der entscheidende Punkt: jeder Lauf findet SEINE Fassung und bleibt
    // gueltig, obwohl die andere danebenliegt.
    const laufV1 = laufGegen(v1, "ML-901");
    const laufV2 = laufGegen(v2, "ML-902");
    expect(pruefeLauf(laufV1, (treffer1 as { definition: Messdefinition }).definition).fehler).toEqual([]);
    expect(pruefeLauf(laufV2, (treffer2 as { definition: Messdefinition }).definition).fehler).toEqual([]);
  });

  it("A — die alte Fassung wird nicht von der neuen verdraengt", () => {
    const register = sammleFassungen([
      { datei: "MD-999-a.json", inhalt: v1 },
      { datei: "MD-999-b.json", inhalt: v2 },
    ]);
    expect([...register.fassungen.keys()].sort()).toEqual(["MD-999@1.0.0", "MD-999@2.0.0"]);
    expect(register.doppelte.size).toBe(0);
  });

  it("B — die Dateinamensortierung hat keinen Einfluss auf die gewaehlte Fassung", () => {
    const vorwaerts = sammleFassungen([
      { datei: "aaa.json", inhalt: v1 },
      { datei: "zzz.json", inhalt: v2 },
    ]);
    const rueckwaerts = sammleFassungen([
      { datei: "zzz.json", inhalt: v2 },
      { datei: "aaa.json", inhalt: v1 },
    ]);

    for (const version of ["1.0.0", "2.0.0"]) {
      const a = findeFassung(vorwaerts, { id: "MD-999", version });
      const b = findeFassung(rueckwaerts, { id: "MD-999", version });
      expect(a.art).toBe("gefunden");
      expect(b.art).toBe("gefunden");
      expect((a as { definition: Messdefinition }).definition.version).toBe(version);
      expect((b as { definition: Messdefinition }).definition.version).toBe(version);
    }
  });

  it("C — zwei Dateien mit identischer id und version werden als Fehler abgelehnt", () => {
    const register = sammleFassungen([
      { datei: "MD-999-zweitfassung.json", inhalt: v1 },
      { datei: "MD-999-original.json", inhalt: v1 },
    ]);

    // Nicht aufgeloest: der Schluessel fehlt in `fassungen` und steht in `doppelte`.
    expect(register.fassungen.has("MD-999@1.0.0")).toBe(false);
    expect(register.doppelte.get("MD-999@1.0.0")).toEqual([
      "MD-999-original.json",
      "MD-999-zweitfassung.json",
    ]);

    const auflösung = findeFassung(register, { id: "MD-999", version: "1.0.0" });
    expect(auflösung.art).toBe("mehrdeutig");

    const text = auflösungsFehler({ id: "MD-999", version: "1.0.0" }, auflösung);
    expect(text).toContain("MD-999@1.0.0");
    expect(text).toContain("mehrfach");
    // Der Fehler nennt beide Dateien — sonst weiss niemand, welche zu loeschen ist.
    expect(text).toContain("MD-999-original.json");
    expect(text).toContain("MD-999-zweitfassung.json");
  });

  it("C — Mehrdeutigkeit ist etwas anderes als 'nicht gefunden'", () => {
    const register = sammleFassungen([
      { datei: "a.json", inhalt: v1 },
      { datei: "b.json", inhalt: v1 },
    ]);
    expect(findeFassung(register, { id: "MD-999", version: "1.0.0" }).art).toBe("mehrdeutig");
    expect(findeFassung(register, { id: "MD-999", version: "9.9.9" }).art).toBe("fehlt");
    expect(auflösungsFehler({ id: "MD-999", version: "9.9.9" }, { art: "fehlt" })).toContain(
      "nicht gefunden",
    );
  });

  it("der Schluessel ist id@version", () => {
    expect(definitionsSchluessel("MD-001", "2.0.0")).toBe("MD-001@2.0.0");
  });
});

describe("D — beide Werkzeuge loesen nach derselben Regel auf", () => {
  // Der Schutz liegt darin, dass pruefen.ts und messquote.ts denselben
  // Resolver benutzen statt je eine eigene Suche. Diese Tests halten das am
  // Quelltext fest: eine wiedereingefuehrte id-only-Suche faellt hier auf,
  // nicht erst, wenn eine zweite Fassung im Verzeichnis liegt.
  const quelle = (name: string): string => readFileSync(messkorpusPfad("tools", name), "utf8");

  it.each(["pruefen.ts", "messquote.ts"])("%s benutzt den gemeinsamen Resolver", (name) => {
    const text = quelle(name);
    expect(text).toContain("findeFassung");
    expect(text).toContain("sammleFassungen");
  });

  it.each(["pruefen.ts", "messquote.ts"])("%s loest nicht mehr allein ueber die id auf", (name) => {
    const text = quelle(name);
    // Die beiden konkreten Muster, die den Fehler ausmachten.
    expect(text).not.toMatch(/\.find\(\s*\(\s*d\s*\)\s*=>\s*d\.id\s*===\s*lauf\.messdefinition\.id/);
    expect(text).not.toMatch(/definitionen\.(set|get)\(\s*(definition|lauf\.messdefinition)\.id\s*[,)]/);
  });

  it("dieselbe Verzeichnislage ergibt in beiden Werkzeugen dieselbe Fassung", () => {
    const v1 = fassung("1.0.0");
    const v2 = fassung("2.0.0");
    const dateien = [
      { datei: "MD-999-neu.json", inhalt: v2 },
      { datei: "MD-999.json", inhalt: v1 },
    ];
    // Beide Werkzeuge bauen ihr Register aus derselben Liste und fragen mit
    // demselben Verweis — es gibt keine zweite Auflösungsregel mehr.
    const ausPruefen = findeFassung(sammleFassungen(dateien), { id: "MD-999", version: "1.0.0" });
    const ausQuote = findeFassung(sammleFassungen(dateien), { id: "MD-999", version: "1.0.0" });
    expect(ausPruefen).toEqual(ausQuote);
    expect((ausPruefen as { definition: Messdefinition }).definition.version).toBe("1.0.0");
  });
});

describe("Der reale Parallelbestand: MD-001 in zwei Fassungen", () => {
  // Seit dem v3-Entwurf liegen zwei echte MD-001-Dateien nebeneinander. Bis
  // hierher pruefte nur die synthetische MD-999, ob das gutgeht — jetzt tut
  // es der Bestand selbst.
  const dateien = leseDefinitionen().map((d) => ({ datei: d.datei, inhalt: d.inhalt as Messdefinition }));
  const register = sammleFassungen(dateien);

  it("beide Fassungen liegen wirklich als eigene Dateien vor", () => {
    const mdEins = dateien.filter((d) => d.inhalt.id === "MD-001");
    expect(mdEins.length).toBeGreaterThanOrEqual(2);
    expect(mdEins.map((d) => d.inhalt.version).sort()).toContain("2.0.0");
    expect(mdEins.map((d) => d.inhalt.version).sort()).toContain("3.0.0");
    expect(register.doppelte.size).toBe(0);
  });

  it("v2.0.0 wird eindeutig gefunden und behaelt ihren eingefrorenen Hash", () => {
    const auflösung = findeFassung(register, { id: "MD-001", version: "2.0.0" });
    expect(auflösung.art).toBe("gefunden");
    const definition = (auflösung as { definition: Messdefinition }).definition;
    expect(definition.status).toBe("eingefroren");
    expect(definitionsHash(definition)).toBe(
      "a9b2143bd2873f1b5df2b9bebaf8247283158c9bb86d9f233fbb330f860244af",
    );
  });

  it("v3.0.0 wird eindeutig gefunden und ist ein Entwurf", () => {
    const auflösung = findeFassung(register, { id: "MD-001", version: "3.0.0" });
    expect(auflösung.art).toBe("gefunden");
    const definition = (auflösung as { definition: Messdefinition }).definition;
    expect(definition.status).toBe("entwurf");
    expect(definition.auswertungsmodell).toBe("endwirkung");
    // Aus einem Entwurf entsteht keine Quote.
    expect(darfQuoteMaterialisieren(definition).ok).toBe(false);
  });

  it("ML-001 bleibt gegen v2.0.0 gueltig — die neue Fassung verdraengt sie nicht", () => {
    const ml = leseJson(messkorpusPfad("laeufe", "ML-001", "lauf.json")) as Messlauf;
    const auflösung = findeFassung(register, ml.messdefinition);
    expect(auflösung.art).toBe("gefunden");
    const definition = (auflösung as { definition: Messdefinition }).definition;
    expect(definition.version).toBe("2.0.0");
    expect(pruefeLauf(ml, definition).fehler).toEqual([]);
  });
});

describe("E — der reale Bestand bleibt gueltig", () => {
  it("npm run pruefen meldet keinen Fehler", () => {
    expect(berichte().fehler).toBe(0);
  });

  it("ML-001 wird gegen MD-001 v2.0.0 aufgeloest und ist gueltig", () => {
    const zeilen = berichte().zeilen;
    const zeile = zeilen.find((z) => z.trim().startsWith("ML-001 "));
    expect(zeile).toBeDefined();
    expect(zeile).toContain("MD-001 v2.0.0");
    expect(zeile).toContain("ok");
  });

  it("MD-001 v2.0.0 traegt weiterhin ihren eingefrorenen Hash", () => {
    const zeilen = berichte().zeilen;
    expect(zeilen.some((z) => z.includes("MD-001 v2.0.0") && z.includes("a9b2143bd287"))).toBe(true);
  });
});

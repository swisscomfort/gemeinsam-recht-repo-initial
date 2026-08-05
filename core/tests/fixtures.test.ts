/**
 * Laedt alle FX-Fixtures und vergleicht das Ergebnis von bewerteFall mit
 * expected.json.
 *
 * expected.json hat die Form { heute, ergebnis }; `ergebnis` ist das
 * vollstaendige erwartete Ergebnis OHNE trace.zeitpunkt (dieser wird aus dem
 * injizierten `heute` deterministisch gesetzt und separat geprueft).
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { bewerteFall } from "../src/index.js";

const HIER = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HIER, "fixtures");

const dirs = readdirSync(FIXTURES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("FX-"))
  .map((d) => d.name)
  .sort();

describe("Fixtures FX-001…FX-020", () => {
  it("alle 20 Fixtures vorhanden", () => {
    expect(dirs).toHaveLength(20);
  });

  for (const dir of dirs) {
    it(`${dir}: bewerteFall liefert exakt das erwartete Ergebnis`, () => {
      const fall = JSON.parse(
        readFileSync(join(FIXTURES_DIR, dir, "case.json"), "utf8"),
      );
      const expected = JSON.parse(
        readFileSync(join(FIXTURES_DIR, dir, "expected.json"), "utf8"),
      ) as { heute: string; ergebnis: Record<string, unknown> };

      const ergebnis = bewerteFall(fall, expected.heute) as unknown as Record<
        string,
        unknown
      >;

      // trace.zeitpunkt separat pruefen (deterministisch aus heute).
      const trace = ergebnis["trace"] as Record<string, unknown>;
      expect(trace["zeitpunkt"]).toBe(`${expected.heute}T00:00:00Z`);

      const { zeitpunkt: _zeitpunkt, ...traceOhneZeitpunkt } = trace;
      const vergleich = { ...ergebnis, trace: traceOhneZeitpunkt };
      expect(vergleich).toEqual(expected.ergebnis);
    });
  }
});

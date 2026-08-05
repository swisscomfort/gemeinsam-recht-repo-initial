/**
 * Determinismus: zweifacher Lauf ueber alle Fixtures ergibt ein
 * byte-identisches Ergebnis (100 % Reproduzierbarkeit, Plan §4 Schritt 1).
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

describe("Determinismus", () => {
  for (const dir of dirs) {
    it(`${dir}: zwei Laeufe => byte-identisches JSON`, () => {
      const fall = JSON.parse(
        readFileSync(join(FIXTURES_DIR, dir, "case.json"), "utf8"),
      );
      const { heute } = JSON.parse(
        readFileSync(join(FIXTURES_DIR, dir, "expected.json"), "utf8"),
      ) as { heute: string };

      const lauf1 = JSON.stringify(bewerteFall(fall, heute));
      const lauf2 = JSON.stringify(
        bewerteFall(JSON.parse(JSON.stringify(fall)), heute),
      );
      expect(lauf2).toBe(lauf1);
    });
  }

  it("bewerteFall mutiert das Eingabeobjekt nicht", () => {
    const dir = dirs[0] as string;
    const fall = JSON.parse(
      readFileSync(join(FIXTURES_DIR, dir, "case.json"), "utf8"),
    );
    const { heute } = JSON.parse(
      readFileSync(join(FIXTURES_DIR, dir, "expected.json"), "utf8"),
    ) as { heute: string };
    const vorher = JSON.stringify(fall);
    bewerteFall(fall, heute);
    expect(JSON.stringify(fall)).toBe(vorher);
  });
});

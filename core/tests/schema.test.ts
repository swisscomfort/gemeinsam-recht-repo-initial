/**
 * Schema-Validierung aller Fixtures gegen schemas/case-object.schema.json (ajv).
 *
 * Luecken-Fixtures, deren Konstellation laut Auftrag §5 gerade in einer
 * Schema-Verletzung besteht (fehlendes Pflichtfeld bzw. Schema-Pflicht bei
 * Familienwohnung), MUESSEN als schema-ungueltig erkannt werden — genau an
 * der erwarteten Stelle. Alle uebrigen Fixtures muessen gueltig sein.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

const HIER = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HIER, "fixtures");
const SCHEMA_PATH = join(HIER, "..", "..", "schemas", "case-object.schema.json");

/** Erwartet schema-ungueltig, mit Pruefausdruck auf die Fehlerursache. */
const ERWARTET_UNGUELTIG: Record<string, (fehler: string) => boolean> = {
  "FX-012": (f) => f.includes("zugestellt_am"),
  "FX-013": (f) => f.includes("zugestellt_am"),
  "FX-014": (f) => f.includes("separate_zustellung_beide") || f.includes("/wohnung"),
};

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
const validate = ajv.compile(schema);

const dirs = readdirSync(FIXTURES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("FX-"))
  .map((d) => d.name)
  .sort();

describe("Fixtures vs. case-object.schema.json", () => {
  it("es existieren genau 20 Fixtures FX-001…FX-020", () => {
    expect(dirs).toHaveLength(20);
    const ids = dirs.map((d) => d.slice(0, 6));
    expect(ids).toEqual(
      Array.from({ length: 20 }, (_, i) => `FX-${String(i + 1).padStart(3, "0")}`),
    );
  });

  for (const dir of dirs) {
    const id = dir.slice(0, 6);
    const fall = JSON.parse(
      readFileSync(join(FIXTURES_DIR, dir, "case.json"), "utf8"),
    );

    it(`${dir}: meta.fixture=true (Kennzeichnungspflicht, Invariante 2)`, () => {
      expect(fall.meta?.fixture).toBe(true);
    });

    const pruefer = ERWARTET_UNGUELTIG[id];
    if (pruefer) {
      it(`${dir}: verletzt das Schema an der erwarteten Stelle`, () => {
        const gueltig = validate(fall);
        expect(gueltig).toBe(false);
        const fehlerText = ajv.errorsText(validate.errors, { separator: " | " });
        expect(pruefer(fehlerText)).toBe(true);
      });
    } else {
      it(`${dir}: validiert gegen das Schema`, () => {
        const gueltig = validate(fall);
        expect(validate.errors ?? []).toEqual([]);
        expect(gueltig).toBe(true);
      });
    }
  }
});

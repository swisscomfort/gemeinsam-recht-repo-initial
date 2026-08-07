// Formatgarantie der Nacherzaehl-Entwuerfe (AUFTRAG-R1 §3): Jeder Entwurf
// unter redaktion/entwuerfe/ wird programmatisch gegen den BESTEHENDEN
// Feed-Parser geprueft (pruefeStory aus prototypen/feed — unveraendert).
// Das Pruefdatum wird fest injiziert — keine Systemzeit im Test.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { pruefeStory } from "../../prototypen/feed/src/story.js";

/** Fest injiziertes Heute-Datum (Erstellungstag der Entwuerfe). */
const PRUEF_DATUM = "2026-08-07";

const entwuerfeVerzeichnis = fileURLToPath(new URL("../entwuerfe", import.meta.url));
const ordner = readdirSync(entwuerfeVerzeichnis, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name.startsWith("FS-1"))
  .map((e) => e.name)
  .sort();

describe("Entwuerfe — Parser-Pruefung (pruefeStory, injiziertes Heute-Datum)", () => {
  it("es liegen genau drei Entwuerfe FS-101 bis FS-103 vor", () => {
    expect(ordner.map((o) => o.slice(0, 6))).toEqual(["FS-101", "FS-102", "FS-103"]);
  });

  for (const name of ordner) {
    it(`${name}: meta.yaml + story.md werden vom Feed-Parser angenommen`, () => {
      const metaRoh = readFileSync(join(entwuerfeVerzeichnis, name, "meta.yaml"), "utf8");
      const storyRoh = readFileSync(join(entwuerfeVerzeichnis, name, "story.md"), "utf8");
      const ergebnis = pruefeStory(name, metaRoh, storyRoh, PRUEF_DATUM);
      if (!ergebnis.ok) {
        throw new Error(`Verweigert:\n- ${ergebnis.verweigerung.gruende.join("\n- ")}`);
      }
      expect(ergebnis.story.meta.kennzeichnung).toBe("NACHERZAEHLT_OEFFENTLICH");
      expect(ergebnis.story.meta.quelle).toBeTruthy();
      expect(ergebnis.story.etappen).toHaveLength(ergebnis.story.meta.etappen);
    });
  }

  it("ohne injiziertes Pruefdatum verweigert der Parser jeden Entwurf", () => {
    const name = ordner[0]!;
    const metaRoh = readFileSync(join(entwuerfeVerzeichnis, name, "meta.yaml"), "utf8");
    const storyRoh = readFileSync(join(entwuerfeVerzeichnis, name, "story.md"), "utf8");
    const ergebnis = pruefeStory(name, metaRoh, storyRoh);
    expect(ergebnis.ok).toBe(false);
  });
});

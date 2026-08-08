// Parser-Pruefung der Nacherzaehl-Entwuerfe (AUFTRAG-R1 §3, seit MANIFEST
// v2.1 §3 erweitert): Jeder Entwurf unter redaktion/entwuerfe/ wird
// programmatisch gegen den BESTEHENDEN Feed-Parser geprueft (pruefeStory aus
// prototypen/feed — unveraendert). Das Pruefdatum wird fest injiziert —
// keine Systemzeit im Test.
//
// Seit MANIFEST v2.1 §3 sind aktenzeichen/instanz/kanton/rubrik/regel_id/
// regel_version/norm_fundstelle Pflicht. Die Anzahl der Entwuerfe ist
// bewusst NICHT fest kodiert (frueher: "genau FS-106 und FS-108") — neue
// Entwuerfe (z. B. aus AUFTRAG-FALLAUFNAHME-Laeufen, regel_id ggf. mit dem
// Praefix "OFFEN:", vom Parser akzeptiert) duerfen dazukommen, ohne dass
// dieser Test bricht. Geprueft wird jeder vorhandene Ordner einzeln gegen
// den Parser; ob ein Entwurf spaeter freigegeben wird, ist redaktionelle
// Entscheidung und nicht Gegenstand dieses Tests.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { pruefeStory } from "../../prototypen/feed/src/story.js";

/** Fest injiziertes Heute-Datum (Erstellungstag der Entwuerfe). */
const PRUEF_DATUM = "2026-08-08";

const entwuerfeVerzeichnis = fileURLToPath(new URL("../entwuerfe", import.meta.url));
const ordner = readdirSync(entwuerfeVerzeichnis, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name.startsWith("FS-1"))
  .map((e) => e.name)
  .sort();

describe("Entwuerfe — Parser-Pruefung (pruefeStory, injiziertes Heute-Datum)", () => {
  it("mindestens ein Entwurf ist vorhanden (sonst liefe die folgende Schleife leer und stumm)", () => {
    expect(ordner.length).toBeGreaterThan(0);
  });

  for (const name of ordner) {
    it(`${name}: meta.yaml + story.md werden vom Feed-Parser angenommen (regel_id gesetzt, MANIFEST v2.1 §3)`, () => {
      const metaRoh = readFileSync(join(entwuerfeVerzeichnis, name, "meta.yaml"), "utf8");
      const storyRoh = readFileSync(join(entwuerfeVerzeichnis, name, "story.md"), "utf8");
      const ergebnis = pruefeStory(name, metaRoh, storyRoh, PRUEF_DATUM);
      if (!ergebnis.ok) {
        throw new Error(`Verweigert:\n- ${ergebnis.verweigerung.gruende.join("\n- ")}`);
      }
      expect(ergebnis.story.meta.kennzeichnung).toBe("NACHERZAEHLT_OEFFENTLICH");
      expect(ergebnis.story.meta.regel_id).toBeTruthy();
      expect(ergebnis.story.meta.norm_fundstelle).toBeTruthy();
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

// Tests der Platzhalter-Serien FS-9xx (AUFTRAG-F1 §5/§7): FIKTIV +
// titelseitiger PLATZHALTER-Hinweis, Schutzstufe maximal S2, 2-3 Etappen,
// und die harte Regel: keine Gesetzesartikel, keine Artikelnennungen.

import { describe, expect, it } from "vitest";
import { ladeAlle } from "../src/quelle";
import { pruefeStory } from "../src/story";

const metaDateien = import.meta.glob("../../stories/*/meta.yaml", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const storyDateien = import.meta.glob("../../stories/*/story.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const platzhalter = Object.keys(metaDateien)
  .filter((pfad) => pfad.includes("/FS-9"))
  .sort()
  .map((pfad) => {
    const verzeichnis = pfad.slice(0, pfad.lastIndexOf("/"));
    return {
      name: verzeichnis.slice(verzeichnis.lastIndexOf("/") + 1),
      meta: metaDateien[pfad]!,
      story: storyDateien[`${verzeichnis}/story.md`]!,
    };
  });

describe("Platzhalter-Serien FS-9xx (F1 §5)", () => {
  it("es gibt hoechstens 4 Platzhalter-Serien, alle unter FS-9xx-platzhalter-*", () => {
    expect(platzhalter.length).toBeGreaterThan(0);
    expect(platzhalter.length).toBeLessThanOrEqual(4);
    for (const p of platzhalter) {
      expect(p.name).toMatch(/^FS-9\d\d-platzhalter-/);
    }
  });

  it("jede Platzhalter-Serie ist gueltig (FIKTIV) und hat 2-3 Etappen, Schutzstufe max S2", () => {
    for (const p of platzhalter) {
      const ergebnis = pruefeStory(p.name, p.meta, p.story);
      expect(ergebnis.ok, `${p.name} muss gueltig sein`).toBe(true);
      if (!ergebnis.ok) continue;
      expect(ergebnis.story.etappen.length).toBeGreaterThanOrEqual(2);
      expect(ergebnis.story.etappen.length).toBeLessThanOrEqual(3);
      expect(["S1", "S2"]).toContain(ergebnis.story.meta.schutzstufe);
    }
  });

  it("traegt den PLATZHALTER-Hinweis titelseitig (meta-Titel und story.md)", () => {
    for (const p of platzhalter) {
      expect(p.meta).toContain("PLATZHALTER");
      expect(p.story).toContain("PLATZHALTER");
      expect(p.story).toContain("wird durch Redaktionsinhalt ersetzt");
    }
  });

  it("enthaelt keine Gesetzesartikel und keine Artikelnennungen (Invariante 3)", () => {
    const artikelmuster = /Art\.\s*\d|Artikel|§|Abs\.\s*\d|Gesetz|Paragraph/;
    const abkuerzungen = /\b(OR|ZGB|ZPO|StGB|BGE|BV|VVG|KKG)\b/;
    for (const p of platzhalter) {
      const inhalt = `${p.meta}\n${p.story}`;
      expect(artikelmuster.test(inhalt), `${p.name}: Artikelnennung gefunden`).toBe(false);
      expect(abkuerzungen.test(inhalt), `${p.name}: Gesetzesabkuerzung gefunden`).toBe(false);
    }
  });

  it("mindestens eine Platzhalter-Serie liegt im Rechtsgebiet mietrecht_* (Uebergangsknopf)", () => {
    expect(platzhalter.some((p) => /rechtsgebiet:\s*mietrecht_/.test(p.meta))).toBe(true);
  });

  it("die Platzhalter-Serien werden vom Feed akzeptiert (erscheinen in der Ausgabe)", () => {
    const ids = ladeAlle().akzeptiert.map((s) => s.meta.id);
    for (const p of platzhalter) {
      expect(ids).toContain(p.name.slice(0, 6));
    }
  });
});

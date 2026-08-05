// Tests der Story-Validierung (AUFTRAG-F0, Teil E).
// FS-001 ist die einzige echte Repo-Story (FIKTIV gekennzeichnet, Plan-konform);
// alle Negativfaelle sind FX-Fixtures (fixture: true, Invariante 2).

import { describe, expect, it } from "vitest";
import { pruefeStory } from "../src/story";

import fs001Meta from "../../stories/FS-001-rebell-20-franken/meta.yaml?raw";
import fs001Story from "../../stories/FS-001-rebell-20-franken/story.md?raw";
import fxGueltigMeta from "./fixtures/FX-SONST-GUELTIG/meta.yaml?raw";
import fxGueltigStory from "./fixtures/FX-SONST-GUELTIG/story.md?raw";
import fxOhneMeta from "./fixtures/FX-OHNE-KENNZEICHNUNG/meta.yaml?raw";
import fxOhneStory from "./fixtures/FX-OHNE-KENNZEICHNUNG/story.md?raw";
import fxFalschMeta from "./fixtures/FX-KENNZEICHNUNG-FALSCH/meta.yaml?raw";
import fxFalschStory from "./fixtures/FX-KENNZEICHNUNG-FALSCH/story.md?raw";
import fxS4Meta from "./fixtures/FX-SCHUTZSTUFE-S4/meta.yaml?raw";
import fxS4Story from "./fixtures/FX-SCHUTZSTUFE-S4/story.md?raw";
import fxUnbekanntMeta from "./fixtures/FX-UNBEKANNTER-SCHLUESSEL/meta.yaml?raw";
import fxUnbekanntStory from "./fixtures/FX-UNBEKANNTER-SCHLUESSEL/story.md?raw";
import fxMismatchMeta from "./fixtures/FX-ETAPPEN-MISMATCH/meta.yaml?raw";
import fxMismatchStory from "./fixtures/FX-ETAPPEN-MISMATCH/story.md?raw";

function gruendeVon(metaRoh: string, storyRoh: string): string[] {
  const ergebnis = pruefeStory("test", metaRoh, storyRoh);
  expect(ergebnis.ok).toBe(false);
  return ergebnis.ok ? [] : ergebnis.verweigerung.gruende;
}

describe("pruefeStory — Annahme", () => {
  it("akzeptiert FS-001 und zerlegt sie in 3 Etappen", () => {
    const ergebnis = pruefeStory("FS-001", fs001Meta, fs001Story);
    expect(ergebnis.ok).toBe(true);
    if (!ergebnis.ok) return;
    const { meta, etappen } = ergebnis.story;
    expect(meta.id).toBe("FS-001");
    expect(meta.titel).toBe("Der Rebell gegen die 20-Franken-Marke");
    expect(meta.schutzstufe).toBe("S2");
    expect(meta.etappen).toBe(3);
    expect(meta.missions_status).toEqual(["eingereicht", "recherche", "urteil_erkenntnis"]);
    expect(meta.prinzipien).toHaveLength(3);
    expect(meta.emotions_ziel).toEqual(["Empoerung zu Neugier", "Aha-Moment", "Verstaendnis"]);
    expect(etappen).toHaveLength(3);
    expect(etappen[0]!.titel).toContain("Der Rebell gegen die 20-Franken-Marke");
    expect(etappen[2]!.titel).toContain("Das Urteil");
    expect(etappen[1]!.text).toContain("CHF 0.15");
  });
});

describe("pruefeStory — Verweigerung", () => {
  it("verweigert Fixtures selbst dann, wenn sie sonst gueltig sind (fixture: true)", () => {
    const gruende = gruendeVon(fxGueltigMeta, fxGueltigStory);
    expect(gruende).toHaveLength(1);
    expect(gruende[0]).toContain("Test-Fixture");
  });

  it("verweigert bei fehlendem Kennzeichnungs-Schluessel", () => {
    const gruende = gruendeVon(fxOhneMeta, fxOhneStory);
    expect(gruende.some((g) => g.includes('Pflichtschluessel fehlt: "kennzeichnung"'))).toBe(true);
  });

  it('verweigert, wenn die Kennzeichnung nicht exakt "FIKTIV" ist (z. B. "fiktiv")', () => {
    const gruende = gruendeVon(fxFalschMeta, fxFalschStory);
    expect(gruende.some((g) => g.includes('nicht exakt "FIKTIV"'))).toBe(true);
  });

  it("verweigert Schutzstufe S4 (Belastungsschutz, F1)", () => {
    const gruende = gruendeVon(fxS4Meta, fxS4Story);
    expect(gruende.some((g) => g.includes("Schutzstufe S4"))).toBe(true);
  });

  it("verweigert Schutzstufe S5 (Belastungsschutz, F1)", () => {
    const gruende = gruendeVon(fxS4Meta.replace("schutzstufe: S4", "schutzstufe: S5"), fxS4Story);
    expect(gruende.some((g) => g.includes("Schutzstufe S5"))).toBe(true);
  });

  it("verweigert unbekannte Schluessel streng, nie stillschweigend", () => {
    const gruende = gruendeVon(fxUnbekanntMeta, fxUnbekanntStory);
    expect(gruende.some((g) => g.includes('Unbekannter oder falsch geschriebener Schluessel: "bonus_punkte"'))).toBe(true);
  });

  it("verweigert falsch geschriebene Pflichtschluessel (Tippfehler)", () => {
    const meta = fxGueltigMeta.replace("rechtsgebiet:", "rechtsgebeit:");
    const gruende = gruendeVon(meta, fxGueltigStory);
    expect(gruende.some((g) => g.includes('"rechtsgebeit"'))).toBe(true);
    expect(gruende.some((g) => g.includes('Pflichtschluessel fehlt: "rechtsgebiet"'))).toBe(true);
  });

  it("verweigert bei Etappen-Mismatch zwischen meta.yaml und story.md", () => {
    const gruende = gruendeVon(fxMismatchMeta, fxMismatchStory);
    expect(gruende.some((g) => g.includes('story.md hat 3 Etappen-Ueberschriften'))).toBe(true);
  });

  it("verweigert story.md ohne sichtbare Kennzeichnungszeile", () => {
    const storyOhneZeile = fxGueltigStory
      .split("\n")
      .filter((z) => !z.includes("KENNZEICHNUNG"))
      .join("\n");
    const gruende = gruendeVon(fxGueltigMeta, storyOhneZeile);
    expect(gruende.some((g) => g.includes("keine sichtbare Kennzeichnungszeile"))).toBe(true);
  });

  it("verweigert doppelte Schluessel", () => {
    const gruende = gruendeVon(fxGueltigMeta + "id: FX-901\n", fxGueltigStory);
    expect(gruende.some((g) => g.includes('Doppelter Schluessel: "id"'))).toBe(true);
  });

  it("sammelt ALLE Gruende, nicht nur den ersten", () => {
    const gruende = gruendeVon(fxUnbekanntMeta.replace("kennzeichnung: FIKTIV", "kennzeichnung: real"), fxUnbekanntStory);
    expect(gruende.length).toBeGreaterThanOrEqual(3);
  });
});

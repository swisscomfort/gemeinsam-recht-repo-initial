/**
 * Snapshot-Tests der Mustertexte (AUFTRAG-S2 §1 E):
 *   M1 mit FX-001 (Regelfall GELB -> Anfechtungsbegehren)
 *   M2 mit FX-002 (Formular fehlt, GRUEN -> Mitteilung Nichtigkeit)
 *
 * Deterministische Werte stammen aus Fixture + Kern (kuendigung_datum,
 * frist_datum); persoenliche Angaben bleiben bewusst ungefuellt, damit die
 * Platzhalter-Mechanik sichtbar geprueft wird.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  bewerteFall,
  erzeugeBrief,
  PFLICHT_PLATZHALTER,
  platzhalterInVorlage,
} from "../src/index.js";
import type { BriefWerte } from "../src/index.js";

const HIER = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HIER, "fixtures");

function fixtureWerte(dir: string): BriefWerte {
  const fall = JSON.parse(
    readFileSync(join(FIXTURES_DIR, dir, "case.json"), "utf8"),
  ) as { kuendigung: { zugestellt_am: string } };
  const expected = JSON.parse(
    readFileSync(join(FIXTURES_DIR, dir, "expected.json"), "utf8"),
  ) as { heute: string };
  const ergebnis = bewerteFall(fall, expected.heute);
  if (ergebnis.status !== "OK") throw new Error(`${dir}: erwartet OK`);
  return {
    kuendigung_datum: fall.kuendigung.zugestellt_am,
    frist_datum: ergebnis.fristen.anfechtungsfrist_bis,
    ort: "Luzern",
    datum: expected.heute,
  };
}

describe("Briefvorlagen M1/M2", () => {
  it("M1 (FX-001): Markdown-Snapshot", () => {
    const brief = erzeugeBrief("M1", fixtureWerte("FX-001-regelfall-a-post"));
    expect(brief.markdown).toMatchSnapshot();
  });

  it("M1 (FX-001): HTML-Snapshot (druckfaehig)", () => {
    const brief = erzeugeBrief("M1", fixtureWerte("FX-001-regelfall-a-post"));
    expect(brief.html).toMatchSnapshot();
  });

  it("M2 (FX-002): Markdown-Snapshot", () => {
    const brief = erzeugeBrief("M2", fixtureWerte("FX-002-formular-fehlt"));
    expect(brief.markdown).toMatchSnapshot();
  });

  it("M2 (FX-002): HTML-Snapshot (druckfaehig)", () => {
    const brief = erzeugeBrief("M2", fixtureWerte("FX-002-formular-fehlt"));
    expect(brief.html).toMatchSnapshot();
  });

  it("M1 enthaelt alle Pflicht-Platzhalter", () => {
    const vorhanden = platzhalterInVorlage("M1");
    for (const p of PFLICHT_PLATZHALTER) {
      expect(vorhanden).toContain(p);
    }
  });

  it("M2 enthaelt die Pflicht-Platzhalter ausser der Behoerdenadresse (dokumentierte Auslegung)", () => {
    const vorhanden = platzhalterInVorlage("M2");
    for (const p of PFLICHT_PLATZHALTER) {
      if (p === "adresse_schlichtungsbehoerde") {
        expect(vorhanden).not.toContain(p);
      } else {
        expect(vorhanden).toContain(p);
      }
    }
  });

  it("ungefuellte Platzhalter bleiben sichtbar und werden gemeldet; Behoerdenadresse wird nie erfunden", () => {
    const brief = erzeugeBrief("M1", fixtureWerte("FX-001-regelfall-a-post"));
    expect(brief.markdown).toContain("{{name_mieter}}");
    expect(brief.markdown).toContain("VOM_NUTZER_ZU_ERGAENZEN");
    expect([...brief.offene_platzhalter].sort()).toEqual(
      [
        "adresse_mieter",
        "adresse_schlichtungsbehoerde",
        "adresse_vermieter",
        "name_mieter",
        "name_vermieter",
        "wohnungsadresse",
      ].sort(),
    );
    expect(brief.pruefstand).toBe("fachlich_zu_verifizieren");
  });

  it("gefuellte Werte werden eingesetzt und im HTML escaped", () => {
    const brief = erzeugeBrief("M2", {
      ...fixtureWerte("FX-002-formular-fehlt"),
      name_mieter: "Muster & Co. <Test>",
      adresse_mieter: "Musterweg 1, 6000 Luzern",
      name_vermieter: "V. Beispiel",
      adresse_vermieter: "Beispielgasse 2, 6000 Luzern",
      wohnungsadresse: "Musterweg 1, 6000 Luzern",
    });
    expect(brief.offene_platzhalter).toEqual([]);
    expect(brief.markdown).not.toContain("{{");
    expect(brief.html).toContain("Muster &amp; Co. &lt;Test&gt;");
    expect(brief.html).not.toContain("<Test>");
  });

  it("Determinismus: Doppellauf byte-identisch", () => {
    const werte = fixtureWerte("FX-001-regelfall-a-post");
    const a = erzeugeBrief("M1", werte);
    const b = erzeugeBrief("M1", werte);
    expect(a.markdown).toBe(b.markdown);
    expect(a.html).toBe(b.html);
  });
});

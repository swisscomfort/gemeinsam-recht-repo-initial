/**
 * Ampel-Mapping gegen alle 20 Fixtures (AUFTRAG-S2 §1 E).
 *
 * Erwartung gemaess Auftrag:
 *   GRUEN: FX-002, FX-003, FX-004, FX-005, FX-018
 *   GELB:  FX-001, FX-006…FX-011, FX-019
 *   ROT:   FX-020
 *   keine Ampel (LUECKE): FX-012…FX-017
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { bewerteFall, erstelleEinschaetzung, QUELLEN } from "../src/index.js";
import type { Ampel, QuelleId } from "../src/index.js";

const HIER = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HIER, "fixtures");

const ERWARTETE_AMPEL: Record<string, Ampel | null> = {
  "FX-001": "GELB",
  "FX-002": "GRUEN",
  "FX-003": "GRUEN",
  "FX-004": "GRUEN",
  "FX-005": "GRUEN",
  "FX-006": "GELB",
  "FX-007": "GELB",
  "FX-008": "GELB",
  "FX-009": "GELB",
  "FX-010": "GELB",
  "FX-011": "GELB",
  "FX-012": null,
  "FX-013": null,
  "FX-014": null,
  "FX-015": null,
  "FX-016": null,
  "FX-017": null,
  "FX-018": "GRUEN",
  "FX-019": "GELB",
  "FX-020": "ROT",
};

const dirs = readdirSync(FIXTURES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("FX-"))
  .map((d) => d.name)
  .sort();

function ladeFixture(dir: string): {
  fall: unknown;
  heute: string;
  fehlend?: string[];
} {
  const fall = JSON.parse(
    readFileSync(join(FIXTURES_DIR, dir, "case.json"), "utf8"),
  );
  const expected = JSON.parse(
    readFileSync(join(FIXTURES_DIR, dir, "expected.json"), "utf8"),
  ) as { heute: string; ergebnis: { fehlend?: string[] } };
  return { fall, heute: expected.heute, fehlend: expected.ergebnis.fehlend };
}

describe("Ampel-Mapping (einschaetzung.ts) gegen FX-001…FX-020", () => {
  for (const dir of dirs) {
    const kurz = dir.slice(0, 6);
    const erwartet = ERWARTETE_AMPEL[kurz];
    it(`${dir}: Ampel ${erwartet ?? "keine (LUECKE)"}`, () => {
      const { fall, heute, fehlend } = ladeFixture(dir);
      const einschaetzung = erstelleEinschaetzung(bewerteFall(fall, heute));

      expect(einschaetzung.ampel).toBe(erwartet);
      expect(einschaetzung.pruefstand).toBe("fachlich_zu_verifizieren");
      expect(einschaetzung.regelversion).toBe("0.1.0");

      if (einschaetzung.status === "LUECKE") {
        // Keine Ampel; Liste der fehlenden Punkte wie im Kern-Ergebnis.
        expect(einschaetzung.fehlende_punkte).toEqual(fehlend);
        expect(einschaetzung.fehlende_punkte.length).toBeGreaterThan(0);
        expect(einschaetzung.optionen).toEqual([]);
        expect(einschaetzung.frist_datum).toBeNull();
      } else {
        // Zitierte Artikel stammen ausschliesslich aus dem Quellenregister.
        for (const quelle of einschaetzung.artikel) {
          expect(QUELLEN[quelle.id as QuelleId]).toEqual(quelle);
        }
        for (const begruendung of einschaetzung.begruendungen) {
          expect(begruendung.artikel).toBe(QUELLEN[begruendung.quelle_id].artikel);
          expect(begruendung.text).toContain(begruendung.artikel);
        }
      }
    });
  }

  it("Determinismus: Doppellauf liefert identische Einschaetzung", () => {
    const { fall, heute } = ladeFixture("FX-002-formular-fehlt");
    const a = erstelleEinschaetzung(bewerteFall(fall, heute));
    const b = erstelleEinschaetzung(bewerteFall(fall, heute));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("Optionslisten und Fristaussagen", () => {
  it("GELB (FX-001): fixe Option M1 mit konkretem Fristdatum", () => {
    const { fall, heute } = ladeFixture("FX-001-regelfall-a-post");
    const e = erstelleEinschaetzung(bewerteFall(fall, heute));
    if (e.status !== "OK") throw new Error("erwartet OK");
    expect(e.frist_datum).toBe("2026-10-02");
    expect(e.optionen).toEqual([
      {
        id: "BRIEF_M1",
        text: "Anfechtung bei der Schlichtungsbehoerde bis 2026-10-02 (Brief M1)",
        brief: "M1",
      },
    ]);
    expect(e.textbaustein).toContain("2026-10-02");
  });

  it("GRUEN mit Nichtigkeits-Flag (FX-002): Optionen M2 und M1", () => {
    const { fall, heute } = ladeFixture("FX-002-formular-fehlt");
    const e = erstelleEinschaetzung(bewerteFall(fall, heute));
    if (e.status !== "OK") throw new Error("erwartet OK");
    expect(e.optionen.map((o) => o.id)).toEqual(["BRIEF_M2", "BRIEF_M1"]);
    expect(e.optionen[0]?.text).toBe(
      "Nichtigkeit gegenueber Vermieter geltend machen (Brief M2)",
    );
    expect(e.optionen[1]?.text).toBe("Anfechtung einreichen (Brief M1)");
    expect(e.begruendungen.map((b) => b.flag)).toEqual(["nichtig_formular_fehlt"]);
  });

  it("GRUEN ohne Nichtigkeits-Flag (FX-004): nur Option M1", () => {
    const { fall, heute } = ladeFixture("FX-004-sperrfrist-271a");
    const e = erstelleEinschaetzung(bewerteFall(fall, heute));
    if (e.status !== "OK") throw new Error("erwartet OK");
    expect(e.optionen.map((o) => o.id)).toEqual(["BRIEF_M1"]);
  });

  it("ROT (FX-020): fixe Beratungsstellen-Option, kein Brief", () => {
    const { fall, heute } = ladeFixture("FX-020-frist-abgelaufen");
    const e = erstelleEinschaetzung(bewerteFall(fall, heute));
    if (e.status !== "OK") throw new Error("erwartet OK");
    expect(e.frist_abgelaufen).toBe(true);
    expect(e.optionen).toEqual([
      {
        id: "BERATUNGSSTELLE",
        text: "Frist verpasst – weitere Moeglichkeiten mit Beratungsstelle klaeren; keine neuen Rechtsbehauptungen",
        brief: null,
      },
    ]);
  });

  it("Sonderfall befristet (FX-019): GELB, Zusatzhinweis, keine Fristaussage im Text", () => {
    const { fall, heute } = ladeFixture("FX-019-befristetes-verhaeltnis");
    const ergebnis = bewerteFall(fall, heute);
    const e = erstelleEinschaetzung(ergebnis);
    if (e.status !== "OK" || ergebnis.status !== "OK") throw new Error("erwartet OK");
    expect(e.ampel).toBe("GELB");
    expect(e.frist_datum).toBeNull();
    expect(e.zusatzhinweise).toHaveLength(1);
    expect(e.zusatzhinweise[0]).toContain("befristet");
    // Das berechnete Datum darf nirgends im Text als Frist auftauchen.
    const datum = ergebnis.fristen.anfechtungsfrist_bis;
    expect(e.textbaustein).not.toContain(datum);
    for (const option of e.optionen) {
      expect(option.text).not.toContain(datum);
    }
  });
});

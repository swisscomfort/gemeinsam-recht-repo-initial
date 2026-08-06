// Tests der Morgenausgabe (AUFTRAG-F0, Teil E): 3–5 Karten, festes Ende,
// Determinismus. Die Mehr-Story-Faelle nutzen synthetische In-Memory-Objekte
// (Testdaten im Code, FX-IDs — keine realen Faelle, Invariante 2).

import { describe, expect, it } from "vitest";
import { ABSCHLUSS, BADGE, MAX_KARTEN, morgenausgabe } from "../src/ausgabe";
import { pruefeStory, type Story } from "../src/story";

import fs001Meta from "../../stories/FS-001-rebell-20-franken/meta.yaml?raw";
import fs001Story from "../../stories/FS-001-rebell-20-franken/story.md?raw";

function fs001(): Story {
  const ergebnis = pruefeStory("FS-001", fs001Meta, fs001Story);
  if (!ergebnis.ok) throw new Error("FS-001 muss gueltig sein");
  return ergebnis.story;
}

function testStory(id: string, etappenAnzahl: number): Story {
  return {
    meta: {
      id,
      titel: `${id} — synthetische Teststory`,
      kennzeichnung: "FIKTIV",
      rechtsgebiet: "testgebiet",
      schutzstufe: "S1",
      etappen: etappenAnzahl,
      missions_status: Array.from({ length: etappenAnzahl }, (_, i) => `schritt_${i + 1}`),
      prinzipien: ["testprinzip"],
      emotions_ziel: ["Test zu Test"],
      autor: "test",
      erstellt: "2026-08-05",
    },
    etappen: Array.from({ length: etappenAnzahl }, (_, i) => ({
      nr: i + 1,
      titel: `Etappe ${i + 1}`,
      text: `Synthetischer Testtext ${i + 1}.`,
    })),
  };
}

describe("morgenausgabe", () => {
  it("erzeugt aus FS-001 genau 3 Karten mit FIKTIV-Badge und festem Ende", () => {
    const ausgabe = morgenausgabe([fs001()], "2026-08-05");
    expect(ausgabe.karten).toHaveLength(3);
    expect(ausgabe.wenigerAlsDrei).toBe(false);
    expect(ausgabe.abschluss).toBe(ABSCHLUSS);
    expect(ausgabe.abschluss).toBe("Fertig für heute");
    for (const karte of ausgabe.karten) {
      expect(karte.badge).toBe(BADGE);
      expect(karte.storyId).toBe("FS-001");
    }
    expect(ausgabe.karten.map((k) => k.missionsStatus)).toEqual([
      "eingereicht",
      "recherche",
      "urteil_erkenntnis",
    ]);
  });

  it("kappt hart bei 5 Karten, auch wenn mehr verfuegbar sind", () => {
    const stories = [testStory("FX-A01", 3), testStory("FX-A02", 3), testStory("FX-A03", 3)];
    const ausgabe = morgenausgabe(stories, "2026-08-05");
    expect(ausgabe.karten).toHaveLength(MAX_KARTEN);
  });

  it("ist deterministisch: gleiches Datum und gleiche Stories ergeben dieselbe Ausgabe", () => {
    const stories = [testStory("FX-A01", 3), testStory("FX-A02", 2), testStory("FX-A03", 4)];
    const a = morgenausgabe(stories, "2026-08-11");
    const b = morgenausgabe([...stories].reverse(), "2026-08-11");
    expect(a).toEqual(b);
  });

  it("erfindet bei weniger als 3 Karten nichts, sondern setzt den Hinweis", () => {
    const ausgabe = morgenausgabe([testStory("FX-A04", 2)], "2026-08-05");
    expect(ausgabe.karten).toHaveLength(2);
    expect(ausgabe.wenigerAlsDrei).toBe(true);
  });

  it("liefert auch ohne Stories eine leere Ausgabe mit festem Ende", () => {
    const ausgabe = morgenausgabe([], "2026-08-05");
    expect(ausgabe.karten).toHaveLength(0);
    expect(ausgabe.wenigerAlsDrei).toBe(true);
    expect(ausgabe.abschluss).toBe(ABSCHLUSS);
  });

  it("verlangt ein injiziertes Datum im Format JJJJ-MM-TT", () => {
    expect(() => morgenausgabe([], "heute")).toThrow();
    expect(() => morgenausgabe([], "05.08.2026")).toThrow();
  });
});

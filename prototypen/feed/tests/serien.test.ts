// Tests der Journey-Komposition (AUFTRAG-F1 §1/§7): Determinismus,
// Fortsetzung ueber aufeinanderfolgende Morgen, Folgen-Mechanik, festes
// Ende, verlustfreier Rueckweg. Testdaten sind synthetische In-Memory-
// Objekte (FX-IDs — keine realen Faelle, Invariante 2).

import { describe, expect, it } from "vitest";
import { ABSCHLUSS, MAX_KARTEN } from "../src/ausgabe";
import {
  etappeAmTag,
  folgeUmschalten,
  journeyAusgabe,
  ladeLeseZustand,
  merkeGesehen,
  naechsterMorgen,
  neuerLeseZustand,
  type JourneyAusgabe,
  type LeseZustand,
} from "../src/serien";
import type { Story } from "../src/story";

function testStory(id: string, etappenAnzahl: number, rechtsgebiet = "testgebiet"): Story {
  return {
    meta: {
      id,
      titel: `${id} — synthetische Teststory`,
      rechtsgebiet,
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

/** Spielt eine Tagesfolge ab (wie die UI: nach jeder Ausgabe wird gesehen gemerkt). */
function spieleTage(
  stories: Story[],
  startDatum: string,
  tage: number,
  zustand: LeseZustand = neuerLeseZustand(),
): JourneyAusgabe[] {
  const folge: JourneyAusgabe[] = [];
  let datum = startDatum;
  let aktuell = zustand;
  for (let i = 0; i < tage; i++) {
    const ausgabe = journeyAusgabe(stories, datum, aktuell);
    folge.push(ausgabe);
    aktuell = merkeGesehen(aktuell, ausgabe);
    datum = naechsterMorgen(datum);
  }
  return folge;
}

describe("journeyAusgabe — Determinismus und festes Ende", () => {
  const stories = [testStory("FX-J01", 3), testStory("FX-J02", 2), testStory("FX-J03", 3)];

  it("gleiche Stories + gleiche Tagesfolge ergeben identische Ausgabenfolge", () => {
    const a = spieleTage(stories, "2026-08-10", 7);
    const b = spieleTage([...stories].reverse(), "2026-08-10", 7);
    expect(a).toEqual(b);
  });

  it("jede Ausgabe endet mit 'Fertig für heute'", () => {
    for (const ausgabe of spieleTage(stories, "2026-08-10", 10)) {
      expect(ausgabe.abschluss).toBe(ABSCHLUSS);
      expect(ausgabe.abschluss).toBe("Fertig für heute");
    }
  });

  it("Serien verteilen ihre Etappen ueber aufeinanderfolgende Ausgaben (Fortsetzung)", () => {
    const story = testStory("FX-J04", 3);
    const heute = etappeAmTag(story, "2026-08-10");
    const morgen = etappeAmTag(story, naechsterMorgen("2026-08-10"));
    expect(morgen).toBe((heute % 3) + 1);
  });

  it("kappt hart bei 5 Karten und erfindet unter 3 nichts", () => {
    const viele = Array.from({ length: 7 }, (_, i) => testStory(`FX-K0${i + 1}`, 3));
    const voll = journeyAusgabe(viele, "2026-08-10", neuerLeseZustand());
    expect(voll.karten).toHaveLength(MAX_KARTEN);
    expect(voll.wenigerAlsDrei).toBe(false);

    const wenig = journeyAusgabe([testStory("FX-K08", 2)], "2026-08-10", neuerLeseZustand());
    expect(wenig.karten).toHaveLength(1);
    expect(wenig.wenigerAlsDrei).toBe(true);
    expect(wenig.abschluss).toBe(ABSCHLUSS);
  });

  it("verlangt ein injiziertes Datum im Format JJJJ-MM-TT", () => {
    expect(() => journeyAusgabe([], "heute", neuerLeseZustand())).toThrow();
    expect(() => journeyAusgabe([], "05.08.2026", neuerLeseZustand())).toThrow();
  });

  it("naechsterMorgen rechnet ueber Monatsgrenzen (Kern-Arithmetik)", () => {
    expect(naechsterMorgen("2026-08-31")).toBe("2026-09-01");
  });
});

describe("journeyAusgabe — Folgen-Mechanik (F1 §1)", () => {
  const stories = [testStory("FX-J01", 3), testStory("FX-J02", 2), testStory("FX-J03", 3)];

  it("gefolgte Serie mit neuem Update erscheint zuerst, mit Hinweis", () => {
    const datum = "2026-08-10";
    const gefolgtId = "FX-J03";
    const story = stories.find((s) => s.meta.id === gefolgtId)!;
    const heutigeEtappe = etappeAmTag(story, datum);
    const andereEtappe = (heutigeEtappe % story.meta.etappen) + 1;
    const zustand: LeseZustand = {
      gefolgt: [gefolgtId],
      gesehen: { [gefolgtId]: andereEtappe },
    };
    const ausgabe = journeyAusgabe(stories, datum, zustand);
    expect(ausgabe.karten[0]!.storyId).toBe(gefolgtId);
    expect(ausgabe.karten[0]!.updateHinweis).toBe(true);
  });

  it("erste Begegnung mit einer gefolgten Serie traegt keinen Update-Hinweis", () => {
    const zustand: LeseZustand = { gefolgt: ["FX-J02"], gesehen: {} };
    const ausgabe = journeyAusgabe(stories, "2026-08-10", zustand);
    for (const karte of ausgabe.karten) {
      expect(karte.updateHinweis).toBe(false);
    }
  });

  it("folgeUmschalten schaltet um, ohne den alten Zustand zu veraendern", () => {
    const alt = neuerLeseZustand();
    const gefolgt = folgeUmschalten(alt, "FX-J01");
    expect(gefolgt.gefolgt).toEqual(["FX-J01"]);
    expect(alt.gefolgt).toEqual([]);
    expect(folgeUmschalten(gefolgt, "FX-J01").gefolgt).toEqual([]);
  });
});

describe("journeyAusgabe — Uebergang und Rueckweg verlustfrei (F1 §2)", () => {
  it("nach einem Werkzeug-Ausflug ergibt derselbe Zustand dieselbe Ausgabe", () => {
    const stories = [testStory("FX-J01", 3), testStory("FX-J02", 2), testStory("FX-J03", 3)];
    const zustand: LeseZustand = { gefolgt: ["FX-J01"], gesehen: { "FX-J02": 1 } };
    const vorher = journeyAusgabe(stories, "2026-08-12", zustand);
    // Der Fragebaum-Ausflug beruehrt weder Stories noch Datum noch Lesestand.
    const nachher = journeyAusgabe(stories, "2026-08-12", zustand);
    expect(nachher).toEqual(vorher);
  });

  it("merkeGesehen liefert einen neuen Zustand und laesst den alten unveraendert", () => {
    const stories = [testStory("FX-J01", 3)];
    const alt = neuerLeseZustand();
    const ausgabe = journeyAusgabe(stories, "2026-08-12", alt);
    const neu = merkeGesehen(alt, ausgabe);
    expect(alt.gesehen).toEqual({});
    expect(neu.gesehen["FX-J01"]).toBe(ausgabe.karten[0]!.etappeNr);
  });
});

describe("journeyAusgabe — Karte 'Betrifft mich das?' (F1 §2)", () => {
  it("nur Karten mit rechtsgebiet mietrecht_* tragen das Flag", () => {
    const stories = [
      testStory("FX-J05", 2, "mietrecht_alltag"),
      testStory("FX-J06", 2, "verwaltungsrecht_gebuehren"),
      testStory("FX-J07", 2, "konsum_alltag"),
    ];
    const ausgabe = journeyAusgabe(stories, "2026-08-10", neuerLeseZustand());
    for (const karte of ausgabe.karten) {
      expect(karte.betrifftMich).toBe(karte.storyId === "FX-J05");
    }
  });
});

describe("ladeLeseZustand", () => {
  it("laedt einen eigenen Stand verlustfrei", () => {
    const zustand: LeseZustand = { gefolgt: ["FX-J01"], gesehen: { "FX-J01": 2 } };
    expect(ladeLeseZustand(JSON.stringify(zustand))).toEqual(zustand);
  });

  it("verwirft kaputtes JSON, fremde Schluessel und falsche Typen", () => {
    expect(ladeLeseZustand(null)).toEqual({ gefolgt: [], gesehen: {} });
    expect(ladeLeseZustand("{kaputt")).toEqual({ gefolgt: [], gesehen: {} });
    expect(
      ladeLeseZustand(JSON.stringify({ gefolgt: [], gesehen: {}, verweildauerMs: 1 })),
    ).toEqual({ gefolgt: [], gesehen: {} });
    expect(ladeLeseZustand(JSON.stringify({ gefolgt: [1], gesehen: {} }))).toEqual({
      gefolgt: [],
      gesehen: {},
    });
    expect(ladeLeseZustand(JSON.stringify({ gefolgt: [], gesehen: { a: "x" } }))).toEqual({
      gefolgt: [],
      gesehen: {},
    });
  });
});

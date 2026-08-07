// Tests des Metadaten-Siebs (AUFTRAG-R1 §1). Grundlage ist ausschliesslich
// die eingefrorene Beispiel-Kandidatenliste
// (tests/fixtures/beispiel-kandidaten.md) und redaktion/sieb.json —
// deterministisch, ohne Netz, ohne Uhr (Stand-Datum wird injiziert).

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  bewerte,
  entferneDubletten,
  gerichtsStufe,
  gesiebtListe,
  istFrOderIt,
  normalisiere,
  parseKandidatenListe,
  siebe,
  spaeterListe,
  type SiebKonfiguration,
} from "../src/sieb.js";

const konfig = JSON.parse(
  readFileSync(new URL("../sieb.json", import.meta.url), "utf8"),
) as SiebKonfiguration;

const liste = parseKandidatenListe(
  readFileSync(new URL("./fixtures/beispiel-kandidaten.md", import.meta.url), "utf8"),
);

/** Fest injiziertes Stand-Datum — keine Systemzeit im Test. */
const STAND = "2026-08-07";

const zeileMit = (aktenzeichen: string) => {
  const zeile = liste.find((z) => z.aktenzeichen === aktenzeichen);
  if (!zeile) throw new Error(`Fixture-Zeile fehlt: ${aktenzeichen}`);
  return zeile;
};

describe("parseKandidatenListe", () => {
  it("liest alle 12 Kandidatenzeilen, Kopfzeilen werden ignoriert", () => {
    expect(liste).toHaveLength(12);
    expect(liste[0]!.aktenzeichen).toBe("LU250008");
    expect(liste[0]!.betreff).toBe("Kündigungsschutz / Erstreckung");
  });
});

describe("bewerte — Positiv-/Negativwoerter und Gerichts-Gewicht", () => {
  it("Positivwoerter werten auf (Kuerzel: Positive · Gericht)", () => {
    const b = bewerte(zeileMit("ZKBER.2025.43"), konfig);
    expect(b.kuerzel).toEqual(["+kuendigung", "+anfechtung", "+erstreckung", "+OG"]);
    expect(b.punkte).toBe(3 * konfig.punkte.positiv + konfig.punkte.gericht_mittel);
  });

  it("Negativwoerter werten stark ab", () => {
    const b = bewerte(zeileMit("SV1 2025 35"), konfig);
    expect(b.kuerzel).toEqual(["+KG", "−uR"]);
    expect(b.punkte).toBe(konfig.punkte.gericht_mittel + konfig.punkte.negativ);
  });

  it("Bundesgericht wiegt hoch, uebrige Gerichte tief", () => {
    expect(gerichtsStufe("https://entscheidsuche.ch/view/CH_BGer_004_x_2025-01-01", konfig)).toBe("hoch");
    expect(gerichtsStufe("https://entscheidsuche.ch/view/ZH_BK_004_x_2025-01-01", konfig)).toBe("tief");
    const bger = bewerte(zeileMit("4D_90/2025"), konfig);
    expect(bger.kuerzel).toEqual(["+BGer"]);
    expect(bger.punkte).toBe(konfig.punkte.gericht_hoch);
    const mietgericht = bewerte(zeileMit("MJ250072-L"), konfig);
    expect(mietgericht.kuerzel).toEqual(["+anfechtung", "+mietzins", "+anfangsmietzins"]);
    expect(mietgericht.punkte).toBe(3 * konfig.punkte.positiv);
  });

  it("normalisiert Umlaute und Akzente fuer den Abgleich", () => {
    expect(normalisiere("Kündigung — Arrêt")).toBe("kuendigung arret");
  });
});

describe("Sprach-Heuristik — FR/IT in die Spaeter-Liste", () => {
  it("erkennt FR/IT ueber Kantonskuerzel der Link-Signatur (VD)", () => {
    expect(istFrOderIt(zeileMit("JL25.034528"), konfig)).toBe(true);
  });

  it("erkennt FR/IT ueber Wort-Marker im Betreff (zweisprachiger Kanton FR)", () => {
    expect(istFrOderIt(zeileMit("502 2025 372"), konfig)).toBe(true);
  });

  it("stuft deutsche Zeilen nicht als FR/IT ein", () => {
    expect(istFrOderIt(zeileMit("ZKBER.2025.43"), konfig)).toBe(false);
    expect(istFrOderIt(zeileMit("4D_90/2025"), konfig)).toBe(false);
  });
});

describe("Instanzen-Dubletten (Best-Effort)", () => {
  it("entfernt die Vorinstanz, deren Aktenzeichen im Betreff der spaeteren erscheint", () => {
    const { behalten, dubletten } = entferneDubletten(liste, konfig);
    const zitat = dubletten.find((d) => d.entfernt.aktenzeichen === "FX-DUB 25 1");
    expect(zitat?.behalten.aktenzeichen).toBe("FX-DUB 99 9");
    expect(behalten.some((z) => z.aktenzeichen === "FX-DUB 25 1")).toBe(false);
  });

  it("behaelt bei gleichem spezifischem Betreff die hoehere Instanz", () => {
    const { behalten, dubletten } = entferneDubletten(liste, konfig);
    const gleich = dubletten.find((d) => d.entfernt.aktenzeichen === "FX-DUB 25 2");
    expect(gleich?.behalten.aktenzeichen).toBe("FX-DUB 99 8");
    expect(behalten.some((z) => z.aktenzeichen === "FX-DUB 99 8")).toBe(true);
  });

  it("behandelt generische gleiche Betreffe (ohne Sachbezug) nie als Dublette", () => {
    const { dubletten } = entferneDubletten(liste, konfig);
    // die beiden BGer-Zeilen tragen denselben Betreff "(kein Betreff …)" — bleiben beide
    expect(dubletten.every((d) => !d.entfernt.link.includes("CH_BGer"))).toBe(true);
    expect(dubletten).toHaveLength(2);
  });
});

describe("siebe — Sortierung und Listen", () => {
  const ergebnis = siebe(liste, konfig);

  it("sortiert: Score absteigend · Datum absteigend · Aktenzeichen aufsteigend", () => {
    expect(ergebnis.deutsch.map((b) => b.zeile.aktenzeichen)).toEqual([
      "ZKBER.2025.43", // 14, 2025-11-19
      "FX-DUB 99 8", // 14, 2025-04-20
      "MJ250072-L", // 12
      "LU250008", // 10
      "FX-DUB 99 9", // 6
      "1C_456/2024", // 3, gleiches Datum wie 4D — Aktenzeichen entscheidet
      "4D_90/2025", // 3
      "SV1 2025 35", // -6
    ]);
  });

  it("fuehrt FR/IT in der Spaeter-Liste, nach denselben Kriterien sortiert", () => {
    expect(ergebnis.spaeter.map((b) => b.zeile.aktenzeichen)).toEqual([
      "JL25.034528",
      "502 2025 372",
    ]);
  });

  it("gesiebtListe traegt Original-Zeile + Score-Kuerzel und weist Dubletten aus", () => {
    const text = gesiebtListe(ergebnis, STAND, ["2025-11.md"]);
    expect(text).toContain(`# Gesiebte Kandidaten — Stand ${STAND}`);
    expect(text).toContain(
      "- 2025-11-19 · Solothurn Obergericht Zivilkammer · ZKBER.2025.43 · Anfechtung Kündigung / Erstreckung Mietvertrag · https://entscheidsuche.ch/view/SO_OG_004_ZKBER-2025-43_2025-11-19 [14 +kuendigung +anfechtung +erstreckung +OG]",
    );
    expect(text).toContain("## Instanzen-Dubletten");
    expect(text).toContain("ZZ_BG_001_FX-DUB-25-1_2025-01-15");
  });

  it("spaeterListe nennt Stand und beide Zeilen", () => {
    const text = spaeterListe(ergebnis, STAND);
    expect(text).toContain("JL25.034528");
    expect(text).toContain("502 2025 372");
    expect(text).not.toContain("ZKBER.2025.43");
  });

  it("ist deterministisch: zweiter Lauf liefert identische Ausgabe", () => {
    const nochmal = siebe(parseKandidatenListe(
      readFileSync(new URL("./fixtures/beispiel-kandidaten.md", import.meta.url), "utf8"),
    ), konfig);
    expect(gesiebtListe(nochmal, STAND, ["2025-11.md"])).toBe(gesiebtListe(ergebnis, STAND, ["2025-11.md"]));
  });
});

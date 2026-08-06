// Tests des Uebernahme-Werkzeugs (AUFTRAG-W0 Teil C): prueft Schema, vergibt
// id, traegt Review-Vermerk ein — entscheidet nichts. Alle Eintraege sind
// synthetische Inline-Objekte (Invariante 2).

import { describe, expect, it } from "vitest";
import { naechsteId, uebernehmeKandidat } from "../tools/uebernehmen.ts";

const HEX64 = "b".repeat(64);

function kandidat(): Record<string, unknown> {
  return {
    status: "kandidat",
    regel: "Synthetischer Regelvorschlag fuer die Uebernahme.",
    wenn: ["struktur.bedingung=true"],
    dann: ["folge:synthetische_folge"],
    quellen: [{ artikel: "Art. 0 OR", fundstelle: "OR (SR 220), synthetisch" }],
    zeitstand: "2026-08-05",
    regelversion: "0.1.0",
    pruefstand: "fachlich_zu_verifizieren",
    herkunft: "fall_destillat",
    begruendung: "Synthetische Begruendung.",
    fall_anker: HEX64,
  };
}

const VORHANDEN = ["R-CH-0001", "R-CH-0010", "R-LU-0001"];

describe("naechsteId", () => {
  it("vergibt fortlaufend je Region mit vierstelligem Zaehler", () => {
    expect(naechsteId(VORHANDEN, "CH")).toBe("R-CH-0011");
    expect(naechsteId(VORHANDEN, "LU")).toBe("R-LU-0002");
    expect(naechsteId(VORHANDEN, "ZH")).toBe("R-ZH-0001");
  });
});

describe("uebernehmeKandidat", () => {
  it("baut aus einem gueltigen Kandidaten einen schema-konformen Register-Eintrag mit id und Review-Vermerk", () => {
    const ergebnis = uebernehmeKandidat(kandidat(), VORHANDEN, "CH", "Pruefer:in A", "2026-08-06 (frei)");
    expect(ergebnis.ok).toBe(true);
    if (ergebnis.ok) {
      expect(ergebnis.eintrag.id).toBe("R-CH-0011");
      expect(ergebnis.eintrag.review).toEqual({ wer: "Pruefer:in A", wann: "2026-08-06 (frei)" });
      expect(ergebnis.eintrag.fall_anker).toBe(HEX64);
      expect("status" in ergebnis.eintrag).toBe(false);
      expect("begruendung" in ergebnis.eintrag).toBe(false);
    }
  });

  it("weist Fehlermeldungen ab — sie werden nie ins Register uebernommen (E1)", () => {
    const ergebnis = uebernehmeKandidat(
      { status: "fehlermeldung", regel_id: "R-CH-0001", begruendung: "Scheint falsch." },
      VORHANDEN,
      "CH",
      "Pruefer:in A",
      "2026-08-06",
    );
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok) {
      expect(ergebnis.fehler.join(" ")).toContain("nicht ins Register uebernommen");
    }
  });

  it("weist schema-widrige Kandidaten ab (z. B. mit Falldaten-Feld)", () => {
    const ergebnis = uebernehmeKandidat(
      { ...kandidat(), name: "x" },
      VORHANDEN,
      "CH",
      "Pruefer:in A",
      "2026-08-06",
    );
    expect(ergebnis.ok).toBe(false);
  });

  it("verlangt Region und vollstaendigen Review-Vermerk", () => {
    expect(uebernehmeKandidat(kandidat(), VORHANDEN, "XX", "A", "B").ok).toBe(false);
    expect(uebernehmeKandidat(kandidat(), VORHANDEN, "CH", " ", "B").ok).toBe(false);
    expect(uebernehmeKandidat(kandidat(), VORHANDEN, "CH", "A", "").ok).toBe(false);
  });
});

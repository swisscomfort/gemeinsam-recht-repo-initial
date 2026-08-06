// Schema-Tests (AUFTRAG-W0 Teil F, Ergaenzung E1).
// Alle Beispiel-Eintraege sind synthetische Inline-Objekte (Invariante 2) —
// keine realen Faelle, keine Falldaten.

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { leseJson, leseRegister, wissenPfad } from "../tools/umgebung.ts";
import { pruefeErkenntnis, pruefeKandidat } from "../tools/validierung.ts";

const HEX64 = "a".repeat(64);

/** Gueltiger synthetischer Kandidat als Ausgangsbasis. */
function beispielKandidat(): Record<string, unknown> {
  return {
    status: "kandidat",
    regel: "Ein synthetischer Regelvorschlag ohne jeden Fallbezug.",
    wenn: ["struktur.bedingung=true"],
    dann: ["folge:synthetische_folge"],
    quellen: [{ artikel: "Art. 0 OR", fundstelle: "OR (SR 220), synthetisch" }],
    zeitstand: "2026-08-05",
    regelversion: "0.1.0",
    pruefstand: "fachlich_zu_verifizieren",
    herkunft: "fall_destillat",
    begruendung: "Synthetische Begruendung fuer den Test.",
    fall_anker: HEX64,
  };
}

function beispielFehlermeldung(): Record<string, unknown> {
  return {
    status: "fehlermeldung",
    regel_id: "R-CH-0001",
    begruendung: "Die Fristdauer scheint mir nicht zu stimmen.",
    regelversion: "0.1.0",
  };
}

describe("Register-Dateien (wissen/register/)", () => {
  const dateien = readdirSync(wissenPfad("register")).filter((n) => n.endsWith(".json")).sort();

  it("es gibt Register-Eintraege", () => {
    expect(dateien.length).toBeGreaterThanOrEqual(11);
  });

  it("jede Datei erfuellt erkenntnis.schema.json (inkl. quellen/zeitstand/pruefstand nie leer)", () => {
    for (const datei of dateien) {
      const eintrag = leseJson(wissenPfad("register", datei));
      const ergebnis = pruefeErkenntnis(eintrag);
      expect(ergebnis.fehler, `${datei}: ${ergebnis.fehler.join("; ")}`).toEqual([]);
      expect(ergebnis.ok).toBe(true);
    }
  });

  it("Dateiname entspricht der id; ids sind eindeutig (kein Eintrag doppelt)", () => {
    const ids = dateien.map((datei) => {
      const eintrag = leseJson(wissenPfad("register", datei)) as { id: string };
      expect(datei).toBe(`${eintrag.id}.json`);
      return eintrag.id;
    });
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("kein Eintrag ohne quellen, zeitstand oder pruefstand", () => {
    for (const eintrag of leseRegister() as Record<string, unknown>[]) {
      expect(Array.isArray(eintrag["quellen"])).toBe(true);
      expect((eintrag["quellen"] as unknown[]).length).toBeGreaterThan(0);
      expect(eintrag["zeitstand"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(["technisch_validiert", "fachlich_zu_verifizieren", "fachlich_verifiziert"]).toContain(
        eintrag["pruefstand"],
      );
    }
  });
});

describe("erkenntnis.schema.json — fall_anker und Feldgrenzen", () => {
  const basis = (): Record<string, unknown> => ({
    id: "R-CH-9999",
    regel: "Synthetischer Eintrag.",
    wenn: ["a"],
    dann: ["folge:b"],
    quellen: [{ artikel: "Art. 0 OR", fundstelle: "OR (SR 220)" }],
    zeitstand: "2026-08-05",
    regelversion: "0.1.0",
    pruefstand: "fachlich_zu_verifizieren",
    herkunft: "auftrag",
  });

  it("akzeptiert fall_anker nur als exakt 64 Hex-Zeichen (nur Hash, nie Inhalt)", () => {
    expect(pruefeErkenntnis({ ...basis(), fall_anker: HEX64 }).ok).toBe(true);
    expect(pruefeErkenntnis({ ...basis(), fall_anker: HEX64.slice(0, 63) }).ok).toBe(false);
    expect(pruefeErkenntnis({ ...basis(), fall_anker: `${HEX64.slice(0, 63)}G` }).ok).toBe(false);
    expect(pruefeErkenntnis({ ...basis(), fall_anker: HEX64.toUpperCase() }).ok).toBe(false);
  });

  it("weist unbekannte Felder ab (additionalProperties false)", () => {
    expect(pruefeErkenntnis({ ...basis(), notizen: "x" }).ok).toBe(false);
  });

  it("weist ungueltige id-Muster ab", () => {
    expect(pruefeErkenntnis({ ...basis(), id: "R-XX-0001" }).ok).toBe(false);
    expect(pruefeErkenntnis({ ...basis(), id: "R-CH-1" }).ok).toBe(false);
  });
});

describe("kandidat.schema.json — Typ kandidat (Teil C)", () => {
  it("akzeptiert einen gueltigen Kandidaten (ohne id; id kommt erst bei Uebernahme)", () => {
    expect(pruefeKandidat(beispielKandidat()).ok).toBe(true);
  });

  it("weist einen Kandidaten mit id ab", () => {
    expect(pruefeKandidat({ ...beispielKandidat(), id: "R-CH-0042" }).ok).toBe(false);
  });

  it("verlangt die begruendung (Pflichtfeld)", () => {
    const { begruendung: _weg, ...ohne } = beispielKandidat();
    expect(pruefeKandidat(ohne).ok).toBe(false);
  });

  it("weist Falldaten-Felder ab (Namen, Adressen, Datumsfelder, Freitext-Fall)", () => {
    for (const feld of ["name", "adresse", "datum", "fall_text", "kuendigung_am"]) {
      expect(
        pruefeKandidat({ ...beispielKandidat(), [feld]: "x" }).ok,
        `Feld '${feld}' muss abgewiesen werden`,
      ).toBe(false);
    }
  });

  it("weist Datumsangaben eines konkreten Falls in Freitexten ab (ISO und dd.mm.yyyy)", () => {
    expect(
      pruefeKandidat({ ...beispielKandidat(), begruendung: "Kuendigung kam am 2026-09-02." }).ok,
    ).toBe(false);
    expect(
      pruefeKandidat({ ...beispielKandidat(), begruendung: "Kuendigung kam am 2.9.2026." }).ok,
    ).toBe(false);
    expect(
      pruefeKandidat({ ...beispielKandidat(), regel: "Gilt seit 01.01.2026 immer." }).ok,
    ).toBe(false);
  });

  it("erlaubt als Herkunftsbezug nur fall_anker (Hash) oder entscheid_quelle", () => {
    expect(pruefeKandidat({ ...beispielKandidat(), fall_anker: HEX64 }).ok).toBe(true);
    const { fall_anker: _weg, ...ohneAnker } = beispielKandidat();
    expect(pruefeKandidat({ ...ohneAnker, entscheid_quelle: "LB.2025.00123" }).ok).toBe(true);
    expect(pruefeKandidat({ ...beispielKandidat(), fall_anker: "kein-hash" }).ok).toBe(false);
  });
});

describe("kandidat.schema.json — Typ fehlermeldung (Ergaenzung E1)", () => {
  it("akzeptiert eine gueltige Fehlermeldung (regel_id + begruendung, optional regelversion)", () => {
    expect(pruefeKandidat(beispielFehlermeldung()).ok).toBe(true);
    const { regelversion: _weg, ...ohneVersion } = beispielFehlermeldung();
    expect(pruefeKandidat(ohneVersion).ok).toBe(true);
  });

  it("verlangt regel_id und begruendung", () => {
    const { regel_id: _a, ...ohneRegel } = beispielFehlermeldung();
    expect(pruefeKandidat(ohneRegel).ok).toBe(false);
    const { begruendung: _b, ...ohneBegruendung } = beispielFehlermeldung();
    expect(pruefeKandidat(ohneBegruendung).ok).toBe(false);
  });

  it("weist ungueltige regel_id-Muster ab", () => {
    expect(pruefeKandidat({ ...beispielFehlermeldung(), regel_id: "P1" }).ok).toBe(false);
    expect(pruefeKandidat({ ...beispielFehlermeldung(), regel_id: "R-CH-1" }).ok).toBe(false);
  });

  it("bleibt ohne jegliche Falldaten: fremde Felder und Fall-Daten im Freitext abgewiesen", () => {
    expect(pruefeKandidat({ ...beispielFehlermeldung(), name: "x" }).ok).toBe(false);
    expect(pruefeKandidat({ ...beispielFehlermeldung(), zugestellt_am: "x" }).ok).toBe(false);
    expect(
      pruefeKandidat({
        ...beispielFehlermeldung(),
        begruendung: "Meine Kuendigung vom 2026-09-02 wurde falsch gerechnet.",
      }).ok,
    ).toBe(false);
  });
});

describe("Eingangskorb-Dateien (wissen/eingang/)", () => {
  it("alle vorhandenen *.json erfuellen kandidat.schema.json", () => {
    const dateien = readdirSync(wissenPfad("eingang")).filter((n) => n.endsWith(".json"));
    for (const datei of dateien) {
      const ergebnis = pruefeKandidat(leseJson(join(wissenPfad("eingang"), datei)));
      expect(ergebnis.fehler, `${datei}: ${ergebnis.fehler.join("; ")}`).toEqual([]);
    }
  });
});

/**
 * Prueft den Fragebaum gegen schemas/case-object.schema.json:
 * alle Pflichtfelder sind als Pflichtfragen abgedeckt, jede Frage traegt
 * genau eine Ein-Satz-Hilfe, LU ist vorausgewaehlt, und die mechanische
 * Uebersetzung der Antworten ergibt ein Fallobjekt, das der Kern bewertet.
 */
import { describe, expect, it } from "vitest";
import { bewerteFall, erstelleEinschaetzung } from "@core/index";
import { baueFallobjekt, FRAGEN, sichtbareFragen, type Antworten } from "../src/fragen";

const PFLICHTFELDER_SCHEMA = [
  "kanton",
  "rolle",
  "kuendigung.zugestellt_am",
  "kuendigung.zustellart",
  "kuendigung.amtliches_formular",
  "kuendigung.unterschrieben",
  "kuendigung.begruendung_angegeben",
  "wohnung.familienwohnung",
  "vertrag.beginn",
  "vertrag.befristet",
  "sperrfrist.verfahren_letzte_3_jahre",
  "sperrfrist.verfahren_haengig",
];

const BASIS_ANTWORTEN: Antworten = {
  kanton: "LU",
  rolle: "mieter",
  "kuendigung.zustellart": "a_post",
  "kuendigung.zugestellt_am": "2026-09-02",
  "kuendigung.amtliches_formular": "ja",
  "kuendigung.unterschrieben": "ja",
  "kuendigung.begruendung_angegeben": "nein",
  "wohnung.familienwohnung": "nein",
  "vertrag.beginn": "2024-04-01",
  "vertrag.befristet": "nein",
  "vertrag.orts_gemeinde": "Luzern",
  "sperrfrist.verfahren_letzte_3_jahre": "nein",
  "sperrfrist.verfahren_haengig": "nein",
  "sperrfrist.rechte_geltend_gemacht": "nein",
};

describe("Fragebaum", () => {
  it("deckt alle Pflichtfelder des Schemas mit Pflichtfragen ab", () => {
    const pflichtIds = FRAGEN.filter((f) => f.pflicht).map((f) => f.id);
    for (const feld of PFLICHTFELDER_SCHEMA) {
      expect(pflichtIds).toContain(feld);
    }
  });

  it("jede Frage hat genau eine Ein-Satz-Hilfe", () => {
    for (const frage of FRAGEN) {
      expect(frage.hilfe.trim().length, frage.id).toBeGreaterThan(0);
      expect(frage.hilfe.trim().endsWith("."), frage.id).toBe(true);
      // genau ein Satz: genau ein Punkt, keine weiteren Satzzeichen-Enden
      expect(frage.hilfe.trim().split(".").filter((t) => t.trim() !== "").length, frage.id).toBe(1);
    }
  });

  it("Kanton LU ist vorausgewaehlt", () => {
    const kanton = FRAGEN.find((f) => f.id === "kanton");
    expect(kanton?.vorauswahl).toBe("LU");
  });

  it("bedingte Fragen: Abholfrist nur bei nicht abgeholtem Einschreiben", () => {
    const ohne = sichtbareFragen(BASIS_ANTWORTEN).map((f) => f.id);
    expect(ohne).not.toContain("kuendigung.abholfrist_ende");
    expect(ohne).not.toContain("ui.einschreiben_abgeholt");

    const mit = sichtbareFragen({
      ...BASIS_ANTWORTEN,
      "kuendigung.zustellart": "einschreiben",
      "ui.einschreiben_abgeholt": "nein",
    }).map((f) => f.id);
    expect(mit).toContain("kuendigung.abholfrist_ende");
    expect(mit).not.toContain("kuendigung.zugestellt_am");
  });

  it("bedingte Frage: separate Zustellung nur bei Familienwohnung", () => {
    const ohne = sichtbareFragen(BASIS_ANTWORTEN).map((f) => f.id);
    expect(ohne).not.toContain("wohnung.separate_zustellung_beide");
    const mit = sichtbareFragen({
      ...BASIS_ANTWORTEN,
      "wohnung.familienwohnung": "ja",
    }).map((f) => f.id);
    expect(mit).toContain("wohnung.separate_zustellung_beide");
  });
});

describe("Antworten -> Fallobjekt -> Kern", () => {
  it("Regelfall ergibt OK/GELB im deterministischen Kern", () => {
    const fall = baueFallobjekt(BASIS_ANTWORTEN, "2026-09-15T10:00:00Z");
    const ergebnis = bewerteFall(fall, "2026-09-15");
    expect(ergebnis.status).toBe("OK");
    const einschaetzung = erstelleEinschaetzung(ergebnis);
    expect(einschaetzung.ampel).toBe("GELB");
  });

  it("Einschreiben nicht abgeholt: Zustellfiktion wie FX-009", () => {
    const fall = baueFallobjekt(
      {
        ...BASIS_ANTWORTEN,
        "kuendigung.zustellart": "einschreiben",
        "ui.einschreiben_abgeholt": "nein",
        "kuendigung.abholfrist_ende": "2026-09-10",
      },
      "2026-09-20T10:00:00Z",
    ) as { kuendigung: Record<string, unknown> };
    expect(fall.kuendigung["zugestellt_am"]).toBe("2026-09-10");
    expect(fall.kuendigung["abholfrist_ende"]).toBe("2026-09-10");
    const ergebnis = bewerteFall(fall, "2026-09-20");
    expect(ergebnis.status).toBe("OK");
    if (ergebnis.status === "OK") {
      expect(ergebnis.fristen.empfangsdatum_effektiv).toBe("2026-09-10");
    }
  });

  it("'weiss nicht' bei Rachekuendigungs-Frage laesst das Feld weg", () => {
    const fall = baueFallobjekt(
      { ...BASIS_ANTWORTEN, "sperrfrist.rechte_geltend_gemacht": "weiss_nicht" },
      "2026-09-15T10:00:00Z",
    ) as { sperrfrist: Record<string, unknown> };
    expect("rechte_geltend_gemacht" in fall.sperrfrist).toBe(false);
  });

  it("meta ist als realer Fall gekennzeichnet (fixture=false)", () => {
    const fall = baueFallobjekt(BASIS_ANTWORTEN, "2026-09-15T10:00:00Z") as {
      meta: Record<string, unknown>;
    };
    expect(fall.meta["fixture"]).toBe(false);
    expect(fall.meta["regelversion"]).toBe("0.1.0");
  });
});

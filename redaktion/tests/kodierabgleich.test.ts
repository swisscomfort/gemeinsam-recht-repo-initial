import { describe, expect, it } from "vitest";
import { vergleicheEintrag, vergleicheKodierungen, type KonsensKlassifikation } from "../src/kodierabgleich.js";
import type { Kodiereintrag, Kodierartefakt } from "../src/kodierschema.js";

const BASIS = {
  aktenzeichen: "4A_1/2011",
  text_sha256: "a".repeat(64),
} as const;

function ausgeschlossen(id: string, grund = "andere_rechtsfrage", begruendung = "Beleg A"): Kodiereintrag {
  return { quelle_id: id, ...BASIS, status: "ausgeschlossen", ausschlussgrund: grund, begruendung };
}

function ungeklaert(id: string, frage = "offen A"): Kodiereintrag {
  return { quelle_id: id, ...BASIS, status: "ungeklaert", begruendung: "unklar", offene_frage: frage };
}

function eingeschlossen(
  id: string,
  aendern: Partial<{
    zaehleinheit: string;
    abschluss_status: string;
    modus: string;
    prozessgrund: string | null;
    stand_datum: string;
    erledigungsquelle: string;
    wert: string;
    messquelle: string;
    regime: string;
    rechtsquelle: string;
    beleg: string;
  }> = {},
): Kodiereintrag {
  const abschluss = aendern.abschluss_status ?? "abgeschlossen";
  const eintrag: Kodiereintrag = {
    quelle_id: id,
    ...BASIS,
    status: "eingeschlossen",
    begruendung: aendern.beleg ?? "Begruendung A",
    zaehleinheit: aendern.zaehleinheit ?? id,
    abschluss_status: abschluss,
    erledigungsweg: {
      modus: aendern.modus ?? "materiell_entschieden",
      prozessgrund: aendern.prozessgrund ?? null,
      beleg: aendern.beleg ?? "Weg A",
      stand_datum: aendern.stand_datum ?? "2011-01-01",
      quelle: aendern.erledigungsquelle ?? id,
    },
    messausgang: {
      messdefinition_id: "MD-001",
      messdefinition_version: "3.1.0",
      wert: aendern.wert ?? "nicht_durchgesetzt",
      beleg: aendern.beleg ?? "Ausgang A",
      quelle: aendern.messquelle ?? id,
    },
  };
  if (abschluss === "abgeschlossen") {
    eintrag.verfahrensrecht_nachweis = {
      regime: aendern.regime ?? "bgg",
      beleg: aendern.beleg ?? "BGG A",
      quelle: aendern.rechtsquelle ?? id,
    };
  }
  return eintrag;
}

function artefakt(rolle: "A" | "B", eintraege: Kodiereintrag[]): Kodierartefakt {
  return {
    schema: "gemeinsam-recht.ml003.kodierung.v1",
    kodierer: { rolle, modell: rolle === "A" ? "GPT-5.6 Sol" : "Claude Opus 5 (claude-opus-5)" },
    messlauf: "ML-003",
    messdefinition: { id: "MD-001", version: "3.1.0", sha256: "d".repeat(64) },
    kodierstoff_sha256: "p".repeat(64),
    eintraege,
  };
}

describe("ML-003 kodierabgleich", () => {
  it("ignoriert Freitext-Unterschiede bei gleicher strukturierter Klassifikation", () => {
    const a = ausgeschlossen("x", "andere_rechtsfrage", "A formuliert anders");
    const b = ausgeschlossen("x", "andere_rechtsfrage", "B formuliert anders");
    const r = vergleicheEintrag(a, b);
    expect(r.ergebnis).toBe("uebereinstimmung");
    expect(r.konflikte).toEqual([]);
    expect(r.konsens).toEqual({ status: "ausgeschlossen", ausschlussgrund: "andere_rechtsfrage" });
  });

  it("macht einen Statuskonflikt fail closed zum ganzen ungeklaerten Treffer", () => {
    const r = vergleicheEintrag(ausgeschlossen("x"), ungeklaert("x"));
    expect(r.ergebnis).toBe("konflikt");
    expect(r.konsens).toEqual({ status: "ungeklaert" });
    expect(r.konflikte.map((k) => k.feld)).toEqual(["status"]);
  });

  it("behandelt erledigungsweg.quelle als konsensblockierend", () => {
    const a = eingeschlossen("x");
    const b = eingeschlossen("x", { erledigungsquelle: "folgeentscheid-B" });
    const r = vergleicheEintrag(a, b);
    expect(r.ergebnis).toBe("konflikt");
    expect(r.konsens).toEqual({ status: "ungeklaert" });
    expect(r.konflikte).toContainEqual({ feld: "erledigungsweg.quelle", a: "x", b: "folgeentscheid-B" });
  });

  it("behandelt messausgang.quelle und verfahrensrecht_nachweis.quelle als Pflichtfelder", () => {
    const a = eingeschlossen("x");
    const b = eingeschlossen("x", { messquelle: "m-b", rechtsquelle: "r-b" });
    const felder = vergleicheEintrag(a, b).konflikte.map((k) => k.feld);
    expect(felder).toContain("messausgang.quelle");
    expect(felder).toContain("verfahrensrecht_nachweis.quelle");
  });

  it("vergleicht bei rueckweisung_offen keinen nicht-pflichtigen Verfahrensrechtsnachweis", () => {
    const a = eingeschlossen("x", {
      abschluss_status: "rueckweisung_offen",
      modus: "rueckweisung_offen",
      wert: "offen",
    });
    const b = structuredClone(a);
    b.verfahrensrecht_nachweis = { regime: "ungeklaert", beleg: "zusaetzlich", quelle: "x" };
    const r = vergleicheEintrag(a, b);
    expect(r.ergebnis).toBe("uebereinstimmung");
  });

  it("zaehlt doppelt ungeklaert als Uebereinstimmung, sperrt aber die Quote", () => {
    const a = artefakt("A", [ungeklaert("x", "A-Frage")]);
    const b = artefakt("B", [ungeklaert("x", "B-Frage")]);
    const r = vergleicheKodierungen(a, b, ["x"]);
    expect(r.vergleich.uebereinstimmung).toBe(1);
    expect(r.vergleich.doppelt_ungeklaert).toBe(1);
    expect(r.quote.zulaessig).toBe(false);
  });

  it("mischt bei einem Feldkonflikt keine uebereinstimmenden Teilfelder", () => {
    const a = eingeschlossen("x", { wert: "durchgesetzt" });
    const b = eingeschlossen("x", { wert: "nicht_durchgesetzt" });
    const r = vergleicheEintrag(a, b);
    expect(r.konsens).toEqual({ status: "ungeklaert" });
    expect((r.konsens as KonsensKlassifikation).zaehleinheit).toBeUndefined();
  });
});


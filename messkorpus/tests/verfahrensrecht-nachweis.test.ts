// Der Nachweis des anwendbaren Verfahrensrechts (Art. 132 BGG).
//
// Unter der historischen Rechtskraftregel sagt eine Bundesgerichtssignatur
// NICHT, welches Verfahrensrecht fuer dieses Verfahren galt. Die Definition
// verlangt deshalb, dass es je Treffer sicher bestimmbar ist. Damit das mehr
// ist als ein Satz in der Prosa, braucht es einen maschinenlesbaren Ort fuer
// die Feststellung — und eine Pruefung, die ihn einfordert.
//
// Diese Tests halten beide Richtungen fest:
//   - die Art.-61-Regel verhaelt sich unveraendert, mit und ohne Nachweis;
//   - die historische Regel oeffnet sich nur bei belegtem regime "bgg", und
//     "og" wie "ungeklaert" fuehren gleichermassen nicht weiter.
//
// Alle Definitionen und Laeufe hier sind synthetisch (MD-9xx/ML-999). Es wird
// kein realer Fall des Kandidatenkorpus beruehrt.

import { describe, expect, it } from "vitest";
import {
  belegtRegime,
  definitionsHash,
  findeFassung,
  rechtskraftAusInstanz,
  sammleFassungen,
  type Messdefinition,
  type VerfahrensrechtNachweis,
} from "../tools/definition.ts";
import { pruefeLauf, type Messlauf, type Treffer } from "../tools/lauf.ts";
import { leseDefinitionen, leseJson, messkorpusPfad } from "../tools/umgebung.ts";
import { DEFINITION, abruf, lauf, treffer } from "./fixtures.ts";

/** Fixture-Definition unter der historischen Uebergangsregel. */
function historisch(teil: Partial<Messdefinition> = {}): Messdefinition {
  return {
    ...DEFINITION,
    auswertungsmodell: "endwirkung",
    rechtskraft_regel: {
      art: "bundesgericht_uebergangsrecht_art132_bgg",
      rechtsquelle: "Art. 61 BGG und Art. 132 BGG (SR 173.110)",
      begruendung:
        "Art. 61 BGG traegt die Rechtskraft nur fuer ein Verfahren, das nach Art. 132 BGG dem BGG untersteht.",
      pruefstand: "fachlich_zu_verifizieren",
    },
    ...teil,
  };
}

function nachweis(
  regime: VerfahrensrechtNachweis["regime"],
  teil: Partial<VerfahrensrechtNachweis> = {},
): VerfahrensrechtNachweis {
  return {
    regime,
    beleg: "E. 1: Auf das Verfahren ist das Bundesgerichtsgesetz anwendbar.",
    quelle: "https://entscheidsuche.invalid/view/CH_BGer_TEST",
    ...teil,
  };
}

/** Eingeschlossener, abgeschlossener Treffer im Endwirkungsmodell. */
function abgeschlossen(teil: Partial<Treffer> = {}): Treffer {
  return treffer({
    quelle_id: "h1",
    gericht: "CH_BGer",
    datum: "2012-05-04",
    status: "eingeschlossen",
    zaehleinheit: "s-h1",
    abschluss_status: "abgeschlossen",
    erledigungsweg: {
      modus: "materiell_entschieden",
      prozessgrund: null,
      beleg: "Das Gericht beurteilt die Ruege materiell und weist die Beschwerde ab.",
      stand_datum: "2012-05-04",
      quelle: "https://entscheidsuche.invalid/view/CH_BGer_TEST",
    },
    messausgang: {
      messdefinition_id: DEFINITION.id,
      messdefinition_version: DEFINITION.version,
      wert: "nicht_durchgesetzt",
      beleg: "Dispositiv: die Beschwerde wird abgewiesen.",
      quelle: "https://entscheidsuche.invalid/view/CH_BGer_TEST",
    },
    ...teil,
  });
}

describe("rechtskraftAusInstanz mit Verfahrensrechtsnachweis", () => {
  const v61 = DEFINITION;
  const v132 = historisch();

  it("1 — Art.-61-Regel: Bundesgerichtssignatur ohne Nachweis traegt weiterhin", () => {
    expect(rechtskraftAusInstanz(v61, "CH_BGer")).toBe(true);
    expect(rechtskraftAusInstanz(v61, "CH_BGE")).toBe(true);
    // Ein vorhandener Nachweis aendert dort nichts — auch kein widersprechender.
    expect(rechtskraftAusInstanz(v61, "CH_BGer", nachweis("og"))).toBe(true);
    expect(rechtskraftAusInstanz(v61, "CH_BGer", nachweis("ungeklaert"))).toBe(true);
  });

  it("2 — historische Regel: Bundesgerichtssignatur ohne Nachweis traegt nicht", () => {
    expect(rechtskraftAusInstanz(v132, "CH_BGer")).toBe(false);
    expect(rechtskraftAusInstanz(v132, "CH_BGE")).toBe(false);
  });

  it("3 — historische Regel: belegtes regime bgg oeffnet die Art.-61-Wirkung", () => {
    expect(rechtskraftAusInstanz(v132, "CH_BGer", nachweis("bgg"))).toBe(true);
    expect(rechtskraftAusInstanz(v132, "CH_BGE", nachweis("bgg"))).toBe(true);
  });

  it("4 — regime ungeklaert traegt nicht: Nichtwissen ist keine Feststellung", () => {
    expect(rechtskraftAusInstanz(v132, "CH_BGer", nachweis("ungeklaert"))).toBe(false);
  });

  it("5 — regime og traegt nicht: fuer das OG ist hier keine Rechtskraftregel hinterlegt", () => {
    expect(rechtskraftAusInstanz(v132, "CH_BGer", nachweis("og"))).toBe(false);
  });

  it("6 — kantonale Signatur traegt auch mit regime bgg nicht", () => {
    for (const gericht of ["ZH_OG", "LU_KG", "ZH_MG"]) {
      expect(rechtskraftAusInstanz(v132, gericht, nachweis("bgg"))).toBe(false);
    }
    expect(rechtskraftAusInstanz(v132, undefined, nachweis("bgg"))).toBe(false);
  });

  it("ein Nachweis ohne Beleg oder Quelle ist keiner", () => {
    expect(rechtskraftAusInstanz(v132, "CH_BGer", nachweis("bgg", { beleg: "   " }))).toBe(false);
    expect(rechtskraftAusInstanz(v132, "CH_BGer", nachweis("bgg", { quelle: "" }))).toBe(false);
    expect(belegtRegime(nachweis("bgg"), "bgg")).toBe(true);
    expect(belegtRegime(undefined, "bgg")).toBe(false);
  });

  it("10 — gleiche Art, verschiedene id und Version: identisches Verhalten", () => {
    const eine = historisch({ id: "MD-777", version: "1.0.0" });
    const andere = historisch({ id: "MD-888", version: "9.42.7" });
    for (const n of [undefined, nachweis("bgg"), nachweis("og"), nachweis("ungeklaert")]) {
      for (const gericht of ["CH_BGer", "CH_BGE", "ZH_OG"]) {
        expect(rechtskraftAusInstanz(eine, gericht, n)).toBe(rechtskraftAusInstanz(andere, gericht, n));
      }
    }
    expect(rechtskraftAusInstanz(eine, "CH_BGer", nachweis("bgg"))).toBe(true);
    expect(rechtskraftAusInstanz(andere, "CH_BGer")).toBe(false);
  });
});

describe("pruefeLauf unter der historischen Regel", () => {
  const v132 = historisch();
  const einLauf = (liste: Treffer[]) =>
    lauf(liste, {
      messdefinition: { id: v132.id, version: v132.version, sha256: definitionsHash(v132) },
      abrufe: [abruf(liste.length)],
    });

  it("7 — eingeschlossen und abgeschlossen ohne Nachweis ist ein Fehler", () => {
    const befund = pruefeLauf(einLauf([abgeschlossen()]), v132);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("verfahrensrecht_nachweis");
    expect(befund.fehler.join(" ")).toContain("Art. 132 BGG");
  });

  it("8 — mit belegtem regime bgg ist derselbe Treffer strukturell zulaessig", () => {
    const befund = pruefeLauf(
      einLauf([abgeschlossen({ verfahrensrecht_nachweis: nachweis("bgg") })]),
      v132,
    );
    expect(befund.fehler).toEqual([]);
  });

  it("regime og und ungeklaert tragen einen Einschluss nicht", () => {
    for (const regime of ["og", "ungeklaert"] as const) {
      const befund = pruefeLauf(
        einLauf([abgeschlossen({ verfahrensrecht_nachweis: nachweis(regime) })]),
        v132,
      );
      expect(befund.ok).toBe(false);
      expect(befund.fehler.join(" ")).toContain(`"${regime}"`);
    }
  });

  it("9 — ein ungeklaerter Treffer braucht keinen Nachweis", () => {
    const befund = pruefeLauf(einLauf([treffer({ quelle_id: "h9", gericht: "CH_BGer" })]), v132);
    expect(befund.fehler).toEqual([]);
  });

  it("ein ausgeschlossener Treffer braucht keinen Nachweis", () => {
    const befund = pruefeLauf(
      einLauf([treffer({ quelle_id: "h8", gericht: "CH_BGer", status: "ausgeschlossen", ausschlussgrund: "andere_norm" })]),
      v132,
    );
    expect(befund.fehler).toEqual([]);
  });

  it("ein vorhandener Nachweis muss auch unter der Art.-61-Regel etwas nennen", () => {
    // Strukturpruefung gilt ueberall: ein leerer Beleg ist nirgends zulaessig.
    const befund = pruefeLauf(
      lauf([treffer({ quelle_id: "a1", verfahrensrecht_nachweis: nachweis("bgg", { beleg: "" }) })]),
      DEFINITION,
    );
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("keinen Beleg");
  });

  it("ohne Nachweis bleibt die Art.-61-Regel vollstaendig rueckwaertskompatibel", () => {
    const befund = pruefeLauf(lauf([abgeschlossen({ quelle_id: "a1" })]), DEFINITION);
    expect(befund.fehler).toEqual([]);
  });
});

describe("der reale Bestand bleibt vom neuen Feld unberuehrt", () => {
  const register = sammleFassungen(
    leseDefinitionen().map((d) => ({ datei: d.datei, inhalt: d.inhalt as Messdefinition })),
  );

  function fassung(version: string): Messdefinition {
    const auflösung = findeFassung(register, { id: "MD-001", version });
    return (auflösung as { definition: Messdefinition }).definition;
  }

  it("13 — die eingefrorenen Hashes bewegen sich nicht", () => {
    expect(definitionsHash(fassung("2.0.0"))).toBe(
      "a9b2143bd2873f1b5df2b9bebaf8247283158c9bb86d9f233fbb330f860244af",
    );
    expect(definitionsHash(fassung("3.0.0"))).toBe(
      "576d55c2464cbb4ceef8c8cccd2749ba9c70c78e67a16cf6b5f07c4f075cdc6f",
    );
  });

  it.each([
    ["ML-001", "2.0.0"],
    ["ML-002", "3.0.0"],
  ])("11/12 — %s bleibt gueltig und traegt keinen einzigen Nachweis", (laufId, version) => {
    const ml = leseJson(messkorpusPfad("laeufe", laufId, "lauf.json")) as Messlauf;
    expect(ml.messdefinition.version).toBe(version);
    expect(pruefeLauf(ml, fassung(version)).fehler).toEqual([]);
    // Das Feld ist neu und optional — im Bestand kommt es nirgends vor.
    expect(ml.treffer.some((t) => t.verfahrensrecht_nachweis !== undefined)).toBe(false);
  });
});

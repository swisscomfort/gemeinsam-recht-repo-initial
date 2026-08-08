// Tests der Kodierungs-Quotenlogik (MANIFEST v2.1 §3/§5): FIKTIV/PLATZHALTER
// und nicht-rechtskraeftige Faelle zaehlen nie; die Scheiterpunkt-Auswertung
// zaehlt ausschliesslich doppelt_bestaetigt/mensch_bestaetigt und schliesst
// vorschlag/strittig aus; dazu die Uebereinstimmungsquote der Kodierlaeufe.
// Alle Faelle hier sind synthetisch (keine echten Story-Inhalte noetig, nur
// die kodierten Felder).

import { describe, expect, it } from "vitest";
import {
  ausgangQuote,
  FALLZAHL_REICHT_NICHT_HINWEIS,
  MINDESTFALLZAHL,
  mitMindestfallzahl,
  scheiterpunktQuote,
  type KodierteStory,
  type Quote,
} from "../tools/kodierung-quoten.ts";
import { MINDESTFALLZAHL as MINDESTFALLZAHL_QUOTEN_SICHT } from "../tools/quoten-sicht.ts";

function story(teile: Partial<KodierteStory> & Pick<KodierteStory, "id">): KodierteStory {
  return {
    kennzeichnung: "NACHERZAEHLT_OEFFENTLICH",
    rechtskraft_status: "rechtskraeftig",
    kodierung_status: "doppelt_bestaetigt",
    ausgang: "durchgesetzt",
    scheiterpunkt: ["frist_verpasst"],
    ...teile,
  };
}

describe("ausgangQuote — Ausschluesse", () => {
  it("FIKTIV zaehlt nie (weder im Zaehler noch im Nenner)", () => {
    const stories = [
      story({ id: "FX-1", kennzeichnung: "FIKTIV", ausgang: "durchgesetzt" }),
      story({ id: "FX-2", kennzeichnung: "NACHERZAEHLT_OEFFENTLICH", ausgang: "durchgesetzt" }),
    ];
    const quote = ausgangQuote(stories, "durchgesetzt");
    expect(quote.nenner).toBe(1);
    expect(quote.zaehler).toBe(1);
    expect(quote.ausschluesse).toContainEqual({
      grund: "kennzeichnung_fiktiv_oder_platzhalter",
      anzahl: 1,
    });
  });

  it("PLATZHALTER zaehlt ebenfalls nie", () => {
    const stories = [story({ id: "FX-1", kennzeichnung: "PLATZHALTER" })];
    const quote = ausgangQuote(stories, "durchgesetzt");
    expect(quote.nenner).toBe(0);
    expect(quote.ausschluesse).toContainEqual({
      grund: "kennzeichnung_fiktiv_oder_platzhalter",
      anzahl: 1,
    });
  });

  it("nicht-rechtskraeftig zaehlt nie (weitergezogen oder unbekannt)", () => {
    const stories = [
      story({ id: "FX-1", rechtskraft_status: "weitergezogen" }),
      story({ id: "FX-2", rechtskraft_status: "unbekannt" }),
      story({ id: "FX-3", rechtskraft_status: "rechtskraeftig" }),
    ];
    const quote = ausgangQuote(stories, "durchgesetzt");
    expect(quote.nenner).toBe(1);
    expect(quote.ausschluesse).toContainEqual({ grund: "nicht_rechtskraeftig", anzahl: 2 });
  });

  it("zaehlt Zaehler/Nenner korrekt fuer einen konkreten Ausgang", () => {
    const stories = [
      story({ id: "FX-1", ausgang: "durchgesetzt" }),
      story({ id: "FX-2", ausgang: "teilweise" }),
      story({ id: "FX-3", ausgang: "nicht_durchgesetzt" }),
    ];
    const quote = ausgangQuote(stories, "durchgesetzt");
    expect(quote.zaehler).toBe(1);
    expect(quote.nenner).toBe(3);
    expect(quote.ausschluesse).toEqual([]);
  });
});

describe("scheiterpunktQuote — nur doppelt_bestaetigt/mensch_bestaetigt zaehlen (§5)", () => {
  it("vorschlag zaehlt nicht in der Scheiterpunkt-Auswertung", () => {
    const stories = [
      story({ id: "FX-1", kodierung_status: "vorschlag", scheiterpunkt: ["frist_verpasst"] }),
      story({ id: "FX-2", kodierung_status: "doppelt_bestaetigt", scheiterpunkt: ["frist_verpasst"] }),
    ];
    const quote = scheiterpunktQuote(stories, "frist_verpasst");
    expect(quote.nenner).toBe(1);
    expect(quote.zaehler).toBe(1);
    expect(quote.ausschluesse).toContainEqual({ grund: "kodierung_nicht_bestaetigt", anzahl: 1 });
  });

  it("strittig zaehlt ebenfalls nicht in der Scheiterpunkt-Auswertung", () => {
    const stories = [
      story({ id: "FX-1", kodierung_status: "strittig", scheiterpunkt: ["frist_verpasst"] }),
      story({ id: "FX-2", kodierung_status: "doppelt_bestaetigt", scheiterpunkt: ["frist_verpasst"] }),
    ];
    const quote = scheiterpunktQuote(stories, "frist_verpasst");
    expect(quote.nenner).toBe(1);
    expect(quote.zaehler).toBe(1);
    expect(quote.ausschluesse).toContainEqual({ grund: "kodierung_nicht_bestaetigt", anzahl: 1 });
  });

  it("mensch_bestaetigt zaehlt (wie doppelt_bestaetigt)", () => {
    const stories = [
      story({ id: "FX-1", kodierung_status: "mensch_bestaetigt", scheiterpunkt: ["frist_verpasst"] }),
    ];
    const quote = scheiterpunktQuote(stories, "frist_verpasst");
    expect(quote.nenner).toBe(1);
    expect(quote.zaehler).toBe(1);
    expect(quote.ausschluesse).not.toContainEqual(
      expect.objectContaining({ grund: "kodierung_nicht_bestaetigt" }),
    );
  });

  it("kombiniert alle drei Ausschlussgruende korrekt (je eigener Zaehlwert)", () => {
    const stories = [
      story({ id: "FX-1", kennzeichnung: "FIKTIV" }),
      story({ id: "FX-2", rechtskraft_status: "unbekannt" }),
      story({ id: "FX-3", kodierung_status: "vorschlag" }),
      story({ id: "FX-4", kodierung_status: "doppelt_bestaetigt", scheiterpunkt: ["beweis_fehlte"] }),
    ];
    const quote = scheiterpunktQuote(stories, "frist_verpasst");
    expect(quote.nenner).toBe(1);
    expect(quote.zaehler).toBe(0);
    expect(quote.ausschluesse).toEqual([
      { grund: "kennzeichnung_fiktiv_oder_platzhalter", anzahl: 1 },
      { grund: "nicht_rechtskraeftig", anzahl: 1 },
      { grund: "kodierung_nicht_bestaetigt", anzahl: 1 },
    ]);
  });

  it("Faelle ohne scheiterpunkt-Eintrag fuer den gesuchten Code zaehlen nicht in den Zaehler", () => {
    const stories = [story({ id: "FX-1", scheiterpunkt: ["beweis_fehlte"] })];
    const quote = scheiterpunktQuote(stories, "frist_verpasst");
    expect(quote.nenner).toBe(1);
    expect(quote.zaehler).toBe(0);
  });
});

describe("scheiterpunktQuote — Uebereinstimmungsquote der Kodierlaeufe (§5)", () => {
  it("zaehlt doppelt_bestaetigt gegen strittig, mensch_bestaetigt zaehlt nicht mit", () => {
    const stories = [
      story({ id: "FX-1", kodierung_status: "doppelt_bestaetigt" }),
      story({ id: "FX-2", kodierung_status: "doppelt_bestaetigt" }),
      story({ id: "FX-3", kodierung_status: "strittig" }),
      story({ id: "FX-4", kodierung_status: "mensch_bestaetigt" }),
      story({ id: "FX-5", kodierung_status: "vorschlag" }),
    ];
    const quote = scheiterpunktQuote(stories, "frist_verpasst");
    expect(quote.uebereinstimmungsquote).toEqual({ zaehler: 2, nenner: 3 });
  });

  it("FIKTIV/nicht-rechtskraeftige Faelle fliessen nicht in die Uebereinstimmungsquote ein", () => {
    const stories = [
      story({ id: "FX-1", kennzeichnung: "FIKTIV", kodierung_status: "strittig" }),
      story({ id: "FX-2", rechtskraft_status: "unbekannt", kodierung_status: "strittig" }),
      story({ id: "FX-3", kodierung_status: "doppelt_bestaetigt" }),
    ];
    const quote = scheiterpunktQuote(stories, "frist_verpasst");
    expect(quote.uebereinstimmungsquote).toEqual({ zaehler: 1, nenner: 1 });
  });

  it("ist 0 von 0, wenn noch kein Fall verglichen wurde", () => {
    const stories = [story({ id: "FX-1", kodierung_status: "vorschlag" })];
    const quote = scheiterpunktQuote(stories, "frist_verpasst");
    expect(quote.uebereinstimmungsquote).toEqual({ zaehler: 0, nenner: 0 });
  });
});

describe("mitMindestfallzahl — §5: Quoten erst ab MINDESTFALLZAHL gezaehlten Faellen", () => {
  it("MINDESTFALLZAHL ist eine einzige, aus quoten-sicht.ts importierte Konstante (10)", () => {
    expect(MINDESTFALLZAHL).toBe(10);
    expect(MINDESTFALLZAHL).toBe(MINDESTFALLZAHL_QUOTEN_SICHT);
  });

  function quote(zaehler: number, nenner: number): Quote {
    return { zaehler, nenner, ausschluesse: [] };
  }

  it("unterhalb der Mindestfallzahl: nur die Fallzahl mit Hinweis, kein Zaehler in der Anzeige", () => {
    const darstellung = mitMindestfallzahl(quote(3, MINDESTFALLZAHL - 1));
    expect(darstellung.ausreichend).toBe(false);
    expect(darstellung.nenner).toBe(MINDESTFALLZAHL - 1);
    expect(darstellung.anzeige).toBe(`${MINDESTFALLZAHL - 1} Faelle — ${FALLZAHL_REICHT_NICHT_HINWEIS}`);
    expect(darstellung.anzeige).not.toContain("3");
  });

  it("ab der Mindestfallzahl: Zaehler von Nenner wird gezeigt", () => {
    const darstellung = mitMindestfallzahl(quote(4, MINDESTFALLZAHL));
    expect(darstellung.ausreichend).toBe(true);
    expect(darstellung.anzeige).toBe(`4 von ${MINDESTFALLZAHL} Faellen`);
  });

  it("gibt keine Prozentzahl aus (§6: Nenner immer mitzitierbar)", () => {
    const darstellung = mitMindestfallzahl(quote(5, 50));
    expect(darstellung.anzeige).not.toMatch(/%/);
    expect(darstellung.anzeige).toContain("von");
  });

  it("reicht die Ausschluesse durch", () => {
    const q: Quote = { zaehler: 1, nenner: 2, ausschluesse: [{ grund: "nicht_rechtskraeftig", anzahl: 5 }] };
    expect(mitMindestfallzahl(q).ausschluesse).toEqual(q.ausschluesse);
  });
});

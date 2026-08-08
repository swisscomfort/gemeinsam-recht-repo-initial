// Tests der Quote aus dem Messkorpus. Kern: die Sperren. Eine Quote darf
// nicht entstehen, solange der Nenner unvollstaendig ist — weder durch
// ungeklaerte Treffer noch durch eingeschlossene Treffer ohne Fall.

import { describe, expect, it } from "vitest";
import { definitionsHash, type Messdefinition } from "../tools/definition.ts";
import type { Messlauf, Treffer } from "../tools/lauf.ts";
import { berechneMessquote, eingeschlosseneOhneFall, korpusFaelle, sperren } from "../tools/messquote.ts";
import type { KodierteStory } from "../../wissen/tools/kodierung-quoten.ts";

const DEFINITION: Messdefinition = {
  id: "MD-999",
  version: "1.0.0",
  status: "eingefroren",
  stand: "2026-08-08",
  messfrage: "Testfrage fuer die Fixture, lang genug fuer das Schema.",
  norm: { norm_fundstelle: "Art. 1 OR (SR 220)", pruefstand: "fachlich_bestaetigt" },
  quelle: { name: "entscheidsuche.ch", endpunkt: "https://entscheidsuche.ch/_search.php", abrufart: "metadaten" },
  abfrage: { suchanfrage: "Testanfrage", gerichtsfilter: ["CH_BGer"] },
  zeitraum: { von: "2020-01-01", bis: "2025-12-31" },
  einschluss: [
    { code: "norm_streitig", beschreibung: "Die Norm ist Gegenstand des Verfahrens.", bezug: "verfahrensgegenstand" },
  ],
  ausschluss: [
    { code: "andere_norm", beschreibung: "Das Verfahren betrifft eine andere Bestimmung.", bezug: "verfahrensgegenstand" },
  ],
  rechtskraft_regel: {
    art: "letztinstanzlich",
    begruendung: "Die Instanz traegt die Rechtskraft selbst, weil kein ordentliches Rechtsmittel folgt.",
    pruefstand: "fachlich_bestaetigt",
  },
  selektionsneutralitaet: "Kein Kriterium kennt den Ausgang; gefiltert wird allein nach dem Streitgegenstand.",
};

function fall(nummer: number, ausgang: string): KodierteStory {
  return {
    id: `FS-${100 + nummer}`,
    kennzeichnung: "NACHERZAEHLT_OEFFENTLICH",
    regel_id: "R-CH-0001",
    rechtskraft_status: "rechtskraeftig",
    kodierung_status: "doppelt_bestaetigt",
    ausgang,
    scheiterpunkt: [],
  };
}

function korpus(anzahl: number, davonDurchgesetzt: number): { lauf: Messlauf; faelle: Map<string, KodierteStory> } {
  const treffer: Treffer[] = [];
  const faelle = new Map<string, KodierteStory>();
  for (let i = 0; i < anzahl; i += 1) {
    const id = `FS-${100 + i}`;
    treffer.push({ quelle_id: `q${i}`, status: "eingeschlossen", story_id: id });
    faelle.set(id, fall(i, i < davonDurchgesetzt ? "durchgesetzt" : "nicht_durchgesetzt"));
  }
  return {
    lauf: {
      id: "ML-999",
      messdefinition: { id: "MD-999", version: "1.0.0", sha256: definitionsHash(DEFINITION) },
      durchgefuehrt_am: "2026-08-08",
      datenstand: "2026-08-08",
      roh_treffer: treffer.length,
      gekappt: false,
      treffer,
    },
    faelle,
  };
}

describe("sperren", () => {
  it("gibt einen vollstaendigen Korpus frei", () => {
    const { lauf, faelle } = korpus(10, 4);
    expect(sperren(lauf, DEFINITION, faelle)).toEqual({ ok: true, gruende: [] });
  });

  it("sperrt, solange ein Treffer ungeklaert ist", () => {
    const { lauf, faelle } = korpus(10, 4);
    lauf.treffer.push({ quelle_id: "offen", status: "ungeklaert" });
    lauf.roh_treffer += 1;
    const sperre = sperren(lauf, DEFINITION, faelle);
    expect(sperre.ok).toBe(false);
    expect(sperre.gruende.join(" ")).toContain("ungeklaert");
  });

  it("sperrt, wenn ein eingeschlossener Treffer keinen dokumentierten Fall hat", () => {
    const { lauf, faelle } = korpus(10, 4);
    lauf.treffer.push({ quelle_id: "ohne", status: "eingeschlossen" });
    lauf.roh_treffer += 1;
    const sperre = sperren(lauf, DEFINITION, faelle);
    expect(sperre.ok).toBe(false);
    expect(sperre.gruende.join(" ")).toContain("keinen dokumentierten Fall");
    expect(eingeschlosseneOhneFall(lauf, faelle)).toEqual(["ohne"]);
  });

  it("sperrt eine Definition im Entwurf", () => {
    const { lauf, faelle } = korpus(10, 4);
    const entwurf: Messdefinition = { ...DEFINITION, status: "entwurf" };
    // Hash des Laufs zeigt weiter auf die eingefrorene Fassung — beide
    // Gruende muessen genannt werden, nicht nur der erste.
    const sperre = sperren(lauf, entwurf, faelle);
    expect(sperre.ok).toBe(false);
    expect(sperre.gruende.join(" ")).toContain("entwurf");
  });
});

describe("berechneMessquote", () => {
  it("wirft, solange eine Sperre greift", () => {
    const { lauf, faelle } = korpus(10, 4);
    lauf.treffer.push({ quelle_id: "offen", status: "ungeklaert" });
    lauf.roh_treffer += 1;
    expect(() => berechneMessquote(lauf, DEFINITION, faelle, { ausgang: "durchgesetzt", zeitstand: "2026-08-08" })).toThrow(
      /Quote gesperrt/,
    );
  });

  it("zaehlt aus der eingeschlossenen Population und fuehrt die Bilanz mit", () => {
    const { lauf, faelle } = korpus(12, 5);
    lauf.treffer.push({ quelle_id: "raus", status: "ausgeschlossen", ausschlussgrund: "andere_norm" });
    lauf.roh_treffer += 1;

    const quote = berechneMessquote(lauf, DEFINITION, faelle, { ausgang: "durchgesetzt", zeitstand: "2026-08-08" });
    expect(quote.quote.ausreichend).toBe(true);
    expect(quote.quote.anzeige).toBe("5 von 12 Faellen");
    expect(quote.korpus.roh).toBe(13);
    expect(quote.korpus.eingeschlossen).toBe(12);
    expect(quote.korpus.ausschluesse).toEqual([{ grund: "andere_norm", anzahl: 1 }]);
    expect(quote.uebereinstimmungsquote).toEqual({ zaehler: 12, nenner: 12 });
    expect(quote.zeitstand).toBe("2026-08-08");
  });

  it("zeigt unterhalb der Mindestfallzahl keine Quote", () => {
    const { lauf, faelle } = korpus(9, 4);
    const quote = berechneMessquote(lauf, DEFINITION, faelle, { ausgang: "durchgesetzt", zeitstand: "2026-08-08" });
    expect(quote.quote.ausreichend).toBe(false);
    expect(quote.quote.anzeige).not.toContain("4 von");
  });

  it("zaehlt nicht rechtskraeftige Faelle im Korpus nicht mit, nennt sie aber als Ausschluss", () => {
    const { lauf, faelle } = korpus(12, 5);
    const gezogen = faelle.get("FS-100");
    if (gezogen) faelle.set("FS-100", { ...gezogen, rechtskraft_status: "weitergezogen" });

    const quote = berechneMessquote(lauf, DEFINITION, faelle, { ausgang: "durchgesetzt", zeitstand: "2026-08-08" });
    expect(quote.quote.nenner).toBe(11);
    expect(quote.quote.ausschluesse).toContainEqual({ grund: "nicht_rechtskraeftig", anzahl: 1 });
  });

  it("liefert die Faelle des Nenners in Trefferreihenfolge", () => {
    const { lauf, faelle } = korpus(3, 1);
    expect(korpusFaelle(lauf, faelle).map((f) => f.id)).toEqual(["FS-100", "FS-101", "FS-102"]);
  });
});

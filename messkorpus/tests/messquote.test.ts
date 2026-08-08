// Tests der Quote aus dem Messkorpus.
//
// Kern ist der Unterschied zwischen dem allgemeinen Verfahrensausgang einer
// Geschichte und dem Ausgang bezueglich der gemessenen Norm. Eine Mietpartei
// kann teilweise obsiegen, waehrend die gemessene Norm gerade nicht
// durchgesetzt wurde — wer hier den Story-Ausgang zaehlt, misst etwas
// anderes als das, was die Quote behauptet.

import { describe, expect, it } from "vitest";
import type { Messdefinition } from "../tools/definition.ts";
import { berechneMessquote, eingeschlosseneOhneFall, korpusFaelle, quoteBericht, sperren } from "../tools/messquote.ts";
import { DEFINITION, abruf, fall, korpus, lauf, treffer } from "./fixtures.ts";
import type { KodierteStory } from "../../wissen/tools/kodierung-quoten.ts";

const HEUTE = "2026-08-08";

describe("sperren", () => {
  it("gibt einen vollstaendigen Korpus frei", () => {
    const { lauf: l, faelle } = korpus(10, 4);
    expect(sperren(l, DEFINITION, faelle)).toEqual({ ok: true, gruende: [] });
  });

  it("sperrt, solange ein Treffer ungeklaert ist", () => {
    const { lauf: l, faelle } = korpus(10, 4);
    l.treffer.push(treffer({ quelle_id: "offen", status: "ungeklaert" }));
    l.roh_treffer += 1;
    l.abrufe = [abruf(11)];
    const sperre = sperren(l, DEFINITION, faelle);
    expect(sperre.ok).toBe(false);
    expect(sperre.gruende.join(" ")).toContain("ungeklaert");
  });

  it("sperrt, wenn ein eingeschlossener Treffer keinen dokumentierten Fall hat", () => {
    const { lauf: l, faelle } = korpus(10, 4);
    l.treffer.push(treffer({ quelle_id: "ohne", status: "eingeschlossen", zaehleinheit: "streit-x" }));
    l.roh_treffer += 1;
    l.abrufe = [abruf(11)];
    const sperre = sperren(l, DEFINITION, faelle);
    expect(sperre.ok).toBe(false);
    expect(sperre.gruende.join(" ")).toContain("keinen dokumentierten Fall");
    expect(eingeschlosseneOhneFall(l, faelle)).toEqual(["ohne"]);
  });

  it("sperrt eine Definition im Entwurf", () => {
    const { lauf: l, faelle } = korpus(10, 4);
    const entwurf: Messdefinition = { ...DEFINITION, status: "entwurf" };
    expect(sperren(l, entwurf, faelle).gruende.join(" ")).toContain("entwurf");
  });

  it("sperrt, solange die Abschlussregel nicht fachlich bestaetigt ist", () => {
    const { lauf: l, faelle } = korpus(10, 4);
    const offen: Messdefinition = {
      ...DEFINITION,
      abschluss_regel: { ...DEFINITION.abschluss_regel, pruefstand: "fachlich_zu_verifizieren" },
    };
    expect(sperren(l, offen, faelle).gruende.join(" ")).toContain("abschluss_regel.pruefstand");
  });

  it("sperrt bei einer Rueckweisung — rechtskraeftig ist nicht abgeschlossen", () => {
    const { lauf: l, faelle } = korpus(10, 4);
    const ersterTreffer = l.treffer[0];
    if (ersterTreffer) ersterTreffer.abschluss_status = "rueckweisung_offen";
    const sperre = sperren(l, DEFINITION, faelle);
    expect(sperre.ok).toBe(false);
    expect(sperre.gruende.join(" ")).toContain("rueckweisung_offen");
    expect(sperre.gruende.join(" ")).toContain("noch kein abgeschlossener Fall");
  });

  it("sperrt bei einem Zwischenentscheid", () => {
    const { lauf: l, faelle } = korpus(10, 4);
    const ersterTreffer = l.treffer[0];
    if (ersterTreffer) ersterTreffer.abschluss_status = "zwischenentscheid";
    expect(sperren(l, DEFINITION, faelle).ok).toBe(false);
  });

  it("sperrt, wenn der Abschlussstatus fehlt", () => {
    const { lauf: l, faelle } = korpus(10, 4);
    const ersterTreffer = l.treffer[0];
    if (ersterTreffer) delete ersterTreffer.abschluss_status;
    expect(sperren(l, DEFINITION, faelle).gruende.join(" ")).toContain("ungeklaert");
  });

  it("sperrt, wenn einer Zaehleinheit der Normausgang fehlt", () => {
    const { lauf: l, faelle } = korpus(10, 4);
    const ersterTreffer = l.treffer[0];
    if (ersterTreffer) delete ersterTreffer.messausgang;
    const sperre = sperren(l, DEFINITION, faelle);
    expect(sperre.ok).toBe(false);
    expect(sperre.gruende.join(" ")).toContain("kein Normausgang");
  });

  it("sperrt, wenn der Normausgang zu einer anderen Messdefinition gehoert", () => {
    const { lauf: l, faelle } = korpus(10, 4);
    const ersterTreffer = l.treffer[0];
    if (ersterTreffer?.messausgang) ersterTreffer.messausgang.messdefinition_id = "MD-002";
    const sperre = sperren(l, DEFINITION, faelle);
    expect(sperre.ok).toBe(false);
    expect(sperre.gruende.join(" ")).toContain("gilt nur fuer seine eigene Messdefinition");
  });

  it("sperrt, wenn eine Zaehleinheit ungeklaert ist", () => {
    const { lauf: l, faelle } = korpus(10, 4);
    const ersterTreffer = l.treffer[0];
    if (ersterTreffer) delete ersterTreffer.zaehleinheit;
    expect(sperren(l, DEFINITION, faelle).gruende.join(" ")).toContain("keine Zaehleinheit");
  });
});

describe("berechneMessquote", () => {
  it("wirft, solange eine Sperre greift", () => {
    const { lauf: l, faelle } = korpus(10, 4);
    l.treffer.push(treffer({ quelle_id: "offen", status: "ungeklaert" }));
    l.roh_treffer += 1;
    l.abrufe = [abruf(11)];
    expect(() => berechneMessquote(l, DEFINITION, faelle, { wert: "durchgesetzt", zeitstand: HEUTE })).toThrow(
      /Quote gesperrt/,
    );
  });

  it("zaehlt den Normausgang und nicht den allgemeinen Story-Ausgang", () => {
    const { lauf: l, faelle } = korpus(12, 0);
    // Alle zwoelf Geschichten behaupten "durchgesetzt" als allgemeinen Ausgang,
    // der Normausgang steht bei allen auf "nicht_durchgesetzt".
    for (const [id, story] of faelle) faelle.set(id, { ...story, ausgang: "durchgesetzt" });

    const quote = berechneMessquote(l, DEFINITION, faelle, { wert: "durchgesetzt", zeitstand: HEUTE });
    expect(quote.quote.anzeige).toBe("0 von 12 Faellen");
  });

  it("zaehlt einen Fall, dessen Story teilweise obsiegt, aber die Norm durchsetzt", () => {
    const { lauf: l, faelle } = korpus(12, 12);
    for (const [id, story] of faelle) faelle.set(id, { ...story, ausgang: "teilweise" });
    const quote = berechneMessquote(l, DEFINITION, faelle, { wert: "durchgesetzt", zeitstand: HEUTE });
    expect(quote.quote.anzeige).toBe("12 von 12 Faellen");
  });

  it("fuehrt Bilanz, Zaehleinheiten und gemessenen Wert mit", () => {
    const { lauf: l, faelle } = korpus(12, 5);
    l.treffer.push(treffer({ quelle_id: "raus", status: "ausgeschlossen", ausschlussgrund: "andere_norm" }));
    l.roh_treffer += 1;
    l.abrufe = [abruf(13)];

    const quote = berechneMessquote(l, DEFINITION, faelle, { wert: "durchgesetzt", zeitstand: HEUTE });
    expect(quote.quote.ausreichend).toBe(true);
    expect(quote.quote.anzeige).toBe("5 von 12 Faellen");
    expect(quote.gemessener_wert).toBe("durchgesetzt");
    expect(quote.zaehleinheiten).toBe(12);
    expect(quote.korpus.roh).toBe(13);
    expect(quote.korpus.ausschluesse).toEqual([{ grund: "andere_norm", anzahl: 1 }]);
    expect(quote.zeitstand).toBe(HEUTE);
  });

  it("zaehlt zwei Entscheide derselben Streitigkeit als einen Fall", () => {
    const { lauf: l, faelle } = korpus(11, 11);
    // Ein zweiter Entscheid zur selben Streitigkeit und demselben Fall.
    const ersterTreffer = l.treffer[0];
    if (ersterTreffer) {
      l.treffer.push(
        treffer({
          quelle_id: "zweiter-entscheid",
          status: "eingeschlossen",
          story_id: ersterTreffer.story_id,
          zaehleinheit: ersterTreffer.zaehleinheit,
          abschluss_status: "abgeschlossen",
          messausgang: ersterTreffer.messausgang,
        }),
      );
      l.roh_treffer += 1;
      l.abrufe = [abruf(12)];
    }

    const quote = berechneMessquote(l, DEFINITION, faelle, { wert: "durchgesetzt", zeitstand: HEUTE });
    expect(quote.korpus.eingeschlossen).toBe(12);
    expect(quote.zaehleinheiten).toBe(11);
    expect(quote.quote.anzeige).toBe("11 von 11 Faellen");
  });

  it("zeigt unterhalb der Mindestfallzahl keine Quote", () => {
    const { lauf: l, faelle } = korpus(9, 4);
    const quote = berechneMessquote(l, DEFINITION, faelle, { wert: "durchgesetzt", zeitstand: HEUTE });
    expect(quote.quote.ausreichend).toBe(false);
    expect(quote.quote.anzeige).not.toContain("4 von");
  });

  it("zaehlt nicht rechtskraeftige Faelle nicht mit, nennt sie aber als Ausschluss", () => {
    const { lauf: l, faelle } = korpus(12, 5);
    const gezogen = faelle.get("FS-100");
    if (gezogen) faelle.set("FS-100", { ...gezogen, rechtskraft_status: "weitergezogen" });

    const quote = berechneMessquote(l, DEFINITION, faelle, { wert: "durchgesetzt", zeitstand: HEUTE });
    expect(quote.quote.nenner).toBe(11);
    expect(quote.quote.ausschluesse).toContainEqual({ grund: "nicht_rechtskraeftig", anzahl: 1 });
  });

  it("liefert die Faelle des Nenners samt Normausgang", () => {
    const { lauf: l, faelle } = korpus(3, 1);
    const { faelle: liste, normausgang } = korpusFaelle(l, DEFINITION, faelle);
    expect(liste.map((f) => f.id)).toEqual(["FS-100", "FS-101", "FS-102"]);
    expect(normausgang.get("FS-100")).toBe("durchgesetzt");
    expect(normausgang.get("FS-101")).toBe("nicht_durchgesetzt");
  });

  it("fuehrt die Fassung der Kodierliste mit, wenn alle Faelle dieselbe tragen", () => {
    const { lauf: l, faelle } = korpus(12, 5);
    for (const [id, story] of faelle) faelle.set(id, { ...story, kodierliste_version: "1.0.0" } as KodierteStory);
    const quote = berechneMessquote(l, DEFINITION, faelle, { wert: "durchgesetzt", zeitstand: HEUTE });
    expect(quote.kodierliste_version).toBe("1.0.0");
  });

  it("nennt keine Fassung, wenn sie uneinheitlich ist oder bei einem Fall fehlt", () => {
    const { lauf: l, faelle } = korpus(12, 5);
    for (const [id, story] of faelle) faelle.set(id, { ...story, kodierliste_version: "1.0.0" } as KodierteStory);
    const eines = faelle.get("FS-100");
    if (eines) faelle.set("FS-100", { ...eines, kodierliste_version: undefined } as KodierteStory);
    const quote = berechneMessquote(l, DEFINITION, faelle, { wert: "durchgesetzt", zeitstand: HEUTE });
    expect(quote.kodierliste_version).toBeNull();
  });

  it("uebernimmt keinen Normausgang aus einem Fall ohne Zaehleinheit", () => {
    const einzeln: KodierteStory = fall("FS-900");
    const l = lauf([treffer({ quelle_id: "x", status: "eingeschlossen", story_id: "FS-900" })]);
    const { faelle: liste } = korpusFaelle(l, DEFINITION, new Map([["FS-900", einzeln]]));
    expect(liste).toEqual([]);
  });
});

describe("quoteBericht", () => {
  it("nennt die Quote samt Nenner, Ausschluessen und Definitions-Hash", () => {
    const { lauf: l, faelle } = korpus(12, 5);
    const bericht = quoteBericht(l, DEFINITION, faelle, { wert: "durchgesetzt", zeitstand: HEUTE });
    expect(bericht.ok).toBe(true);
    const text = bericht.zeilen.join("\n");
    expect(text).toContain("Quote: 5 von 12 Faellen");
    expect(text).toContain("12 Zaehleinheiten");
    expect(text).toContain("Normausgang, nicht der allgemeine Verfahrensausgang");
    expect(text).toMatch(/sha256: [0-9a-f]{64}/);
  });

  it("liefert bei einer Sperre die Gruende statt einer Zahl", () => {
    const { lauf: l, faelle } = korpus(12, 5);
    const ersterTreffer = l.treffer[0];
    if (ersterTreffer) ersterTreffer.abschluss_status = "rueckweisung_offen";
    const bericht = quoteBericht(l, DEFINITION, faelle, { wert: "durchgesetzt", zeitstand: HEUTE });
    expect(bericht.ok).toBe(false);
    expect(bericht.zeilen.join("\n")).toContain("Gesperrt durch:");
    expect(bericht.zeilen.join("\n")).not.toMatch(/Quote: \d+ von/);
  });
});

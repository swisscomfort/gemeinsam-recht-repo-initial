// Tests des Endwirkungsmodells (CR-03, angenommen am 9. August 2026).
//
// Zwei Dinge muessen zugleich gelten, und sie ziehen in verschiedene
// Richtungen:
//
//   1. Eine Definition, die ausdruecklich `auswertungsmodell: "endwirkung"`
//      setzt, verlangt zu jedem eingeschlossenen Treffer den Erledigungsweg
//      und die endgueltige Rechtswirkung — und laesst "offen" als eigenen,
//      niemals zaehlbaren Zustand zu.
//   2. Eine Definition OHNE dieses Feld verhaelt sich exakt wie vor CR-03.
//      MD-001 v2.0.0 und ML-001 bleiben unveraendert gueltig; ihr Hash darf
//      sich nicht bewegen.
//
// Beides haengt allein an den ausdruecklichen Feldern der Messdefinition.
// Nirgends darf eine Fallunterscheidung nach id, Versionsnummer oder
// Dateinamen stehen — sonst entschiede die Numerierung spaeterer Fassungen
// darueber, wie alte Daten zu lesen sind. Der letzte Block haelt das am
// Quelltext fest.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  auswertungsmodell,
  definitionsHash,
  findeFassung,
  istEndwirkungsmodell,
  sammleFassungen,
  type Messdefinition,
} from "../tools/definition.ts";
import {
  istZaehlbar,
  pruefeLauf,
  zaehleinheiten,
  type Erledigungsweg,
  type Messausgang,
  type Messlauf,
  type Treffer,
} from "../tools/lauf.ts";
import { berechneMessquote, sperren } from "../tools/messquote.ts";
import { berichte } from "../tools/pruefen.ts";
import { leseJson, messkorpusPfad } from "../tools/umgebung.ts";
import { pruefeMessdefinition, pruefeMesslauf } from "../tools/validierung.ts";
import { DEFINITION, abruf, fall, lauf, treffer } from "./fixtures.ts";
import type { KodierteStory } from "../../wissen/tools/kodierung-quoten.ts";

const HEUTE = "2026-08-09";

/** Fixture-Definition, die ausdruecklich nach Endwirkung auswertet. */
const ENDWIRKUNG: Messdefinition = {
  ...DEFINITION,
  version: "2.0.0",
  auswertungsmodell: "endwirkung",
};

function ausgang(wert: Messausgang["wert"], teil: Partial<Messausgang> = {}): Messausgang {
  return {
    messdefinition_id: ENDWIRKUNG.id,
    messdefinition_version: ENDWIRKUNG.version,
    wert,
    beleg: "Dispositiv Ziffer 1 des Entscheids.",
    ...teil,
  };
}

function weg(teil: Partial<Erledigungsweg> = {}): Erledigungsweg {
  return {
    modus: "materiell_entschieden",
    prozessgrund: null,
    beleg: "Erwaegung 3.2 des Entscheids.",
    ...teil,
  };
}

/** Lauf gegen die Endwirkungs-Fixture — mit passendem Definitionshash. */
function endwirkungsLauf(liste: Treffer[]): Messlauf {
  return lauf(liste, {
    messdefinition: {
      id: ENDWIRKUNG.id,
      version: ENDWIRKUNG.version,
      sha256: definitionsHash(ENDWIRKUNG),
    },
    abrufe: [abruf(liste.length)],
    roh_treffer: liste.length,
  });
}

/** Ein in jeder Hinsicht vollstaendiger Treffer des Endwirkungsmodells. */
function vollstaendig(nummer: number, teil: Partial<Treffer> = {}): Treffer {
  return treffer({
    quelle_id: `q${nummer}`,
    status: "eingeschlossen",
    story_id: `FS-${100 + nummer}`,
    zaehleinheit: `streit-${nummer}`,
    abschluss_status: "abgeschlossen",
    erledigungsweg: weg(),
    messausgang: ausgang("durchgesetzt"),
    ...teil,
  });
}

/**
 * Vollstaendiger, freigebbarer Endwirkungs-Korpus: `anzahl` Einheiten, davon
 * `positiv` durchgesetzt. `wegFuer` bestimmt den Erledigungsweg je Einheit —
 * damit laesst sich pruefen, dass er die Zaehlung nicht beruehrt.
 */
function endwirkungsKorpus(
  anzahl: number,
  positiv: number,
  wegFuer: (i: number) => Erledigungsweg = () => weg(),
): { lauf: Messlauf; faelle: Map<string, KodierteStory> } {
  const liste: Treffer[] = [];
  const faelle = new Map<string, KodierteStory>();
  for (let i = 0; i < anzahl; i += 1) {
    const storyId = `FS-${100 + i}`;
    liste.push(
      vollstaendig(i, {
        erledigungsweg: wegFuer(i),
        messausgang: ausgang(i < positiv ? "durchgesetzt" : "nicht_durchgesetzt"),
      }),
    );
    faelle.set(storyId, fall(storyId));
  }
  return { lauf: endwirkungsLauf(liste), faelle };
}

/* ------------------------------------------------------------------ */

describe("1 — Legacy: eine Definition ohne auswertungsmodell bleibt unveraendert", () => {
  it("das Modell fehlender Angabe ist die materielle Pruefung", () => {
    expect(DEFINITION.auswertungsmodell).toBeUndefined();
    expect(auswertungsmodell(DEFINITION)).toBe("materielle_pruefung");
    expect(istEndwirkungsmodell(DEFINITION)).toBe(false);
  });

  it("ein eingeschlossener Treffer ohne Erledigungsweg bleibt gueltig", () => {
    const l = lauf([
      treffer({
        quelle_id: "q1",
        status: "eingeschlossen",
        zaehleinheit: "streit-1",
        abschluss_status: "abgeschlossen",
        messausgang: {
          messdefinition_id: DEFINITION.id,
          messdefinition_version: DEFINITION.version,
          wert: "durchgesetzt",
          beleg: "Dispositiv Ziffer 1 des Entscheids.",
        },
      }),
    ]);
    expect(pruefeLauf(l, DEFINITION).fehler).toEqual([]);
  });

  it("das neue Feld veraendert den kanonischen Hash einer Definition nur, wenn es gesetzt ist", () => {
    // Ein fehlendes Feld ist im kanonischen Bild nicht vorhanden — sonst
    // haetten alle bestehenden Definitionen ihren Hash verloren.
    expect(definitionsHash({ ...DEFINITION, auswertungsmodell: undefined })).toBe(definitionsHash(DEFINITION));
    expect(definitionsHash({ ...DEFINITION, auswertungsmodell: "endwirkung" })).not.toBe(definitionsHash(DEFINITION));
  });

  it("der Wert \"offen\" ist unter der materiellen Pruefung nicht definiert", () => {
    const l = lauf([
      treffer({
        quelle_id: "q1",
        status: "eingeschlossen",
        zaehleinheit: "streit-1",
        abschluss_status: "rueckweisung_offen",
        messausgang: {
          messdefinition_id: DEFINITION.id,
          messdefinition_version: DEFINITION.version,
          wert: "offen",
          beleg: "Dispositiv Ziffer 1 des Entscheids.",
        },
      }),
    ]);
    expect(pruefeLauf(l, DEFINITION).fehler.join("\n")).toContain("nur im Endwirkungsmodell definiert");
  });
});

describe("2/3 — der reale Bestand bleibt unveraendert und gueltig", () => {
  const md = leseJson(messkorpusPfad("definitionen", "MD-001-kuendigungsschutz-bger.json")) as Messdefinition;
  const ml = leseJson(messkorpusPfad("laeufe", "ML-001", "lauf.json")) as Messlauf;

  it("MD-001 v2.0.0 traegt exakt denselben kanonischen Hash wie vor dieser Aenderung", () => {
    expect(md.id).toBe("MD-001");
    expect(md.version).toBe("2.0.0");
    expect(definitionsHash(md)).toBe("a9b2143bd2873f1b5df2b9bebaf8247283158c9bb86d9f233fbb330f860244af");
  });

  it("MD-001 fuehrt kein auswertungsmodell und gilt damit als materielle Pruefung", () => {
    expect(md.auswertungsmodell).toBeUndefined();
    expect(istEndwirkungsmodell(md)).toBe(false);
  });

  it("ML-001 traegt keinen einzigen Erledigungsweg — es wurde nichts nachgetragen", () => {
    expect(ml.treffer.some((t) => t.erledigungsweg !== undefined)).toBe(false);
    expect(ml.treffer.some((t) => t.messausgang?.wert === "offen")).toBe(false);
  });

  it("ML-001 bleibt unveraendert in seiner Bilanz und gueltig", () => {
    expect(ml.treffer.length).toBe(249);
    expect(ml.treffer.filter((t) => t.status === "eingeschlossen").length).toBe(125);
    expect(ml.treffer.filter((t) => t.status === "ausgeschlossen").length).toBe(108);
    expect(ml.treffer.filter((t) => t.status === "ungeklaert").length).toBe(16);
    expect(pruefeLauf(ml, md).fehler).toEqual([]);
  });

  it("beide bestehen die Schemapruefung unveraendert", () => {
    expect(pruefeMessdefinition(md).fehler).toEqual([]);
    expect(pruefeMesslauf(ml).fehler).toEqual([]);
  });

  it("npm run pruefen bleibt fehlerfrei", () => {
    expect(berichte().fehler).toBe(0);
  });
});

describe("4 — Endwirkung: eingeschlossen ohne Erledigungsweg ist ein Fehler", () => {
  it("meldet den fehlenden Erledigungsweg", () => {
    const l = endwirkungsLauf([vollstaendig(1, { erledigungsweg: undefined })]);
    expect(pruefeLauf(l, ENDWIRKUNG).fehler.join("\n")).toContain("keinen Erledigungsweg");
  });

  it("derselbe Treffer unter einer Legacy-Definition waere gueltig — es haengt am Modell, nicht am Treffer", () => {
    const ohneModell: Messdefinition = { ...ENDWIRKUNG, auswertungsmodell: undefined };
    const l = lauf([vollstaendig(1, { erledigungsweg: undefined, messausgang: undefined })], {
      messdefinition: { id: ohneModell.id, version: ohneModell.version, sha256: definitionsHash(ohneModell) },
    });
    expect(pruefeLauf(l, ohneModell).fehler).toEqual([]);
  });

  it("ein ungeklaerter Treffer verlangt nichts — es wird nichts erfunden (Auflage E2 Ziff. 6)", () => {
    const l = endwirkungsLauf([treffer({ quelle_id: "q1", status: "ungeklaert" })]);
    expect(pruefeLauf(l, ENDWIRKUNG).fehler).toEqual([]);
  });
});

describe("5/6/7 — Modus und Prozessgrund gehoeren zusammen", () => {
  it("5 — prozessual_erledigt ohne prozessgrund ist ein Fehler", () => {
    const l = endwirkungsLauf([
      vollstaendig(1, { erledigungsweg: weg({ modus: "prozessual_erledigt", prozessgrund: null }) }),
    ]);
    expect(pruefeLauf(l, ENDWIRKUNG).fehler.join("\n")).toContain("ohne prozessgrund");
  });

  it("5 — mit prozessgrund ist derselbe Treffer gueltig", () => {
    const l = endwirkungsLauf([
      vollstaendig(1, {
        erledigungsweg: weg({ modus: "prozessual_erledigt", prozessgrund: "anfechtungsfrist_verwirkt" }),
      }),
    ]);
    expect(pruefeLauf(l, ENDWIRKUNG).fehler).toEqual([]);
  });

  it("6 — materiell_entschieden mit prozessgrund ist ein Fehler", () => {
    const l = endwirkungsLauf([
      vollstaendig(1, {
        erledigungsweg: weg({ modus: "materiell_entschieden", prozessgrund: "instanzverwirkung" }),
      }),
    ]);
    expect(pruefeLauf(l, ENDWIRKUNG).fehler.join("\n")).toContain("gehoert ausschliesslich");
  });

  it("7 — rueckweisung_offen mit nicht-null prozessgrund ist ein Fehler", () => {
    const l = endwirkungsLauf([
      vollstaendig(1, {
        abschluss_status: "rueckweisung_offen",
        erledigungsweg: weg({ modus: "rueckweisung_offen", prozessgrund: "sonstiger_prozessgrund" }),
        messausgang: ausgang("offen"),
      }),
    ]);
    expect(pruefeLauf(l, ENDWIRKUNG).fehler.join("\n")).toContain("gehoert ausschliesslich");
  });

  it("die Kopplung gilt auch unter einer Legacy-Definition, wo der Weg gefuehrt wird", () => {
    // Der Erledigungsweg ist entweder stimmig oder nicht — das haengt nicht
    // am Auswertungsmodell.
    const l = lauf([
      treffer({
        quelle_id: "q1",
        status: "eingeschlossen",
        zaehleinheit: "streit-1",
        abschluss_status: "abgeschlossen",
        erledigungsweg: { modus: "materiell_entschieden", prozessgrund: "instanzverwirkung", beleg: "Erwaegung 3." },
      }),
    ]);
    expect(pruefeLauf(l, DEFINITION).fehler.join("\n")).toContain("gehoert ausschliesslich");
  });
});

describe("8 — Rueckweisung: strukturell gueltig, aber niemals zaehlbar", () => {
  const offenerTreffer = vollstaendig(1, {
    abschluss_status: "rueckweisung_offen",
    erledigungsweg: weg({ modus: "rueckweisung_offen" }),
    messausgang: ausgang("offen"),
  });

  it("der Treffer ist strukturell gueltig", () => {
    expect(pruefeLauf(endwirkungsLauf([offenerTreffer]), ENDWIRKUNG).fehler).toEqual([]);
  });

  it("die Zaehleinheit gilt als offen und nicht als abgeschlossen", () => {
    const einheiten = zaehleinheiten(endwirkungsLauf([offenerTreffer]), ENDWIRKUNG).einheiten;
    expect(einheiten).toHaveLength(1);
    expect(einheiten[0]!.offen).toBe(true);
    expect(einheiten[0]!.abschluss_status).not.toBe("abgeschlossen");
  });

  it("ein offener Entscheid verdraengt den Abschluss der ganzen Einheit", () => {
    // Sonst wuerde ein spaeterer Endentscheid die noch offene Rechtsfrage
    // ueberdecken und die Einheit als abgeschlossen in den Nenner tragen.
    const l = endwirkungsLauf([
      vollstaendig(1, { zaehleinheit: "streit-x", abschluss_status: "abgeschlossen" }),
      vollstaendig(2, {
        zaehleinheit: "streit-x",
        abschluss_status: "rueckweisung_offen",
        erledigungsweg: weg({ modus: "rueckweisung_offen" }),
        messausgang: ausgang("offen"),
      }),
    ]);
    const einheit = zaehleinheiten(l, ENDWIRKUNG).einheiten.find((e) => e.id === "streit-x");
    expect(einheit).toBeDefined();
    expect(einheit!.offen).toBe(true);
    expect(einheit!.abschluss_status).toBe("rueckweisung_offen");
  });

  it("sie sperrt die Quote", () => {
    const faelle = new Map([["FS-101", fall("FS-101")]]);
    const sperre = sperren(endwirkungsLauf([offenerTreffer]), ENDWIRKUNG, faelle);
    expect(sperre.ok).toBe(false);
    expect(sperre.gruende.join("\n")).toContain('Messausgang "offen"');
  });

  it("eine einzige offene Einheit sperrt einen sonst vollstaendigen Korpus", () => {
    const { lauf: l, faelle } = endwirkungsKorpus(12, 6);
    const vorher = sperren(l, ENDWIRKUNG, faelle);
    expect(vorher.ok).toBe(true);

    const mitOffener: Messlauf = {
      ...l,
      treffer: [
        ...l.treffer.slice(0, 11),
        vollstaendig(11, {
          abschluss_status: "rueckweisung_offen",
          erledigungsweg: weg({ modus: "rueckweisung_offen" }),
          messausgang: ausgang("offen"),
        }),
      ],
    };
    const nachher = sperren(mitOffener, ENDWIRKUNG, faelle);
    expect(nachher.ok).toBe(false);
    expect(nachher.gruende.join("\n")).toContain('Messausgang "offen"');
  });

  it('aus dem Wert "offen" laesst sich keine Quote rechnen', () => {
    const { lauf: l, faelle } = endwirkungsKorpus(12, 6);
    expect(istZaehlbar("offen")).toBe(false);
    expect(() => berechneMessquote(l, ENDWIRKUNG, faelle, { wert: "offen", zeitstand: HEUTE })).toThrow(
      /kein zaehlbarer Messausgang/,
    );
  });
});

describe("9/10 — Abschluss und Messausgang muessen zusammenpassen", () => {
  it("9 — abgeschlossen mit Messausgang \"offen\" ist ein Fehler", () => {
    const l = endwirkungsLauf([vollstaendig(1, { messausgang: ausgang("offen") })]);
    expect(pruefeLauf(l, ENDWIRKUNG).fehler.join("\n")).toContain("abgeschlossen, traegt aber den Messausgang");
  });

  it("10 — ein abgeschlossener Endwirkungs-Treffer ohne Messausgang ist ein Fehler", () => {
    const l = endwirkungsLauf([vollstaendig(1, { messausgang: undefined })]);
    expect(pruefeLauf(l, ENDWIRKUNG).fehler.join("\n")).toContain("keinen Messausgang");
  });

  it("rueckweisung_offen verlangt den passenden Abschlussstatus", () => {
    const l = endwirkungsLauf([
      vollstaendig(1, { erledigungsweg: weg({ modus: "rueckweisung_offen" }), messausgang: ausgang("offen") }),
    ]);
    expect(pruefeLauf(l, ENDWIRKUNG).fehler.join("\n")).toContain("laesst die gemessene Rechtsfrage offen");
  });

  it("rueckweisung_offen verlangt den Messausgang \"offen\"", () => {
    const l = endwirkungsLauf([
      vollstaendig(1, {
        abschluss_status: "rueckweisung_offen",
        erledigungsweg: weg({ modus: "rueckweisung_offen" }),
        messausgang: ausgang("nicht_durchgesetzt"),
      }),
    ]);
    expect(pruefeLauf(l, ENDWIRKUNG).fehler.join("\n")).toContain("noch nicht bestimmbar");
  });

  it("zaehleinheit und abschluss_status sind unter Endwirkung Pflicht", () => {
    const l = endwirkungsLauf([vollstaendig(1, { zaehleinheit: undefined, abschluss_status: undefined })]);
    const text = pruefeLauf(l, ENDWIRKUNG).fehler.join("\n");
    expect(text).toContain("keine Zaehleinheit");
    expect(text).toContain("keinen Abschlussstatus");
  });
});

describe("11 — derselbe prozessuale Weg kann verschieden ausgehen", () => {
  // Der Kern von CR-03: der Erledigungsweg praejudiziert die Rechtswirkung
  // nicht. Wuerde die Pruefung aus dem Weg auf den Ausgang schliessen, waere
  // die Messung zirkulaer.
  const gruende = [
    "rechtsmittelbegruendung_unzureichend",
    "aktivlegitimation_fehlte",
    "klagebewilligung_fehlte_oder_ungueltig",
    "anfechtungsfrist_verwirkt",
    "instanzverwirkung",
    "nichteintreten_sonstiger_grund",
    "sonstiger_prozessgrund",
  ] as const;

  it.each(gruende)("%s besteht mit durchgesetzt UND mit nicht_durchgesetzt", (grund) => {
    for (const wert of ["durchgesetzt", "nicht_durchgesetzt"] as const) {
      const l = endwirkungsLauf([
        vollstaendig(1, {
          erledigungsweg: weg({ modus: "prozessual_erledigt", prozessgrund: grund }),
          messausgang: ausgang(wert),
        }),
      ]);
      expect(pruefeLauf(l, ENDWIRKUNG).fehler).toEqual([]);
    }
  });

  it("beide Richtungen kommen im selben Lauf nebeneinander vor", () => {
    const prozessual = weg({ modus: "prozessual_erledigt", prozessgrund: "nichteintreten_sonstiger_grund" });
    const l = endwirkungsLauf([
      vollstaendig(1, { erledigungsweg: prozessual, messausgang: ausgang("durchgesetzt") }),
      vollstaendig(2, { erledigungsweg: prozessual, messausgang: ausgang("nicht_durchgesetzt") }),
    ]);
    expect(pruefeLauf(l, ENDWIRKUNG).fehler).toEqual([]);
  });
});

describe("12 — gezaehlt wird der Messausgang, nicht der Erledigungsweg", () => {
  it("zwei Korpora mit gleichen Ausgaengen, aber verschiedenen Wegen ergeben dieselbe Quote", () => {
    const materiell = endwirkungsKorpus(12, 5, () => weg());
    const prozessual = endwirkungsKorpus(12, 5, () =>
      weg({ modus: "prozessual_erledigt", prozessgrund: "instanzverwirkung" }),
    );

    const a = berechneMessquote(materiell.lauf, ENDWIRKUNG, materiell.faelle, {
      wert: "durchgesetzt",
      zeitstand: HEUTE,
    });
    const b = berechneMessquote(prozessual.lauf, ENDWIRKUNG, prozessual.faelle, {
      wert: "durchgesetzt",
      zeitstand: HEUTE,
    });

    expect(b.quote).toEqual(a.quote);
    expect(b.quote.anzeige).toBe(a.quote.anzeige);
    expect(b.zaehleinheiten).toBe(a.zaehleinheiten);
  });

  it("gemischte Wege bei gleichen Ausgaengen aendern die Quote nicht", () => {
    const einheitlich = endwirkungsKorpus(12, 5, () => weg());
    const gemischt = endwirkungsKorpus(12, 5, (i) =>
      i % 2 === 0 ? weg() : weg({ modus: "prozessual_erledigt", prozessgrund: "aktivlegitimation_fehlte" }),
    );

    const a = berechneMessquote(einheitlich.lauf, ENDWIRKUNG, einheitlich.faelle, {
      wert: "durchgesetzt",
      zeitstand: HEUTE,
    });
    const b = berechneMessquote(gemischt.lauf, ENDWIRKUNG, gemischt.faelle, {
      wert: "durchgesetzt",
      zeitstand: HEUTE,
    });
    expect(b.quote).toEqual(a.quote);
  });

  it("aendert sich der Messausgang, aendert sich die Quote", () => {
    const wenig = endwirkungsKorpus(12, 3);
    const viel = endwirkungsKorpus(12, 9);
    const a = berechneMessquote(wenig.lauf, ENDWIRKUNG, wenig.faelle, { wert: "durchgesetzt", zeitstand: HEUTE });
    const b = berechneMessquote(viel.lauf, ENDWIRKUNG, viel.faelle, { wert: "durchgesetzt", zeitstand: HEUTE });
    expect(b.quote.anzeige).not.toBe(a.quote.anzeige);
  });
});

describe("13 — mehrere Fassungen bleiben parallel aufloesbar", () => {
  it("Legacy- und Endwirkungsfassung derselben id bestehen nebeneinander", () => {
    const alt: Messdefinition = { ...DEFINITION, version: "1.0.0" };
    const neu = ENDWIRKUNG; // dieselbe id, Version 2.0.0, anderes Modell

    const register = sammleFassungen([
      { datei: "MD-999-v1.json", inhalt: alt },
      { datei: "MD-999-v2.json", inhalt: neu },
    ]);

    const a = findeFassung(register, { id: "MD-999", version: "1.0.0" });
    const b = findeFassung(register, { id: "MD-999", version: "2.0.0" });
    expect(a.art).toBe("gefunden");
    expect(b.art).toBe("gefunden");
    expect(istEndwirkungsmodell((a as { definition: Messdefinition }).definition)).toBe(false);
    expect(istEndwirkungsmodell((b as { definition: Messdefinition }).definition)).toBe(true);
  });

  it("jeder Lauf bleibt gegen seine eigene Fassung gueltig — auch bei verschiedenen Modellen", () => {
    const alt: Messdefinition = { ...DEFINITION, version: "1.0.0" };
    const alterLauf = lauf([treffer({ quelle_id: "alt-1", status: "ungeklaert" })], {
      id: "ML-901",
      messdefinition: { id: alt.id, version: alt.version, sha256: definitionsHash(alt) },
    });
    const neuerLauf = endwirkungsLauf([vollstaendig(1)]);

    expect(pruefeLauf(alterLauf, alt).fehler).toEqual([]);
    expect(pruefeLauf(neuerLauf, ENDWIRKUNG).fehler).toEqual([]);
  });
});

describe("Schema und Laufzeit sagen dasselbe", () => {
  const alsDefinition = (teil: Partial<Messdefinition>): unknown => ({ ...DEFINITION, ...teil });
  const alsLauf = (t: Treffer): unknown => ({ ...endwirkungsLauf([t]) });

  it("das Schema kennt auswertungsmodell und beide Werte", () => {
    expect(pruefeMessdefinition(alsDefinition({ auswertungsmodell: "endwirkung" })).fehler).toEqual([]);
    expect(pruefeMessdefinition(alsDefinition({ auswertungsmodell: "materielle_pruefung" })).fehler).toEqual([]);
    expect(pruefeMessdefinition(alsDefinition({})).fehler).toEqual([]);
  });

  it("das Schema lehnt ein erfundenes Auswertungsmodell ab", () => {
    expect(pruefeMessdefinition(alsDefinition({ auswertungsmodell: "bauchgefuehl" } as never)).ok).toBe(false);
  });

  it("das Schema kennt den Erledigungsweg und den Wert \"offen\"", () => {
    expect(
      pruefeMesslauf(
        alsLauf(
          vollstaendig(1, {
            abschluss_status: "rueckweisung_offen",
            erledigungsweg: weg({ modus: "rueckweisung_offen" }),
            messausgang: ausgang("offen"),
          }),
        ),
      ).fehler,
    ).toEqual([]);
  });

  it("das Schema verlangt den Schluessel prozessgrund ausdruecklich", () => {
    const ohne = vollstaendig(1, {
      erledigungsweg: { modus: "materiell_entschieden", beleg: "Erwaegung 3." } as Erledigungsweg,
    });
    expect(pruefeMesslauf(alsLauf(ohne)).ok).toBe(false);
  });

  it("das Schema lehnt einen erfundenen Prozessgrund ab", () => {
    const falsch = vollstaendig(1, {
      erledigungsweg: weg({ modus: "prozessual_erledigt", prozessgrund: "richter_war_muede" as never }),
    });
    expect(pruefeMesslauf(alsLauf(falsch)).ok).toBe(false);
  });
});

describe("F — keine Bedeutung aus id, Version oder Dateiname", () => {
  // Wuerde das Verhalten an der Versionsnummer haengen, entschiede die
  // Numerierung spaeterer Fassungen darueber, wie alte Daten zu lesen sind.
  const quellen = ["definition.ts", "lauf.ts", "messquote.ts", "pruefen.ts"] as const;

  it.each(quellen)("%s enthaelt keine Fallunterscheidung nach Versionsnummer", (name) => {
    const text = readFileSync(messkorpusPfad("tools", name), "utf8")
      .split("\n")
      .filter((zeile) => !zeile.trimStart().startsWith("*") && !zeile.trimStart().startsWith("//"))
      .join("\n");
    expect(text).not.toMatch(/version\s*\.\s*startsWith/);
    expect(text).not.toMatch(/version\s*(===|!==|>=|<=|>|<)\s*["'`]/);
    expect(text).not.toMatch(/["'`]MD-[0-9]{3}["'`]/);
  });

  it("das Modell wird ausschliesslich aus dem Feld gelesen", () => {
    const hoch: Messdefinition = { ...DEFINITION, version: "9.9.9" };
    expect(istEndwirkungsmodell(hoch)).toBe(false);
    const niedrig: Messdefinition = { ...DEFINITION, version: "0.0.1", auswertungsmodell: "endwirkung" };
    expect(istEndwirkungsmodell(niedrig)).toBe(true);
  });
});

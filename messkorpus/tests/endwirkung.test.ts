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
  ENDWIRKUNG_MESSAUSGAENGE,
  istZaehlbar,
  metadatenFingerprint,
  pruefeEndwirkung,
  pruefeLauf,
  zaehleinheiten,
  type Erledigungsweg,
  type Messausgang,
  type Messlauf,
  type Treffer,
} from "../tools/lauf.ts";
import { berechneMessquote, nichtZaehlbarerWert, quoteBericht, sperren } from "../tools/messquote.ts";
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
    stand_datum: "2020-04-01",
    quelle: "Entscheid des Bundesgerichts, Erwaegung 3.2.",
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

  it("die drei Felder des Treffers sind in sich stimmig", () => {
    // Die Kopplung stimmt — dass der Lauf ihn trotzdem nicht einschliessen
    // darf, ist eine Aussage ueber die Zaehleinheit, nicht ueber den Treffer
    // (siehe Block U).
    expect(pruefeEndwirkung("ML-999", "2026-08-08", offenerTreffer)).toEqual([]);
  });

  it("die Zaehleinheit gilt als offen und nicht als abgeschlossen", () => {
    const einheiten = zaehleinheiten(endwirkungsLauf([offenerTreffer]), ENDWIRKUNG).einheiten;
    expect(einheiten).toHaveLength(1);
    expect(einheiten[0]!.offen).toBe(true);
    expect(einheiten[0]!.abschluss_status).not.toBe("abgeschlossen");
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

describe("Terminaler Stand einer Verfahrenskette", () => {
  // "offen" beschreibt den Stand ZU SEINEM ZEITPUNKT, nicht auf Dauer. Eine
  // Rueckweisung von 2019, die ein Endentscheid von 2020 erledigt hat, darf
  // die Einheit nicht dauerhaft offen halten; umgekehrt darf ein Entscheid
  // von 2020, der die Frage wieder aufmacht, nicht von einem Endentscheid
  // von 2019 ueberdeckt werden. Gezaehlt wird der letzte Stand.

  const EINHEIT = "streit-kette";

  /** Ein Glied derselben Verfahrenskette — gemeinsame Einheit, gemeinsamer Fall. */
  function glied(name: string, teil: Partial<Treffer>): Treffer {
    return vollstaendig(0, { quelle_id: `q-${name}`, zaehleinheit: EINHEIT, story_id: "FS-100", ...teil });
  }

  const rueckweisung = (datum: string): Treffer =>
    glied(`rw-${datum}`, {
      datum,
      abschluss_status: "rueckweisung_offen",
      erledigungsweg: weg({ modus: "rueckweisung_offen", stand_datum: datum }),
      messausgang: ausgang("offen"),
    });

  const endentscheid = (datum: string, wert: "durchgesetzt" | "nicht_durchgesetzt"): Treffer =>
    glied(`end-${datum}-${wert}`, {
      datum,
      abschluss_status: "abgeschlossen",
      erledigungsweg: weg({ stand_datum: datum }),
      messausgang: ausgang(wert),
    });

  function einheitAus(liste: Treffer[]) {
    const ergebnis = zaehleinheiten(endwirkungsLauf(liste), ENDWIRKUNG);
    return { ergebnis, einheit: ergebnis.einheiten.find((e) => e.id === EINHEIT) };
  }

  it("A — 2019 Rueckweisung, 2020 durchgesetzt: abgeschlossen und durchgesetzt", () => {
    const { ergebnis, einheit } = einheitAus([rueckweisung("2019-03-01"), endentscheid("2020-04-01", "durchgesetzt")]);
    expect(ergebnis.fehler).toEqual([]);
    expect(einheit!.abschluss_status).toBe("abgeschlossen");
    expect(einheit!.messausgang?.wert).toBe("durchgesetzt");
    expect(einheit!.offen).toBe(false);
  });

  it("B — 2019 Rueckweisung, 2020 nicht_durchgesetzt: abgeschlossen und nicht_durchgesetzt", () => {
    const { ergebnis, einheit } = einheitAus([
      rueckweisung("2019-03-01"),
      endentscheid("2020-04-01", "nicht_durchgesetzt"),
    ]);
    expect(ergebnis.fehler).toEqual([]);
    expect(einheit!.abschluss_status).toBe("abgeschlossen");
    expect(einheit!.messausgang?.wert).toBe("nicht_durchgesetzt");
    expect(einheit!.offen).toBe(false);
  });

  it("die Reihenfolge im Array aendert nichts — geordnet wird nach Datum", () => {
    const vorwaerts = einheitAus([rueckweisung("2019-03-01"), endentscheid("2020-04-01", "durchgesetzt")]);
    const rueckwaerts = einheitAus([endentscheid("2020-04-01", "durchgesetzt"), rueckweisung("2019-03-01")]);
    expect(rueckwaerts.einheit!.abschluss_status).toBe(vorwaerts.einheit!.abschluss_status);
    expect(rueckwaerts.einheit!.messausgang?.wert).toBe(vorwaerts.einheit!.messausgang?.wert);
    expect(rueckwaerts.einheit!.offen).toBe(false);
  });

  it("C — 2019 abgeschlossen, 2020 Rueckweisung: die Einheit ist wieder offen", () => {
    const { ergebnis, einheit } = einheitAus([endentscheid("2019-03-01", "durchgesetzt"), rueckweisung("2020-04-01")]);
    expect(ergebnis.fehler).toEqual([]);
    expect(einheit!.offen).toBe(true);
    expect(einheit!.abschluss_status).toBe("rueckweisung_offen");
    expect(einheit!.messausgang?.wert).toBe("offen");
  });

  it("D — ein BGE/BGer-Paar am selben Datum mit gleichem Ausgang ist kein Konflikt", () => {
    const { ergebnis, einheit } = einheitAus([
      glied("bger", { datum: "2020-04-01", gericht: "CH_BGer", messausgang: ausgang("durchgesetzt") }),
      glied("bge", { datum: "2020-04-01", gericht: "CH_BGE", messausgang: ausgang("durchgesetzt") }),
    ]);
    expect(ergebnis.fehler).toEqual([]);
    expect(einheit!.treffer).toHaveLength(2);
    expect(einheit!.abschluss_status).toBe("abgeschlossen");
    expect(einheit!.messausgang?.wert).toBe("durchgesetzt");
  });

  it("D — dasselbe Paar auch ohne Datum, solange es denselben Stand abbildet", () => {
    // Ohne Zustandswechsel ist keine Chronologie noetig.
    const { ergebnis, einheit } = einheitAus([
      glied("bger", { gericht: "CH_BGer", erledigungsweg: weg({ stand_datum: undefined }), messausgang: ausgang("durchgesetzt") }),
      glied("bge", { gericht: "CH_BGE", erledigungsweg: weg({ stand_datum: undefined }), messausgang: ausgang("durchgesetzt") }),
    ]);
    expect(ergebnis.fehler).toEqual([]);
    expect(einheit!.messausgang?.wert).toBe("durchgesetzt");
  });

  it("E — gleiches Datum mit unvereinbaren Endausgaengen ist ein Fehler", () => {
    const { ergebnis, einheit } = einheitAus([
      endentscheid("2020-04-01", "durchgesetzt"),
      endentscheid("2020-04-01", "nicht_durchgesetzt"),
    ]);
    expect(ergebnis.fehler.join("\n")).toContain("widersprechende Normausgaenge");
    expect(einheit!.messausgang).toBeUndefined();
  });

  it("F — fehlt das Datum, obwohl der Stand wechselt, wird nicht geraten", () => {
    const ohneDatum = glied("end-ohne-datum", {
      abschluss_status: "abgeschlossen",
      erledigungsweg: weg({ stand_datum: undefined }),
      messausgang: ausgang("durchgesetzt"),
    });
    const { ergebnis, einheit } = einheitAus([rueckweisung("2019-03-01"), ohneDatum]);
    const text = ergebnis.fehler.join("\n");
    expect(text).toContain("kein Standdatum");
    expect(text).toContain("nicht geraten");
    // Kein stiller Rueckfall auf eine der beiden Lesarten.
    expect(einheit!.messausgang).toBeUndefined();
    expect(einheit!.abschluss_status).toBe("ungeklaert");
  });

  it("G — ein frueheres \"offen\" ist kein widersprechender Normausgang", () => {
    const { ergebnis } = einheitAus([rueckweisung("2019-03-01"), endentscheid("2020-04-01", "durchgesetzt")]);
    expect(ergebnis.fehler.join("\n")).not.toContain("widersprechende");
  });

  it("H — nach dem spaeteren Endentscheid sperrt die fruehere Rueckweisung die Quote nicht mehr", () => {
    const basis = endwirkungsKorpus(12, 6);
    const mitKette: Treffer[] = [
      vollstaendig(0, {
        quelle_id: "q0-2019",
        datum: "2019-03-01",
        abschluss_status: "rueckweisung_offen",
        erledigungsweg: weg({ modus: "rueckweisung_offen", stand_datum: "2019-03-01" }),
        messausgang: ausgang("offen"),
      }),
      vollstaendig(0, {
        quelle_id: "q0-2020",
        datum: "2020-04-01",
        erledigungsweg: weg({ stand_datum: "2020-04-01" }),
        messausgang: ausgang("durchgesetzt"),
      }),
      ...basis.lauf.treffer.slice(1),
    ];

    const sperre = sperren(endwirkungsLauf(mitKette), ENDWIRKUNG, basis.faelle);
    expect(sperre.gruende).toEqual([]);
    expect(sperre.ok).toBe(true);

    // Und die Quote entspricht der ohne Rueckweisung — gezaehlt wird die
    // Einheit, nicht ihre Entscheide.
    const mit = berechneMessquote(endwirkungsLauf(mitKette), ENDWIRKUNG, basis.faelle, {
      wert: "durchgesetzt",
      zeitstand: HEUTE,
    });
    const ohne = berechneMessquote(basis.lauf, ENDWIRKUNG, basis.faelle, { wert: "durchgesetzt", zeitstand: HEUTE });
    expect(mit.zaehleinheiten).toBe(ohne.zaehleinheiten);
    expect(mit.quote.anzeige).toBe(ohne.quote.anzeige);
  });

  it("bleibt die Kette offen, sperrt sie weiterhin", () => {
    const basis = endwirkungsKorpus(12, 6);
    const mitOffenerKette: Treffer[] = [
      vollstaendig(0, {
        quelle_id: "q0-2019",
        datum: "2019-03-01",
        erledigungsweg: weg({ stand_datum: "2019-03-01" }),
        messausgang: ausgang("durchgesetzt"),
      }),
      vollstaendig(0, {
        quelle_id: "q0-2020",
        datum: "2020-04-01",
        abschluss_status: "rueckweisung_offen",
        erledigungsweg: weg({ modus: "rueckweisung_offen", stand_datum: "2020-04-01" }),
        messausgang: ausgang("offen"),
      }),
      ...basis.lauf.treffer.slice(1),
    ];
    const sperre = sperren(endwirkungsLauf(mitOffenerKette), ENDWIRKUNG, basis.faelle);
    expect(sperre.ok).toBe(false);
    expect(sperre.gruende.join("\n")).toContain('Messausgang "offen"');
  });
});

describe("W — das Endwirkungsmodell kennt kein \"teilweise\"", () => {
  // CR-03 legt fuer die Endwirkung genau vier Werte fest. Gemessen wird die
  // endgueltige Rechtswirkung auf eine konkrete Kuendigung — die ist
  // eingetreten oder nicht. Ein "teilweise" waere dort keine Beobachtung,
  // sondern eine Zwischenkategorie, ueber die niemand entschieden hat.
  it("W1 — unter der materiellen Pruefung bleibt \"teilweise\" gueltig", () => {
    const l = lauf([
      treffer({
        quelle_id: "q1",
        status: "eingeschlossen",
        zaehleinheit: "streit-1",
        abschluss_status: "abgeschlossen",
        messausgang: {
          messdefinition_id: DEFINITION.id,
          messdefinition_version: DEFINITION.version,
          wert: "teilweise",
          beleg: "Dispositiv Ziffer 1 des Entscheids.",
        },
      }),
    ]);
    expect(pruefeLauf(l, DEFINITION).fehler).toEqual([]);
    expect(istZaehlbar("teilweise")).toBe(true);
  });

  it("W2 — unter Endwirkung ist \"teilweise\" ein Fehler", () => {
    const l = endwirkungsLauf([
      vollstaendig(1, {
        erledigungsweg: weg({ modus: "materiell_entschieden" }),
        abschluss_status: "abgeschlossen",
        messausgang: ausgang("teilweise"),
      }),
    ]);
    const text = pruefeLauf(l, ENDWIRKUNG).fehler.join("\n");
    expect(text).toContain("im Endwirkungsmodell nicht definiert");
    expect(text).toContain(ENDWIRKUNG_MESSAUSGAENGE.join(", "));
  });

  it("W3 — eine Endwirkungs-Quote ueber \"teilweise\" wird abgelehnt", () => {
    const { lauf: l, faelle } = endwirkungsKorpus(12, 6);
    // Kein einziger Treffer traegt den Wert — abgelehnt wird er trotzdem.
    expect(l.treffer.some((t) => t.messausgang?.wert === "teilweise")).toBe(false);
    expect(() => berechneMessquote(l, ENDWIRKUNG, faelle, { wert: "teilweise", zeitstand: HEUTE })).toThrow(
      /nicht kennt/,
    );
    expect(quoteBericht(l, ENDWIRKUNG, faelle, { wert: "teilweise", zeitstand: HEUTE }).ok).toBe(false);
  });

  it("W3 — unter der materiellen Pruefung bleibt dieselbe Quote zulaessig", () => {
    expect(nichtZaehlbarerWert("teilweise", DEFINITION)).toBeNull();
    expect(nichtZaehlbarerWert("teilweise", ENDWIRKUNG)).not.toBeNull();
  });

  it.each(["durchgesetzt", "nicht_durchgesetzt", "nicht_anwendbar"] as const)(
    "W4 — %s bleibt unter Endwirkung zulaessig",
    (wert) => {
      const l = endwirkungsLauf([
        vollstaendig(1, { abschluss_status: "abgeschlossen", messausgang: ausgang(wert) }),
      ]);
      expect(pruefeLauf(l, ENDWIRKUNG).fehler).toEqual([]);
      expect(nichtZaehlbarerWert(wert, ENDWIRKUNG)).toBeNull();
    },
  );
});

describe("U — terminal offen heisst noch nicht einschliessbar", () => {
  // CR-03 verlangt fuer den Einschluss, dass der endgueltige rechtliche
  // Zustand der Kuendigung bestimmbar ist. Steht der terminale Stand einer
  // Einheit noch auf "offen", ist genau dieses Merkmal nicht erfuellt. Der
  // Wert "offen" bleibt trotzdem noetig: INNERHALB einer spaeter
  // abgeschlossenen Kette benennt er den Zwischenstand.
  const EINHEIT = "streit-kette";

  const glied = (name: string, teil: Partial<Treffer>): Treffer =>
    vollstaendig(0, { quelle_id: `q-${name}`, zaehleinheit: EINHEIT, story_id: "FS-100", ...teil });

  const offenerStand = (datum: string): Treffer =>
    glied(`offen-${datum}`, {
      datum,
      abschluss_status: "rueckweisung_offen",
      erledigungsweg: weg({ modus: "rueckweisung_offen", stand_datum: datum }),
      messausgang: ausgang("offen"),
    });

  const finalerStand = (datum: string): Treffer =>
    glied(`final-${datum}`, {
      datum,
      abschluss_status: "abgeschlossen",
      erledigungsweg: weg({ stand_datum: datum }),
      messausgang: ausgang("durchgesetzt"),
    });

  it("U1 — ein einzelner eingeschlossener, terminal offener Fall macht den Lauf ungueltig", () => {
    const befund = pruefeLauf(endwirkungsLauf([offenerStand("2019-03-01")]), ENDWIRKUNG);
    expect(befund.ok).toBe(false);
    const text = befund.fehler.join("\n");
    expect(text).toContain('terminaler Stand ist aber "offen"');
    expect(text).toContain("nicht bestimmbar");
    expect(text).toContain('nach CR-03 E2 als "ungeklaert" gefuehrt werden');
  });

  it("U2 — offen und danach final: der Lauf bleibt gueltig", () => {
    const befund = pruefeLauf(
      endwirkungsLauf([offenerStand("2019-03-01"), finalerStand("2020-04-01")]),
      ENDWIRKUNG,
    );
    expect(befund.fehler).toEqual([]);
  });

  it("U3 — final und danach offen: terminal offen, der Lauf ist ungueltig", () => {
    const befund = pruefeLauf(
      endwirkungsLauf([finalerStand("2019-03-01"), offenerStand("2020-04-01")]),
      ENDWIRKUNG,
    );
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join("\n")).toContain('terminaler Stand ist aber "offen"');
  });

  it("U4 — derselbe ungeloeste Rohtreffer als \"ungeklaert\" ist gueltig, ohne erfundene Felder", () => {
    const roh = treffer({ quelle_id: "q-offen", datum: "2019-03-01", status: "ungeklaert" });
    expect(roh.erledigungsweg).toBeUndefined();
    expect(roh.messausgang).toBeUndefined();
    expect(pruefeLauf(endwirkungsLauf([roh]), ENDWIRKUNG).fehler).toEqual([]);
  });

  it("U5 — ein ungeklaerter Treffer sperrt die Quote wie bisher", () => {
    const basis = endwirkungsKorpus(12, 6);
    const mitUngeklaertem = endwirkungsLauf([
      ...basis.lauf.treffer,
      treffer({ quelle_id: "q-rest", status: "ungeklaert" }),
    ]);
    const sperre = sperren(mitUngeklaertem, ENDWIRKUNG, basis.faelle);
    expect(sperre.ok).toBe(false);
    expect(sperre.gruende.join("\n")).toContain('1 Treffer sind noch "ungeklaert"');
  });

  it("der Wert \"offen\" bleibt erhalten — er benennt den Zwischenstand", () => {
    expect(ENDWIRKUNG_MESSAUSGAENGE).toContain("offen");
    const einheit = zaehleinheiten(
      endwirkungsLauf([offenerStand("2019-03-01"), finalerStand("2020-04-01")]),
      ENDWIRKUNG,
    ).einheiten.find((e) => e.id === EINHEIT);
    expect(einheit!.treffer.some((t) => t.messausgang?.wert === "offen")).toBe(true);
    expect(einheit!.offen).toBe(false);
  });
});

describe("S — das Standdatum, nicht das Datum des Rohtreffers", () => {
  // `treffer.datum` ist Rohquellen-Metadatum des urspruenglichen Suchtreffers.
  // Stammt der kodierte Endzustand aus einem nach CR-03 E2 zulaessigen
  // verknuepften Folgeentscheid, ist DESSEN Datum massgeblich — sonst ordnete
  // die Kette nach dem Datum des falschen Entscheids.
  const EINHEIT = "streit-kette";

  const glied = (name: string, teil: Partial<Treffer>): Treffer =>
    vollstaendig(0, { quelle_id: `q-${name}`, zaehleinheit: EINHEIT, story_id: "FS-100", ...teil });

  const offen = (rohDatum: string, standDatum: string): Treffer =>
    glied(`offen-${standDatum}`, {
      datum: rohDatum,
      abschluss_status: "rueckweisung_offen",
      erledigungsweg: weg({ modus: "rueckweisung_offen", stand_datum: standDatum }),
      messausgang: ausgang("offen"),
    });

  const final = (rohDatum: string, standDatum: string, wert: "durchgesetzt" | "nicht_durchgesetzt"): Treffer =>
    glied(`final-${standDatum}-${wert}`, {
      datum: rohDatum,
      abschluss_status: "abgeschlossen",
      erledigungsweg: weg({ stand_datum: standDatum, quelle: `Verknuepfter Entscheid vom ${standDatum}.` }),
      messausgang: ausgang(wert),
    });

  const einheitAus = (liste: Treffer[]) => {
    const ergebnis = zaehleinheiten(endwirkungsLauf(liste), ENDWIRKUNG);
    return { ergebnis, einheit: ergebnis.einheiten.find((e) => e.id === EINHEIT)! };
  };

  it("S1 — Rohdatum und Standdatum stimmen ueberein: der spaetere Stand gilt", () => {
    const { ergebnis, einheit } = einheitAus([
      offen("2019-03-01", "2019-03-01"),
      final("2020-04-01", "2020-04-01", "durchgesetzt"),
    ]);
    expect(ergebnis.fehler).toEqual([]);
    expect(einheit.abschluss_status).toBe("abgeschlossen");
    expect(einheit.messausgang?.wert).toBe("durchgesetzt");
  });

  it("S2 — der Stand aus einer verknuepften Quelle ordnet nach deren Datum", () => {
    // Der Rohtreffer ist von 2019, sein Endzustand stammt aus einem Entscheid
    // von 2021. Waere `treffer.datum` massgeblich, gewaenne die Rueckweisung
    // von 2020 — und die Einheit bliebe faelschlich offen.
    const { ergebnis, einheit } = einheitAus([
      final("2019-01-01", "2021-06-15", "nicht_durchgesetzt"),
      offen("2020-05-01", "2020-05-01"),
    ]);
    expect(ergebnis.fehler).toEqual([]);
    expect(einheit.abschluss_status).toBe("abgeschlossen");
    expect(einheit.messausgang?.wert).toBe("nicht_durchgesetzt");
    expect(einheit.offen).toBe(false);
  });

  it("S3 — die Array-Reihenfolge aendert nichts", () => {
    const vorwaerts = einheitAus([offen("2019-03-01", "2019-03-01"), final("2020-04-01", "2020-04-01", "durchgesetzt")]);
    const rueckwaerts = einheitAus([final("2020-04-01", "2020-04-01", "durchgesetzt"), offen("2019-03-01", "2019-03-01")]);
    expect(rueckwaerts.einheit.abschluss_status).toBe(vorwaerts.einheit.abschluss_status);
    expect(rueckwaerts.einheit.messausgang?.wert).toBe(vorwaerts.einheit.messausgang?.wert);
  });

  it("S4 — das spaeteste Standdatum gewinnt", () => {
    const { einheit } = einheitAus([
      final("2019-01-01", "2019-02-02", "durchgesetzt"),
      final("2019-01-01", "2022-09-09", "nicht_durchgesetzt"),
    ]);
    expect(einheit.messausgang?.wert).toBe("nicht_durchgesetzt");
  });

  it("S5 — gleiches spaetestes Standdatum mit widersprechenden Staenden ist ein Fehler", () => {
    const { ergebnis, einheit } = einheitAus([
      final("2019-01-01", "2020-04-01", "durchgesetzt"),
      final("2019-02-01", "2020-04-01", "nicht_durchgesetzt"),
    ]);
    expect(ergebnis.fehler.join("\n")).toContain("widersprechende Normausgaenge");
    expect(einheit.messausgang).toBeUndefined();
  });

  it("S6 — ein eingeschlossener Endwirkungs-Treffer ohne Standdatum ist ein Fehler", () => {
    const l = endwirkungsLauf([vollstaendig(1, { erledigungsweg: weg({ stand_datum: undefined }) })]);
    expect(pruefeLauf(l, ENDWIRKUNG).fehler.join("\n")).toContain("kein erledigungsweg.stand_datum");
  });

  it("S7 — ein eingeschlossener Endwirkungs-Treffer ohne Provenienz ist ein Fehler", () => {
    const l = endwirkungsLauf([vollstaendig(1, { erledigungsweg: weg({ quelle: undefined }) })]);
    expect(pruefeLauf(l, ENDWIRKUNG).fehler.join("\n")).toContain("keine erledigungsweg.quelle");
  });

  it("S8 — ein Standdatum nach dem Datenstand des Laufs ist ein Fehler", () => {
    const l: Messlauf = {
      ...endwirkungsLauf([vollstaendig(1, { erledigungsweg: weg({ stand_datum: "2026-08-10" }) })]),
      datenstand: "2026-08-09",
    };
    const text = pruefeLauf(l, ENDWIRKUNG).fehler.join("\n");
    expect(text).toContain("liegt nach dem Datenstand des Laufs");
    expect(text).toContain("spaeteres Wissen in eine historische Messung");
  });

  it("S8 — am Datenstand selbst ist es zulaessig", () => {
    const l: Messlauf = {
      ...endwirkungsLauf([vollstaendig(1, { erledigungsweg: weg({ stand_datum: "2026-08-09" }) })]),
      datenstand: "2026-08-09",
    };
    expect(pruefeLauf(l, ENDWIRKUNG).fehler).toEqual([]);
  });

  it("S9 — Legacy verlangt weder Standdatum noch Provenienz", () => {
    const l = lauf([
      treffer({
        quelle_id: "q1",
        status: "eingeschlossen",
        zaehleinheit: "streit-1",
        abschluss_status: "abgeschlossen",
        erledigungsweg: { modus: "materiell_entschieden", prozessgrund: null, beleg: "Erwaegung 3.2." },
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

  it("S10 — das Standdatum aendert den Rohmetadaten-Fingerprint nicht", () => {
    const metadaten = { quelle_id: "q1", datum: "2019-03-01", gericht: "CH_BGer" };
    const ohne = vollstaendig(1, { ...metadaten, erledigungsweg: weg({ stand_datum: "2019-03-01" }) });
    const mit = vollstaendig(1, { ...metadaten, erledigungsweg: weg({ stand_datum: "2021-06-15" }) });

    expect(mit.metadaten_fingerprint).toBe(ohne.metadaten_fingerprint);
    expect(mit.metadaten_fingerprint).toBe(metadatenFingerprint(metadaten));
    // Und der Lauf bleibt fingerprint-fehlerfrei.
    expect(pruefeLauf(endwirkungsLauf([mit]), ENDWIRKUNG).fehler).toEqual([]);
  });
});

describe("L — die Modellgrenze: Legacy behaelt seine Aggregation", () => {
  // Dieselben Daten, dieselbe id, dieselbe Version — nur das erklaerte
  // Auswertungsmodell unterscheidet die beiden Definitionen. Damit misst
  // dieser Block genau eines: dass die Chronologie des Endwirkungsmodells
  // nicht auf alte Definitionen durchschlaegt. Ihre Bedeutung gehoert zu
  // ihnen; wer sie nachtraeglich verbessert, macht alte Quoten
  // unreproduzierbar.
  const LEGACY: Messdefinition = { ...ENDWIRKUNG, auswertungsmodell: undefined };
  const EINHEIT = "streit-kette";

  function glied(name: string, teil: Partial<Treffer>): Treffer {
    return treffer({
      quelle_id: `q-${name}`,
      status: "eingeschlossen",
      zaehleinheit: EINHEIT,
      story_id: "FS-100",
      ...teil,
    });
  }

  // Dieselben Treffer werden gegen beide Definitionen gehalten. Der
  // Erledigungsweg samt stand_datum steht mit dabei — Legacy ignoriert ihn,
  // Endwirkung braucht ihn. So bleiben die DATEN identisch, und nur das
  // Modell unterscheidet sich.
  const abgeschlossen = (datum: string | undefined, wert: "durchgesetzt" | "nicht_durchgesetzt"): Treffer =>
    glied(`end-${datum ?? "ohne"}-${wert}`, {
      datum,
      abschluss_status: "abgeschlossen",
      erledigungsweg: weg({ stand_datum: datum }),
      messausgang: ausgang(wert),
    });

  /** Rueckweisung in Legacy-Gestalt: ohne den Wert "offen", den es dort nicht gibt. */
  const rueckweisung = (datum?: string): Treffer =>
    glied(`rw-${datum ?? "ohne"}`, {
      datum,
      abschluss_status: "rueckweisung_offen",
      erledigungsweg: weg({ modus: "rueckweisung_offen", stand_datum: datum }),
    });

  const einheitAus = (liste: Treffer[], definition: Messdefinition) => {
    const ergebnis = zaehleinheiten(endwirkungsLauf(liste), definition);
    return { ergebnis, einheit: ergebnis.einheiten.find((e) => e.id === EINHEIT)! };
  };

  it("L1 — Legacy: ein spaeterer Rueckweisungsentscheid oeffnet die Einheit NICHT wieder", () => {
    const kette = [abgeschlossen("2019-03-01", "durchgesetzt"), rueckweisung("2020-04-01")];
    const { ergebnis, einheit } = einheitAus(kette, LEGACY);

    // Exakt die Regel von vor dem Endwirkungsmodell: irgendein
    // "abgeschlossen" schliesst die Einheit ab, gleich wann es faellt.
    expect(ergebnis.fehler).toEqual([]);
    expect(einheit.abschluss_status).toBe("abgeschlossen");
    expect(einheit.messausgang?.wert).toBe("durchgesetzt");
    expect(einheit.offen).toBe(false);
  });

  it("L1 — dieselbe Kette unter Endwirkung ist wieder offen", () => {
    const kette = [abgeschlossen("2019-03-01", "durchgesetzt"), rueckweisung("2020-04-01")];
    const { ergebnis, einheit } = einheitAus(kette, ENDWIRKUNG);

    expect(ergebnis.fehler).toEqual([]);
    expect(einheit.abschluss_status).toBe("rueckweisung_offen");
    // Der Unterschied haengt allein am Feld — die Daten sind identisch.
    expect(LEGACY.id).toBe(ENDWIRKUNG.id);
    expect(LEGACY.version).toBe(ENDWIRKUNG.version);
  });

  it("L2 — Legacy: zwei verschiedene Endausgaenge bleiben ein Widerspruch, auch mit Daten", () => {
    const kette = [abgeschlossen("2019-03-01", "durchgesetzt"), abgeschlossen("2020-04-01", "nicht_durchgesetzt")];
    const { ergebnis } = einheitAus(kette, LEGACY);

    // Die Terminalchronologie darf diesen Konflikt hier NICHT aufloesen.
    expect(ergebnis.fehler.join("\n")).toContain("widersprechende Normausgaenge");
  });

  it("L3 — Endwirkung: dieselben Ausgaenge loest der terminale Stand auf", () => {
    const kette = [abgeschlossen("2019-03-01", "durchgesetzt"), abgeschlossen("2020-04-01", "nicht_durchgesetzt")];
    const { ergebnis, einheit } = einheitAus(kette, ENDWIRKUNG);

    expect(ergebnis.fehler).toEqual([]);
    expect(einheit.messausgang?.wert).toBe("nicht_durchgesetzt");
    expect(einheit.abschluss_status).toBe("abgeschlossen");
  });

  it("L4 — Legacy ohne Datumsangaben bekommt keinen neuen Chronologiefehler", () => {
    const kette = [abgeschlossen(undefined, "durchgesetzt"), rueckweisung(undefined)];
    const { ergebnis, einheit } = einheitAus(kette, LEGACY);

    expect(ergebnis.fehler).toEqual([]);
    expect(einheit.abschluss_status).toBe("abgeschlossen");
    expect(einheit.messausgang?.wert).toBe("durchgesetzt");
  });

  it("L4 — dieselbe undatierte Kette unter Endwirkung wird nicht geraten", () => {
    const kette = [abgeschlossen(undefined, "durchgesetzt"), rueckweisung(undefined)];
    const { ergebnis } = einheitAus(kette, ENDWIRKUNG);
    expect(ergebnis.fehler.join("\n")).toContain("kein Standdatum");
  });

  it("die Entscheidung faellt allein ueber istEndwirkungsmodell", () => {
    expect(istEndwirkungsmodell(LEGACY)).toBe(false);
    expect(istEndwirkungsmodell(ENDWIRKUNG)).toBe(true);
    expect(auswertungsmodell(LEGACY)).toBe("materielle_pruefung");
  });

  it("L5 — die realen Zaehleinheiten von ML-001 bleiben unveraendert", () => {
    const md = leseJson(messkorpusPfad("definitionen", "MD-001-kuendigungsschutz-bger.json")) as Messdefinition;
    const ml = leseJson(messkorpusPfad("laeufe", "ML-001", "lauf.json")) as Messlauf;
    const ergebnis = zaehleinheiten(ml, md);

    expect(istEndwirkungsmodell(md)).toBe(false);
    expect(ergebnis.fehler).toEqual([]);
    expect(ergebnis.einheiten).toHaveLength(119);
    // Keine Einheit gilt als offen — den Wert gibt es unter diesem Modell nicht.
    expect(ergebnis.einheiten.some((e) => e.offen)).toBe(false);
    // Die einzige nicht abgeschlossene Einheit ist die bekannte Rueckweisung.
    expect(ergebnis.einheiten.filter((e) => e.abschluss_status !== "abgeschlossen").map((e) => e.id)).toEqual([
      "4A_347/2017",
    ]);
  });

  it("L6 — MD-001 v2.0.0 behaelt denselben kanonischen Hash", () => {
    const md = leseJson(messkorpusPfad("definitionen", "MD-001-kuendigungsschutz-bger.json")) as Messdefinition;
    expect(definitionsHash(md)).toBe("a9b2143bd2873f1b5df2b9bebaf8247283158c9bb86d9f233fbb330f860244af");
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

describe("K — Erledigungsweg, Abschlussstatus und Messausgang sind vollstaendig gekoppelt", () => {
  // Die drei Felder beschreiben denselben Sachverhalt aus drei Richtungen.
  // Geprueft wird deshalb in beide Richtungen: nicht nur "eine Rueckweisung
  // laesst die Messfrage offen", sondern ebenso "eine offene Messfrage kommt
  // nur aus einer Rueckweisung". Ohne die Gegenrichtung waere ein Datensatz
  // gueltig, in dem der Erledigungsweg etwas anderes behauptet als die beiden
  // anderen Felder — dann bezeichnete er nicht mehr deren Zustand.
  const befund = (teil: Partial<Treffer>) => pruefeLauf(endwirkungsLauf([vollstaendig(1, teil)]), ENDWIRKUNG);

  it("K1 — prozessual_erledigt mit rueckweisung_offen und offen ist ein Fehler", () => {
    const f = befund({
      erledigungsweg: weg({ modus: "prozessual_erledigt", prozessgrund: "anfechtungsfrist_verwirkt" }),
      abschluss_status: "rueckweisung_offen",
      messausgang: ausgang("offen"),
    });
    expect(f.ok).toBe(false);
    expect(f.fehler.join("\n")).toContain('Messausgang "offen", Erledigungsweg aber "prozessual_erledigt"');
  });

  it("K2 — materiell_entschieden mit rueckweisung_offen und offen ist ein Fehler", () => {
    const f = befund({
      erledigungsweg: weg({ modus: "materiell_entschieden" }),
      abschluss_status: "rueckweisung_offen",
      messausgang: ausgang("offen"),
    });
    expect(f.ok).toBe(false);
    expect(f.fehler.join("\n")).toContain('Abschlussstatus "rueckweisung_offen", Erledigungsweg aber');
  });

  it.each(["materiell_entschieden", "prozessual_erledigt"] as const)(
    "K3 — Messausgang \"offen\" bei modus %s ist ein Fehler",
    (modus) => {
      const f = befund({
        erledigungsweg:
          modus === "prozessual_erledigt"
            ? weg({ modus, prozessgrund: "instanzverwirkung" })
            : weg({ modus }),
        messausgang: ausgang("offen"),
      });
      expect(f.ok).toBe(false);
      expect(f.fehler.join("\n")).toContain("das ist keine Erledigung");
    },
  );

  it.each(["materiell_entschieden", "prozessual_erledigt"] as const)(
    "K4 — Abschlussstatus rueckweisung_offen bei modus %s ist ein Fehler",
    (modus) => {
      const f = befund({
        erledigungsweg:
          modus === "prozessual_erledigt"
            ? weg({ modus, prozessgrund: "instanzverwirkung" })
            : weg({ modus }),
        abschluss_status: "rueckweisung_offen",
      });
      expect(f.ok).toBe(false);
      expect(f.fehler.join("\n")).toContain("hier sagen sie Verschiedenes");
    },
  );

  it("K5 — materiell_entschieden, abgeschlossen, durchgesetzt ist gueltig", () => {
    const f = befund({
      erledigungsweg: weg({ modus: "materiell_entschieden" }),
      abschluss_status: "abgeschlossen",
      messausgang: ausgang("durchgesetzt"),
    });
    expect(f.fehler).toEqual([]);
  });

  it("K6 — prozessual_erledigt mit Grund, abgeschlossen, nicht_durchgesetzt ist gueltig", () => {
    const f = befund({
      erledigungsweg: weg({ modus: "prozessual_erledigt", prozessgrund: "klagebewilligung_fehlte_oder_ungueltig" }),
      abschluss_status: "abgeschlossen",
      messausgang: ausgang("nicht_durchgesetzt"),
    });
    expect(f.fehler).toEqual([]);
  });

  it("K7 — prozessual_erledigt, abgeschlossen, offen ist ein Fehler", () => {
    const f = befund({
      erledigungsweg: weg({ modus: "prozessual_erledigt", prozessgrund: "nichteintreten_sonstiger_grund" }),
      abschluss_status: "abgeschlossen",
      messausgang: ausgang("offen"),
    });
    expect(f.ok).toBe(false);
    expect(f.fehler.join("\n")).toContain("das ist keine Erledigung");
  });

  it("K8 — materiell_entschieden mit zwischenentscheid ist ein Fehler", () => {
    const f = befund({ erledigungsweg: weg({ modus: "materiell_entschieden" }), abschluss_status: "zwischenentscheid" });
    expect(f.ok).toBe(false);
    expect(f.fehler.join("\n")).toContain("fuer einen Zwischenstand ist keiner definiert");
  });

  it("K9 — prozessual_erledigt mit ungeklaertem Abschluss ist ein Fehler", () => {
    const f = befund({
      erledigungsweg: weg({ modus: "prozessual_erledigt", prozessgrund: "sonstiger_prozessgrund" }),
      abschluss_status: "ungeklaert",
    });
    expect(f.ok).toBe(false);
    expect(f.fehler.join("\n")).toContain("fuer einen Zwischenstand ist keiner definiert");
  });

  it("K9 — es wird kein Modus fuer den Zwischenstand erfunden", () => {
    // Der Fehlertext verweist auf "ungeklaert" als Ausweg, nicht auf einen
    // vierten Modus. Einen einzufuehren waere eine fachliche Entscheidung.
    const f = befund({ erledigungsweg: weg(), abschluss_status: "zwischenentscheid" });
    expect(f.fehler.join("\n")).toContain('bleibt der Treffer "ungeklaert" statt eingeschlossen');
  });

  it("K10 — ein ungeklaerter Treffer bleibt ohne Endwirkungsfelder gueltig", () => {
    const l = endwirkungsLauf([treffer({ quelle_id: "q1", status: "ungeklaert" })]);
    expect(pruefeLauf(l, ENDWIRKUNG).fehler).toEqual([]);
  });

  it("nur drei Kombinationen sind gueltig — jede andere faellt auf", () => {
    const kombinationen = [
      { modus: "materiell_entschieden", abschluss: "abgeschlossen", wert: "durchgesetzt", gueltig: true },
      { modus: "prozessual_erledigt", abschluss: "abgeschlossen", wert: "nicht_durchgesetzt", gueltig: true },
      { modus: "rueckweisung_offen", abschluss: "rueckweisung_offen", wert: "offen", gueltig: true },
      { modus: "materiell_entschieden", abschluss: "abgeschlossen", wert: "offen", gueltig: false },
      { modus: "materiell_entschieden", abschluss: "rueckweisung_offen", wert: "durchgesetzt", gueltig: false },
      { modus: "prozessual_erledigt", abschluss: "rueckweisung_offen", wert: "offen", gueltig: false },
      { modus: "rueckweisung_offen", abschluss: "abgeschlossen", wert: "offen", gueltig: false },
      { modus: "rueckweisung_offen", abschluss: "rueckweisung_offen", wert: "durchgesetzt", gueltig: false },
    ] as const;

    for (const k of kombinationen) {
      // Geprueft wird die Kopplung der drei Felder, nicht der ganze Lauf: ein
      // terminal offener Fall ist in sich stimmig und trotzdem nicht
      // einschliessbar (Block U).
      const fehler = pruefeEndwirkung(
        "ML-999",
        "2026-08-08",
        vollstaendig(1, {
          erledigungsweg:
            k.modus === "prozessual_erledigt"
              ? weg({ modus: k.modus, prozessgrund: "aktivlegitimation_fehlte" })
              : weg({ modus: k.modus }),
          abschluss_status: k.abschluss,
          messausgang: ausgang(k.wert),
        }),
      );
      expect(
        fehler.length === 0,
        `${k.modus} / ${k.abschluss} / ${k.wert} sollte ${k.gueltig ? "gueltig" : "abgelehnt"} sein: ${fehler.join(" | ")}`,
      ).toBe(k.gueltig);
    }
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

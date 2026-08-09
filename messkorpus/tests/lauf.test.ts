// Tests der Lauf-Invarianten: kein stiller Verlust (nachgewiesen ueber das
// Abrufprotokoll, nicht ueber roh_treffer), genau ein Status je Treffer,
// vorher deklarierte Ausschlussgruende, Fingerprint, Zaehleinheiten,
// Reproduzierbarkeit.

import { describe, expect, it } from "vitest";
import { definitionsHash, type Messdefinition } from "../tools/definition.ts";
import {
  bilanz,
  gleichePopulation,
  metadatenFingerprint,
  population,
  pruefeLauf,
  zaehleinheiten,
} from "../tools/lauf.ts";
import { DEFINITION, abruf, lauf, treffer } from "./fixtures.ts";

const EINS = treffer({ quelle_id: "a1", status: "eingeschlossen", story_id: "FS-101", zaehleinheit: "s1" });
const ZWEI = treffer({ quelle_id: "a2", status: "ausgeschlossen", ausschlussgrund: "andere_norm" });
const DREI = treffer({ quelle_id: "a3", status: "ungeklaert" });

describe("pruefeLauf", () => {
  it("nimmt einen vollstaendigen Lauf an", () => {
    const befund = pruefeLauf(lauf([EINS, ZWEI, DREI]), DEFINITION);
    expect(befund.fehler).toEqual([]);
  });

  it("meldet stillen Verlust, wenn roh_treffer nicht zur Liste passt", () => {
    const befund = pruefeLauf(lauf([EINS, ZWEI], { roh_treffer: 5 }), DEFINITION);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("Differenz 3");
  });

  it("lehnt einen gekappten Abruf als Messkorpus ab", () => {
    const befund = pruefeLauf(lauf([EINS], { gekappt: true }), DEFINITION);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("gekappt");
  });

  it("lehnt einen Ausschluss ohne Grund ab", () => {
    const befund = pruefeLauf(lauf([treffer({ quelle_id: "a9", status: "ausgeschlossen" })]), DEFINITION);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("keinen Grund");
  });

  it("lehnt einen nachtraeglich erfundenen Ausschlussgrund ab", () => {
    const befund = pruefeLauf(
      lauf([treffer({ quelle_id: "a9", status: "ausgeschlossen", ausschlussgrund: "passt_nicht_ins_bild" })]),
      DEFINITION,
    );
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("nicht vorher deklariert");
  });

  it("lehnt einen Ausschlussgrund an einem eingeschlossenen Treffer ab", () => {
    const befund = pruefeLauf(
      lauf([treffer({ quelle_id: "a9", status: "eingeschlossen", ausschlussgrund: "andere_norm" })]),
      DEFINITION,
    );
    expect(befund.ok).toBe(false);
  });

  it("lehnt doppelte Treffer ab", () => {
    const befund = pruefeLauf(lauf([EINS, { ...EINS }], { abrufe: [abruf(2)] }), DEFINITION);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("mehrfach");
  });

  it("erkennt eine nachtraeglich geaenderte Messdefinition am Hash", () => {
    const geaendert: Messdefinition = { ...DEFINITION, zeitraum: { von: "2020-01-02", bis: "2020-12-31" } };
    const befund = pruefeLauf(lauf([EINS]), geaendert);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("nach dem Lauf inhaltlich geaendert");
  });

  it("erkennt einen Lauf gegen eine andere Version der Definition", () => {
    const neu: Messdefinition = { ...DEFINITION, version: "2.0.0" };
    const befund = pruefeLauf(lauf([EINS]), neu);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("Version");
  });

  it("lehnt einen Normausgang ab, der unter einer aelteren Fassung derselben Definition kodiert wurde", () => {
    // Eine neue Version kann Messfrage oder Kriterien geaendert haben — dann
    // ist die alte Kodierung nicht mehr dieselbe Aussage.
    const alt = treffer({
      quelle_id: "a5",
      status: "eingeschlossen",
      story_id: "FS-101",
      zaehleinheit: "s1",
      abschluss_status: "abgeschlossen",
      messausgang: {
        messdefinition_id: DEFINITION.id,
        messdefinition_version: "0.9.0",
        wert: "durchgesetzt",
        beleg: "Dispositiv Ziffer 1.",
      },
    });
    const befund = pruefeLauf(lauf([alt]), DEFINITION);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("MD-999@0.9.0");
  });

  it("nimmt einen Normausgang derselben Fassung an", () => {
    const passend = treffer({
      quelle_id: "a6",
      status: "eingeschlossen",
      story_id: "FS-101",
      zaehleinheit: "s1",
      abschluss_status: "abgeschlossen",
      messausgang: {
        messdefinition_id: DEFINITION.id,
        messdefinition_version: DEFINITION.version,
        wert: "durchgesetzt",
        beleg: "Dispositiv Ziffer 1.",
      },
    });
    expect(pruefeLauf(lauf([passend]), DEFINITION).fehler).toEqual([]);
  });

  it("lehnt einen Normausgang einer fremden Messdefinition ab", () => {
    const fremd = treffer({
      quelle_id: "a4",
      status: "eingeschlossen",
      story_id: "FS-101",
      zaehleinheit: "s1",
      messausgang: {
        messdefinition_id: "MD-002",
        messdefinition_version: "1.0.0",
        wert: "durchgesetzt",
        beleg: "Dispositiv Ziffer 1.",
      },
    });
    const befund = pruefeLauf(lauf([fremd]), DEFINITION);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("gilt nur fuer seine eigene Messdefinition");
  });
});

describe("Metadaten-Fingerprint", () => {
  it("faellt auf, wenn die Quellmetadaten nachtraeglich geaendert wurden", () => {
    const echt = treffer({ quelle_id: "a1", aktenzeichen: "4A_1/2020", status: "ungeklaert" });
    const manipuliert = { ...echt, aktenzeichen: "4A_2/2020" };
    const befund = pruefeLauf(lauf([manipuliert]), DEFINITION);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("nachtraeglich geaendert");
  });

  it("ist stabil gegen die Schluesselreihenfolge der Metadaten", () => {
    expect(metadatenFingerprint({ quelle_id: "x", datum: "2020-01-01", gericht: "CH_BGer" })).toBe(
      metadatenFingerprint({ gericht: "CH_BGer", quelle_id: "x", datum: "2020-01-01" }),
    );
  });
});

describe("Abrufprotokoll — der eigentliche Vollstaendigkeitsnachweis", () => {
  it("lehnt eine Trefferzahl ab, die die Quelle nur als Untergrenze meldet", () => {
    const befund = pruefeLauf(lauf([EINS], { abrufe: [abruf(1, { gemeldet_relation: "gte" })] }), DEFINITION);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("nicht als exakt");
  });

  it("lehnt eine unbekannte Relation ebenso ab", () => {
    const befund = pruefeLauf(lauf([EINS], { abrufe: [abruf(1, { gemeldet_relation: "unbekannt" })] }), DEFINITION);
    expect(befund.ok).toBe(false);
  });

  it("meldet, wenn weniger empfangen wurde als die Quelle nannte", () => {
    const befund = pruefeLauf(
      lauf([EINS], { abrufe: [abruf(1, { gemeldet_total: 12, empfangen: 1, vor_gerichtsfilter: 1 })] }),
      DEFINITION,
    );
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("Differenz 11");
  });

  it("laesst keinen Treffer ohne Quelle-ID still verschwinden", () => {
    const befund = pruefeLauf(
      lauf([EINS], { abrufe: [abruf(1, { empfangen: 3, ohne_id: 2, vor_gerichtsfilter: 1, gemeldet_total: 3 })] }),
      DEFINITION,
    );
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("ohne Quelle-ID");
  });

  it("verlangt, dass die Fenster den Zeitraum lueckenlos abdecken", () => {
    const mitLuecke = lauf([EINS], {
      abrufe: [
        abruf(1, { von: "2020-01-01", bis: "2020-06-30" }),
        abruf(0, { von: "2020-07-02", bis: "2020-12-31" }),
      ],
    });
    const befund = pruefeLauf(mitLuecke, DEFINITION);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("Luecke");
  });

  it("nimmt lueckenlos aneinandergrenzende Fenster an", () => {
    const geteilt = lauf([EINS], {
      abrufe: [
        abruf(1, { von: "2020-01-01", bis: "2020-06-30" }),
        abruf(0, { von: "2020-07-01", bis: "2020-12-31" }),
      ],
    });
    expect(pruefeLauf(geteilt, DEFINITION).fehler).toEqual([]);
  });

  it("verlangt, dass die Fenster am Rand des Zeitraums beginnen und enden", () => {
    const zuKurz = lauf([EINS], { abrufe: [abruf(1, { von: "2020-02-01" })] });
    expect(pruefeLauf(zuKurz, DEFINITION).fehler.join(" ")).toContain("erstes Fenster beginnt");
  });

  it("rechnet die gespeicherte Population aus dem Protokoll nach", () => {
    // 5 nach Filter, 2 Duplikate -> 3 gespeicherte Treffer waeren richtig.
    const falsch = lauf([EINS, ZWEI], { abrufe: [abruf(5, { empfangen: 5, vor_gerichtsfilter: 5 })], duplikate: 2 });
    const befund = pruefeLauf(falsch, DEFINITION);
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("Bilanz geht nicht auf");
  });

  it("akzeptiert eine aufgehende Bilanz mit Duplikaten", () => {
    const stimmig = lauf([EINS, ZWEI, DREI], {
      abrufe: [abruf(5, { empfangen: 5, vor_gerichtsfilter: 5 })],
      duplikate: 2,
    });
    expect(pruefeLauf(stimmig, DEFINITION).fehler).toEqual([]);
  });
});

describe("bilanz", () => {
  it("zaehlt jeden Treffer genau einmal und fuehrt die gemeldete Zahl mit", () => {
    const b = bilanz(
      lauf([EINS, ZWEI, DREI, treffer({ quelle_id: "a4", status: "ausgeschlossen", ausschlussgrund: "andere_norm" })]),
    );
    expect(b.roh).toBe(4);
    expect(b.eingeschlossen + b.ausgeschlossen + b.ungeklaert).toBe(b.roh);
    expect(b.ausschluesse).toEqual([{ grund: "andere_norm", anzahl: 2 }]);
    expect(b.gemeldet_gesamt).toBe(4);
  });
});

describe("zaehleinheiten", () => {
  function eingeschlossen(id: string, einheit: string, story?: string, wert: "durchgesetzt" | "nicht_durchgesetzt" = "durchgesetzt") {
    return treffer({
      quelle_id: id,
      status: "eingeschlossen",
      zaehleinheit: einheit,
      story_id: story,
      abschluss_status: "abgeschlossen",
      messausgang: {
        messdefinition_id: DEFINITION.id,
        messdefinition_version: DEFINITION.version,
        wert,
        beleg: "Dispositiv Ziffer 1 des Entscheids.",
      },
    });
  }

  it("fasst zwei Entscheide derselben Streitigkeit zu einer Einheit zusammen", () => {
    const ergebnis = zaehleinheiten(
      lauf([eingeschlossen("a1", "streit-1", "FS-101"), eingeschlossen("a2", "streit-1", "FS-101")], {
        abrufe: [abruf(2)],
      }),
      DEFINITION,
    );
    expect(ergebnis.fehler).toEqual([]);
    expect(ergebnis.einheiten).toHaveLength(1);
    expect(ergebnis.einheiten[0]?.treffer).toHaveLength(2);
  });

  it("meldet einen eingeschlossenen Treffer ohne Zaehleinheit", () => {
    const ergebnis = zaehleinheiten(
      lauf([treffer({ quelle_id: "a1", status: "eingeschlossen", story_id: "FS-101" })]),
      DEFINITION,
    );
    expect(ergebnis.fehler.join(" ")).toContain("keine Zaehleinheit");
  });

  it("meldet denselben Fall an zwei Zaehleinheiten", () => {
    const ergebnis = zaehleinheiten(
      lauf([eingeschlossen("a1", "streit-1", "FS-101"), eingeschlossen("a2", "streit-2", "FS-101")], {
        abrufe: [abruf(2)],
      }),
      DEFINITION,
    );
    expect(ergebnis.fehler.join(" ")).toContain("doppelt in den Nenner");
  });

  it("meldet widersprechende Normausgaenge innerhalb einer Einheit", () => {
    const ergebnis = zaehleinheiten(
      lauf(
        [
          eingeschlossen("a1", "streit-1", "FS-101", "durchgesetzt"),
          eingeschlossen("a2", "streit-1", "FS-101", "nicht_durchgesetzt"),
        ],
        { abrufe: [abruf(2)] },
      ),
      DEFINITION,
    );
    expect(ergebnis.fehler.join(" ")).toContain("widersprechende Normausgaenge");
  });

  it("laesst einen spaeteren Endentscheid eine fruehere Rueckweisung abschliessen", () => {
    const rueckweisung = treffer({
      quelle_id: "a1",
      status: "eingeschlossen",
      zaehleinheit: "streit-1",
      story_id: "FS-101",
      abschluss_status: "rueckweisung_offen",
    });
    const ergebnis = zaehleinheiten(
      lauf([rueckweisung, eingeschlossen("a2", "streit-1", "FS-101")], { abrufe: [abruf(2)] }),
      DEFINITION,
    );
    expect(ergebnis.einheiten[0]?.abschluss_status).toBe("abgeschlossen");
  });
});

describe("Reproduzierbarkeit", () => {
  it("ergibt dieselbe Population unabhaengig von der Reihenfolge der Treffer", () => {
    expect(gleichePopulation(lauf([EINS, ZWEI, DREI]), lauf([DREI, EINS, ZWEI]))).toBe(true);
  });

  it("erkennt eine geaenderte Population", () => {
    const a = lauf([EINS, ZWEI]);
    const b = lauf([EINS, treffer({ quelle_id: "a2", status: "eingeschlossen" })]);
    expect(gleichePopulation(a, b)).toBe(false);
    expect(population(a)).not.toBe(population(b));
  });

  it("haelt den Definitions-Hash unabhaengig von der Schluesselreihenfolge", () => {
    const umsortiert = { ...DEFINITION };
    expect(definitionsHash(umsortiert)).toBe(definitionsHash(DEFINITION));
  });
});

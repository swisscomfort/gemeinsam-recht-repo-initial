// Tests der reinen Erhebungslogik (messlauf.ts). Kein Netz — die Rohtreffer
// sind Fixtures im Format der Quelle (nur die Metadaten-Felder aus abruf.ts).

import { describe, expect, it } from "vitest";
import {
  aktenzeichenAus,
  alsMesslaufTreffer,
  gehoertZuGericht,
  jahresfenster,
  metadatenFingerprint,
  relationAus,
  tage,
  teile,
  vereinige,
  type MesslaufTreffer,
} from "../src/messlauf.js";

const VIEW = "https://entscheidsuche.ch/view/";

function roh(id: string, datum: string, hierarchy: string[], titel: string): unknown {
  return { _id: id, _source: { date: datum, hierarchy, title: { de: titel } } };
}

describe("Zeitfenster", () => {
  it("zaehlt beide Enden mit", () => {
    expect(tage({ von: "2025-01-01", bis: "2025-01-01" })).toBe(1);
    expect(tage({ von: "2025-01-01", bis: "2025-01-31" })).toBe(31);
    expect(tage({ von: "2024-01-01", bis: "2024-12-31" })).toBe(366);
  });

  it("teilt ein Fenster luecken- und ueberschneidungsfrei", () => {
    const fenster = { von: "2025-01-01", bis: "2025-01-10" };
    const haelften = teile(fenster);
    expect(haelften).not.toBeNull();
    const [links, rechts] = haelften!;
    expect(links.von).toBe("2025-01-01");
    expect(rechts.bis).toBe("2025-01-10");
    expect(tage(links) + tage(rechts)).toBe(tage(fenster));
    // Kein Tag doppelt, kein Tag verloren.
    expect(new Date(`${rechts.von}T00:00:00Z`).getTime() - new Date(`${links.bis}T00:00:00Z`).getTime()).toBe(
      86_400_000,
    );
  });

  it("teilt einen einzelnen Tag nicht — das muss der Aufrufer melden", () => {
    expect(teile({ von: "2025-05-05", bis: "2025-05-05" })).toBeNull();
  });

  it("teilt bis auf Tagesebene hinunter, ohne Tage zu verlieren", () => {
    let fenster = [{ von: "2025-03-01", bis: "2025-03-08" }];
    for (let runde = 0; runde < 3; runde += 1) {
      fenster = fenster.flatMap((f) => teile(f) ?? [f]);
    }
    expect(fenster).toHaveLength(8);
    expect(fenster.every((f) => tage(f) === 1)).toBe(true);
    expect(fenster[0]!.von).toBe("2025-03-01");
    expect(fenster[7]!.bis).toBe("2025-03-08");
  });

  it("zerlegt den Zeitraum in Jahresfenster mit exakten Raendern", () => {
    const fenster = jahresfenster({ von: "2015-06-15", bis: "2017-02-28" });
    expect(fenster).toEqual([
      { von: "2015-06-15", bis: "2015-12-31" },
      { von: "2016-01-01", bis: "2016-12-31" },
      { von: "2017-01-01", bis: "2017-02-28" },
    ]);
  });
});

describe("Gerichtsfilter", () => {
  const bger = roh("CH_BGer_001_4A-123-2024_2024-05-01", "2024-05-01", ["CH", "CH_BGer"], "x");
  const kanton = roh("ZH_MG_001_MJ250072-L_2025-10-21", "2025-10-21", ["ZH", "ZH_MG"], "x");

  it("laesst ohne Filter alles durch", () => {
    expect(gehoertZuGericht(bger, [])).toBe(true);
    expect(gehoertZuGericht(kanton, [])).toBe(true);
  });

  it("erkennt das Gericht an der Hierarchie", () => {
    expect(gehoertZuGericht(bger, ["CH_BGer"])).toBe(true);
    expect(gehoertZuGericht(kanton, ["CH_BGer"])).toBe(false);
  });

  it("erkennt das Gericht ersatzweise an der Quell-ID", () => {
    const ohneHierarchie = { _id: "CH_BGer_001_4A-9-2020_2020-01-01", _source: { date: "2020-01-01" } };
    expect(gehoertZuGericht(ohneHierarchie, ["CH_BGer"])).toBe(true);
  });

  it("verwechselt keine Signatur, die nur als Praefix aussieht", () => {
    const anderes = { _id: "CH_BGerXY_001_1-2020_2020-01-01", _source: { date: "2020-01-01" } };
    expect(gehoertZuGericht(anderes, ["CH_BGer"])).toBe(false);
  });
});

describe("Trefferabbildung", () => {
  it("uebernimmt ID, Datum, Gericht und Link, setzt Status und Fingerprint", () => {
    const treffer = alsMesslaufTreffer(
      roh("CH_BGer_001_4A-123-2024_2024-05-01", "2024-05-01", ["CH", "CH_BGer"], "Bundesgericht 01.05.2024 4A_123/2024"),
      VIEW,
    );
    expect(treffer).toEqual({
      quelle_id: "CH_BGer_001_4A-123-2024_2024-05-01",
      aktenzeichen: "4A_123/2024",
      datum: "2024-05-01",
      gericht: "CH_BGer",
      link: `${VIEW}CH_BGer_001_4A-123-2024_2024-05-01`,
      metadaten_fingerprint: metadatenFingerprint({
        quelle_id: "CH_BGer_001_4A-123-2024_2024-05-01",
        aktenzeichen: "4A_123/2024",
        datum: "2024-05-01",
        gericht: "CH_BGer",
        link: `${VIEW}CH_BGer_001_4A-123-2024_2024-05-01`,
      }),
      status: "ungeklaert",
    });
  });

  it("bildet einen franzoesischsprachigen Entscheid genauso ab wie einen deutschen", () => {
    // Der Nenner darf kein Sprachgebiet bevorzugen: die Abbildung liest
    // de/fr/it und faellt bei fr nicht auf einen Rueckfallwert zurueck.
    const treffer = alsMesslaufTreffer(
      {
        _id: "CH_BGer_001_4A-77-2021_2021-03-02",
        _source: {
          date: "2021-03-02",
          hierarchy: ["CH", "CH_BGer"],
          title: { fr: "Tribunal fédéral 02.03.2021 4A_77/2021" },
        },
      },
      VIEW,
    );
    expect(treffer?.aktenzeichen).toBe("4A_77/2021");
    expect(treffer?.gericht).toBe("CH_BGer");
  });

  it("erfindet kein Aktenzeichen, wenn der Titel das Datum nicht traegt", () => {
    expect(aktenzeichenAus("Bundesgericht ohne Datum 4A_1/2020", "2024-05-01")).toBeUndefined();
    expect(aktenzeichenAus(null, "2024-05-01")).toBeUndefined();
  });

  it("verwirft einen Rohtreffer ohne ID, statt ihn zu erfinden", () => {
    expect(alsMesslaufTreffer({ _source: { date: "2024-01-01" } }, VIEW)).toBeNull();
  });
});

describe("vereinige", () => {
  const a: MesslaufTreffer = { quelle_id: "b", status: "ungeklaert", metadaten_fingerprint: metadatenFingerprint({ quelle_id: "b" }) };
  const b: MesslaufTreffer = { quelle_id: "a", status: "ungeklaert", metadaten_fingerprint: metadatenFingerprint({ quelle_id: "a" }) };

  it("sortiert nach Quell-ID — die Abrufreihenfolge darf nichts aendern", () => {
    expect(vereinige([[a, b]]).treffer.map((t) => t.quelle_id)).toEqual(["a", "b"]);
    expect(vereinige([[b], [a]]).treffer.map((t) => t.quelle_id)).toEqual(["a", "b"]);
  });

  it("entfernt Doppel aus ueberlappenden Fenstern und zaehlt sie mit", () => {
    const ergebnis = vereinige([[a], [{ ...a }], [b]]);
    expect(ergebnis.treffer).toHaveLength(2);
    // Ohne diese Zahl geht die Bilanz des Laufs spaeter nicht auf.
    expect(ergebnis.duplikate).toBe(1);
  });

  it("zaehlt kein Duplikat, wo keines ist", () => {
    expect(vereinige([[a], [b]]).duplikate).toBe(0);
  });
});

describe("relationAus", () => {
  it("erkennt die exakte Angabe", () => {
    expect(relationAus({ value: 12, relation: "eq" })).toBe("eq");
  });

  it("erkennt eine Untergrenze — die reicht fuer eine Population nicht", () => {
    expect(relationAus({ value: 10000, relation: "gte" })).toBe("gte");
  });

  it("behandelt eine fehlende oder unbekannte Angabe als unbekannt, nie als exakt", () => {
    expect(relationAus({ value: 12 })).toBe("unbekannt");
    expect(relationAus(12)).toBe("unbekannt");
    expect(relationAus(null)).toBe("unbekannt");
    expect(relationAus({ value: 12, relation: "irgendwas" })).toBe("unbekannt");
  });
});

describe("Fingerprint der Quellmetadaten", () => {
  const metadaten = { quelle_id: "x", aktenzeichen: "4A_1/2020", datum: "2020-01-01", gericht: "CH_BGer" };

  it("aendert sich, sobald die Quelle ein Feld aendert", () => {
    expect(metadatenFingerprint({ ...metadaten, datum: "2020-01-02" })).not.toBe(metadatenFingerprint(metadaten));
  });

  it("ist unabhaengig von der Schluesselreihenfolge", () => {
    expect(metadatenFingerprint({ gericht: "CH_BGer", quelle_id: "x", aktenzeichen: "4A_1/2020", datum: "2020-01-01" })).toBe(
      metadatenFingerprint(metadaten),
    );
  });
});

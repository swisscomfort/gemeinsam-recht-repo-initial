// Tests des Fehler-Rueckkanals (AUFTRAG-W0, Ergaenzung E3): Rechenweg-
// Wiedergabe, lokale fehlermeldung-Kandidaten (E1-Schema) und Versions-
// abgleich gegen wissen/dist/versionen.json (E2). Der Fall ist ein
// synthetisches In-Memory-Objekt nach FX-001 (meta.fixture=true,
// Invariante 2) — kein realer Fall.

import { describe, expect, it } from "vitest";
import {
  QUELLE_ZU_REGEL,
  REGELVERSION,
  bewerteFall,
  erstelleEinschaetzung,
} from "@core/index";
import {
  REGEL_UPDATE_HINWEIS,
  baueFehlermeldung,
  baueRechenweg,
  enthaeltDatum,
  exportiereMeldungen,
  ladeMeldungen,
  regelAktualisiert,
} from "../src/rechenweg";
import { exportiereFall, fallStatusAus, ladeFall } from "../src/fall";
import VERSIONEN from "../../../wissen/dist/versionen.json";

const FX_FALL = {
  schema_version: "0.1.0",
  rechtsgebiet: "mietrecht_kuendigung",
  kanton: "LU",
  rolle: "mieter",
  kuendigung: {
    zugestellt_am: "2026-09-02",
    zustellart: "a_post",
    amtliches_formular: true,
    unterschrieben: true,
    begruendung_angegeben: false,
  },
  wohnung: { familienwohnung: false },
  vertrag: { beginn: "2024-04-01", befristet: false, orts_gemeinde: "Luzern" },
  sperrfrist: {
    verfahren_letzte_3_jahre: false,
    verfahren_haengig: false,
    rechte_geltend_gemacht: false,
  },
  meta: {
    erfasst_am: "2026-09-10T08:00:00.000Z",
    regelversion: "0.1.0",
    quellenstand: "2026-08-05",
    fixture: true,
  },
};

function einschaetzungOk() {
  return erstelleEinschaetzung(bewerteFall(FX_FALL, "2026-09-10"));
}

describe("baueRechenweg — laienlesbare Wiedergabe des Trace-Inhalts (E3)", () => {
  it("liefert je herangezogener Quelle einen Schritt mit Regel-ID, Quelle und Zeitstand", () => {
    const einschaetzung = einschaetzungOk();
    expect(einschaetzung.status).toBe("OK");
    const schritte = baueRechenweg(einschaetzung);
    if (einschaetzung.status !== "OK") return;
    expect(schritte).toHaveLength(einschaetzung.artikel.length);
    einschaetzung.artikel.forEach((quelle, i) => {
      const schritt = schritte[i]!;
      expect(schritt.regelId).toBe(QUELLE_ZU_REGEL[quelle.id]);
      expect(schritt.regelId).toMatch(/^R-[A-Z]{2}-\d{4}$/);
      expect(schritt.quelle).toContain(quelle.artikel);
      expect(schritt.zeitstand).toBe(quelle.zeitstand);
      expect(schritt.schritt.length).toBeGreaterThan(0);
    });
  });

  it("gibt bei einer LUECKE keinen Rechenweg aus (es wurde nichts berechnet)", () => {
    expect(baueRechenweg(erstelleEinschaetzung(bewerteFall({}, "2026-09-10")))).toEqual([]);
  });
});

describe("baueFehlermeldung — E1-Schema, ohne jegliche Falldaten", () => {
  it("erzeugt exakt die vier Felder status/regel_id/begruendung/regelversion", () => {
    const meldung = baueFehlermeldung("R-CH-0001", "Die Fristdauer scheint mir zu kurz.", REGELVERSION);
    expect(meldung).toEqual({
      status: "fehlermeldung",
      regel_id: "R-CH-0001",
      begruendung: "Die Fristdauer scheint mir zu kurz.",
      regelversion: REGELVERSION,
    });
    expect(Object.keys(meldung).sort()).toEqual(["begruendung", "regel_id", "regelversion", "status"]);
  });

  it("weist leere Begruendungen und ungueltige Regel-IDs ab", () => {
    expect(() => baueFehlermeldung("R-CH-0001", "   ", REGELVERSION)).toThrow(/begründen/);
    expect(() => baueFehlermeldung("P1", "Text", REGELVERSION)).toThrow(/Regel-ID/);
    expect(() => baueFehlermeldung("R-CH-0001", "Text", " ")).toThrow(/Regelversion/);
  });

  it("weist Datumsangaben eines konkreten Falls im Freitext ab (wie kandidat.schema.json)", () => {
    expect(enthaeltDatum("zugestellt am 2026-09-02")).toBe(true);
    expect(enthaeltDatum("zugestellt am 2.9.2026")).toBe(true);
    expect(enthaeltDatum("die 30-Tage-Frist")).toBe(false);
    expect(() =>
      baueFehlermeldung("R-CH-0001", "Meine Kündigung kam am 2026-09-02.", REGELVERSION),
    ).toThrow(/Datumsangaben/);
  });
});

describe("Meldungs-Speicher — lokal, Export ueber die Werkbank", () => {
  it("laedt einen eigenen Export verlustfrei", () => {
    const liste = [baueFehlermeldung("R-CH-0001", "Scheint zu kurz.", REGELVERSION)];
    expect(ladeMeldungen(exportiereMeldungen(liste))).toEqual(liste);
  });

  it("verwirft kaputtes JSON, fremde Schluessel und Falldaten-Felder vollstaendig", () => {
    expect(ladeMeldungen(null)).toEqual([]);
    expect(ladeMeldungen("{kaputt")).toEqual([]);
    const meldung = baueFehlermeldung("R-CH-0001", "Scheint zu kurz.", REGELVERSION);
    expect(ladeMeldungen(JSON.stringify([{ ...meldung, name: "x" }]))).toEqual([]);
    expect(ladeMeldungen(JSON.stringify([{ ...meldung, regel_id: "P1" }]))).toEqual([]);
    const { regelversion: _weg, ...unvollstaendig } = meldung;
    expect(ladeMeldungen(JSON.stringify([unvollstaendig]))).toEqual([]);
  });
});

describe("Mein Fall — Rechenweg, Regelversion und Versionsabgleich (E2/E3)", () => {
  it("traegt Regelversion, Regel-IDs und Rechenweg aus der Einschaetzung", () => {
    const einschaetzung = einschaetzungOk();
    const fall = fallStatusAus(einschaetzung, "2026-09-10");
    expect(fall.regelversion).toBe(einschaetzung.regelversion);
    expect(fall.rechenweg).toEqual(baueRechenweg(einschaetzung));
    expect(fall.regelIds).toEqual(fall.rechenweg.map((s) => s.regelId));
    expect(fall.regelIds.length).toBeGreaterThan(0);
  });

  it("laedt den neuen Export verlustfrei und akzeptiert den Altbestand ohne E3-Felder", () => {
    const fall = fallStatusAus(einschaetzungOk(), "2026-09-10");
    expect(ladeFall(exportiereFall(fall))).toEqual(fall);
    const alt = {
      erstelltAm: "2026-09-10",
      status: "OK",
      ampel: "GELB",
      fristDatum: "2026-10-12",
      fristAbgelaufen: false,
      briefBereit: true,
    };
    const geladen = ladeFall(JSON.stringify(alt));
    expect(geladen).not.toBeNull();
    expect(geladen?.regelversion).toBeNull();
    expect(geladen?.regelIds).toEqual([]);
    expect(geladen?.rechenweg).toEqual([]);
  });

  it("verwirft manipulierte Rechenweg-Eintraege", () => {
    const fall = fallStatusAus(einschaetzungOk(), "2026-09-10");
    const kaputt = { ...fall, rechenweg: [{ schritt: "x", regelId: "R-CH-0001", quelle: "q" }] };
    expect(ladeFall(JSON.stringify(kaputt))).toBeNull();
  });

  it("regelAktualisiert meldet nur Abweichungen der tatsaechlich verwendeten Regeln", () => {
    const fall = { regelversion: "0.1.0", regelIds: ["R-CH-0001", "R-CH-0002"] };
    expect(regelAktualisiert(fall, { "R-CH-0001": "0.1.0", "R-CH-0002": "0.1.0" })).toBe(false);
    expect(regelAktualisiert(fall, { "R-CH-0001": "0.2.0", "R-CH-0002": "0.1.0" })).toBe(true);
    expect(regelAktualisiert(fall, { "R-CH-0009": "0.2.0" })).toBe(false);
    expect(regelAktualisiert({ regelversion: null, regelIds: ["R-CH-0001"] }, { "R-CH-0001": "9.9.9" })).toBe(false);
  });

  it("stimmt mit dem lokal gebauten wissen/dist/versionen.json ueberein (kein Hinweis im Gleichstand)", () => {
    const fall = fallStatusAus(einschaetzungOk(), "2026-09-10");
    for (const regelId of fall.regelIds) {
      expect((VERSIONEN as Record<string, string>)[regelId]).toBeDefined();
    }
    expect(regelAktualisiert(fall, VERSIONEN as Record<string, string>)).toBe(false);
  });

  it("der Hinweistext ist fest vorgegeben (E3)", () => {
    expect(REGEL_UPDATE_HINWEIS).toBe(
      "Eine Regel deines Falls wurde aktualisiert — prüfe deine Frist neu.",
    );
  });
});

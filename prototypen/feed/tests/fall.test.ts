// Tests der privaten Fallkarte "Mein Fall" (AUFTRAG-F1 §3/§7).
// Der Status entsteht ausschliesslich aus einer Einschaetzung des
// deterministischen Kerns (core wird nur genutzt, nie veraendert).
// Das Fallobjekt ist ein synthetisches In-Memory-Objekt nach dem Muster
// von FX-001 (meta.fixture=true — kein realer Fall, Invariante 2).

import { describe, expect, it } from "vitest";
import { bewerteFall, erstelleEinschaetzung } from "@core/index";
import {
  PHASE_S_HINWEIS,
  PRIVAT_BADGE,
  exportiereFall,
  fallStatusAus,
  fallStatusZeilen,
  ladeFall,
} from "../src/fall";

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

describe("fallStatusAus", () => {
  it("uebernimmt Ampel, Fristdatum und Brief-Status nur aus der Kern-Einschaetzung", () => {
    const einschaetzung = einschaetzungOk();
    expect(einschaetzung.status).toBe("OK");
    const fall = fallStatusAus(einschaetzung, "2026-09-10");
    expect(fall.status).toBe("OK");
    expect(fall.erstelltAm).toBe("2026-09-10");
    expect(fall.ampel).toBe(einschaetzung.ampel);
    expect(fall.fristDatum).toBe(einschaetzung.frist_datum);
    if (einschaetzung.status === "OK") {
      expect(fall.briefBereit).toBe(einschaetzung.optionen.some((o) => o.brief !== null));
    }
  });

  it("bildet eine LUECKE als Status ohne Ampel und ohne Frist ab", () => {
    const einschaetzung = erstelleEinschaetzung(bewerteFall({}, "2026-09-10"));
    expect(einschaetzung.status).toBe("LUECKE");
    const fall = fallStatusAus(einschaetzung, "2026-09-10");
    expect(fall.status).toBe("LUECKE");
    expect(fall.ampel).toBeNull();
    expect(fall.fristDatum).toBeNull();
    expect(fall.briefBereit).toBe(false);
  });
});

describe("fallStatusZeilen", () => {
  it("gibt Fristzeile und Brief-Status nur wieder, nie selbst berechnet", () => {
    const einschaetzung = einschaetzungOk();
    const fall = fallStatusAus(einschaetzung, "2026-09-10");
    const zeilen = fallStatusZeilen(fall).join(" | ");
    if (fall.fristDatum !== null && !fall.fristAbgelaufen) {
      expect(zeilen).toContain(`Frist läuft bis ${fall.fristDatum}`);
    }
    if (fall.briefBereit) {
      expect(zeilen).toContain("Brief bereit");
    }
  });

  it("benennt bei LUECKE die fehlende Einschaetzung", () => {
    const fall = fallStatusAus(erstelleEinschaetzung(bewerteFall({}, "2026-09-10")), "2026-09-10");
    expect(fallStatusZeilen(fall).join(" ")).toContain("Keine Einschätzung möglich");
  });
});

describe("ladeFall — Mein Fall nur nach Abschluss, rueckstandsfrei loeschbar", () => {
  it("liefert ohne gespeicherten Fall (oder nach dem Loeschen) null — keine Karte", () => {
    expect(ladeFall(null)).toBeNull();
  });

  it("laedt einen eigenen Export verlustfrei", () => {
    const fall = fallStatusAus(einschaetzungOk(), "2026-09-10");
    expect(ladeFall(exportiereFall(fall))).toEqual(fall);
  });

  it("verwirft kaputtes JSON, fremde Schluessel und falsche Typen", () => {
    expect(ladeFall("{kaputt")).toBeNull();
    const fall = fallStatusAus(einschaetzungOk(), "2026-09-10");
    const mitFremdschluessel = JSON.stringify({ ...fall, verweildauerMs: 5 });
    expect(ladeFall(mitFremdschluessel)).toBeNull();
    const falscheAmpel = JSON.stringify({ ...fall, ampel: "VIOLETT" });
    expect(ladeFall(falscheAmpel)).toBeNull();
  });

  it("Kennzeichnungen der Karte sind fest: PRIVAT-Badge und Phase-S-Hinweis", () => {
    expect(PRIVAT_BADGE).toBe("PRIVAT — nur auf diesem Gerät");
    expect(PHASE_S_HINWEIS).toContain("Phase S");
  });
});

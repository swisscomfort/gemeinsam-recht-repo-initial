// Tests des deterministischen Listenformats (AUFTRAG-R0 §4).
// Grundlage ist ausschliesslich die gespeicherte Beispiel-Antwort
// (tests/fixtures/beispiel-antwort.json) — der Netz-Abruf selbst wird
// hier NIE ausgefuehrt.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  OHNE_BETREFF,
  betreffEinzeiler,
  formatiereZeile,
  gerichtAus,
  kandidatAus,
  kandidatenAus,
  monatsListen,
} from "../src/format.js";
import { MAX_TREFFER, METADATEN_FELDER, SEITEN_GROESSE, baueAbfrage } from "../src/abruf.js";

const antwort: unknown = JSON.parse(
  readFileSync(new URL("./fixtures/beispiel-antwort.json", import.meta.url), "utf8"),
);

/** Fest injiziertes Abrufdatum — deterministisch, keine Systemzeit im Test. */
const ABRUF_DATUM = "2026-08-07";

describe("kandidatenAus — Beispiel-Antwort", () => {
  it("liest alle drei Treffer als Kandidaten", () => {
    const kandidaten = kandidatenAus(antwort);
    expect(kandidaten).toHaveLength(3);
  });

  it("bildet die Zeile: Entscheiddatum · Gericht · Aktenzeichen · Betreff · Link", () => {
    const kandidaten = kandidatenAus(antwort);
    expect(formatiereZeile(kandidaten[0]!)).toBe(
      "- 2026-08-05 · Nidwalden Gerichte · 42529 · Mieterausweisung (ZA 26 4) · https://entscheidsuche.ch/view/NW_OG_001_42529_2026-08-05",
    );
  });

  it("kuerzt doppelte Abstract-Teile (';;') auf einen Einzeiler", () => {
    const kandidaten = kandidatenAus(antwort);
    const bstg = kandidaten.find((k) => k.link.includes("CH_BSTG"));
    expect(bstg?.betreff).toBe("Gesuch um Kostenerlass; Nachträgliche Entscheide");
    expect(bstg?.gericht).toBe("Bundesstrafgericht");
  });

  it("benennt fehlende Betreffe sichtbar statt etwas zu erfinden", () => {
    const kandidaten = kandidatenAus(antwort);
    const ag = kandidaten.find((k) => k.link.includes("AG_OG"));
    expect(ag?.betreff).toBe(OHNE_BETREFF);
    expect(ag?.gericht).toBe("Aargau Obergericht Zivilkammern");
    expect(ag?.aktenzeichen).toBe("ZVE.2026.16");
  });

  it("verwirft unbrauchbare Treffer und dedupliziert ueber den Link", () => {
    expect(kandidatAus({ _id: "x" })).toBeNull();
    expect(kandidatAus({ _id: "x", _source: { date: "irgendwann" } })).toBeNull();
    const hits = kandidatenAus(antwort);
    const doppelt = {
      hits: {
        hits: [
          ...(antwort as { hits: { hits: unknown[] } }).hits.hits,
          ...(antwort as { hits: { hits: unknown[] } }).hits.hits,
        ],
      },
    };
    expect(kandidatenAus(doppelt)).toHaveLength(hits.length);
  });
});

describe("monatsListen — Datei je Monat, deterministisch", () => {
  it("gruppiert nach Entscheid-Monat (JJJJ-MM)", () => {
    const dateien = monatsListen(kandidatenAus(antwort), ABRUF_DATUM, ["Mietrecht"]);
    expect([...dateien.keys()]).toEqual(["2026-07", "2026-08"]);
  });

  it("sortiert im Monat nach Datum absteigend und traegt Kopf mit Abrufdatum", () => {
    const dateien = monatsListen(kandidatenAus(antwort), ABRUF_DATUM, ["Mietrecht"]);
    const juli = dateien.get("2026-07")!;
    expect(juli).toContain("# Kandidaten 2026-07");
    expect(juli).toContain(`Abruf vom ${ABRUF_DATUM}`);
    expect(juli).toContain("keine Volltexte");
    const bstgStelle = juli.indexOf("CH_BSTG");
    const agStelle = juli.indexOf("AG_OG");
    expect(bstgStelle).toBeGreaterThan(-1);
    expect(agStelle).toBeGreaterThan(bstgStelle);
  });

  it("ist reproduzierbar: gleiche Eingabe ergibt exakt gleiche Dateien", () => {
    const a = monatsListen(kandidatenAus(antwort), ABRUF_DATUM, ["Mietrecht"]);
    const b = monatsListen(kandidatenAus(antwort), ABRUF_DATUM, ["Mietrecht"]);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });

  it("speichert keine Volltexte: die Listen enthalten nur die Zeilen-Metadaten", () => {
    const dateien = monatsListen(kandidatenAus(antwort), ABRUF_DATUM, ["Mietrecht"]);
    for (const inhalt of dateien.values()) {
      expect(inhalt).not.toContain("content");
      for (const zeile of inhalt.split("\n")) {
        if (zeile.startsWith("- ")) {
          expect(zeile.split(" · ")).toHaveLength(5);
        }
      }
    }
  });
});

describe("baueAbfrage — nur Metadaten, deterministische Sortierung", () => {
  it("fragt ausschliesslich die Metadaten-Felder an und filtert das Datumsfenster", () => {
    const abfrage = baueAbfrage("Mietvertrag", "2025-01-01", ABRUF_DATUM, 0, SEITEN_GROESSE) as {
      _source: string[];
      from: number;
      size: number;
      query: { bool: { filter: unknown[]; must: unknown[] } };
      sort: unknown[];
    };
    expect(abfrage._source).toEqual([...METADATEN_FELDER]);
    expect(abfrage._source).not.toContain("attachment");
    expect(abfrage.size).toBe(SEITEN_GROESSE);
    expect(abfrage.query.bool.filter).toEqual([
      { range: { date: { gte: "2025-01-01", lte: ABRUF_DATUM } } },
    ]);
    expect(abfrage.query.bool.must).toEqual([{ query_string: { query: "Mietvertrag" } }]);
    expect(abfrage.sort).toEqual([{ date: "desc" }, { _id: "asc" }]);
    expect(SEITEN_GROESSE).toBeLessThanOrEqual(MAX_TREFFER);
  });
});

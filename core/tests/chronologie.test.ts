/**
 * Chronologie-Tests (AUFTRAG-S2 §1 E): Datei-Hashing mit der vorhandenen
 * SHA-256, Export JSON + Markdown inkl. regelversion/quellenstand/
 * fallobjekt_hash, Determinismus.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  exportiereChronologieJson,
  exportiereChronologieMarkdown,
  hashDokument,
  hashFallobjekt,
  mitEintrag,
  neueChronologie,
  sha256Hex,
} from "../src/index.js";
import type { Chronologie } from "../src/index.js";

const HIER = dirname(fileURLToPath(import.meta.url));
const FX001_CASE = JSON.parse(
  readFileSync(
    join(HIER, "fixtures", "FX-001-regelfall-a-post", "case.json"),
    "utf8",
  ),
) as unknown;

function beispielChronologie(): Chronologie {
  let c = neueChronologie(FX001_CASE);
  c = mitEintrag(c, {
    zeitpunkt: "2026-09-15T10:00:00Z",
    typ: "erfassung",
    beschreibung: "Sachverhalt im Fragebaum erfasst",
  });
  c = mitEintrag(c, {
    zeitpunkt: "2026-09-02",
    typ: "kuendigung_erhalten",
    beschreibung: "Kuendigung zugestellt (a_post)",
  });
  c = mitEintrag(c, {
    zeitpunkt: "2026-09-15T10:05:00Z",
    typ: "dokument_hinzugefuegt",
    beschreibung: "Kuendigungsschreiben lokal gehasht",
    dokument_hash: hashDokument(new Uint8Array([0x61, 0x62, 0x63])),
  });
  return c;
}

describe("Chronologie", () => {
  it("hashDokument entspricht SHA-256 (Testvektor 'abc')", () => {
    // FIPS 180-4 Testvektor.
    expect(hashDokument(new Uint8Array([0x61, 0x62, 0x63]))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(hashDokument(new Uint8Array([]))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("hashDokument (Bytes) und sha256Hex (Text) stimmen ueberein", () => {
    expect(hashDokument(new Uint8Array([0x61, 0x62, 0x63]))).toBe(
      sha256Hex("abc"),
    );
  });

  it("fallobjekt_hash entspricht dem Hash des DTM-Trace (FX-001)", () => {
    const c = neueChronologie(FX001_CASE);
    expect(c.fallobjekt_hash).toBe(hashFallobjekt(FX001_CASE));
    expect(c.fallobjekt_hash).toBe(
      "023c6a173c1e4c45728704b321d19cde9e263815a5bb69713e0e29bed81a38a5",
    );
    expect(c.regelversion).toBe("0.1.0");
    expect(c.quellenstand).toBe("2026-08-05");
  });

  it("mitEintrag ist immutabel und validiert Eingaben", () => {
    const c = neueChronologie(FX001_CASE);
    const c2 = mitEintrag(c, {
      zeitpunkt: "2026-09-15",
      typ: "erfassung",
      beschreibung: "Test",
    });
    expect(c.eintraege).toHaveLength(0);
    expect(c2.eintraege).toHaveLength(1);
    expect(() =>
      mitEintrag(c, { zeitpunkt: "15.09.2026", typ: "erfassung", beschreibung: "x" }),
    ).toThrow(/ISO-8601/);
    expect(() =>
      mitEintrag(c, { zeitpunkt: "2026-09-15", typ: "erfassung", beschreibung: "  " }),
    ).toThrow(/beschreibung/);
  });

  it("JSON-Export enthaelt Metadaten und abschliessenden export-Eintrag", () => {
    const json = exportiereChronologieJson(beispielChronologie(), "2026-09-15T11:00:00Z");
    const daten = JSON.parse(json) as Chronologie;
    expect(daten.fallobjekt_hash).toBe(hashFallobjekt(FX001_CASE));
    expect(daten.regelversion).toBe("0.1.0");
    expect(daten.quellenstand).toBe("2026-08-05");
    expect(daten.eintraege).toHaveLength(4);
    const letzter = daten.eintraege[3];
    expect(letzter?.typ).toBe("export");
    expect(letzter?.zeitpunkt).toBe("2026-09-15T11:00:00Z");
  });

  it("Markdown-Export enthaelt Metadaten und alle Eintraege", () => {
    const md = exportiereChronologieMarkdown(beispielChronologie(), "2026-09-15T11:00:00Z");
    expect(md).toContain(hashFallobjekt(FX001_CASE));
    expect(md).toContain("Regelversion: 0.1.0");
    expect(md).toContain("Quellenstand: 2026-08-05");
    expect(md).toContain("| 2026-09-02 | kuendigung_erhalten |");
    expect(md).toContain(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(md).toContain("Chronologie exportiert (Markdown)");
  });

  it("Determinismus: Doppellauf byte-identisch; Export veraendert Original nicht", () => {
    const c = beispielChronologie();
    const a = exportiereChronologieJson(c, "2026-09-15T11:00:00Z");
    const b = exportiereChronologieJson(c, "2026-09-15T11:00:00Z");
    expect(a).toBe(b);
    expect(c.eintraege).toHaveLength(3);
  });
});

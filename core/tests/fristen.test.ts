/**
 * Grenzwert-Unittests der Fristarithmetik (P1–P4) — rein deterministisch.
 */
import { describe, expect, it } from "vitest";
import {
  addTage,
  berechneFristen,
  istIsoDatum,
  istWochenende,
  vonTagen,
  wochentag,
  zuTagen,
} from "../src/fristen.js";
import { istFeiertagLu } from "../src/feiertage_lu.js";
import { sha256Hex, stableStringify } from "../src/trace.js";

describe("Datumsarithmetik", () => {
  it("validiert ISO-Daten inkl. Kalenderregeln", () => {
    expect(istIsoDatum("2026-09-02")).toBe(true);
    expect(istIsoDatum("2026-02-29")).toBe(false); // 2026 kein Schaltjahr
    expect(istIsoDatum("2028-02-29")).toBe(true); // 2028 Schaltjahr
    expect(istIsoDatum("2026-13-01")).toBe(false);
    expect(istIsoDatum("2026-04-31")).toBe(false);
    expect(istIsoDatum("2026-9-2")).toBe(false);
    expect(istIsoDatum("kein datum")).toBe(false);
    expect(istIsoDatum(20260902)).toBe(false);
  });

  it("zuTagen/vonTagen sind invers und korrekt verankert", () => {
    expect(zuTagen("1970-01-01")).toBe(0);
    expect(vonTagen(0)).toBe("1970-01-01");
    for (const d of ["2026-09-02", "2026-12-31", "2028-02-29", "1999-03-01"]) {
      expect(vonTagen(zuTagen(d))).toBe(d);
    }
  });

  it("addTage rechnet ueber Monats-, Jahres- und Schaltjahresgrenzen", () => {
    expect(addTage("2026-08-31", 30)).toBe("2026-09-30");
    expect(addTage("2026-12-15", 30)).toBe("2027-01-14");
    expect(addTage("2028-01-31", 30)).toBe("2028-03-01"); // Schaltjahr: 29.2. existiert
    expect(addTage("2027-01-31", 30)).toBe("2027-03-02"); // kein Schaltjahr
  });

  it("wochentag: bekannte Kalendertage 2026", () => {
    expect(wochentag("2026-09-02")).toBe(2); // Mittwoch (0=Mo)
    expect(wochentag("2026-10-02")).toBe(4); // Freitag
    expect(wochentag("2026-10-03")).toBe(5); // Samstag
    expect(wochentag("2026-10-04")).toBe(6); // Sonntag
    expect(wochentag("2026-10-05")).toBe(0); // Montag
    expect(istWochenende("2026-10-03")).toBe(true);
    expect(istWochenende("2026-10-05")).toBe(false);
  });
});

describe("berechneFristen (P1/P2/P3)", () => {
  it("Regelfall: Empfang zaehlt nicht mit, letzter Tag = Empfang + 30", () => {
    const r = berechneFristen("2026-09-02", "2026-09-15");
    expect(r).toMatchObject({
      ok: true,
      anfechtungsfrist_bis: "2026-10-02",
      verschoben: false,
      frist_abgelaufen: false,
    });
  });

  it("P3: Samstag-Ende verschiebt auf Montag", () => {
    const r = berechneFristen("2026-09-03", "2026-09-15");
    expect(r).toMatchObject({
      ok: true,
      fristende_roh: "2026-10-03",
      anfechtungsfrist_bis: "2026-10-05",
      verschoben: true,
    });
  });

  it("P3: Feiertagskaskade Weihnachten/Stephanstag/Wochenende 2026", () => {
    // roh: Fr 25.12. (Feiertag) -> Sa 26.12. -> So 27.12. -> Mo 28.12.
    expect(istFeiertagLu("2026-12-25")).toBe(true);
    expect(istFeiertagLu("2026-12-26")).toBe(true);
    const r = berechneFristen("2026-11-25", "2026-12-01");
    expect(r).toMatchObject({
      ok: true,
      fristende_roh: "2026-12-25",
      anfechtungsfrist_bis: "2026-12-28",
      verschoben: true,
    });
  });

  it("frist_abgelaufen: Grenztag zaehlt noch zur Frist", () => {
    const amEnde = berechneFristen("2026-09-02", "2026-10-02");
    expect(amEnde).toMatchObject({ ok: true, frist_abgelaufen: false });
    const danach = berechneFristen("2026-09-02", "2026-10-03");
    expect(danach).toMatchObject({ ok: true, frist_abgelaufen: true });
  });

  it("meldet fehlende Feiertagsdaten statt zu raten (Invariante 3)", () => {
    const r = berechneFristen("2030-01-10", "2030-01-15");
    expect(r).toEqual({ ok: false, fehlendes_feiertagsjahr: 2030 });
  });
});

describe("Hash-Grundlage des DTM-Trace", () => {
  it("sha256Hex entspricht dem FIPS-Testvektor", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("stableStringify ist unabhaengig von der Schluesselreihenfolge", () => {
    expect(stableStringify({ b: 1, a: [{ y: 2, x: 1 }] })).toBe(
      stableStringify({ a: [{ x: 1, y: 2 }], b: 1 }),
    );
  });
});

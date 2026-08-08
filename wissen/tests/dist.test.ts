// Tests der lokal gebauten oeffentlichen Sicht (AUFTRAG-W0 Teil E,
// Ergaenzung E2): deterministischer Build, index/alle/verifiziert und
// versionen.json (regel_id -> aktuelle regelversion).

import { describe, expect, it } from "vitest";
import { baueDist, DIST_VERSION } from "../tools/build-dist.ts";
import type { RegisterEintrag } from "../tools/migrate.ts";
import { leseJson, leseRegister, wissenPfad } from "../tools/umgebung.ts";

const eintraege = leseRegister() as RegisterEintrag[];
const scheiterpunkteVersion = leseJson(wissenPfad("scheiterpunkte.json")) as { version: string };
const kodierlisten = { "KL-SCHEITERPUNKTE": scheiterpunkteVersion.version };

describe("baueDist — deterministisch", () => {
  it("zwei Laeufe ueber dieselben Eintraege liefern byte-identische Sichten", () => {
    const a = baueDist(eintraege);
    const b = baueDist([...eintraege].reverse());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("index traegt version, zeitstand, anzahl und signatur: null (Platzhalter)", () => {
    const dist = baueDist(eintraege);
    expect(dist.index.version).toBe(DIST_VERSION);
    expect(dist.index.zeitstand).toBe("2026-08-05");
    expect(dist.index.anzahl).toBe(eintraege.length);
    expect(dist.index.signatur).toBeNull();
  });

  it("alle.json ist nach id sortiert; verifiziert.json enthaelt nur fachlich_verifiziert", () => {
    const dist = baueDist(eintraege);
    const ids = dist.alle.map((e) => e.id);
    expect(ids).toEqual([...ids].sort());
    expect(dist.verifiziert.every((e) => e.pruefstand === "fachlich_verifiziert")).toBe(true);
    // In W0 ist noch nichts fachlich verifiziert — die Sicht ist ehrlich leer.
    expect(dist.verifiziert).toEqual([]);
  });

  it("versionen.json bildet jede regel_id auf ihre aktuelle regelversion ab (E2)", () => {
    const dist = baueDist(eintraege);
    expect(Object.keys(dist.versionen).sort()).toEqual(eintraege.map((e) => e.id).sort());
    for (const eintrag of eintraege) {
      expect(dist.versionen[eintrag.id]).toBe(eintrag.regelversion);
    }
  });

  it("weist schema-widrige Eintraege ab", () => {
    expect(() =>
      baueDist([{ ...(eintraege[0] as RegisterEintrag), zeitstand: "gestern" }]),
    ).toThrow(/ungueltig/);
  });
});

describe("wissen/dist/ (lokal gebauter Stand)", () => {
  it("die abgelegten Dateien entsprechen exakt dem aktuellen Register (kein veralteter Build)", () => {
    const dist = baueDist(eintraege, kodierlisten);
    expect(leseJson(wissenPfad("dist", "index.json"))).toEqual(dist.index);
    expect(leseJson(wissenPfad("dist", "alle.json"))).toEqual(JSON.parse(JSON.stringify(dist.alle)));
    expect(leseJson(wissenPfad("dist", "verifiziert.json"))).toEqual(dist.verifiziert);
    expect(leseJson(wissenPfad("dist", "versionen.json"))).toEqual(dist.versionen);
  });

  it("versionen.json registriert die Kodierliste scheiterpunkte.json analog zu den Regeln (Konzept v2 §5.3)", () => {
    const dist = baueDist(eintraege, kodierlisten);
    expect(dist.versionen["KL-SCHEITERPUNKTE"]).toBe(scheiterpunkteVersion.version);
    expect(leseJson(wissenPfad("dist", "versionen.json"))).toMatchObject({
      "KL-SCHEITERPUNKTE": scheiterpunkteVersion.version,
    });
  });
});

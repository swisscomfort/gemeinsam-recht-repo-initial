// Register<->core-Konsistenz (AUFTRAG-W0 Teil F): kein Rechtswert doppelt
// oder abweichend. core liest Quellen und Regel-Metadaten seit W0 aus dem
// Register (generiertes Modul register.gen.ts); diese Tests sichern ab,
// dass Register-Dateien, generiertes Modul und core-Verhalten uebereinstimmen.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  P1_ANFECHTUNGSFRIST_TAGE,
  P4_ABHOLFRIST_TAGE,
  QUELLEN,
  QUELLENSTAND,
  QUELLE_ZU_REGEL,
  REGELVERSION,
  REGISTER,
  type QuelleId,
} from "@core/index";
import { erzeugeRegisterGen, parameterAus, type RegisterEintrag } from "../tools/migrate.ts";
import { leseRegister, wissenPfad } from "../tools/umgebung.ts";

const registerDateien = leseRegister() as RegisterEintrag[];

describe("Register-Dateien <-> core/src/register.gen.ts", () => {
  it("das generierte Modul entspricht exakt dem Stand der Register-Dateien", () => {
    const erwartet = erzeugeRegisterGen(registerDateien);
    const tatsaechlich = readFileSync(
      wissenPfad("..", "core", "src", "register.gen.ts"),
      "utf8",
    );
    expect(tatsaechlich).toBe(erwartet);
  });

  it("REGISTER enthaelt dieselben Eintraege wie wissen/register/ (nach id sortiert)", () => {
    const sortiert = [...registerDateien].sort((a, b) => (a.id < b.id ? -1 : 1));
    expect(JSON.parse(JSON.stringify(REGISTER))).toEqual(sortiert);
  });
});

describe("core-Quellen stammen aus dem Register (kein Rechtswert doppelt/abweichend)", () => {
  const proId = new Map(registerDateien.map((e) => [e.id, e]));

  it("jede core-QuelleId ist genau einem Register-Eintrag zugeordnet", () => {
    const regelIds = Object.values(QUELLE_ZU_REGEL);
    expect(new Set(regelIds).size).toBe(regelIds.length);
    for (const regelId of regelIds) {
      expect(proId.has(regelId), `Register-Eintrag ${regelId} fehlt`).toBe(true);
    }
  });

  it("artikel, fundstelle, zeitstand und pruefstand jeder core-Quelle sind identisch mit dem Register", () => {
    for (const [quelleId, quelle] of Object.entries(QUELLEN)) {
      const eintrag = proId.get(QUELLE_ZU_REGEL[quelleId as QuelleId]);
      expect(eintrag, `Eintrag fuer ${quelleId} fehlt`).toBeDefined();
      const registerQuelle = eintrag!.quellen[0]!;
      expect(quelle.artikel, quelleId).toBe(registerQuelle.artikel);
      expect(quelle.fundstelle, quelleId).toBe(registerQuelle.fundstelle);
      expect(quelle.zeitstand, quelleId).toBe(eintrag!.zeitstand);
      expect(quelle.pruefstand, quelleId).toBe(eintrag!.pruefstand);
    }
  });

  it("REGELVERSION und QUELLENSTAND entsprechen dem Register (einheitlich)", () => {
    for (const eintrag of registerDateien) {
      expect(eintrag.regelversion).toBe(REGELVERSION);
      expect(eintrag.zeitstand).toBe(QUELLENSTAND);
    }
  });

  it("Rechtsparameter P1=30 und P4=7 stimmen mit der dann-Konvention des Registers ueberein", () => {
    const parameter = parameterAus(registerDateien);
    expect(parameter["anfechtungsfrist_tage"]).toBe(P1_ANFECHTUNGSFRIST_TAGE);
    expect(parameter["abholfrist_tage"]).toBe(P4_ABHOLFRIST_TAGE);
    expect(P1_ANFECHTUNGSFRIST_TAGE).toBe(30);
    expect(P4_ABHOLFRIST_TAGE).toBe(7);
  });

  it("die migrierten Eintraege tragen herkunft=auftrag und unveraenderten pruefstand", () => {
    for (const [quelleId, regelId] of Object.entries(QUELLE_ZU_REGEL)) {
      const eintrag = proId.get(regelId)!;
      expect(eintrag.herkunft, regelId).toBe("auftrag");
      const erwartet = quelleId === "Q_SCOPE" ? "technisch_validiert" : "fachlich_zu_verifizieren";
      expect(eintrag.pruefstand, regelId).toBe(erwartet);
    }
  });
});

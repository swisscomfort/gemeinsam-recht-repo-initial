// Tests des Inventars: Was fehlt einem Fall noch, um zaehlen zu koennen?
// Zusaetzlich der Abgleich mit dem tatsaechlichen Bestand — faellt er, hat
// sich die Datenlage geaendert und der Bericht dazu ist veraltet.

import { describe, expect, it } from "vitest";
import { leseFaelle } from "../tools/faelle.ts";
import { hindernisse, inventar, realfaelle } from "../tools/inventar.ts";
import type { FallMitHerkunft } from "../tools/faelle.ts";

function fall(teil: Partial<FallMitHerkunft> = {}): FallMitHerkunft {
  return {
    id: "FS-999",
    kennzeichnung: "NACHERZAEHLT_OEFFENTLICH",
    regel_id: "R-CH-0001",
    rechtskraft_status: "rechtskraeftig",
    kodierung_status: "doppelt_bestaetigt",
    ausgang: "durchgesetzt",
    scheiterpunkt: [],
    entwurf: false,
    ...teil,
  };
}

describe("hindernisse", () => {
  it("nennt keines, wenn alles stimmt und der Fall im Messkorpus liegt", () => {
    expect(hindernisse(fall(), true)).toEqual([]);
  });

  it("nennt den fehlenden Messkorpus auch bei sonst makellosem Fall", () => {
    expect(hindernisse(fall(), false)).toEqual(["kein_messkorpus"]);
  });

  it("prueft fiktive Faelle nicht weiter", () => {
    expect(hindernisse(fall({ kennzeichnung: "FIKTIV", regel_id: undefined }), false)).toEqual([
      "kennzeichnung_fiktiv_oder_platzhalter",
    ]);
  });

  it("unterscheidet offene von fehlenden Regelverweisen", () => {
    expect(hindernisse(fall({ regel_id: "OFFEN:S-2026-08-08-C:MJ250038-L" }), true)).toEqual(["regel_id_offen"]);
    expect(hindernisse(fall({ regel_id: undefined }), true)).toEqual(["regel_id_fehlt"]);
  });

  it("unterscheidet unbekannte von ausdruecklich fehlender Rechtskraft", () => {
    expect(hindernisse(fall({ rechtskraft_status: "unbekannt" }), true)).toEqual(["rechtskraft_unbekannt"]);
    expect(hindernisse(fall({ rechtskraft_status: "weitergezogen" }), true)).toEqual(["nicht_rechtskraeftig"]);
  });

  it("zaehlt strittige Kodierung als Hindernis, mensch_bestaetigt dagegen nicht", () => {
    expect(hindernisse(fall({ kodierung_status: "strittig" }), true)).toEqual(["kodierung_nicht_bestaetigt"]);
    expect(hindernisse(fall({ kodierung_status: "mensch_bestaetigt" }), true)).toEqual([]);
  });

  it("sammelt mehrere Hindernisse statt beim ersten aufzuhoeren", () => {
    const liste = hindernisse(
      fall({ regel_id: "OFFEN:x", rechtskraft_status: "unbekannt", kodierung_status: "strittig" }),
      false,
    );
    expect(liste).toEqual([
      "regel_id_offen",
      "rechtskraft_unbekannt",
      "kodierung_nicht_bestaetigt",
      "kein_messkorpus",
    ]);
  });
});

describe("Bestand im Repository", () => {
  const faelle = leseFaelle();
  const ergebnis = inventar(faelle, new Set());

  it("liest die realen Faelle vollstaendig ein", () => {
    expect(realfaelle(faelle).length).toBeGreaterThanOrEqual(19);
  });

  it("kein realer Fall zaehlt, solange es keinen Messkorpus gibt", () => {
    expect(ergebnis.zaehlfaehig).toEqual([]);
  });

  it("FS-102 haengt an nichts anderem mehr als am Messkorpus", () => {
    // Der einzige rechtskraeftige, doppelt bestaetigte, registrierte Fall.
    // Aendert sich das, ist die Lagebeschreibung im Abschlussbericht veraltet.
    const fs102 = ergebnis.eintraege.find((e) => e.id === "FS-102");
    expect(fs102?.hindernisse).toEqual(["kein_messkorpus"]);
  });

  it("die Rechtskraft ist der groesste Einzelposten nach dem Messkorpus", () => {
    const ohneMesskorpus = ergebnis.haeufigkeit.filter((h) => h.hindernis !== "kein_messkorpus");
    expect(ohneMesskorpus[0]?.hindernis).toBe("rechtskraft_unbekannt");
  });
});

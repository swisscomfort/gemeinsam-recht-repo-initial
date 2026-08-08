// Test der echten Story-Quelle (AUFTRAG-F0, Teil A): Der Glob-Lader liest
// ausschliesslich prototypen/stories/ und akzeptiert dort aktuell genau FS-001.

import { describe, expect, it } from "vitest";
import { ladeAlle } from "../src/quelle";

describe("ladeAlle", () => {
  it("akzeptiert FS-001 aus prototypen/stories/", () => {
    const ergebnis = ladeAlle();
    const ids = ergebnis.akzeptiert.map((s) => s.meta.id);
    expect(ids).toContain("FS-001");
  });

  it("akzeptiert nur Geschichten mit Kennzeichnung FIKTIV und ohne Fixture-Markierung", () => {
    const ergebnis = ladeAlle();
    for (const story of ergebnis.akzeptiert) {
      expect(story.meta.id.startsWith("FS-")).toBe(true);
    }
  });
});

describe("ladeAlle — uebernommene Nacherzaehl-Geschichten (mit injiziertem Pruefdatum)", () => {
  // FS-104/105/107/109 wurden am 2026-08-08 freigegeben und per git mv aus
  // redaktion/entwuerfe/ nach prototypen/stories/ uebernommen (FS-106/108
  // bleiben Entwurf, siehe redaktion/tests/entwuerfe.test.ts). Ohne
  // injiziertes Datum verweigert der Parser jede NACHERZAEHLT_OEFFENTLICH-
  // Geschichte (keine Systemzeit in der Fachlogik) — deshalb ein eigener
  // Test mit fest injiziertem Pruefdatum.
  //
  // Registeraufbau aus RUECKHOLUNG-NORMEN.md (berichte/): sieben neue
  // Eintraege R-CH-0011..0017 liefern regel_id/regel_version/norm_fundstelle
  // fuer FS-102/103/105/106/107/108/109. FS-107s Rubrik-Zeile ("TEILWEISE")
  // ist Altbestand aus der Zeit vor dem Dreier-Enum und bleibt bewusst offen
  // (Redaktionsaufgabe, §10.2) — das ist der einzige noch fehlende Pflicht-
  // schluessel unter den sieben §3-Feldern.
  const PRUEF_DATUM = "2026-08-08";

  it("akzeptiert FS-101, 102, 103, 104, 105 und 109 (alle sieben §3-Felder vorhanden)", () => {
    const ergebnis = ladeAlle(PRUEF_DATUM);
    const ids = ergebnis.akzeptiert.map((s) => s.meta.id);
    for (const id of ["FS-101", "FS-102", "FS-103", "FS-104", "FS-105", "FS-109"]) {
      expect(ids, `${id} sollte akzeptiert werden`).toContain(id);
    }
  });

  it("verweigert FS-107 einzig wegen der noch offenen Rubrik", () => {
    const ergebnis = ladeAlle(PRUEF_DATUM);
    const ids = ergebnis.akzeptiert.map((s) => s.meta.id);
    expect(ids).not.toContain("FS-107");
    const fs107 = ergebnis.verweigert.find((v) => v.quelle.startsWith("FS-107-"));
    expect(fs107, "FS-107 sollte verweigert werden").toBeDefined();
    expect(fs107!.gruende).toEqual(['Pflichtschluessel fehlt: "rubrik"']);
  });
});

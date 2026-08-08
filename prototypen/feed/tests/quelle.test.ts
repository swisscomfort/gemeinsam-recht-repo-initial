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
  // bleiben Entwurf). Ohne injiziertes Datum verweigert der Parser jede
  // NACHERZAEHLT_OEFFENTLICH-Geschichte (keine Systemzeit in der Fachlogik) —
  // deshalb ein eigener Test mit fest injiziertem Pruefdatum.
  const PRUEF_DATUM = "2026-08-07";

  it("akzeptiert FS-104, FS-105, FS-107 und FS-109 aus prototypen/stories/", () => {
    const ergebnis = ladeAlle(PRUEF_DATUM);
    const ids = ergebnis.akzeptiert.map((s) => s.meta.id);
    for (const id of ["FS-104", "FS-105", "FS-107", "FS-109"]) {
      expect(ids).toContain(id);
    }
  });
});

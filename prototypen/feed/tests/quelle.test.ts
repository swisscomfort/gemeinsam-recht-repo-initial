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

  it("akzeptiert FS-101 und FS-104 aus prototypen/stories/ (alle sieben §3-Felder ableitbar)", () => {
    const ergebnis = ladeAlle(PRUEF_DATUM);
    const ids = ergebnis.akzeptiert.map((s) => s.meta.id);
    expect(ids).toContain("FS-101");
    expect(ids).toContain("FS-104");
  });

  // MANIFEST v2.1 §3: die sieben Pflichtfelder sind fuer FS-102/103/105/107/109
  // nicht vollstaendig aus Storytext/Aktenzeichen ableitbar (kein passender
  // wissen/register-Eintrag bzw. bei FS-107 eine Rubrik ausserhalb des
  // Dreier-Enums) und bleiben deshalb unvollstaendig — das loest absichtlich
  // einen Ladefehler aus (berichte/AUFTRAG-KODIERUNG-V2-ABSCHLUSS.md §9.3:
  // "das ist beabsichtigt, nicht zu umgehen"), bis ein Mensch regel_id/
  // norm_fundstelle (bzw. bei FS-107 die Rubrik) ergaenzt.
  it("verweigert FS-102, 103, 105, 107, 109 wegen fehlender §3-Felder (beabsichtigt)", () => {
    const ergebnis = ladeAlle(PRUEF_DATUM);
    const ids = ergebnis.akzeptiert.map((s) => s.meta.id);
    for (const id of ["FS-102", "FS-103", "FS-105", "FS-107", "FS-109"]) {
      expect(ids).not.toContain(id);
    }
    const verweigerungFuer = (id: string) =>
      ergebnis.verweigert.find((v) => v.quelle === id || v.quelle.startsWith(`${id}-`));
    for (const id of ["FS-102", "FS-103", "FS-105", "FS-109"]) {
      const verweigerung = verweigerungFuer(id);
      expect(verweigerung, `${id} sollte verweigert werden`).toBeDefined();
      expect(verweigerung!.gruende.some((g) => g.includes('Pflichtschluessel fehlt: "regel_id"'))).toBe(true);
    }
    const fs107 = verweigerungFuer("FS-107");
    expect(fs107, "FS-107 sollte verweigert werden").toBeDefined();
    expect(fs107!.gruende.some((g) => g.includes('Pflichtschluessel fehlt: "rubrik"'))).toBe(true);
  });
});

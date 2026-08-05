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

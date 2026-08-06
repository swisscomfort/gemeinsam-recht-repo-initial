// Integrationstest E1 x E3: Die vom Feed-Prototyp lokal erzeugte
// fehlermeldung-Kandidatendatei erfuellt wissen/schema/kandidat.schema.json.
// So kann der Werkbank-Export unveraendert in den Eingangskorb gelegt werden;
// Pruefung und Uebernahme bleiben menschlich (Review-Gate).

import { describe, expect, it } from "vitest";
import { REGELVERSION } from "@core/index";
import { baueFehlermeldung } from "../../prototypen/feed/src/rechenweg";
import { uebernehmeKandidat } from "../tools/uebernehmen.ts";
import { pruefeKandidat } from "../tools/validierung.ts";

describe("Feed-Fehlermeldung gegen kandidat.schema.json (E1)", () => {
  it("eine im Feed erzeugte Meldung ist schema-konform", () => {
    const meldung = baueFehlermeldung(
      "R-CH-0001",
      "Die Fristdauer scheint mir nicht zu stimmen.",
      REGELVERSION,
    );
    const ergebnis = pruefeKandidat(meldung);
    expect(ergebnis.fehler).toEqual([]);
    expect(ergebnis.ok).toBe(true);
  });

  it("das Uebernahme-Werkzeug weist sie ab — Fehlermeldungen gehen nie ins Register", () => {
    const meldung = baueFehlermeldung("R-CH-0001", "Scheint falsch.", REGELVERSION);
    const ergebnis = uebernehmeKandidat(meldung, [], "CH", "Pruefer:in", "2026-08-06");
    expect(ergebnis.ok).toBe(false);
  });
});

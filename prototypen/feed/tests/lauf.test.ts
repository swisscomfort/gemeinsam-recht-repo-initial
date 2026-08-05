// Tests des Lauf-Modus (AUFTRAG-F0, Teil E) — insbesondere der F1-Waechter:
// Das Lauf-Log darf strukturell keine Zeit-, Dauer- oder Klickraten-Felder
// enthalten koennen.

import { describe, expect, it } from "vitest";
import {
  EXPORT_ERLAUBTE_SCHLUESSEL,
  ZWECKBINDUNG,
  alleSchluessel,
  bricheAb,
  erfasseKarte,
  exportiere,
  ladeSammlung,
  neueSammlung,
  schliesseAb,
  starteLauf,
} from "../src/lauf";

describe("Lauf-Modus", () => {
  it("zaehlt nur abgeschlossene Durchlaeufe", () => {
    const sammlung = neueSammlung();
    const lauf1 = starteLauf(sammlung, "2026-08-05");
    erfasseKarte(lauf1, "FS-001-E1", "verstanden", "");
    erfasseKarte(lauf1, "FS-001-E2", "aha_moment", "gute Wendung");
    erfasseKarte(lauf1, "FS-001-E3", "verstanden", "");
    schliesseAb(sammlung, lauf1);

    const lauf2 = starteLauf(sammlung, "2026-08-05");
    erfasseKarte(lauf2, "FS-001-E1", "ueberfordert", "zu viel Text");
    bricheAb(sammlung, lauf2, "FS-001-E2");

    expect(sammlung.durchlaeufeGesamt).toBe(1);
    expect(lauf2.abbruchstelle).toBe("FS-001-E2");
    expect(lauf2.abgeschlossen).toBe(false);
  });

  it("erlaubt nur Emotionen aus der festen Liste (F1)", () => {
    const sammlung = neueSammlung();
    const lauf = starteLauf(sammlung, "2026-08-05");
    expect(() => erfasseKarte(lauf, "FS-001-E1", "begeistert_klickfreudig", "")).toThrow();
  });

  it("verweigert Eintraege nach Ende des Laufs", () => {
    const sammlung = neueSammlung();
    const lauf = starteLauf(sammlung, "2026-08-05");
    schliesseAb(sammlung, lauf);
    expect(() => erfasseKarte(lauf, "FS-001-E1", "verstanden", "")).toThrow();
  });
});

describe("F1-Waechter: Export-Schema", () => {
  function beispielExport(): string {
    const sammlung = neueSammlung();
    const lauf = starteLauf(sammlung, "2026-08-05");
    erfasseKarte(lauf, "FS-001-E1", "neugierig", "Notiz");
    schliesseAb(sammlung, lauf);
    const abgebrochen = starteLauf(sammlung, "2026-08-06");
    bricheAb(sammlung, abgebrochen, "FS-001-E1");
    return exportiere(sammlung);
  }

  it("enthaelt ausschliesslich Schluessel der abschliessenden Erlaubnisliste", () => {
    const schluessel = [...alleSchluessel(JSON.parse(beispielExport()))];
    for (const s of schluessel) {
      expect(EXPORT_ERLAUBTE_SCHLUESSEL.has(s), `unzulaessiger Schluessel: ${s}`).toBe(true);
    }
  });

  it("enthaelt keine Zeit-, Dauer- oder Klick-Felder (unzulaessige Zwecke nach F1)", () => {
    const schluessel = [...alleSchluessel(JSON.parse(beispielExport()))];
    const verboten = /zeit|dauer|stamp|time|klick|click|besuch|wiederkehr|session/i;
    expect(schluessel.filter((s) => verboten.test(s))).toEqual([]);
  });

  it("traegt die Zweckbindung im Kopffeld", () => {
    const geparst = JSON.parse(beispielExport()) as { zweckbindung: string };
    expect(geparst.zweckbindung).toBe(ZWECKBINDUNG);
    expect(ZWECKBINDUNG).toContain("keine echten Nutzer");
  });
});

describe("ladeSammlung", () => {
  it("laedt einen eigenen Export verlustfrei", () => {
    const sammlung = neueSammlung();
    const lauf = starteLauf(sammlung, "2026-08-05");
    erfasseKarte(lauf, "FS-001-E1", "verstanden", "");
    schliesseAb(sammlung, lauf);
    const geladen = ladeSammlung(exportiere(sammlung));
    expect(geladen).toEqual(sammlung);
  });

  it("verwirft kaputtes JSON und fremde Strukturen", () => {
    expect(ladeSammlung("{kaputt").durchlaeufeGesamt).toBe(0);
    expect(ladeSammlung(null).laeufe).toEqual([]);
    const fremd = JSON.stringify({
      zweckbindung: ZWECKBINDUNG,
      durchlaeufeGesamt: 1,
      laeufe: [
        {
          laufId: 1,
          datum: "2026-08-05",
          eintraege: [],
          abbruchstelle: null,
          abgeschlossen: true,
          verweildauerMs: 12,
        },
      ],
    });
    expect(ladeSammlung(fremd).laeufe).toEqual([]);
  });
});

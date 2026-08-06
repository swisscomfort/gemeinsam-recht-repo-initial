// Tests des Journey-Emotionslaufs (AUFTRAG-F1 §4): Stationen ueber die
// ganze Reise, Soll-Kurve im Log-Kopf, 100er-Zaehler fuer vollstaendige
// Journeys — und der unveraenderte F1-Waechter (keine Zeit-/Engagement-
// Felder erfassbar).

import { describe, expect, it } from "vitest";
import {
  EXPORT_ERLAUBTE_SCHLUESSEL,
  SOLL_ERNSTFALL,
  ZWECKBINDUNG,
  alleSchluessel,
  erfasseKarte,
  erfasseStation,
  erfassteStellen,
  exportiere,
  istVollstaendigeJourney,
  ladeSammlung,
  neueSammlung,
  schliesseAb,
  starteLauf,
  type LaufSammlung,
} from "../src/lauf";

function journeyLauf(sammlung: LaufSammlung) {
  const lauf = starteLauf(sammlung, "2026-08-10");
  erfasseStation(lauf, "karte", "FS-001-E1", "neugierig", "");
  erfasseStation(lauf, "uebergang", "uebergang:post_bekommen", "beunruhigt", "Schreck-Moment");
  erfasseStation(lauf, "fragebaum_schritt", "kanton", "verstanden", "");
  erfasseStation(lauf, "ergebnis", "ergebnis", "aha_moment", "Orientierung");
  erfasseStation(lauf, "mein_fall", "mein-fall", "verstanden", "Erleichterung");
  return lauf;
}

describe("Journey-Stationen (F1 §4)", () => {
  it("erfasst Stationen aller Arten und erkennt die vollstaendige Journey", () => {
    const sammlung = neueSammlung();
    const lauf = starteLauf(sammlung, "2026-08-10");
    expect(istVollstaendigeJourney(lauf)).toBe(false);
    erfasseStation(lauf, "karte", "FS-001-E1", "neugierig", "");
    erfasseStation(lauf, "uebergang", "uebergang:post_bekommen", "beunruhigt", "");
    erfasseStation(lauf, "fragebaum_schritt", "kanton", "verstanden", "");
    erfasseStation(lauf, "ergebnis", "ergebnis", "aha_moment", "");
    expect(istVollstaendigeJourney(lauf)).toBe(false);
    erfasseStation(lauf, "mein_fall", "mein-fall", "verstanden", "");
    expect(istVollstaendigeJourney(lauf)).toBe(true);
  });

  it("erlaubt nur Stationsarten und Emotionen aus den festen Listen", () => {
    const sammlung = neueSammlung();
    const lauf = starteLauf(sammlung, "2026-08-10");
    expect(() => erfasseStation(lauf, "verweildauer", "x", "verstanden", "")).toThrow();
    expect(() => erfasseStation(lauf, "karte", "x", "begeistert_klickfreudig", "")).toThrow();
  });

  it("meldet bereits erfasste Stellen (gegen Doppel-Erfassung in der UI)", () => {
    const sammlung = neueSammlung();
    const lauf = journeyLauf(sammlung);
    expect(erfassteStellen(lauf).has("uebergang:post_bekommen")).toBe(true);
    expect(erfassteStellen(lauf).has("unbekannt")).toBe(false);
  });

  it("erfasseKarte (F0-Aufruf) bleibt als Station der Art 'karte' erhalten", () => {
    const sammlung = neueSammlung();
    const lauf = starteLauf(sammlung, "2026-08-10");
    erfasseKarte(lauf, "FS-001-E1", "verstanden", "");
    expect(lauf.eintraege[0]).toEqual({
      stelle: "FS-001-E1",
      art: "karte",
      emotion: "verstanden",
      notiz: "",
    });
  });
});

describe("100er-Zaehler zaehlt vollstaendige Journey-Durchlaeufe (F1 §4)", () => {
  it("zaehlt Journeys getrennt von blossen Karten-Durchlaeufen", () => {
    const sammlung = neueSammlung();

    const nurKarten = starteLauf(sammlung, "2026-08-10");
    erfasseKarte(nurKarten, "FS-001-E1", "verstanden", "");
    schliesseAb(sammlung, nurKarten);
    expect(sammlung.durchlaeufeGesamt).toBe(1);
    expect(sammlung.journeysGesamt).toBe(0);

    const journey = journeyLauf(sammlung);
    schliesseAb(sammlung, journey);
    expect(sammlung.durchlaeufeGesamt).toBe(2);
    expect(sammlung.journeysGesamt).toBe(1);
  });
});

describe("Log-Kopf und F1-Waechter", () => {
  function beispielExport(): string {
    const sammlung = neueSammlung();
    const lauf = journeyLauf(sammlung);
    schliesseAb(sammlung, lauf);
    return exportiere(sammlung);
  }

  it("traegt Zweckbindung und Soll-Emotionskurve im Log-Kopf", () => {
    const geparst = JSON.parse(beispielExport()) as { zweckbindung: string; soll_ernstfall: string };
    expect(geparst.zweckbindung).toBe(ZWECKBINDUNG);
    expect(geparst.soll_ernstfall).toBe(SOLL_ERNSTFALL);
    expect(SOLL_ERNSTFALL).toBe(
      "Schreck/Angst -> Orientierung -> Handlungsfaehigkeit -> Erleichterung",
    );
  });

  it("Journey-Export enthaelt nur erlaubte Schluessel und keine Zeit-/Engagement-Felder", () => {
    const schluessel = [...alleSchluessel(JSON.parse(beispielExport()))];
    for (const s of schluessel) {
      expect(EXPORT_ERLAUBTE_SCHLUESSEL.has(s), `unzulaessiger Schluessel: ${s}`).toBe(true);
    }
    const verboten = /zeit|dauer|stamp|time|klick|click|besuch|wiederkehr|session/i;
    expect(schluessel.filter((s) => verboten.test(s))).toEqual([]);
  });

  it("laedt einen Journey-Export verlustfrei und verwirft das alte F0-Format", () => {
    const sammlung = neueSammlung();
    const lauf = journeyLauf(sammlung);
    schliesseAb(sammlung, lauf);
    expect(ladeSammlung(exportiere(sammlung))).toEqual(sammlung);

    const altesFormat = JSON.stringify({
      zweckbindung: ZWECKBINDUNG,
      durchlaeufeGesamt: 1,
      laeufe: [
        {
          laufId: 1,
          datum: "2026-08-05",
          eintraege: [{ karteId: "FS-001-E1", emotion: "verstanden", notiz: "" }],
          abbruchstelle: null,
          abgeschlossen: true,
        },
      ],
    });
    expect(ladeSammlung(altesFormat).laeufe).toEqual([]);
  });
});

// Tests der Kategorie NACHERZAEHLT_OEFFENTLICH (AUFTRAG-R0 §1/§4).
// Alle Negativfaelle sind FX-Fixtures (fixture: true, Invariante 2); das
// Pruefdatum ("heute") wird in jedem Test fest injiziert — keine Systemzeit.

import { describe, expect, it } from "vitest";
import { kodiereKodierungsLauf, parseKodierungsLauf, pruefeStory } from "../src/story";
import { BADGE, BADGE_NACHERZAEHLT_PRAEFIX, badgeFuer, morgenausgabe } from "../src/ausgabe";

import fxGueltigMeta from "./fixtures/FX-NACHERZAEHLT-SONST-GUELTIG/meta.yaml?raw";
import fxGueltigStory from "./fixtures/FX-NACHERZAEHLT-SONST-GUELTIG/story.md?raw";
import fxOhneQuelleMeta from "./fixtures/FX-NACHERZAEHLT-OHNE-QUELLE/meta.yaml?raw";
import fxOhneQuelleStory from "./fixtures/FX-NACHERZAEHLT-OHNE-QUELLE/story.md?raw";
import fxQuelleLeerMeta from "./fixtures/FX-NACHERZAEHLT-QUELLE-LEER/meta.yaml?raw";
import fxQuelleLeerStory from "./fixtures/FX-NACHERZAEHLT-QUELLE-LEER/story.md?raw";
import fxZukunftMeta from "./fixtures/FX-NACHERZAEHLT-DATUM-ZUKUNFT/meta.yaml?raw";
import fxZukunftStory from "./fixtures/FX-NACHERZAEHLT-DATUM-ZUKUNFT/story.md?raw";
import fxNichtAbgeschlossenMeta from "./fixtures/FX-NACHERZAEHLT-NICHT-ABGESCHLOSSEN/meta.yaml?raw";
import fxNichtAbgeschlossenStory from "./fixtures/FX-NACHERZAEHLT-NICHT-ABGESCHLOSSEN/story.md?raw";
import fxOhneAbschlussMeta from "./fixtures/FX-NACHERZAEHLT-OHNE-ABSCHLUSS/meta.yaml?raw";
import fxOhneAbschlussStory from "./fixtures/FX-NACHERZAEHLT-OHNE-ABSCHLUSS/story.md?raw";
import fxS3Meta from "./fixtures/FX-NACHERZAEHLT-S3/meta.yaml?raw";
import fxS3Story from "./fixtures/FX-NACHERZAEHLT-S3/story.md?raw";
import fxUnbekanntMeta from "./fixtures/FX-NACHERZAEHLT-UNBEKANNT/meta.yaml?raw";
import fxUnbekanntStory from "./fixtures/FX-NACHERZAEHLT-UNBEKANNT/story.md?raw";
import fxFiktivMeta from "./fixtures/FX-SONST-GUELTIG/meta.yaml?raw";
import fxFiktivStory from "./fixtures/FX-SONST-GUELTIG/story.md?raw";

/** Fest injiziertes Pruefdatum — deterministisch, keine Systemzeit. */
const HEUTE = "2026-08-07";

function gruendeVon(metaRoh: string, storyRoh: string, heute: string | null = HEUTE): string[] {
  const ergebnis = pruefeStory("test", metaRoh, storyRoh, heute ?? undefined);
  expect(ergebnis.ok).toBe(false);
  return ergebnis.ok ? [] : ergebnis.verweigerung.gruende;
}

/** FX-101 ohne die fixture-Markierung — nur zur Annahme-Pruefung im Test. */
const gueltigOhneFixture = fxGueltigMeta.replace(/fixture: true\r?\n?/, "");

describe("NACHERZAEHLT_OEFFENTLICH — Annahme", () => {
  it("verweigert die sonst gueltige Fixture ausschliesslich wegen fixture: true", () => {
    const gruende = gruendeVon(fxGueltigMeta, fxGueltigStory);
    expect(gruende).toHaveLength(1);
    expect(gruende[0]).toContain("Test-Fixture");
  });

  it("akzeptiert eine vollstaendige nacherzaehlte Geschichte und uebernimmt die Quellfelder", () => {
    const ergebnis = pruefeStory("test", gueltigOhneFixture, fxGueltigStory, HEUTE);
    expect(ergebnis.ok).toBe(true);
    if (!ergebnis.ok) return;
    expect(ergebnis.story.meta.kennzeichnung).toBe("NACHERZAEHLT_OEFFENTLICH");
    expect(ergebnis.story.meta.quelle).toBe("BGer 4A_999/2025");
    expect(ergebnis.story.meta.gericht).toBe("Bundesgericht");
    expect(ergebnis.story.meta.entscheid_datum).toBe("2025-03-14");
    expect(ergebnis.story.etappen).toHaveLength(2);
  });

  it("FIKTIV-Geschichten tragen weiterhin die Kennzeichnung FIKTIV in der Meta", () => {
    const ohneFixture = fxFiktivMeta.replace(/fixture: true\r?\n?/, "");
    const ergebnis = pruefeStory("test", ohneFixture, fxFiktivStory, HEUTE);
    expect(ergebnis.ok).toBe(true);
    if (!ergebnis.ok) return;
    expect(ergebnis.story.meta.kennzeichnung).toBe("FIKTIV");
    expect(ergebnis.story.meta.quelle).toBeUndefined();
  });
});

describe("NACHERZAEHLT_OEFFENTLICH — sichtbare Kennzeichnung der Karten (R0 §1)", () => {
  it("jede Karte traegt 'Nach einem echten, öffentlich publizierten Entscheid · <quelle>'", () => {
    const ergebnis = pruefeStory("test", gueltigOhneFixture, fxGueltigStory, HEUTE);
    expect(ergebnis.ok).toBe(true);
    if (!ergebnis.ok) return;
    const erwartet = `${BADGE_NACHERZAEHLT_PRAEFIX} · BGer 4A_999/2025`;
    expect(badgeFuer(ergebnis.story)).toBe(erwartet);
    const ausgabe = morgenausgabe([ergebnis.story], HEUTE);
    expect(ausgabe.karten.length).toBeGreaterThan(0);
    for (const karte of ausgabe.karten) {
      expect(karte.badge).toBe(erwartet);
    }
  });

  it("FIKTIV-Karten behalten das bisherige Badge", () => {
    const ohneFixture = fxFiktivMeta.replace(/fixture: true\r?\n?/, "");
    const ergebnis = pruefeStory("test", ohneFixture, fxFiktivStory, HEUTE);
    expect(ergebnis.ok).toBe(true);
    if (!ergebnis.ok) return;
    expect(badgeFuer(ergebnis.story)).toBe(BADGE);
  });
});

describe("NACHERZAEHLT_OEFFENTLICH — Verweigerung (jeder Grund einzeln)", () => {
  it("verweigert bei fehlender Quelle", () => {
    const gruende = gruendeVon(fxOhneQuelleMeta, fxOhneQuelleStory);
    expect(gruende.some((g) => g.includes('Pflichtschluessel fehlt: "quelle"'))).toBe(true);
  });

  it("verweigert bei leerer Quelle", () => {
    const gruende = gruendeVon(fxQuelleLeerMeta, fxQuelleLeerStory);
    expect(gruende.some((g) => g.includes('"quelle" ist leer'))).toBe(true);
  });

  it("verweigert ein entscheid_datum in der Zukunft (Pruefdatum injiziert)", () => {
    const gruende = gruendeVon(fxZukunftMeta, fxZukunftStory);
    expect(gruende.some((g) => g.includes("liegt in der Zukunft"))).toBe(true);
  });

  it("akzeptiert ein entscheid_datum am Pruefdatum selbst nicht als Zukunft", () => {
    const meta = gueltigOhneFixture.replace("entscheid_datum: 2025-03-14", `entscheid_datum: ${HEUTE}`);
    const ergebnis = pruefeStory("test", meta, fxGueltigStory, HEUTE);
    expect(ergebnis.ok).toBe(true);
  });

  it("verweigert ohne injiziertes Pruefdatum (keine Systemzeit in der Fachlogik)", () => {
    const gruende = gruendeVon(fxGueltigMeta, fxGueltigStory, null);
    expect(gruende.some((g) => g.includes("Kein Pruefdatum injiziert"))).toBe(true);
  });

  it("verweigert verfahren_abgeschlossen: false (keine laufenden Verfahren)", () => {
    const gruende = gruendeVon(fxNichtAbgeschlossenMeta, fxNichtAbgeschlossenStory);
    expect(gruende.some((g) => g.includes('"verfahren_abgeschlossen" ist nicht exakt true'))).toBe(true);
  });

  it("verweigert fehlendes verfahren_abgeschlossen", () => {
    const gruende = gruendeVon(fxOhneAbschlussMeta, fxOhneAbschlussStory);
    expect(gruende.some((g) => g.includes('Pflichtschluessel fehlt: "verfahren_abgeschlossen"'))).toBe(true);
  });

  it("verweigert Schutzstufe S3 (hoeher als S2)", () => {
    const gruende = gruendeVon(fxS3Meta, fxS3Story);
    expect(gruende.some((g) => g.includes("Schutzstufe S3"))).toBe(true);
  });

  it("verweigert unbekannte Schluessel weiterhin streng", () => {
    const gruende = gruendeVon(fxUnbekanntMeta, fxUnbekanntStory);
    expect(gruende.some((g) => g.includes('Unbekannter oder falsch geschriebener Schluessel: "bonus_punkte"'))).toBe(true);
  });

  it("verweigert die Quellfelder bei FIKTIV-Geschichten (nur fuer NACHERZAEHLT erlaubt)", () => {
    const meta = fxFiktivMeta + 'quelle: "BGer 4A_999/2025"\n';
    const gruende = gruendeVon(meta, fxFiktivStory);
    expect(gruende.some((g) => g.includes('Unbekannter oder falsch geschriebener Schluessel: "quelle"'))).toBe(true);
  });

  it("verweigert story.md ohne die Pflichtzeile 'NACH ECHTEM ENTSCHEID …'", () => {
    const ohneZeile = fxGueltigStory
      .split("\n")
      .filter((z) => !z.includes("NACH ECHTEM ENTSCHEID"))
      .join("\n");
    const gruende = gruendeVon(fxGueltigMeta, ohneZeile);
    expect(gruende.some((g) => g.includes("keine sichtbare Kennzeichnungszeile"))).toBe(true);
  });

  it("verweigert eine Pflichtzeile mit abweichender Quelle", () => {
    const falscheQuelle = fxGueltigStory.replace("Quelle: BGer 4A_999/2025", "Quelle: BGer 4A_111/2024");
    const gruende = gruendeVon(fxGueltigMeta, falscheQuelle);
    expect(gruende.some((g) => g.includes("keine sichtbare Kennzeichnungszeile"))).toBe(true);
  });

  it("verweigert ein entscheid_datum ohne Datumsform", () => {
    const meta = fxGueltigMeta.replace("entscheid_datum: 2025-03-14", "entscheid_datum: irgendwann");
    const gruende = gruendeVon(meta, fxGueltigStory);
    expect(gruende.some((g) => g.includes('"entscheid_datum" muss die Form JJJJ-MM-TT haben'))).toBe(true);
  });
});

describe("Doppelkodierung — kodierung_status/kodierung_quellen (MANIFEST v2.1 §3/§5)", () => {
  it("parseKodierungsLauf/kodiereKodierungsLauf sind zueinander invers", () => {
    const lauf = {
      lauf: "cli-2",
      datum: "2026-08-09",
      wert: ["frist_verpasst", "beweis_fehlte"],
      textstelle: "ein Beleg, mit Komma, im Text",
    };
    expect(parseKodierungsLauf(kodiereKodierungsLauf(lauf))).toEqual(lauf);
  });

  it('kodierung_status fehlt: NACHERZAEHLT_OEFFENTLICH erhaelt den Default "vorschlag"', () => {
    const ohneStatus = gueltigOhneFixture.replace("kodierung_status: doppelt_bestaetigt\n", "");
    const ergebnis = pruefeStory("test", ohneStatus, fxGueltigStory, HEUTE);
    expect(ergebnis.ok).toBe(true);
    if (!ergebnis.ok) return;
    expect(ergebnis.story.meta.kodierung_status).toBe("vorschlag");
  });

  it("uebernimmt kodierung_status und die geparsten kodierung_quellen (zwei Laeufe)", () => {
    const ergebnis = pruefeStory("test", gueltigOhneFixture, fxGueltigStory, HEUTE);
    expect(ergebnis.ok).toBe(true);
    if (!ergebnis.ok) return;
    expect(ergebnis.story.meta.kodierung_status).toBe("doppelt_bestaetigt");
    expect(ergebnis.story.meta.kodierung_quellen).toEqual([
      {
        lauf: "cli-1",
        datum: "2026-08-06",
        wert: ["gegenpartei_nicht_substantiiert"],
        textstelle: "FX-Testbeleg Lauf 1",
      },
      {
        lauf: "cli-2",
        datum: "2026-08-06",
        wert: ["gegenpartei_nicht_substantiiert"],
        textstelle: "FX-Testbeleg Lauf 2",
      },
    ]);
  });

  it("verweigert einen unbekannten kodierung_status", () => {
    const meta = gueltigOhneFixture.replace("kodierung_status: doppelt_bestaetigt", "kodierung_status: geprueft");
    const gruende = gruendeVon(meta, fxGueltigStory);
    expect(gruende.some((g) => g.includes('Unbekannter kodierung_status: "geprueft"'))).toBe(true);
  });

  it("verweigert einen kodierung_quellen-Eintrag mit zu wenigen Feldern", () => {
    const meta = gueltigOhneFixture.replace(
      /kodierung_quellen: \[.*\]/,
      'kodierung_quellen: ["cli-1|2026-08-06"]',
    );
    const gruende = gruendeVon(meta, fxGueltigStory);
    expect(gruende.some((g) => g.includes('nicht als "lauf|datum|wert|textstelle" lesbar'))).toBe(true);
  });

  it("verweigert einen kodierung_quellen-Eintrag mit unbekanntem Scheiterpunkt-Wert", () => {
    const meta = gueltigOhneFixture.replace(
      /kodierung_quellen: \[.*\]/,
      'kodierung_quellen: ["cli-1|2026-08-06|nicht_existierender_code|Beleg"]',
    );
    const gruende = gruendeVon(meta, fxGueltigStory);
    expect(
      gruende.some((g) => g.includes('unbekanntem Scheiterpunkt-Wert: "nicht_existierender_code"')),
    ).toBe(true);
  });

  it("verweigert einen kodierung_quellen-Eintrag mit ungueltigem Datum", () => {
    const meta = gueltigOhneFixture.replace(
      /kodierung_quellen: \[.*\]/,
      'kodierung_quellen: ["cli-1|gestern|gegenpartei_nicht_substantiiert|Beleg"]',
    );
    const gruende = gruendeVon(meta, fxGueltigStory);
    expect(gruende.some((g) => g.includes("ungueltigem Datum"))).toBe(true);
  });
});

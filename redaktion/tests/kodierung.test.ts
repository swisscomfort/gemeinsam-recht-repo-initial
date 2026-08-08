// Tests der Doppelkodierung (MANIFEST v2.1 §5): Export ohne Lauf-1-Vorschlag,
// Import-Vergleich (gleich -> doppelt_bestaetigt, ungleich -> strittig).
// Reine Funktionen, keine Systemzeit, keine echten Story-Inhalte noetig.

import { describe, expect, it } from "vitest";
import {
  baueZweitlaufExport,
  kodiereKodierungsLauf,
  leseKodierungsQuellen,
  leseListe,
  leseSkalar,
  parseKodierungsLauf,
  schreibeAktualisiertesMeta,
  vergleicheZweitlauf,
  type AktuelleKodierung,
  type ZweitlaufAntwort,
} from "../src/kodierung.js";
// Konsistenzpruefung: dasselbe Zeilenformat wie der Feed-Parser (kanonische
// Definition), obwohl redaktion/src/kodierung.ts es aus Build-Gruenden
// (tsconfig.build.json rootDir "src") nicht importieren kann.
import {
  kodiereKodierungsLauf as feedKodiere,
  parseKodierungsLauf as feedParse,
} from "../../prototypen/feed/src/story.js";

describe("parseKodierungsLauf/kodiereKodierungsLauf", () => {
  it("sind zueinander invers", () => {
    const lauf = {
      lauf: "cli-2",
      datum: "2026-08-09",
      wert: ["frist_verpasst", "beweis_fehlte"],
      textstelle: "ein Beleg, mit Komma",
    };
    expect(parseKodierungsLauf(kodiereKodierungsLauf(lauf))).toEqual(lauf);
  });

  it("liest weniger als vier Segmente als Formfehler (null)", () => {
    expect(parseKodierungsLauf("cli-1|2026-08-08")).toBeNull();
  });

  it("verhaelt sich exakt wie die kanonische Definition in prototypen/feed/src/story.ts", () => {
    const lauf = { lauf: "cli-1", datum: "2026-08-08", wert: ["antrag_unbeziffert"], textstelle: "Beleg" };
    expect(kodiereKodierungsLauf(lauf)).toBe(feedKodiere(lauf));
    const zeile = "cli-1|2026-08-08|antrag_unbeziffert,frist_verpasst|Beleg mit | Pipe im Text";
    expect(parseKodierungsLauf(zeile)).toEqual(feedParse(zeile));
  });
});

describe("leseSkalar/leseListe (meta.yaml-Subset ohne vollen Parser)", () => {
  const meta = [
    "id: FS-999",
    "kennzeichnung: NACHERZAEHLT_OEFFENTLICH",
    "kodierung_status: vorschlag",
    'kodierung_quellen: ["cli-1|2026-08-08|frist_verpasst|Beleg, mit Komma"]',
  ].join("\n");

  it("liest einen Skalar-Wert", () => {
    expect(leseSkalar(meta, "kennzeichnung")).toBe("NACHERZAEHLT_OEFFENTLICH");
    expect(leseSkalar(meta, "id")).toBe("FS-999");
  });

  it("liefert null fuer einen fehlenden Schluessel", () => {
    expect(leseSkalar(meta, "quelle")).toBeNull();
  });

  it("liest eine Liste unter Beachtung von Anfuehrungszeichen (Komma im Wert)", () => {
    expect(leseListe(meta, "kodierung_quellen")).toEqual([
      "cli-1|2026-08-08|frist_verpasst|Beleg, mit Komma",
    ]);
  });

  it("leseKodierungsQuellen dekodiert direkt zu KodierungsLauf-Objekten", () => {
    expect(leseKodierungsQuellen(meta)).toEqual([
      { lauf: "cli-1", datum: "2026-08-08", wert: ["frist_verpasst"], textstelle: "Beleg, mit Komma" },
    ]);
  });

  it("leseKodierungsQuellen ist leer, wenn der Schluessel fehlt", () => {
    expect(leseKodierungsQuellen("id: FS-999")).toEqual([]);
  });
});

describe("baueZweitlaufExport — ohne Lauf-1-Vorschlag", () => {
  it("enthaelt Story-ID, Textauszug und Werteliste, sortiert nach ID", () => {
    const datei = baueZweitlaufExport(
      [
        { id: "FS-002", textauszug: "Text B" },
        { id: "FS-001", textauszug: "Text A" },
      ],
      ["frist_verpasst", "beweis_fehlte"],
      "1.0.0",
      "2026-08-09",
      "2026-08-09",
    );
    expect(datei.stories.map((s) => s.id)).toEqual(["FS-001", "FS-002"]);
    expect(datei.werteliste).toEqual(["frist_verpasst", "beweis_fehlte"]);
    expect(datei.kodierliste_version).toBe("1.0.0");
  });

  it("die Nutzlast enthaelt an keiner Stelle das Wort 'scheiterpunkt' als Vorschlag-Feld (kein Lauf-1-Leak)", () => {
    const datei = baueZweitlaufExport(
      [{ id: "FS-001", textauszug: "Text ohne Kodierung" }],
      ["frist_verpasst"],
      "1.0.0",
      "2026-08-09",
      "2026-08-09",
    );
    const json = JSON.stringify(datei);
    expect(json).not.toContain("kodierung_quellen");
    expect(json).not.toContain('"wert"');
  });
});

describe("vergleicheZweitlauf — MANIFEST v2.1 §5", () => {
  function ersterLauf(wert: string[]): AktuelleKodierung["ersterLauf"] {
    return { lauf: "cli-1", datum: "2026-08-08", wert, textstelle: "Lauf-1-Beleg" };
  }
  function antwort(id: string, wert: string[]): ZweitlaufAntwort {
    return { id, lauf: "cli-2", datum: "2026-08-09", wert, textstelle: "Lauf-2-Beleg" };
  }

  it("gleiche Wertemenge -> doppelt_bestaetigt", () => {
    const aktuelle: AktuelleKodierung[] = [{ id: "FS-001", ersterLauf: ersterLauf(["frist_verpasst"]) }];
    const { ergebnisse, strittig } = vergleicheZweitlauf(aktuelle, [antwort("FS-001", ["frist_verpasst"])]);
    expect(ergebnisse).toHaveLength(1);
    expect(ergebnisse[0]!.kodierung_status).toBe("doppelt_bestaetigt");
    expect(strittig).toEqual([]);
  });

  it("gleiche Wertemenge in anderer Reihenfolge zaehlt ebenfalls als gleich", () => {
    const aktuelle: AktuelleKodierung[] = [
      { id: "FS-001", ersterLauf: ersterLauf(["frist_verpasst", "beweis_fehlte"]) },
    ];
    const { ergebnisse } = vergleicheZweitlauf(aktuelle, [
      antwort("FS-001", ["beweis_fehlte", "frist_verpasst"]),
    ]);
    expect(ergebnisse[0]!.kodierung_status).toBe("doppelt_bestaetigt");
  });

  it("abweichende Werte -> strittig, mit beiden Laeufen in kodierung_quellen", () => {
    const aktuelle: AktuelleKodierung[] = [{ id: "FS-001", ersterLauf: ersterLauf(["frist_verpasst"]) }];
    const { ergebnisse, strittig } = vergleicheZweitlauf(aktuelle, [antwort("FS-001", ["beweis_fehlte"])]);
    expect(ergebnisse[0]!.kodierung_status).toBe("strittig");
    expect(strittig).toHaveLength(1);
    expect(ergebnisse[0]!.kodierung_quellen).toEqual([
      ersterLauf(["frist_verpasst"]),
      { lauf: "cli-2", datum: "2026-08-09", wert: ["beweis_fehlte"], textstelle: "Lauf-2-Beleg" },
    ]);
  });

  it("Story ohne Zweitlauf-Eintrag bleibt unveraendert (ohneZweitlauf)", () => {
    const aktuelle: AktuelleKodierung[] = [{ id: "FS-001", ersterLauf: ersterLauf(["frist_verpasst"]) }];
    const { ergebnisse, ohneZweitlauf } = vergleicheZweitlauf(aktuelle, []);
    expect(ergebnisse).toEqual([]);
    expect(ohneZweitlauf).toEqual(["FS-001"]);
  });
});

describe("schreibeAktualisiertesMeta — gezielte Zeilenersetzung", () => {
  const metaRoh = [
    "id: FS-999",
    "kennzeichnung: NACHERZAEHLT_OEFFENTLICH",
    "kodierliste_version: \"1.0.0\"",
    "kodierung_status: vorschlag",
    'kodierung_quellen: ["cli-1|2026-08-08|frist_verpasst|Alter Beleg"]',
  ].join("\n");

  it("ersetzt beide Zeilen und laesst den Rest der Datei unveraendert", () => {
    const neu = schreibeAktualisiertesMeta(metaRoh, "doppelt_bestaetigt", [
      { lauf: "cli-1", datum: "2026-08-08", wert: ["frist_verpasst"], textstelle: "Alter Beleg" },
      { lauf: "cli-2", datum: "2026-08-09", wert: ["frist_verpasst"], textstelle: "Neuer Beleg" },
    ]);
    expect(neu).toBe(
      [
        "id: FS-999",
        "kennzeichnung: NACHERZAEHLT_OEFFENTLICH",
        "kodierliste_version: \"1.0.0\"",
        "kodierung_status: doppelt_bestaetigt",
        'kodierung_quellen: ["cli-1|2026-08-08|frist_verpasst|Alter Beleg", "cli-2|2026-08-09|frist_verpasst|Neuer Beleg"]',
      ].join("\n"),
    );
  });

  it("das Ergebnis ist wieder mit leseKodierungsQuellen lesbar (Rundreise)", () => {
    const neu = schreibeAktualisiertesMeta(metaRoh, "strittig", [
      { lauf: "cli-1", datum: "2026-08-08", wert: ["frist_verpasst"], textstelle: "Alter Beleg" },
      { lauf: "cli-2", datum: "2026-08-09", wert: ["beweis_fehlte"], textstelle: "Neuer Beleg" },
    ]);
    expect(leseSkalar(neu, "kodierung_status")).toBe("strittig");
    expect(leseKodierungsQuellen(neu)).toHaveLength(2);
  });
});

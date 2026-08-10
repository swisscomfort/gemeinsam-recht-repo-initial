// MD-001 v3.1.0 — historische Replikation 2011-2014 (EINGEFROREN).
//
// Dieselbe Endwirkungsmethode wie die eingefrorene v3.0.0, aber ein
// vollstaendig getrenntes, frueheres Fenster. Zwei Dinge muessen der Test
// zugleich sichern, und sie ziehen in verschiedene Richtungen:
//
//   1. Der Messgegenstand darf sich NICHT verschoben haben. Messfrage,
//      Suchanfrage, Gerichtsfilter, Ein- und Ausschlusscodes sind Zeichen
//      fuer Zeichen dieselben wie in v3.0.0 — sonst waere es eine andere
//      Messung mit demselben Namen.
//   2. Die Rechtskraftregel ist gerade NICHT wortgleich. Art. 61 BGG traegt
//      nur ein Verfahren, das dem BGG untersteht; fuer den historischen
//      Korpus kommt die Uebergangsbestimmung Art. 132 BGG hinzu. Wer die
//      Regel spaeter wieder auf den v3.0.0-Wortlaut zurueckzieht, faellt hier
//      auf.
//
// Seit der Eigentuemerfreigabe vom 2026-08-10 ist die Fassung eingefroren;
// ihr kanonischer Hash ist hier und in FREEZE.txt derselbe Anker.

import { describe, expect, it } from "vitest";
import {
  darfQuoteMaterialisieren,
  definitionsHash,
  findeFassung,
  rechtskraftAusInstanz,
  sammleFassungen,
  type Messdefinition,
} from "../tools/definition.ts";
import { leseDefinitionen, leseJson, leseLaeufe, leseText, messkorpusPfad, repoPfad } from "../tools/umgebung.ts";
import type { Messlauf } from "../tools/lauf.ts";

/** Kanonischer Freeze-Hash von MD-001@3.1.0 — Eintrag in FREEZE.txt, 2026-08-10. */
const V31_FREEZE_HASH = "c03d1279245b977ea247c70ec789ec9514506f80d92dc8ab3463cc97e4a462d9";

const register = sammleFassungen(
  leseDefinitionen().map((d) => ({ datei: d.datei, inhalt: d.inhalt as Messdefinition })),
);

function fassung(version: string): Messdefinition {
  const auflösung = findeFassung(register, { id: "MD-001", version });
  expect(auflösung.art).toBe("gefunden");
  return (auflösung as { definition: Messdefinition }).definition;
}

describe("MD-001 v3.1.0 — eingefrorenes historisches Fenster", () => {
  it("alle drei Fassungen bleiben eindeutig nebeneinander aufloesbar", () => {
    expect(register.doppelte.size).toBe(0);
    expect(definitionsHash(fassung("2.0.0"))).toBe(
      "a9b2143bd2873f1b5df2b9bebaf8247283158c9bb86d9f233fbb330f860244af",
    );
    expect(definitionsHash(fassung("3.0.0"))).toBe(
      "576d55c2464cbb4ceef8c8cccd2749ba9c70c78e67a16cf6b5f07c4f075cdc6f",
    );
    expect(fassung("2.0.0").status).toBe("eingefroren");
    expect(fassung("3.0.0").status).toBe("eingefroren");
  });

  it("3.1.0 ist eingefroren, im Endwirkungsmodell, mit dem Fenster 2011-2014", () => {
    const v31 = fassung("3.1.0");
    expect(v31.status).toBe("eingefroren");
    expect(v31.auswertungsmodell).toBe("endwirkung");
    expect(v31.zeitraum).toEqual({ von: "2011-01-01", bis: "2014-12-31" });
    expect(definitionsHash(v31)).toBe(V31_FREEZE_HASH);
  });

  it("FREEZE.txt traegt exakt den kanonischen v3.1.0-Hash aus definitionsHash()", () => {
    // Wie bei v3.0.0: der Eintrag in FREEZE.txt und die kanonische Form der
    // Datei muessen dasselbe sagen, sonst ist der Freeze-Anker wertlos.
    const block = leseText(repoPfad("FREEZE.txt")).split("MESSDEFINITION MD-001 v3.1.0")[1];
    expect(block).toBeDefined();
    const hashes = block?.match(/[0-9a-f]{64}/g) ?? [];
    expect(hashes[0]).toBe(V31_FREEZE_HASH);
    // Der Block nennt die historische Besonderheit, nicht nur den Zeitraum.
    expect(block).toContain("bundesgericht_uebergangsrecht_art132_bgg");
    expect(block).toContain("verfahrensrecht_nachweis");
  });

  it("der Messgegenstand ist Zeichen fuer Zeichen der von 3.0.0", () => {
    const v3 = fassung("3.0.0");
    const v31 = fassung("3.1.0");
    expect(v31.messfrage).toBe(v3.messfrage);
    expect(v31.abfrage.suchanfrage).toBe(v3.abfrage.suchanfrage);
    expect(v31.abfrage.gerichtsfilter).toEqual(v3.abfrage.gerichtsfilter);
    expect(v31.einschluss).toEqual(v3.einschluss);
    expect(v31.ausschluss).toEqual(v3.ausschluss);
    expect(v31.norm).toEqual(v3.norm);
    expect(v31.quelle).toEqual(v3.quelle);
    expect(v31.abschluss_regel).toEqual(v3.abschluss_regel);
    expect(v31.zaehleinheit).toEqual(v3.zaehleinheit);
  });

  it("die Rechtskraftregel traegt die historische Art.-132-BGG-Sicherung", () => {
    const v3 = fassung("3.0.0");
    const v31 = fassung("3.1.0");
    // Eigener Regeltyp: die Textregel und die ausfuehrbare Semantik sagen
    // dasselbe. v3.0.0 behaelt ihre Art unveraendert.
    expect(v3.rechtskraft_regel.art).toBe("bundesgericht_art61_bgg");
    expect(v31.rechtskraft_regel.art).toBe("bundesgericht_uebergangsrecht_art132_bgg");
    // Art. 132 BGG steht im dafuer vorgesehenen Feld, nicht nur in der Prosa.
    expect(v31.rechtskraft_regel.rechtsquelle).toContain("Art. 132 BGG");
    expect(v31.rechtskraft_regel.rechtsquelle).toContain("Art. 61 BGG");
    for (const anker of ["Art. 72 ff.", "Art. 74", "Art. 75", "Art. 90 ff.", "Art. 113 ff."]) {
      expect(v31.rechtskraft_regel.rechtsquelle).toContain(anker);
    }
    // Die v3.0.0-Begruendung bleibt vollstaendig erhalten und wird ergaenzt,
    // nicht ersetzt — aber sie ist nicht mehr wortgleich.
    expect(v31.rechtskraft_regel.begruendung).toContain(v3.rechtskraft_regel.begruendung);
    expect(v31.rechtskraft_regel.begruendung).not.toBe(v3.rechtskraft_regel.begruendung);
    expect(v31.rechtskraft_regel.begruendung).toContain("Art. 132 BGG");
    // Kein Rueckfall auf "im Zweifel gilt trotzdem Art. 61 BGG".
    expect(v31.rechtskraft_regel.begruendung).toContain("NICHT ersatzweise");
    expect(v31.rechtskraft_regel.begruendung).toContain("ungeklaert");
    // Das Entscheidjahr allein entscheidet nie ueber das Verfahrensrecht.
    expect(v31.rechtskraft_regel.begruendung).toContain("Entscheidjahr");
  });

  it("alle drei Pruefstaende sind fachlich bestaetigt", () => {
    // Die Rechtskraftregel ist mit der Eigentuemerfreigabe vom 2026-08-10
    // bestaetigt; Norm und Abschlussregel waren es schon und sind gegenueber
    // 3.0.0 unveraendert.
    expect(fassung("3.1.0").rechtskraft_regel.pruefstand).toBe("fachlich_bestaetigt");
    expect(fassung("3.1.0").norm.pruefstand).toBe("fachlich_bestaetigt");
    expect(fassung("3.1.0").abschluss_regel.pruefstand).toBe("fachlich_bestaetigt");
  });

  it("die Selektionsneutralitaet nennt das Fenster und seinen prozessrechtlichen Grund", () => {
    const text = fassung("3.1.0").selektionsneutralitaet ?? "";
    expect(text).toContain("2011-01-01 bis 2014-12-31");
    expect(text).toContain("2026-08-10");
    // Kein stehengebliebener 2026-Text aus der Vorfassung.
    expect(text).not.toContain("2026-01-01 bis 2026-07-31 wurde vor jedem Abruf");
    expect(text).toContain("ML-002");
  });

  it("die ausfuehrbare Semantik folgt der Textregel: 3.0.0 leitet ab, 3.1.0 nicht", () => {
    // Der eigentliche Punkt dieser Fassung. Unter v3.0.0 traegt die
    // Bundesgerichtssignatur die Aussage; unter dem historischen
    // Uebergangstyp gerade nicht — sonst wuerde die Maschine die Pruefung
    // ueberspringen, die die Definition im Text verlangt.
    for (const signatur of ["CH_BGer", "CH_BGE"]) {
      expect(rechtskraftAusInstanz(fassung("3.0.0"), signatur)).toBe(true);
      expect(rechtskraftAusInstanz(fassung("3.1.0"), signatur)).toBe(false);
    }
    // Keine rueckwirkende Semantikaenderung: auch die Legacy-Fassung bleibt.
    expect(rechtskraftAusInstanz(fassung("2.0.0"), "CH_BGer")).toBe(true);
    // Kantonale Signaturen bleiben unter beiden Regeln aussen vor.
    expect(rechtskraftAusInstanz(fassung("3.0.0"), "ZH_OG")).toBe(false);
    expect(rechtskraftAusInstanz(fassung("3.1.0"), "ZH_OG")).toBe(false);
  });

  it("auf Definitionsebene ist die Quote freigegeben — mehr sagt das nicht", () => {
    // Eingefroren und dreifach bestaetigt: die Definition sperrt nicht mehr.
    // Das heisst NICHT, dass ein Lauf eine Quote bekaeme — es gibt keinen,
    // und ein kuenftiger traegt seine eigenen Sperren (Vollstaendigkeit,
    // Abschluss, Normausgang je Treffer, Mindestfallzahl).
    expect(darfQuoteMaterialisieren(fassung("3.1.0"))).toEqual({ ok: true, fehler: [] });
  });

  it("die bestehenden Laeufe bleiben an ihren eigenen Fassungen — ML-003 ist der rohe v3.1.0-Lauf", () => {
    const ml1 = leseJson(messkorpusPfad("laeufe", "ML-001", "lauf.json")) as Messlauf;
    const ml2 = leseJson(messkorpusPfad("laeufe", "ML-002", "lauf.json")) as Messlauf;
    const ml3 = leseJson(messkorpusPfad("laeufe", "ML-003", "lauf.json")) as Messlauf;

    expect(ml1.messdefinition.version).toBe("2.0.0");
    expect(ml2.messdefinition.version).toBe("3.0.0");
    expect(ml3.messdefinition.version).toBe("3.1.0");
    expect(ml3.messdefinition.sha256).toBe(V31_FREEZE_HASH);

    expect(findeFassung(register, ml1.messdefinition).art).toBe("gefunden");
    expect(findeFassung(register, ml2.messdefinition).art).toBe("gefunden");
    expect(findeFassung(register, ml3.messdefinition).art).toBe("gefunden");

    const vorhandene = leseLaeufe()
      .map((l) => (l.inhalt as Messlauf).id)
      .sort();
    expect(vorhandene).toEqual(["ML-001", "ML-002", "ML-003"]);

    expect(ml3.roh_treffer).toBe(129);
    expect(ml3.treffer).toHaveLength(129);
    expect(ml3.abrufe).toHaveLength(48);
    expect(ml3.duplikate).toBe(0);
    expect(ml3.gekappt).toBe(false);
    expect(ml3.abrufe.every((a) =>
      a.gemeldet_relation === "eq" &&
      a.empfangen === a.gemeldet_total &&
      a.ohne_id === 0
    )).toBe(true);
    expect(
      ml3.abrufe.reduce((summe, a) => summe + a.nach_gerichtsfilter, 0) - ml3.duplikate,
    ).toBe(129);

    const klassifikationsfelder = [
      "ausschlussgrund",
      "zaehleinheit",
      "abschluss_status",
      "erledigungsweg",
      "messausgang",
      "verfahrensrecht_nachweis",
    ];
    expect(ml3.treffer.every((t) => t.status === "ungeklaert")).toBe(true);
    expect(ml3.treffer.every((t) => /^[a-f0-9]{64}$/.test(t.metadaten_fingerprint))).toBe(true);
    expect(
      ml3.treffer.every((t) =>
        klassifikationsfelder.every(
          (feld) => !Object.prototype.hasOwnProperty.call(t as unknown as Record<string, unknown>, feld),
        ),
      ),
    ).toBe(true);
  });
});

// MD-001 v3.1.0 — historische Replikation 2011-2014 (ENTWURF).
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
// Der Entwurf traegt keine Quote und ist nicht eingefroren.

import { describe, expect, it } from "vitest";
import {
  darfQuoteMaterialisieren,
  definitionsHash,
  findeFassung,
  rechtskraftAusInstanz,
  sammleFassungen,
  type Messdefinition,
} from "../tools/definition.ts";
import { leseDefinitionen, leseJson, leseLaeufe, messkorpusPfad } from "../tools/umgebung.ts";
import type { Messlauf } from "../tools/lauf.ts";

const register = sammleFassungen(
  leseDefinitionen().map((d) => ({ datei: d.datei, inhalt: d.inhalt as Messdefinition })),
);

function fassung(version: string): Messdefinition {
  const auflösung = findeFassung(register, { id: "MD-001", version });
  expect(auflösung.art).toBe("gefunden");
  return (auflösung as { definition: Messdefinition }).definition;
}

describe("MD-001 v3.1.0 — historisches Fenster als Entwurf", () => {
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

  it("3.1.0 ist ein Entwurf im Endwirkungsmodell mit dem Fenster 2011-2014", () => {
    const v31 = fassung("3.1.0");
    expect(v31.status).toBe("entwurf");
    expect(v31.auswertungsmodell).toBe("endwirkung");
    expect(v31.zeitraum).toEqual({ von: "2011-01-01", bis: "2014-12-31" });
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

  it("die neue Rechtskraftregel ist ausdruecklich noch nicht fachlich bestaetigt", () => {
    expect(fassung("3.1.0").rechtskraft_regel.pruefstand).toBe("fachlich_zu_verifizieren");
    // Die Norm selbst ist gegenueber 3.0.0 unveraendert und bleibt bestaetigt.
    expect(fassung("3.1.0").norm.pruefstand).toBe("fachlich_bestaetigt");
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

  it("aus dem Entwurf entsteht keine Quote — Status und Pruefstand sperren doppelt", () => {
    const befund = darfQuoteMaterialisieren(fassung("3.1.0"));
    expect(befund.ok).toBe(false);
    expect(befund.fehler.join(" ")).toContain("entwurf");
    expect(befund.fehler.join(" ")).toContain("rechtskraft_regel.pruefstand");
  });

  it("die bestehenden Laeufe bleiben an ihren eigenen Fassungen — kein ML-003", () => {
    const ml1 = leseJson(messkorpusPfad("laeufe", "ML-001", "lauf.json")) as Messlauf;
    const ml2 = leseJson(messkorpusPfad("laeufe", "ML-002", "lauf.json")) as Messlauf;
    expect(ml1.messdefinition.version).toBe("2.0.0");
    expect(ml2.messdefinition.version).toBe("3.0.0");
    expect(findeFassung(register, ml1.messdefinition).art).toBe("gefunden");
    expect(findeFassung(register, ml2.messdefinition).art).toBe("gefunden");
    // Zur neuen Fassung gehoert noch kein einziger Lauf: das Verzeichnis
    // selbst wird gelesen, nicht eine Liste erwarteter Namen.
    const vorhandene = leseLaeufe()
      .map((l) => (l.inhalt as Messlauf).id)
      .sort();
    expect(vorhandene).toEqual(["ML-001", "ML-002"]);
    expect(vorhandene).not.toContain("ML-003");
    expect(leseLaeufe().some((l) => (l.inhalt as Messlauf).messdefinition.version === "3.1.0")).toBe(false);
  });
});

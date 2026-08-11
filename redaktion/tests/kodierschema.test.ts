// Tests des gemeinsamen Antwortschemas (kodierschema.ts).
//
// Geprueft wird eine Antwort immer FUER SICH gegen die Definition — wer sie
// gegeben hat, aendert daran nichts. Beide Kodierer laufen durch dieselbe
// Funktion mit demselben Kontext; faellt eine Antwort durch, wird sie
// zurueckgewiesen und nicht stillschweigend verglichen.
//
// Verglichen wird hier nichts. Der A/B-Abgleich ist ein eigener Schritt.

import { describe, expect, it } from "vitest";
import {
  KODIERSCHEMA_ID,
  KLASSIFIKATIONSFELDER,
  FREITEXTFELDER,
  ZAEHLEINHEIT_REGEL,
  antwortschema,
  istKalenderdatum,
  pruefeKodierartefakt,
  pruefeZaehleinheiten,
  type Kodiereintrag,
  type KodierKontext,
} from "../src/kodierschema.js";

const IDS = ["CH_BGer_004_4A-1-2011", "CH_BGer_004_4A-2-2011", "CH_BGer_004_4A-3-2011"] as const;

const KONTEXT: KodierKontext = {
  messlauf: "ML-003",
  datenstand: "2026-08-10",
  messdefinition: { id: "MD-001", version: "3.1.0", sha256: "c".repeat(64) },
  kodierstoff_sha256: "a".repeat(64),
  quelle_ids: IDS,
  ausschlussgruende: [
    "andere_rechtsfrage",
    "nur_erstreckung",
    "kein_mietverhaeltnis",
    "nur_prozessuale_nebenfrage",
    "text_nicht_zugaenglich",
  ],
  verlangt_verfahrensrecht_nachweis: true,
};

/* ---------- Vier gueltige Formen, eine je Zustand ---------- */

const AUSGESCHLOSSEN: Kodiereintrag = {
  quelle_id: IDS[0],
  status: "ausgeschlossen",
  begruendung: "Streitig ist allein die Erstreckung nach Art. 272 OR.",
  ausschlussgrund: "nur_erstreckung",
};

const UNGEKLAERT: Kodiereintrag = {
  quelle_id: IDS[1],
  status: "ungeklaert",
  begruendung: "Der Endzustand der angefochtenen Kuendigung bleibt offen.",
  offene_frage: "Ob der kantonale Folgeentscheid die Kuendigung endgueltig beseitigt hat.",
};

const EINGESCHLOSSEN_ABGESCHLOSSEN: Kodiereintrag = {
  quelle_id: IDS[2],
  status: "eingeschlossen",
  begruendung: "Anfechtung einer konkreten Kuendigung unter Berufung auf Art. 271a OR.",
  zaehleinheit: IDS[2],
  abschluss_status: "abgeschlossen",
  erledigungsweg: {
    modus: "materiell_entschieden",
    prozessgrund: null,
    beleg: "E. 3.4: Die Kuendigung wird aufgehoben.",
    stand_datum: "2011-06-14",
    quelle: IDS[2],
  },
  messausgang: {
    wert: "durchgesetzt",
    beleg: "Dispositiv Ziff. 1.",
    quelle: IDS[2],
  },
  verfahrensrecht_nachweis: {
    regime: "bgg",
    beleg: "Der angefochtene Entscheid erging am 3. Maerz 2011, also nach Inkrafttreten des BGG.",
    quelle: IDS[2],
  },
};

const EINGESCHLOSSEN_RUECKWEISUNG: Kodiereintrag = {
  quelle_id: IDS[2],
  status: "eingeschlossen",
  begruendung: "Anfechtung einer konkreten Kuendigung; die Sache wird zurueckgewiesen.",
  zaehleinheit: IDS[2],
  abschluss_status: "rueckweisung_offen",
  erledigungsweg: {
    modus: "rueckweisung_offen",
    prozessgrund: null,
    beleg: "E. 5: Rueckweisung an die Vorinstanz zur neuen Beurteilung.",
    stand_datum: "2011-06-14",
    quelle: IDS[2],
  },
  messausgang: {
    wert: "offen",
    beleg: "Dispositiv Ziff. 1: Die Sache wird zurueckgewiesen.",
    quelle: IDS[2],
  },
};

function artefakt(eintraege: unknown[], kopf: Record<string, unknown> = {}): unknown {
  return {
    schema: KODIERSCHEMA_ID,
    kodierer: { rolle: "A", modell: "irgendein Modell" },
    messlauf: KONTEXT.messlauf,
    messdefinition: KONTEXT.messdefinition,
    kodierstoff_sha256: KONTEXT.kodierstoff_sha256,
    eintraege,
    ...kopf,
  };
}

/** Alle drei Bezeichner abdecken, mit dem geprueften Eintrag an dritter Stelle. */
function volleAntwort(dritter: Kodiereintrag): unknown {
  return artefakt([AUSGESCHLOSSEN, UNGEKLAERT, { ...dritter, quelle_id: IDS[2] }]);
}

describe("das Schema ist fuer beide Kodierer dasselbe", () => {
  it("kennt nur Feldnamen ohne Rollenzusatz", () => {
    const felder = [...KLASSIFIKATIONSFELDER, ...FREITEXTFELDER];
    for (const feld of felder) {
      expect(feld, `Feldname ${feld} traegt eine Rolle`).not.toMatch(/_(a|b)\d*$/i);
    }
    // Die ML-002-Artefakte fuehrten status_a bzw. status_b. Genau das ist hier
    // ausgeschlossen: der Zustand heisst in beiden Antworten "status".
    expect(felder).toContain("status");
    expect(felder).not.toContain("status_a");
    expect(felder).not.toContain("status_b");
  });

  it("haelt Klassifikation und Freitext auseinander", () => {
    for (const feld of KLASSIFIKATIONSFELDER) expect(FREITEXTFELDER).not.toContain(feld);
    expect(KLASSIFIKATIONSFELDER).toContain("messausgang.wert");
    expect(FREITEXTFELDER).toContain("messausgang.beleg");
  });

  it("nennt Rolle und Modell nur im Kopf des Artefakts", () => {
    const schema = antwortschema() as { eintrag: Record<string, unknown>; kopf: Record<string, unknown> };
    expect(Object.keys(schema.eintrag)).not.toContain("kodierer");
    expect(Object.keys(schema.eintrag)).not.toContain("rolle");
    expect(Object.keys(schema.eintrag)).not.toContain("modell");
    expect(Object.keys(schema.kopf)).toContain("kodierer");
  });

  it("prueft beide Rollen mit derselben Funktion und demselben Ergebnis", () => {
    const a = pruefeKodierartefakt(volleAntwort(EINGESCHLOSSEN_ABGESCHLOSSEN), KONTEXT);
    const b = pruefeKodierartefakt(
      artefakt([AUSGESCHLOSSEN, UNGEKLAERT, EINGESCHLOSSEN_ABGESCHLOSSEN], {
        kodierer: { rolle: "B", modell: "ein anderes Modell" },
      }),
      KONTEXT,
    );
    expect(a).toEqual([]);
    expect(b).toEqual([]);
  });
});

describe("gueltige Antworten", () => {
  it("nimmt ausgeschlossen, ungeklaert und eingeschlossen+abgeschlossen+bgg an", () => {
    expect(pruefeKodierartefakt(volleAntwort(EINGESCHLOSSEN_ABGESCHLOSSEN), KONTEXT)).toEqual([]);
  });

  it("nimmt eingeschlossen+rueckweisung_offen an — ohne Verfahrensrechtsnachweis", () => {
    // Die Pflicht trifft nur den abgeschlossenen Treffer: er behauptet einen
    // endgueltigen Rechtszustand.
    expect(pruefeKodierartefakt(volleAntwort(EINGESCHLOSSEN_RUECKWEISUNG), KONTEXT)).toEqual([]);
  });

  it("nimmt prozessuale Erledigung mit Prozessgrund an", () => {
    const prozessual: Kodiereintrag = {
      ...EINGESCHLOSSEN_ABGESCHLOSSEN,
      erledigungsweg: {
        modus: "prozessual_erledigt",
        prozessgrund: "anfechtungsfrist_verwirkt",
        beleg: "E. 2: Die Anfechtungsfrist war verwirkt.",
        stand_datum: "2011-06-14",
        quelle: IDS[2],
      },
      messausgang: { wert: "nicht_durchgesetzt", beleg: "Dispositiv Ziff. 1.", quelle: IDS[2] },
    };
    expect(pruefeKodierartefakt(volleAntwort(prozessual), KONTEXT)).toEqual([]);
  });
});

describe("unzulaessige Kombinationen", () => {
  function fehlerBei(eintrag: object): string[] {
    return pruefeKodierartefakt(artefakt([AUSGESCHLOSSEN, UNGEKLAERT, { ...eintrag, quelle_id: IDS[2] }]), KONTEXT);
  }

  it("weist abgeschlossen ohne Verfahrensrechtsnachweis zurueck", () => {
    const { verfahrensrecht_nachweis: _weg, ...ohne } = EINGESCHLOSSEN_ABGESCHLOSSEN;
    expect(fehlerBei(ohne).join(" ")).toMatch(/ohne verfahrensrecht_nachweis/);
  });

  it("weist abgeschlossen mit regime og zurueck", () => {
    expect(
      fehlerBei({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        verfahrensrecht_nachweis: { regime: "og", beleg: "Der angefochtene Entscheid erging 2006.", quelle: IDS[2] },
      }).join(" "),
    ).toMatch(/statt "bgg"/);
  });

  it("weist abgeschlossen mit regime ungeklaert zurueck", () => {
    expect(
      fehlerBei({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        verfahrensrecht_nachweis: { regime: "ungeklaert", beleg: "Der Text sagt es nicht.", quelle: IDS[2] },
      }).join(" "),
    ).toMatch(/statt "bgg"/);
  });

  it("weist einen Nachweis ohne Beleg zurueck", () => {
    expect(
      fehlerBei({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        verfahrensrecht_nachweis: { regime: "bgg", beleg: "   ", quelle: IDS[2] },
      }).join(" "),
    ).toMatch(/verfahrensrecht_nachweis.beleg fehlt/);
  });

  it("weist rueckweisung_offen mit abschluss_status abgeschlossen zurueck", () => {
    expect(
      fehlerBei({ ...EINGESCHLOSSEN_RUECKWEISUNG, abschluss_status: "abgeschlossen" }).join(" "),
    ).toMatch(/Eine Rueckweisung laesst die gemessene Rechtsfrage offen/);
  });

  it("weist abgeschlossen mit messausgang offen zurueck", () => {
    expect(
      fehlerBei({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        messausgang: { wert: "offen", beleg: "unklar", quelle: IDS[2] },
      }).join(" "),
    ).toMatch(/keine Erledigung|nicht abgeschlossen/);
  });

  it("weist materiell_entschieden mit Prozessgrund zurueck", () => {
    expect(
      fehlerBei({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        erledigungsweg: { ...EINGESCHLOSSEN_ABGESCHLOSSEN.erledigungsweg!, prozessgrund: "instanzverwirkung" },
      }).join(" "),
    ).toMatch(/gehoert ausschliesslich zu "prozessual_erledigt"/);
  });

  it("weist prozessual_erledigt ohne Prozessgrund zurueck", () => {
    expect(
      fehlerBei({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        erledigungsweg: {
          ...EINGESCHLOSSEN_ABGESCHLOSSEN.erledigungsweg!,
          modus: "prozessual_erledigt",
          prozessgrund: null,
        },
      }).join(" "),
    ).toMatch(/verlangt einen prozessgrund/);
  });

  it("weist einen fehlenden Schluessel prozessgrund zurueck", () => {
    // Ein fehlendes Feld und ein ausdrueckliches null sind verschiedene
    // Aussagen: "nicht beantwortet" und "es gibt keinen Prozessgrund".
    const { prozessgrund: _grund, ...weg } = EINGESCHLOSSEN_ABGESCHLOSSEN.erledigungsweg!;
    expect(fehlerBei({ ...EINGESCHLOSSEN_ABGESCHLOSSEN, erledigungsweg: weg }).join(" ")).toMatch(
      /prozessgrund fehlt/,
    );
  });

  it("weist ein stand_datum nach dem Datenstand zurueck", () => {
    expect(
      fehlerBei({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        erledigungsweg: { ...EINGESCHLOSSEN_ABGESCHLOSSEN.erledigungsweg!, stand_datum: "2026-12-01" },
      }).join(" "),
    ).toMatch(/liegt nach dem Datenstand/);
  });

  it("weist ein Datum zurueck, das es nicht gibt", () => {
    expect(
      fehlerBei({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        erledigungsweg: { ...EINGESCHLOSSEN_ABGESCHLOSSEN.erledigungsweg!, stand_datum: "2011-02-30" },
      }).join(" "),
    ).toMatch(/kein gueltiges Kalenderdatum/);
  });

  it("weist den Messausgang teilweise zurueck", () => {
    expect(
      fehlerBei({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        messausgang: { wert: "teilweise", beleg: "Dispositiv.", quelle: IDS[2] },
      }).join(" "),
    ).toMatch(/"teilweise" nicht definiert/);
  });

  it("weist einen unbekannten Ausschlussgrund zurueck", () => {
    expect(
      pruefeKodierartefakt(
        artefakt([{ ...AUSGESCHLOSSEN, ausschlussgrund: "passt_mir_nicht" }, UNGEKLAERT, EINGESCHLOSSEN_ABGESCHLOSSEN]),
        KONTEXT,
      ).join(" "),
    ).toMatch(/keiner der deklarierten Codes/);
  });

  it("weist Einschlussfelder bei ungeklaert zurueck", () => {
    // Bei ungeklaert wird nichts erfunden (CR-03 Auflage E2 Ziff. 6).
    expect(
      pruefeKodierartefakt(
        artefakt([
          AUSGESCHLOSSEN,
          { ...UNGEKLAERT, messausgang: { wert: "offen", beleg: "x", quelle: "y" } },
          EINGESCHLOSSEN_ABGESCHLOSSEN,
        ]),
        KONTEXT,
      ).join(" "),
    ).toMatch(/messausgang bei status "ungeklaert"/);
  });

  it("weist ungeklaert ohne offene Frage zurueck", () => {
    const { offene_frage: _frage, ...ohne } = UNGEKLAERT;
    expect(
      pruefeKodierartefakt(artefakt([AUSGESCHLOSSEN, ohne, EINGESCHLOSSEN_ABGESCHLOSSEN]), KONTEXT).join(" "),
    ).toMatch(/offene_frage fehlt/);
  });

  it("weist eingeschlossen ohne Zaehleinheit zurueck", () => {
    const { zaehleinheit: _einheit, ...ohne } = EINGESCHLOSSEN_ABGESCHLOSSEN;
    expect(fehlerBei(ohne).join(" ")).toMatch(/zaehleinheit fehlt/);
  });

  it("weist eine Antwort ohne Begruendung zurueck", () => {
    expect(fehlerBei({ ...EINGESCHLOSSEN_ABGESCHLOSSEN, begruendung: "  " }).join(" ")).toMatch(/begruendung fehlt/);
  });
});

describe("Kopf und Deckung", () => {
  it("weist ein fremdes Schema zurueck", () => {
    expect(
      pruefeKodierartefakt(
        artefakt([AUSGESCHLOSSEN, UNGEKLAERT, EINGESCHLOSSEN_ABGESCHLOSSEN], { schema: "etwas.anderes.v1" }),
        KONTEXT,
      ).join(" "),
    ).toMatch(/schema ist/);
  });

  it("weist eine Antwort zurueck, die gegen anderen Stoff kodiert wurde", () => {
    expect(
      pruefeKodierartefakt(
        artefakt([AUSGESCHLOSSEN, UNGEKLAERT, EINGESCHLOSSEN_ABGESCHLOSSEN], { kodierstoff_sha256: "b".repeat(64) }),
        KONTEXT,
      ).join(" "),
    ).toMatch(/gegen anderen Stoff kodiert/);
  });

  it("verlangt Rolle und Modell im Kopf", () => {
    const ohne = pruefeKodierartefakt(
      artefakt([AUSGESCHLOSSEN, UNGEKLAERT, EINGESCHLOSSEN_ABGESCHLOSSEN], { kodierer: { rolle: "C", modell: "" } }),
      KONTEXT,
    ).join(" ");
    expect(ohne).toMatch(/kodierer.rolle/);
    expect(ohne).toMatch(/kodierer.modell/);
  });

  it("meldet fehlende und ueberzaehlige Bezeichner", () => {
    const zuwenig = pruefeKodierartefakt(artefakt([AUSGESCHLOSSEN]), KONTEXT).join(" ");
    expect(zuwenig).toMatch(/2 Bezeichner des Pakets fehlen/);

    const zuviel = pruefeKodierartefakt(
      artefakt([
        AUSGESCHLOSSEN,
        UNGEKLAERT,
        EINGESCHLOSSEN_ABGESCHLOSSEN,
        { ...UNGEKLAERT, quelle_id: "CH_BGer_004_4A-99-2011" },
      ]),
      KONTEXT,
    ).join(" ");
    expect(zuviel).toMatch(/stehen in der Antwort, aber nicht im Paket/);
  });

  it("meldet einen doppelten Bezeichner", () => {
    expect(
      pruefeKodierartefakt(
        artefakt([AUSGESCHLOSSEN, AUSGESCHLOSSEN, UNGEKLAERT, EINGESCHLOSSEN_ABGESCHLOSSEN]),
        KONTEXT,
      ).join(" "),
    ).toMatch(/kommt mehrfach vor/);
  });
});

describe("die kanonische Zaehleinheit-Regel", () => {
  it("steht als Regel ueber quelle_id, nicht ueber Aktenzeichen", () => {
    expect(ZAEHLEINHEIT_REGEL).toMatch(/lexikographisch kleinste quelle_id/);
    expect(ZAEHLEINHEIT_REGEL).toMatch(/Nur Roh-Treffer dieses Laufs bestimmen den Bezeichner/);
    expect(ZAEHLEINHEIT_REGEL).not.toMatch(/Aktenzeichen des Bundesgerichts/);
  });

  it("nimmt den einzelnen Treffer mit seiner eigenen quelle_id an", () => {
    expect(pruefeZaehleinheiten([{ quelle_id: IDS[0], status: "x", begruendung: "y", zaehleinheit: IDS[0] }], IDS))
      .toEqual([]);
  });

  it("nimmt zwei Treffer derselben Streitigkeit unter der kleinsten quelle_id an", () => {
    const eintraege: Kodiereintrag[] = [
      { quelle_id: IDS[1], status: "x", begruendung: "y", zaehleinheit: IDS[1] },
      { quelle_id: IDS[2], status: "x", begruendung: "y", zaehleinheit: IDS[1] },
    ];
    expect(pruefeZaehleinheiten(eintraege, IDS)).toEqual([]);
  });

  it("weist die groessere quelle_id als Bezeichner zurueck", () => {
    const eintraege: Kodiereintrag[] = [
      { quelle_id: IDS[1], status: "x", begruendung: "y", zaehleinheit: IDS[2] },
      { quelle_id: IDS[2], status: "x", begruendung: "y", zaehleinheit: IDS[2] },
    ];
    expect(pruefeZaehleinheiten(eintraege, IDS).join(" ")).toMatch(/ist groesser als die kleinste/);
  });

  it("laesst einen kleineren Bezeichner zu, dessen Treffer selbst nicht eingeschlossen ist", () => {
    // Die kleinste quelle_id der Streitigkeit kann ausgeschlossen oder
    // ungeklaert sein und traegt dann gar keine zaehleinheit. Die Regel meint
    // ALLE Roh-Treffer der Streitigkeit, nicht nur die eingeschlossenen.
    const eintraege: Kodiereintrag[] = [
      { quelle_id: IDS[2], status: "x", begruendung: "y", zaehleinheit: IDS[0] },
    ];
    expect(pruefeZaehleinheiten(eintraege, IDS)).toEqual([]);
  });

  it("weist einen Bezeichner ausserhalb der Rohpopulation zurueck", () => {
    // Ein nach CR-03 E2 zulaessiger Folgeentscheid belegt den Endzustand,
    // benennt die Streitigkeit aber nicht.
    const eintraege: Kodiereintrag[] = [
      { quelle_id: IDS[0], status: "x", begruendung: "y", zaehleinheit: "CH_Kanton_ZH_2013_folgeentscheid" },
    ];
    expect(pruefeZaehleinheiten(eintraege, IDS).join(" ")).toMatch(/keine quelle_id dieses Laufs/);
  });

  it("weist einen frei gewaehlten Namen zurueck", () => {
    const eintraege: Kodiereintrag[] = [
      { quelle_id: IDS[0], status: "x", begruendung: "y", zaehleinheit: "Streitigkeit 1" },
    ];
    expect(pruefeZaehleinheiten(eintraege, IDS).join(" ")).toMatch(/keine quelle_id dieses Laufs/);
  });

  it("greift auch im vollstaendigen Artefakt", () => {
    const falsch = pruefeKodierartefakt(
      artefakt([
        AUSGESCHLOSSEN,
        UNGEKLAERT,
        { ...EINGESCHLOSSEN_ABGESCHLOSSEN, zaehleinheit: "4A_281/2011" },
      ]),
      KONTEXT,
    ).join(" ");
    expect(falsch).toMatch(/keine quelle_id dieses Laufs/);
  });
});

describe("istKalenderdatum", () => {
  it("nimmt echte Tage an", () => {
    expect(istKalenderdatum("2011-01-01")).toBe(true);
    expect(istKalenderdatum("2012-02-29")).toBe(true);
  });

  it("weist Tage zurueck, die es nicht gibt", () => {
    expect(istKalenderdatum("2011-02-29")).toBe(false);
    expect(istKalenderdatum("2011-13-01")).toBe(false);
    expect(istKalenderdatum("2011-1-1")).toBe(false);
    expect(istKalenderdatum("")).toBe(false);
  });
});

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
  ARTEFAKT_SCHLUESSEL,
  BESETZUNG,
  EINTRAG_SCHLUESSEL,
  ERLEDIGUNGSWEG_SCHLUESSEL,
  FREITEXTFELDER,
  IDENTITAETSFELDER,
  KLASSIFIKATIONSFELDER,
  KODIERER_SCHLUESSEL,
  KODIERSCHEMA_ID,
  MESSAUSGANG_SCHLUESSEL,
  MESSDEFINITION_SCHLUESSEL,
  NACHWEIS_SCHLUESSEL,
  ZAEHLEINHEIT_REGEL,
  antwortschema,
  istKalenderdatum,
  pruefeKodierartefakt,
  pruefeZaehleinheiten,
  type Kodiereintrag,
  type KodierKontext,
  type TrefferIdentitaet,
} from "../src/kodierschema.js";

/* Der erste Bezeichner ist ein BGE-Publikationsauszug ohne Aktenzeichen —
   der Fall, den 13 der 129 ML-003-Treffer wirklich haben. */
const IDS = ["CH_BGE_001_BGE-137-I-167_2011", "CH_BGer_004_4A-2-2011", "CH_BGer_004_4A-3-2011"] as const;

const IDENTITAETEN: readonly TrefferIdentitaet[] = [
  { quelle_id: IDS[0], aktenzeichen: null, text_sha256: "1".repeat(64) },
  { quelle_id: IDS[1], aktenzeichen: "4A_2/2011", text_sha256: "2".repeat(64) },
  { quelle_id: IDS[2], aktenzeichen: "4A_3/2011", text_sha256: "3".repeat(64) },
];

/** Die Identitaetsfelder eines Treffers, so wie sie im Paket stehen. */
function ident(i: 0 | 1 | 2): TrefferIdentitaet {
  return { ...(IDENTITAETEN[i] as TrefferIdentitaet) };
}

const KONTEXT: KodierKontext = {
  messlauf: "ML-003",
  datenstand: "2026-08-10",
  messdefinition: { id: "MD-001", version: "3.1.0", sha256: "c".repeat(64) },
  kodierstoff_sha256: "a".repeat(64),
  identitaeten: IDENTITAETEN,
  ausschlussgruende: [
    "andere_rechtsfrage",
    "nur_erstreckung",
    "kein_mietverhaeltnis",
    "nur_prozessuale_nebenfrage",
    "text_nicht_zugaenglich",
  ],
  verlangt_verfahrensrecht_nachweis: true,
};

const BINDUNG = { messdefinition_id: "MD-001", messdefinition_version: "3.1.0" };

/* ---------- Vier gueltige Formen, eine je Zustand ---------- */

const AUSGESCHLOSSEN: Kodiereintrag = {
  ...ident(0),
  status: "ausgeschlossen",
  begruendung: "Streitig ist allein die Erstreckung nach Art. 272 OR.",
  ausschlussgrund: "nur_erstreckung",
};

const UNGEKLAERT: Kodiereintrag = {
  ...ident(1),
  status: "ungeklaert",
  begruendung: "Der Endzustand der angefochtenen Kuendigung bleibt offen.",
  offene_frage: "Ob der kantonale Folgeentscheid die Kuendigung endgueltig beseitigt hat.",
};

const EINGESCHLOSSEN_ABGESCHLOSSEN: Kodiereintrag = {
  ...ident(2),
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
    ...BINDUNG,
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
  ...ident(2),
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
    ...BINDUNG,
    wert: "offen",
    beleg: "Dispositiv Ziff. 1: Die Sache wird zurueckgewiesen.",
    quelle: IDS[2],
  },
};

function artefakt(eintraege: unknown[], kopf: Record<string, unknown> = {}): unknown {
  return {
    schema: KODIERSCHEMA_ID,
    kodierer: { rolle: "A", modell: BESETZUNG.A },
    messlauf: KONTEXT.messlauf,
    messdefinition: KONTEXT.messdefinition,
    kodierstoff_sha256: KONTEXT.kodierstoff_sha256,
    eintraege,
    ...kopf,
  };
}

/** Alle drei Bezeichner abdecken, mit dem geprueften Eintrag an dritter Stelle. */
function volleAntwort(dritter: object): unknown {
  return artefakt([AUSGESCHLOSSEN, UNGEKLAERT, dritter]);
}

/** Alle Meldungen zu einer Antwort, deren dritter Eintrag geprueft wird. */
function meldung(dritter: object): string {
  return pruefeKodierartefakt(volleAntwort(dritter), KONTEXT).join(" ");
}

describe("das Schema ist fuer beide Kodierer dasselbe", () => {
  it("kennt nur Feldnamen ohne Rollenzusatz", () => {
    const felder = [...IDENTITAETSFELDER, ...KLASSIFIKATIONSFELDER, ...FREITEXTFELDER];
    for (const feld of felder) {
      expect(feld, `Feldname ${feld} traegt eine Rolle`).not.toMatch(/_(a|b)\d*$/i);
    }
    // Die ML-002-Artefakte fuehrten status_a bzw. status_b. Genau das ist hier
    // ausgeschlossen: der Zustand heisst in beiden Antworten "status".
    expect(EINTRAG_SCHLUESSEL).toContain("status");
    expect(EINTRAG_SCHLUESSEL).not.toContain("status_a");
    expect(EINTRAG_SCHLUESSEL).not.toContain("status_b");
  });

  it("haelt Identitaet, Klassifikation und Freitext auseinander", () => {
    for (const feld of KLASSIFIKATIONSFELDER) expect(FREITEXTFELDER).not.toContain(feld);
    for (const feld of IDENTITAETSFELDER) {
      expect(KLASSIFIKATIONSFELDER, `${feld} ist keine Klassifikation`).not.toContain(feld);
      expect(FREITEXTFELDER, `${feld} ist kein Freitext`).not.toContain(feld);
    }
    expect(IDENTITAETSFELDER).toContain("text_sha256");
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

  it("beschreibt Ebene fuer Ebene genau die Schluessel, die es auch prueft", () => {
    // Waeren Beschreibung und Pruefung zwei Quellen, koennte das Verlangte vom
    // Geprueften abweichen — und der Kodierer truege die Folge.
    const schema = antwortschema() as {
      kopf: Record<string, unknown>;
      eintrag: Record<string, unknown>;
      erlaubte_schluessel: Record<string, readonly string[]>;
    };
    expect(Object.keys(schema.kopf).sort()).toEqual([...ARTEFAKT_SCHLUESSEL].sort());
    expect(Object.keys(schema.eintrag).sort()).toEqual([...EINTRAG_SCHLUESSEL].sort());
    expect(Object.keys(schema.eintrag.erledigungsweg as object).sort()).toEqual([...ERLEDIGUNGSWEG_SCHLUESSEL].sort());
    expect(Object.keys(schema.eintrag.messausgang as object).sort()).toEqual([...MESSAUSGANG_SCHLUESSEL].sort());
    expect(Object.keys(schema.eintrag.verfahrensrecht_nachweis as object).sort()).toEqual(
      [...NACHWEIS_SCHLUESSEL].sort(),
    );
    expect(Object.keys(schema.kopf.kodierer as object).sort()).toEqual([...KODIERER_SCHLUESSEL].sort());
    expect(schema.erlaubte_schluessel.artefakt).toEqual(ARTEFAKT_SCHLUESSEL);
    expect(schema.erlaubte_schluessel.eintrag).toEqual(EINTRAG_SCHLUESSEL);
    expect(schema.erlaubte_schluessel.messdefinition).toEqual(MESSDEFINITION_SCHLUESSEL);
  });

  it("prueft beide Rollen mit derselben inhaltlichen Kodierpruefung", () => {
    const eintraege = [AUSGESCHLOSSEN, UNGEKLAERT, EINGESCHLOSSEN_ABGESCHLOSSEN];
    const a = pruefeKodierartefakt(artefakt(eintraege), KONTEXT);
    const b = pruefeKodierartefakt(
      artefakt(eintraege, { kodierer: { rolle: "B", modell: BESETZUNG.B } }),
      KONTEXT,
    );
    expect(a).toEqual([]);
    expect(b).toEqual([]);

    // Und ein inhaltlicher Fehler faellt unter beiden Rollen gleich auf.
    const kaputt = [AUSGESCHLOSSEN, UNGEKLAERT, { ...EINGESCHLOSSEN_ABGESCHLOSSEN, begruendung: "  " }];
    expect(pruefeKodierartefakt(artefakt(kaputt), KONTEXT)).toEqual(
      pruefeKodierartefakt(artefakt(kaputt, { kodierer: { rolle: "B", modell: BESETZUNG.B } }), KONTEXT),
    );
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
      messausgang: { ...BINDUNG, wert: "nicht_durchgesetzt", beleg: "Dispositiv Ziff. 1.", quelle: IDS[2] },
    };
    expect(pruefeKodierartefakt(volleAntwort(prozessual), KONTEXT)).toEqual([]);
  });
});

describe("Identitaet und Provenienz je Eintrag", () => {
  it("uebernimmt aktenzeichen und text_sha256 unveraendert aus dem Paket", () => {
    expect(pruefeKodierartefakt(volleAntwort(EINGESCHLOSSEN_ABGESCHLOSSEN), KONTEXT)).toEqual([]);
    expect(EINGESCHLOSSEN_ABGESCHLOSSEN.aktenzeichen).toBe("4A_3/2011");
    expect(EINGESCHLOSSEN_ABGESCHLOSSEN.text_sha256).toBe("3".repeat(64));
  });

  it("weist einen falschen text_sha256 zurueck", () => {
    expect(meldung({ ...EINGESCHLOSSEN_ABGESCHLOSSEN, text_sha256: "f".repeat(64) })).toMatch(
      /text_sha256 ist "f{64}", das Paket nennt/,
    );
  });

  it("weist einen fehlenden text_sha256 zurueck", () => {
    const { text_sha256: _hash, ...ohne } = EINGESCHLOSSEN_ABGESCHLOSSEN;
    expect(meldung(ohne)).toMatch(/text_sha256 ist "undefined"/);
  });

  it("weist ein falsches aktenzeichen zurueck", () => {
    expect(meldung({ ...EINGESCHLOSSEN_ABGESCHLOSSEN, aktenzeichen: "4A_999/2011" })).toMatch(
      /aktenzeichen ist "4A_999\/2011", das Paket nennt "4A_3\/2011"/,
    );
  });

  it("nimmt null als kanonischen Wert, wo der Roh-Treffer kein Aktenzeichen traegt", () => {
    // Der BGE-Publikationsauszug: das Paket nennt null, die Antwort auch.
    expect(AUSGESCHLOSSEN.aktenzeichen).toBeNull();
    expect(pruefeKodierartefakt(volleAntwort(EINGESCHLOSSEN_ABGESCHLOSSEN), KONTEXT)).toEqual([]);
  });

  it("weist ein aus dem Volltext ergaenztes Aktenzeichen zurueck", () => {
    // Wo das Paket null nennt, wird nichts nachgetragen — das waere bereits
    // eine Auslegung des Entscheids, den zu beurteilen erst die Aufgabe ist.
    const erfunden = { ...AUSGESCHLOSSEN, aktenzeichen: "4A_137/2011" };
    expect(
      pruefeKodierartefakt(artefakt([erfunden, UNGEKLAERT, EINGESCHLOSSEN_ABGESCHLOSSEN]), KONTEXT).join(" "),
    ).toMatch(/aktenzeichen ist "4A_137\/2011", das Paket nennt null/);
  });

  it("weist einen fehlenden Schluessel aktenzeichen zurueck", () => {
    const { aktenzeichen: _az, ...ohne } = AUSGESCHLOSSEN;
    expect(
      pruefeKodierartefakt(artefakt([ohne, UNGEKLAERT, EINGESCHLOSSEN_ABGESCHLOSSEN]), KONTEXT).join(" "),
    ).toMatch(/aktenzeichen fehlt/);
  });
});

describe("Bindung des Messausgangs an die Fassung", () => {
  it("weist eine andere messdefinition_id zurueck", () => {
    expect(
      meldung({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        messausgang: { ...EINGESCHLOSSEN_ABGESCHLOSSEN.messausgang!, messdefinition_id: "MD-002" },
      }),
    ).toMatch(/messdefinition_id ist "MD-002", der Lauf gehoert zu "MD-001"/);
  });

  it("weist eine andere messdefinition_version zurueck", () => {
    expect(
      meldung({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        messausgang: { ...EINGESCHLOSSEN_ABGESCHLOSSEN.messausgang!, messdefinition_version: "3.0.0" },
      }),
    ).toMatch(/messdefinition_version ist "3.0.0", kodiert wird gegen "3.1.0"/);
  });

  it("weist einen Messausgang ohne Fassungsangabe zurueck", () => {
    const { messdefinition_id: _id, messdefinition_version: _v, ...ohne } = EINGESCHLOSSEN_ABGESCHLOSSEN.messausgang!;
    expect(meldung({ ...EINGESCHLOSSEN_ABGESCHLOSSEN, messausgang: ohne })).toMatch(/messdefinition_id ist "undefined"/);
  });
});

describe("das Schema ist geschlossen", () => {
  it("weist einen unbekannten Schluessel im Artefakt zurueck", () => {
    expect(
      pruefeKodierartefakt(
        artefakt([AUSGESCHLOSSEN, UNGEKLAERT, EINGESCHLOSSEN_ABGESCHLOSSEN], { eigene_zusammenfassung: "…" }),
        KONTEXT,
      ).join(" "),
    ).toMatch(/Artefakt: unbekannte Schluessel "eigene_zusammenfassung"/);
  });

  it("weist einen unbekannten Schluessel in einem Eintrag zurueck", () => {
    expect(meldung({ ...EINGESCHLOSSEN_ABGESCHLOSSEN, eigene_sonderwertung: "eigentlich klar" })).toMatch(
      /unbekannte Schluessel "eigene_sonderwertung"/,
    );
  });

  it("weist einen unbekannten Schluessel im erledigungsweg zurueck", () => {
    expect(
      meldung({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        erledigungsweg: { ...EINGESCHLOSSEN_ABGESCHLOSSEN.erledigungsweg!, konfidenz: 0.8 },
      }),
    ).toMatch(/erledigungsweg: unbekannte Schluessel "konfidenz"/);
  });

  it("weist einen unbekannten Schluessel im messausgang zurueck", () => {
    expect(
      meldung({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        messausgang: { ...EINGESCHLOSSEN_ABGESCHLOSSEN.messausgang!, tendenz: "eher ja" },
      }),
    ).toMatch(/messausgang: unbekannte Schluessel "tendenz"/);
  });

  it("weist einen unbekannten Schluessel im verfahrensrecht_nachweis zurueck", () => {
    expect(
      meldung({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        verfahrensrecht_nachweis: {
          ...EINGESCHLOSSEN_ABGESCHLOSSEN.verfahrensrecht_nachweis!,
          anmerkung_des_modells: "…",
        },
      }),
    ).toMatch(/verfahrensrecht_nachweis: unbekannte Schluessel "anmerkung_des_modells"/);
  });

  it("weist unbekannte Schluessel in kodierer und messdefinition zurueck", () => {
    const meldungen = pruefeKodierartefakt(
      artefakt([AUSGESCHLOSSEN, UNGEKLAERT, EINGESCHLOSSEN_ABGESCHLOSSEN], {
        kodierer: { rolle: "A", modell: BESETZUNG.A, temperatur: 0 },
        messdefinition: { ...KONTEXT.messdefinition, datei: "irgendwas.json" },
      }),
      KONTEXT,
    ).join(" ");
    expect(meldungen).toMatch(/kodierer: unbekannte Schluessel "temperatur"/);
    expect(meldungen).toMatch(/messdefinition: unbekannte Schluessel "datei"/);
  });
});

describe("die festgeschriebene Besetzung", () => {
  it("nimmt A nur mit dem festgelegten Modell an", () => {
    expect(
      pruefeKodierartefakt(
        artefakt([AUSGESCHLOSSEN, UNGEKLAERT, EINGESCHLOSSEN_ABGESCHLOSSEN], {
          kodierer: { rolle: "A", modell: BESETZUNG.B },
        }),
        KONTEXT,
      ).join(" "),
    ).toMatch(/fuer Rolle A ist "GPT-5.6 Sol" festgeschrieben/);
  });

  it("nimmt B nur mit dem festgelegten Modell an", () => {
    expect(
      pruefeKodierartefakt(
        artefakt([AUSGESCHLOSSEN, UNGEKLAERT, EINGESCHLOSSEN_ABGESCHLOSSEN], {
          kodierer: { rolle: "B", modell: "irgendein anderes Modell" },
        }),
        KONTEXT,
      ).join(" "),
    ).toMatch(/fuer Rolle B ist "Claude Opus 5 \(claude-opus-5\)" festgeschrieben/);
  });

  it("weist eine unbekannte Rolle zurueck", () => {
    expect(
      pruefeKodierartefakt(
        artefakt([AUSGESCHLOSSEN, UNGEKLAERT, EINGESCHLOSSEN_ABGESCHLOSSEN], {
          kodierer: { rolle: "C", modell: BESETZUNG.A },
        }),
        KONTEXT,
      ).join(" "),
    ).toMatch(/kodierer.rolle ist "C"/);
  });

  it("nennt zwei verschiedene Modelle — MANIFEST v2.1 §5", () => {
    expect(BESETZUNG.A).not.toBe(BESETZUNG.B);
  });
});

describe("unzulaessige Kombinationen", () => {
  it("weist abgeschlossen ohne Verfahrensrechtsnachweis zurueck", () => {
    const { verfahrensrecht_nachweis: _weg, ...ohne } = EINGESCHLOSSEN_ABGESCHLOSSEN;
    expect(meldung(ohne)).toMatch(/ohne verfahrensrecht_nachweis/);
  });

  it("weist abgeschlossen mit regime og zurueck", () => {
    expect(
      meldung({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        verfahrensrecht_nachweis: { regime: "og", beleg: "Der angefochtene Entscheid erging 2006.", quelle: IDS[2] },
      }),
    ).toMatch(/statt "bgg"/);
  });

  it("weist abgeschlossen mit regime ungeklaert zurueck", () => {
    expect(
      meldung({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        verfahrensrecht_nachweis: { regime: "ungeklaert", beleg: "Der Text sagt es nicht.", quelle: IDS[2] },
      }),
    ).toMatch(/statt "bgg"/);
  });

  it("weist einen Nachweis ohne Beleg zurueck", () => {
    expect(
      meldung({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        verfahrensrecht_nachweis: { regime: "bgg", beleg: "   ", quelle: IDS[2] },
      }),
    ).toMatch(/verfahrensrecht_nachweis.beleg fehlt/);
  });

  it("weist rueckweisung_offen mit abschluss_status abgeschlossen zurueck", () => {
    expect(meldung({ ...EINGESCHLOSSEN_RUECKWEISUNG, abschluss_status: "abgeschlossen" })).toMatch(
      /Eine Rueckweisung laesst die gemessene Rechtsfrage offen/,
    );
  });

  it("weist abgeschlossen mit messausgang offen zurueck", () => {
    expect(
      meldung({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        messausgang: { ...BINDUNG, wert: "offen", beleg: "unklar", quelle: IDS[2] },
      }),
    ).toMatch(/keine Erledigung|nicht abgeschlossen/);
  });

  it("weist materiell_entschieden mit Prozessgrund zurueck", () => {
    expect(
      meldung({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        erledigungsweg: { ...EINGESCHLOSSEN_ABGESCHLOSSEN.erledigungsweg!, prozessgrund: "instanzverwirkung" },
      }),
    ).toMatch(/gehoert ausschliesslich zu "prozessual_erledigt"/);
  });

  it("weist prozessual_erledigt ohne Prozessgrund zurueck", () => {
    expect(
      meldung({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        erledigungsweg: {
          ...EINGESCHLOSSEN_ABGESCHLOSSEN.erledigungsweg!,
          modus: "prozessual_erledigt",
          prozessgrund: null,
        },
      }),
    ).toMatch(/verlangt einen prozessgrund/);
  });

  it("weist einen fehlenden Schluessel prozessgrund zurueck", () => {
    // Ein fehlendes Feld und ein ausdrueckliches null sind verschiedene
    // Aussagen: "nicht beantwortet" und "es gibt keinen Prozessgrund".
    const { prozessgrund: _grund, ...weg } = EINGESCHLOSSEN_ABGESCHLOSSEN.erledigungsweg!;
    expect(meldung({ ...EINGESCHLOSSEN_ABGESCHLOSSEN, erledigungsweg: weg })).toMatch(/prozessgrund fehlt/);
  });

  it("weist ein stand_datum nach dem Datenstand zurueck", () => {
    expect(
      meldung({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        erledigungsweg: { ...EINGESCHLOSSEN_ABGESCHLOSSEN.erledigungsweg!, stand_datum: "2026-12-01" },
      }),
    ).toMatch(/liegt nach dem Datenstand/);
  });

  it("weist ein Datum zurueck, das es nicht gibt", () => {
    expect(
      meldung({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        erledigungsweg: { ...EINGESCHLOSSEN_ABGESCHLOSSEN.erledigungsweg!, stand_datum: "2011-02-30" },
      }),
    ).toMatch(/kein gueltiges Kalenderdatum/);
  });

  it("weist den Messausgang teilweise zurueck", () => {
    expect(
      meldung({
        ...EINGESCHLOSSEN_ABGESCHLOSSEN,
        messausgang: { ...BINDUNG, wert: "teilweise", beleg: "Dispositiv.", quelle: IDS[2] },
      }),
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
          { ...UNGEKLAERT, messausgang: { ...BINDUNG, wert: "offen", beleg: "x", quelle: "y" } },
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
    expect(meldung(ohne)).toMatch(/zaehleinheit fehlt/);
  });

  it("weist eine Antwort ohne Begruendung zurueck", () => {
    expect(meldung({ ...EINGESCHLOSSEN_ABGESCHLOSSEN, begruendung: "  " })).toMatch(/begruendung fehlt/);
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

  it("verlangt den kodierer-Block", () => {
    expect(
      pruefeKodierartefakt(
        artefakt([AUSGESCHLOSSEN, UNGEKLAERT, EINGESCHLOSSEN_ABGESCHLOSSEN], { kodierer: null }),
        KONTEXT,
      ).join(" "),
    ).toMatch(/kodierer fehlt/);
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

  const alleIds = IDENTITAETEN.map((i) => i.quelle_id);

  it("nimmt den einzelnen Treffer mit seiner eigenen quelle_id an", () => {
    expect(pruefeZaehleinheiten([{ quelle_id: IDS[0], zaehleinheit: IDS[0] }], alleIds)).toEqual([]);
  });

  it("nimmt zwei Treffer derselben Streitigkeit unter der kleinsten quelle_id an", () => {
    expect(
      pruefeZaehleinheiten(
        [
          { quelle_id: IDS[1], zaehleinheit: IDS[1] },
          { quelle_id: IDS[2], zaehleinheit: IDS[1] },
        ],
        alleIds,
      ),
    ).toEqual([]);
  });

  it("weist die groessere quelle_id als Bezeichner zurueck", () => {
    expect(
      pruefeZaehleinheiten(
        [
          { quelle_id: IDS[1], zaehleinheit: IDS[2] },
          { quelle_id: IDS[2], zaehleinheit: IDS[2] },
        ],
        alleIds,
      ).join(" "),
    ).toMatch(/ist groesser als die kleinste/);
  });

  it("laesst einen kleineren Bezeichner zu, dessen Treffer selbst nicht eingeschlossen ist", () => {
    // Die kleinste quelle_id der Streitigkeit kann ausgeschlossen oder
    // ungeklaert sein und traegt dann gar keine zaehleinheit. Die Regel meint
    // ALLE Roh-Treffer der Streitigkeit, nicht nur die eingeschlossenen.
    expect(pruefeZaehleinheiten([{ quelle_id: IDS[2], zaehleinheit: IDS[0] }], alleIds)).toEqual([]);
  });

  it("weist einen Bezeichner ausserhalb der Rohpopulation zurueck", () => {
    // Ein nach CR-03 E2 zulaessiger Folgeentscheid belegt den Endzustand,
    // benennt die Streitigkeit aber nicht.
    expect(
      pruefeZaehleinheiten(
        [{ quelle_id: IDS[0], zaehleinheit: "CH_Kanton_ZH_2013_folgeentscheid" }],
        alleIds,
      ).join(" "),
    ).toMatch(/keine quelle_id dieses Laufs/);
  });

  it("weist einen frei gewaehlten Namen zurueck", () => {
    expect(
      pruefeZaehleinheiten([{ quelle_id: IDS[0], zaehleinheit: "Streitigkeit 1" }], alleIds).join(" "),
    ).toMatch(/keine quelle_id dieses Laufs/);
  });

  it("greift auch im vollstaendigen Artefakt", () => {
    expect(meldung({ ...EINGESCHLOSSEN_ABGESCHLOSSEN, zaehleinheit: "4A_281/2011" })).toMatch(
      /keine quelle_id dieses Laufs/,
    );
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

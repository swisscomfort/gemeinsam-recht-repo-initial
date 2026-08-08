/**
 * GENERIERT von wissen/tools/migrate.ts aus wissen/register/*.json —
 * NICHT von Hand aendern (AUFTRAG-W0 Teil B).
 *
 * Quelle der Wahrheit fuer Quellen und Regel-Metadaten ist das
 * Wissens-Register (wissen/register/). Aenderungen dort vornehmen und
 * anschliessend `cd wissen && npm run migrate` ausfuehren.
 * Die Register<->core-Konsistenz wird durch wissen/tests/ abgesichert.
 */
import type { IsoDate, Pruefstand, QuelleId } from "./types.js";

export interface RegisterQuelle {
  artikel: string;
  fundstelle: string;
}

export interface RegisterEintrag {
  id: string;
  regel: string;
  wenn: readonly string[];
  dann: readonly string[];
  quellen: readonly RegisterQuelle[];
  zeitstand: IsoDate;
  regelversion: string;
  pruefstand: Pruefstand;
  herkunft: "gesetz" | "entscheid" | "auftrag" | "fall_destillat" | "redaktion";
  fall_anker?: string;
  entscheid_quelle?: string;
  review?: { wer: string; wann: string };
}

/** Alle Register-Eintraege (nach id sortiert). */
export const REGISTER: readonly RegisterEintrag[] = [
  {
    "id": "R-CH-0001",
    "regel": "Die Kuendigung kann innert 30 Tagen nach Empfang bei der Schlichtungsbehoerde angefochten werden; nach Fristablauf gilt die Frist als abgelaufen.",
    "wenn": [
      "rechtsgebiet=mietrecht_kuendigung",
      "empfangsdatum_effektiv liegt vor"
    ],
    "dann": [
      "parameter:anfechtungsfrist_tage=30",
      "flag:frist_abgelaufen"
    ],
    "quellen": [
      {
        "artikel": "Art. 273 Abs. 1 OR",
        "fundstelle": "OR (SR 220)"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "fachlich_zu_verifizieren",
    "herkunft": "auftrag"
  },
  {
    "id": "R-CH-0002",
    "regel": "Der Empfangstag zaehlt nicht mit; die Frist laeuft ab dem Folgetag.",
    "wenn": [
      "eine Frist nach R-CH-0001 wird berechnet"
    ],
    "dann": [
      "folge:fristbeginn_am_folgetag"
    ],
    "quellen": [
      {
        "artikel": "Fristenrecht OR",
        "fundstelle": "OR (SR 220), allgemeines Fristenrecht"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "fachlich_zu_verifizieren",
    "herkunft": "auftrag"
  },
  {
    "id": "R-CH-0003",
    "regel": "Faellt das Fristende auf einen Samstag, Sonntag oder gesetzlichen Feiertag, verschiebt es sich auf den naechsten Werktag.",
    "wenn": [
      "ein berechnetes Fristende faellt auf Samstag, Sonntag oder Feiertag"
    ],
    "dann": [
      "folge:fristende_verschiebung_auf_naechsten_werktag"
    ],
    "quellen": [
      {
        "artikel": "Fristenrecht/ZPO",
        "fundstelle": "OR (SR 220) / ZPO (SR 272)"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "fachlich_zu_verifizieren",
    "herkunft": "auftrag"
  },
  {
    "id": "R-CH-0004",
    "regel": "Ein nicht abgeholtes Einschreiben gilt am Ende der 7-taegigen Abholfrist als zugestellt (Zustellfiktion).",
    "wenn": [
      "kuendigung.zustellart=einschreiben",
      "abholfrist_ende ist erfasst (nicht abgeholt)"
    ],
    "dann": [
      "parameter:abholfrist_tage=7",
      "folge:zustellfiktion_am_ende_der_abholfrist"
    ],
    "quellen": [
      {
        "artikel": "Zustellrecht",
        "fundstelle": "Zustellrecht (Zustellfiktion Einschreiben, 7-taegige Abholfrist)"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "fachlich_zu_verifizieren",
    "herkunft": "auftrag"
  },
  {
    "id": "R-CH-0005",
    "regel": "Eine Kuendigung ohne amtliches Formular oder ohne Unterschrift kann nichtig sein.",
    "wenn": [
      "kuendigung.amtliches_formular=false oder kuendigung.unterschrieben=false"
    ],
    "dann": [
      "flag:nichtig_formular_fehlt",
      "flag:nichtig_unterschrift_fehlt"
    ],
    "quellen": [
      {
        "artikel": "Art. 266l / 266o OR",
        "fundstelle": "OR (SR 220)"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "fachlich_zu_verifizieren",
    "herkunft": "auftrag"
  },
  {
    "id": "R-CH-0006",
    "regel": "Bei einer Familienwohnung muss die Kuendigung beiden Partnern separat zugestellt werden; sonst kann sie nichtig sein.",
    "wenn": [
      "wohnung.familienwohnung=true",
      "wohnung.separate_zustellung_beide=false"
    ],
    "dann": [
      "flag:nichtig_familienwohnung_zustellung"
    ],
    "quellen": [
      {
        "artikel": "Art. 266n / 266o OR",
        "fundstelle": "OR (SR 220)"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "fachlich_zu_verifizieren",
    "herkunft": "auftrag"
  },
  {
    "id": "R-CH-0007",
    "regel": "Wegen eines Verfahrens aus dem Mietverhaeltnis kann eine Sperrfrist bestehen; die Kuendigung kann anfechtbar sein.",
    "wenn": [
      "sperrfrist.verfahren_letzte_3_jahre=true oder sperrfrist.verfahren_haengig=true (haengiges Verfahren: offene fachliche Frage, siehe core/src/regeln.ts)"
    ],
    "dann": [
      "flag:sperrfrist_271a_moeglich"
    ],
    "quellen": [
      {
        "artikel": "Art. 271a OR",
        "fundstelle": "OR (SR 220)"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "fachlich_zu_verifizieren",
    "herkunft": "auftrag"
  },
  {
    "id": "R-CH-0008",
    "regel": "Wurden kurz vor der Kuendigung Rechte aus dem Mietverhaeltnis geltend gemacht, kann das ein Hinweis auf eine anfechtbare Rachekuendigung sein.",
    "wenn": [
      "sperrfrist.rechte_geltend_gemacht=true"
    ],
    "dann": [
      "flag:rachekuendigung_indiz"
    ],
    "quellen": [
      {
        "artikel": "Art. 271a OR",
        "fundstelle": "OR (SR 220)"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "fachlich_zu_verifizieren",
    "herkunft": "auftrag"
  },
  {
    "id": "R-CH-0009",
    "regel": "Sonderrechtslage befristetes Mietverhaeltnis: Ob und wie die Anfechtungsfrist gilt, ist fachlich zu klaeren; es wird keine Fristaussage gemacht.",
    "wenn": [
      "vertrag.befristet=true"
    ],
    "dann": [
      "flag:befristetes_verhaeltnis_sonderfall"
    ],
    "quellen": [
      {
        "artikel": "offen — Sonderrechtslage befristetes Mietverhaeltnis, fachlich zu klaeren",
        "fundstelle": "AUFTRAG-S1 §4 (Flag-Katalog); keine Quellenangabe im Auftrag"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "fachlich_zu_verifizieren",
    "herkunft": "auftrag"
  },
  {
    "id": "R-CH-0010",
    "regel": "Produktiv abgedeckt ist in M1 ausschliesslich der Kanton Luzern; fuer andere Kantone wird keine Einschaetzung ausgegeben.",
    "wenn": [
      "kanton ungleich LU"
    ],
    "dann": [
      "flag:ausserhalb_m1_scope"
    ],
    "quellen": [
      {
        "artikel": "M1-Scope: nur Kanton Luzern produktiv",
        "fundstelle": "DER_PLAN_v1.0_FROZEN.md §3; ADR-0002"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "technisch_validiert",
    "herkunft": "auftrag"
  },
  {
    "id": "R-CH-0011",
    "regel": "Eine Geldforderung ist im Rechtsbegehren grundsaetzlich zu beziffern; unbeziffert zulaessig nur, wenn die Bezifferung zu Beginn unmoeglich oder unzumutbar ist.",
    "wenn": [
      "rechtsgebiet=mietrecht_anfangsmietzins",
      "klage.geldforderung=true"
    ],
    "dann": [
      "flag:bezifferung_erforderlich",
      "flag:ausnahme_bei_unmoeglichkeit_oder_unzumutbarkeit"
    ],
    "quellen": [
      {
        "artikel": "Art. 85 ZPO",
        "fundstelle": "ZPO (SR 272)"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "fachlich_zu_verifizieren",
    "herkunft": "entscheid",
    "entscheid_quelle": "MJ250072-L"
  },
  {
    "id": "R-CH-0012",
    "regel": "Waehrend der Gerichtsferien stehen gesetzliche und gerichtliche Fristen still; das verschiebt den Fristenlauf, verlaengert ihn aber nicht.",
    "wenn": [
      "ein Fristenlauf faellt in den Zeitraum der Gerichtsferien"
    ],
    "dann": [
      "folge:fristenstillstand_gerichtsferien"
    ],
    "quellen": [
      {
        "artikel": "Art. 145 Abs. 1 lit. b ZPO",
        "fundstelle": "ZPO (SR 272)"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "fachlich_zu_verifizieren",
    "herkunft": "entscheid",
    "entscheid_quelle": "NG250015"
  },
  {
    "id": "R-CH-0013",
    "regel": "Bleibt eine Partei der Schlichtungsverhandlung unentschuldigt fern, wird das Verfahren als gegenstandslos abgeschrieben; seit 1. Januar 2025 kann zusaetzlich eine Ordnungsbusse bis Fr. 1'000.- verhaengt werden.",
    "wenn": [
      "partei.erscheint_nicht_zur_schlichtungsverhandlung=true",
      "partei.entschuldigung=false"
    ],
    "dann": [
      "folge:verfahren_gegenstandslos_abgeschrieben",
      "flag:ordnungsbusse_moeglich_bis_1000"
    ],
    "quellen": [
      {
        "artikel": "Art. 206 Abs. 1 und Abs. 4 ZPO",
        "fundstelle": "ZPO (SR 272)"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "fachlich_zu_verifizieren",
    "herkunft": "entscheid",
    "entscheid_quelle": "RU250068"
  },
  {
    "id": "R-CH-0014",
    "regel": "Bei einem Mangel kann der Mieter Behebung verlangen und den Mietzins ab Kenntnis des Vermieters bis zur Behebung verhaeltnismaessig herabsetzen.",
    "wenn": [
      "mietsache.mangel=true",
      "mangel.vom_vermieter_zu_vertreten=true"
    ],
    "dann": [
      "flag:anspruch_auf_behebung",
      "flag:anspruch_auf_herabsetzung_ab_kenntnis"
    ],
    "quellen": [
      {
        "artikel": "Art. 259a Abs. 1 und Art. 259d OR",
        "fundstelle": "OR (SR 220)"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "fachlich_zu_verifizieren",
    "herkunft": "entscheid",
    "entscheid_quelle": "MJ250016"
  },
  {
    "id": "R-CH-0015",
    "regel": "Bei einer umfassenden Ueberholung wird gesetzlich vermutet, dass die getaetigten Investitionen in einem pauschal festgelegten Umfang (50-70 %) wertvermehrend sind; wer das widerlegen will, muss selbst konkret aufschluesseln.",
    "wenn": [
      "sanierung.umfassende_ueberholung=true"
    ],
    "dann": [
      "flag:vermutung_pauschaler_wertvermehrungsanteil"
    ],
    "quellen": [
      {
        "artikel": "Art. 14 Abs. 1 Satz 2 VMWG",
        "fundstelle": "VMWG (SR 221.213.11)"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "fachlich_zu_verifizieren",
    "herkunft": "entscheid",
    "entscheid_quelle": "400 2024 279"
  },
  {
    "id": "R-CH-0016",
    "regel": "Der Mieter kann bei einem Mangel den Mietzins hinterlegen; das Gericht entscheidet danach ueber die Verwendung, in erster Linie zugunsten des Beseitigungsanspruchs, nicht als eigenes Maengelrecht.",
    "wenn": [
      "mietzins.hinterlegt=true"
    ],
    "dann": [
      "folge:gericht_entscheidet_ueber_verwendung_hinterlegter_mietzinse"
    ],
    "quellen": [
      {
        "artikel": "Art. 259g OR",
        "fundstelle": "OR (SR 220)"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "fachlich_zu_verifizieren",
    "herkunft": "entscheid",
    "entscheid_quelle": "MJ250002"
  },
  {
    "id": "R-CH-0017",
    "regel": "Wird mit der Klage eine Geldleistung verlangt, ist diese im Rechtsbegehren stets zu beziffern.",
    "wenn": [
      "klage.geldleistung=true"
    ],
    "dann": [
      "flag:bezifferung_im_rechtsbegehren_erforderlich"
    ],
    "quellen": [
      {
        "artikel": "Art. 84 Abs. 2 ZPO",
        "fundstelle": "ZPO (SR 272)"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "fachlich_zu_verifizieren",
    "herkunft": "entscheid",
    "entscheid_quelle": "NG250008"
  },
  {
    "id": "R-LU-0001",
    "regel": "Fuer die Fristverschiebung nach R-CH-0003 gelten die gesetzlichen Feiertage des Kantons Luzern.",
    "wenn": [
      "kanton=LU",
      "ein Fristende wird auf Verschiebung geprueft"
    ],
    "dann": [
      "folge:feiertagsliste_lu_massgeblich"
    ],
    "quellen": [
      {
        "artikel": "Gesetzliche Feiertage Kanton Luzern",
        "fundstelle": "kantonales Recht LU (Feiertagsliste, siehe feiertage_lu.ts)"
      }
    ],
    "zeitstand": "2026-08-05",
    "regelversion": "0.1.0",
    "pruefstand": "fachlich_zu_verifizieren",
    "herkunft": "auftrag"
  }
];

/** Zuordnung core-QuelleId -> Register-Regel-ID (Migrations-Metadatum). */
export const QUELLE_ZU_REGEL: Readonly<Record<QuelleId, string>> = {
  "P1": "R-CH-0001",
  "P2": "R-CH-0002",
  "P3": "R-CH-0003",
  "P4": "R-CH-0004",
  "P5": "R-CH-0005",
  "P6": "R-CH-0006",
  "P7": "R-CH-0007",
  "P8": "R-CH-0008",
  "Q_BEFRISTET": "R-CH-0009",
  "Q_SCOPE": "R-CH-0010",
  "FEIERTAGE_LU": "R-LU-0001"
};

/** Einheitliche Regelversion aller Register-Eintraege. */
export const REGISTER_REGELVERSION = "0.1.0";

/** Einheitlicher Zeitstand aller Register-Eintraege. */
export const REGISTER_ZEITSTAND: IsoDate = "2026-08-05";

/** Rechtsparameter aus der dann-Konvention "parameter:<name>=<ganzzahl>". */
export const REGISTER_PARAMETER: Readonly<Record<string, number>> = {
  "anfechtungsfrist_tage": 30,
  "abholfrist_tage": 7
};

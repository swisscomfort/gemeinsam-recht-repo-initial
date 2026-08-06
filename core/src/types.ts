/**
 * Typen exakt abgeleitet aus schemas/case-object.schema.json v0.1
 * sowie Ausgabeformat gemaess AUFTRAG-S1 §2 und DTM-Trace gemaess
 * docs/LEGAL_AI_OPERATING_RULES.md §4.
 *
 * Fachlogik ist rein deterministisch: kein LLM, kein Netzwerk,
 * keine Systemzeit (Zeit wird als `heute` injiziert).
 */

/** ISO-Datum im Format YYYY-MM-DD. */
export type IsoDate = string;

export type Kanton =
  | "LU" | "AG" | "AI" | "AR" | "BE" | "BL" | "BS" | "FR" | "GE" | "GL"
  | "GR" | "JU" | "NE" | "NW" | "OW" | "SG" | "SH" | "SO" | "SZ" | "TG"
  | "TI" | "UR" | "VD" | "VS" | "ZG" | "ZH";

export type Rolle = "mieter" | "mitmieter" | "untermieter";

export type Zustellart = "einschreiben" | "a_post" | "persoenlich" | "unbekannt";

export interface Kuendigung {
  zugestellt_am: IsoDate;
  zustellart: Zustellart;
  /** Nur bei Einschreiben und Nichtabholung relevant (Zustellfiktion). */
  abholfrist_ende?: IsoDate;
  amtliches_formular: boolean;
  unterschrieben: boolean;
  begruendung_angegeben: boolean;
  begruendung_text?: string;
  kuendigungstermin_gemaess_schreiben?: IsoDate;
}

export interface Wohnung {
  familienwohnung: boolean;
  /** Pflichtfeld (boolean), wenn familienwohnung=true; sonst null/weggelassen. */
  separate_zustellung_beide?: boolean | null;
}

export interface Vertrag {
  beginn: IsoDate;
  befristet: boolean;
  orts_gemeinde?: string;
}

export interface Sperrfrist {
  verfahren_letzte_3_jahre: boolean;
  verfahren_haengig: boolean;
  rechte_geltend_gemacht?: boolean;
}

export interface Meta {
  erfasst_am: string;
  regelversion: string;
  quellenstand: IsoDate;
  fixture: boolean;
  einwilligung_pilot?: boolean | null;
}

/** Wird ausschliesslich vom deterministischen Kern gesetzt; in Eingaben verboten. */
export interface Berechnet {
  empfangsdatum_effektiv?: IsoDate;
  anfechtungsfrist_bis?: IsoDate;
  nichtigkeit_indiziert?: boolean;
  regel_flags?: string[];
}

export interface Fallobjekt {
  schema_version: "0.1.0";
  rechtsgebiet: "mietrecht_kuendigung";
  kanton: Kanton;
  rolle: Rolle;
  kuendigung: Kuendigung;
  wohnung: Wohnung;
  vertrag: Vertrag;
  sperrfrist: Sperrfrist;
  berechnet?: Berechnet;
  meta: Meta;
}

/** Flag-Katalog — abschliessend fuer S1 (AUFTRAG-S1 §4). Keine weiteren Flags. */
export type FlagId =
  | "nichtig_formular_fehlt"
  | "nichtig_unterschrift_fehlt"
  | "nichtig_familienwohnung_zustellung"
  | "sperrfrist_271a_moeglich"
  | "rachekuendigung_indiz"
  | "frist_abgelaufen"
  | "befristetes_verhaeltnis_sonderfall"
  | "ausserhalb_m1_scope";

export type QuelleId =
  | "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "P8"
  | "FEIERTAGE_LU" | "Q_BEFRISTET" | "Q_SCOPE";

export type Pruefstand =
  | "technisch_validiert"
  | "fachlich_zu_verifizieren"
  | "fachlich_verifiziert";

export interface Quelle {
  id: QuelleId;
  artikel: string;
  fundstelle: string;
  zeitstand: IsoDate;
  pruefstand: Pruefstand;
}

/** DTM-Trace, Pflichtfelder gemaess LEGAL_AI_OPERATING_RULES §4. */
export interface DtmTrace {
  gegenstand: string;
  zeitpunkt: string;
  rolle: "fall-engine";
  basis: {
    fallobjekt_hash: string;
    regelversion: string;
    quellenstand: string;
  };
  alternativen: string[];
  begruendung: string;
}

/** Ausgabeformat von bewerteFall — verbindlich gemaess AUFTRAG-S1 §2. */
export type Ergebnis =
  | {
      status: "OK";
      fristen: {
        empfangsdatum_effektiv: IsoDate;
        anfechtungsfrist_bis: IsoDate;
        frist_abgelaufen: boolean;
      };
      flags: FlagId[];
      quellen: QuelleId[];
      regelversion: string;
      quellenstand: string;
      trace: DtmTrace;
    }
  | {
      status: "LUECKE";
      fehlend: string[];
      hinweis: string;
      trace: DtmTrace;
    };

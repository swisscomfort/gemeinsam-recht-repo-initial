/**
 * Fragebaum strikt entlang schemas/case-object.schema.json v0.1
 * (AUFTRAG-S2 §1 D).
 *
 * Jede Frage traegt genau eine Ein-Satz-Hilfe. Bedingte Fragen:
 * Einschreiben -> Abholfrist, Familienwohnung -> separate Zustellung.
 * Pflichtfelder des Schemas werden erzwungen. Die Antworten werden rein
 * mechanisch in ein Fallobjekt uebersetzt; bewertet wird ausschliesslich
 * im deterministischen Kern (core).
 */
import { REGELVERSION, QUELLENSTAND } from "@core/index";

export type FrageTyp = "datum" | "janein" | "auswahl" | "text";

export interface Auswahloption {
  wert: string;
  label: string;
}

/** Antworten als Strings: "ja"/"nein"(/"weiss_nicht"), ISO-Daten, Freitext. */
export type Antworten = Record<string, string>;

export interface Frage {
  /** Feldpfad im Schema bzw. interne Hilfsfrage (Praefix "ui."). */
  id: string;
  titel: string;
  /** Genau ein Satz Hilfetext. */
  hilfe: string;
  typ: FrageTyp;
  pflicht: boolean;
  optionen?: Auswahloption[];
  vorauswahl?: string;
  maxLaenge?: number;
  sichtbar?: (a: Antworten) => boolean;
}

const JA_NEIN: Auswahloption[] = [
  { wert: "ja", label: "Ja" },
  { wert: "nein", label: "Nein" },
];

const KANTONE = [
  "LU", "AG", "AI", "AR", "BE", "BL", "BS", "FR", "GE", "GL", "GR", "JU", "NE",
  "NW", "OW", "SG", "SH", "SO", "SZ", "TG", "TI", "UR", "VD", "VS", "ZG", "ZH",
];

function istEinschreibenNichtAbgeholt(a: Antworten): boolean {
  return a["kuendigung.zustellart"] === "einschreiben" &&
    a["ui.einschreiben_abgeholt"] === "nein";
}

export const FRAGEN: Frage[] = [
  {
    id: "kanton",
    titel: "In welchem Kanton liegt die Wohnung?",
    hilfe: "In dieser Testphase gibt die Anwendung nur fuer den Kanton Luzern eine Einschaetzung ab.",
    typ: "auswahl",
    pflicht: true,
    vorauswahl: "LU",
    optionen: KANTONE.map((k) => ({ wert: k, label: k })),
  },
  {
    id: "rolle",
    titel: "In welcher Rolle stehen Sie im Mietvertrag?",
    hilfe: "Waehlen Sie, ob Sie den Vertrag allein, gemeinsam mit anderen oder zur Untermiete unterschrieben haben.",
    typ: "auswahl",
    pflicht: true,
    optionen: [
      { wert: "mieter", label: "Mieterin / Mieter" },
      { wert: "mitmieter", label: "Mitmieterin / Mitmieter" },
      { wert: "untermieter", label: "Untermieterin / Untermieter" },
    ],
  },
  {
    id: "kuendigung.zustellart",
    titel: "Wie wurde Ihnen die Kuendigung zugestellt?",
    hilfe: "Schauen Sie auf den Umschlag oder die Abholeinladung, wenn Sie unsicher sind.",
    typ: "auswahl",
    pflicht: true,
    optionen: [
      { wert: "einschreiben", label: "Per Einschreiben" },
      { wert: "a_post", label: "Mit normaler Post (A-/B-Post)" },
      { wert: "persoenlich", label: "Persoenlich uebergeben" },
      { wert: "unbekannt", label: "Weiss ich nicht" },
    ],
  },
  {
    id: "ui.einschreiben_abgeholt",
    titel: "Haben Sie das Einschreiben entgegengenommen oder abgeholt?",
    hilfe: "Wenn Sie das Einschreiben nie abgeholt haben, zaehlt das Ende der Abholfrist der Post.",
    typ: "janein",
    pflicht: true,
    optionen: JA_NEIN,
    sichtbar: (a) => a["kuendigung.zustellart"] === "einschreiben",
  },
  {
    id: "kuendigung.zugestellt_am",
    titel: "An welchem Tag haben Sie die Kuendigung erhalten?",
    hilfe: "Massgebend ist der Tag, an dem das Schreiben tatsaechlich bei Ihnen angekommen ist.",
    typ: "datum",
    pflicht: true,
    sichtbar: (a) => !istEinschreibenNichtAbgeholt(a),
  },
  {
    id: "kuendigung.abholfrist_ende",
    titel: "An welchem Tag ist die Abholfrist der Post abgelaufen?",
    hilfe: "Das Datum steht auf der Abholeinladung der Post (in der Regel 7 Tage Abholfrist).",
    typ: "datum",
    pflicht: true,
    sichtbar: istEinschreibenNichtAbgeholt,
  },
  {
    id: "kuendigung.amtliches_formular",
    titel: "Wurde die Kuendigung auf dem amtlichen Formular ausgesprochen?",
    hilfe: "Das amtliche Formular ist ein vom Kanton genehmigtes Kuendigungsformular; der Hinweis darauf steht meist direkt auf dem Blatt.",
    typ: "janein",
    pflicht: true,
    optionen: JA_NEIN,
  },
  {
    id: "kuendigung.unterschrieben",
    titel: "Ist die Kuendigung unterschrieben?",
    hilfe: "Gemeint ist eine Unterschrift der Vermieterschaft oder ihrer Verwaltung auf dem Kuendigungsschreiben.",
    typ: "janein",
    pflicht: true,
    optionen: JA_NEIN,
  },
  {
    id: "kuendigung.begruendung_angegeben",
    titel: "Wurde in der Kuendigung eine Begruendung angegeben?",
    hilfe: "Schauen Sie nach, ob im Schreiben ein Grund fuer die Kuendigung genannt wird.",
    typ: "janein",
    pflicht: true,
    optionen: JA_NEIN,
  },
  {
    id: "kuendigung.begruendung_text",
    titel: "Wie lautet die Begruendung? (freiwillig)",
    hilfe: "Sie koennen den Grund abtippen oder das Feld leer lassen.",
    typ: "text",
    pflicht: false,
    maxLaenge: 2000,
    sichtbar: (a) => a["kuendigung.begruendung_angegeben"] === "ja",
  },
  {
    id: "kuendigung.kuendigungstermin_gemaess_schreiben",
    titel: "Auf welchen Termin wurde gekuendigt? (freiwillig)",
    hilfe: "Das Datum steht im Kuendigungsschreiben; lassen Sie das Feld leer, wenn keines genannt ist.",
    typ: "datum",
    pflicht: false,
  },
  {
    id: "wohnung.familienwohnung",
    titel: "Wohnen Sie mit Ihrer Ehepartnerin / Ihrem Ehepartner oder in eingetragener Partnerschaft in dieser Wohnung?",
    hilfe: "Fuer solche Familienwohnungen gelten besondere Zustellregeln.",
    typ: "janein",
    pflicht: true,
    optionen: JA_NEIN,
  },
  {
    id: "wohnung.separate_zustellung_beide",
    titel: "Wurde die Kuendigung Ihnen und Ihrer Partnerin / Ihrem Partner je in einem eigenen Brief zugestellt?",
    hilfe: "Zaehlen Sie nach, ob zwei separate Kuendigungsschreiben angekommen sind.",
    typ: "janein",
    pflicht: true,
    optionen: JA_NEIN,
    sichtbar: (a) => a["wohnung.familienwohnung"] === "ja",
  },
  {
    id: "vertrag.beginn",
    titel: "Seit wann laeuft Ihr Mietvertrag?",
    hilfe: "Das Anfangsdatum steht im Mietvertrag.",
    typ: "datum",
    pflicht: true,
  },
  {
    id: "vertrag.befristet",
    titel: "Ist Ihr Mietvertrag befristet?",
    hilfe: "Befristet heisst, dass im Vertrag ein festes Enddatum steht.",
    typ: "janein",
    pflicht: true,
    optionen: JA_NEIN,
  },
  {
    id: "vertrag.orts_gemeinde",
    titel: "In welcher Gemeinde liegt die Wohnung? (freiwillig)",
    hilfe: "Die Gemeinde bestimmt, welche Schlichtungsbehoerde zustaendig ist.",
    typ: "text",
    pflicht: false,
    maxLaenge: 120,
  },
  {
    id: "sperrfrist.verfahren_letzte_3_jahre",
    titel: "Gab es in den letzten 3 Jahren ein Schlichtungs- oder Gerichtsverfahren zu diesem Mietverhaeltnis?",
    hilfe: "Gemeint sind Verfahren zwischen Ihnen und der Vermieterschaft, zum Beispiel wegen Mietzins oder Maengeln.",
    typ: "janein",
    pflicht: true,
    optionen: JA_NEIN,
  },
  {
    id: "sperrfrist.verfahren_haengig",
    titel: "Laeuft zurzeit ein solches Verfahren?",
    hilfe: "Antworten Sie mit Ja, wenn ein Schlichtungs- oder Gerichtsverfahren noch nicht abgeschlossen ist.",
    typ: "janein",
    pflicht: true,
    optionen: JA_NEIN,
  },
  {
    id: "sperrfrist.rechte_geltend_gemacht",
    titel: "Haben Sie kurz vor der Kuendigung Maengel gemeldet oder Forderungen gestellt?",
    hilfe: "Zum Beispiel eine Mietzinssenkung verlangt oder eine Reparatur eingefordert.",
    typ: "auswahl",
    pflicht: true,
    optionen: [
      ...JA_NEIN,
      { wert: "weiss_nicht", label: "Weiss ich nicht" },
    ],
  },
];

/** Sichtbare Fragen in Reihenfolge, abhaengig von den bisherigen Antworten. */
export function sichtbareFragen(antworten: Antworten): Frage[] {
  return FRAGEN.filter((f) => (f.sichtbar ? f.sichtbar(antworten) : true));
}

function alsBool(wert: string | undefined): boolean {
  return wert === "ja";
}

/**
 * Uebersetzt die Antworten mechanisch in ein Fallobjekt gemaess Schema
 * v0.1. `erfasstAm` (ISO-8601) wird von der UI-Schicht injiziert.
 * Bei "Einschreiben nicht abgeholt" wird wie in FX-009 der Tag der
 * Zustellfiktion (Ende Abholfrist) auch als zugestellt_am gefuehrt.
 */
export function baueFallobjekt(antworten: Antworten, erfasstAm: string): unknown {
  const a = antworten;

  const kuendigung: Record<string, unknown> = {
    zustellart: a["kuendigung.zustellart"],
    amtliches_formular: alsBool(a["kuendigung.amtliches_formular"]),
    unterschrieben: alsBool(a["kuendigung.unterschrieben"]),
    begruendung_angegeben: alsBool(a["kuendigung.begruendung_angegeben"]),
  };
  if (istEinschreibenNichtAbgeholt(a)) {
    kuendigung["zugestellt_am"] = a["kuendigung.abholfrist_ende"];
    kuendigung["abholfrist_ende"] = a["kuendigung.abholfrist_ende"];
  } else {
    kuendigung["zugestellt_am"] = a["kuendigung.zugestellt_am"];
  }
  if (a["kuendigung.begruendung_angegeben"] === "ja" && a["kuendigung.begruendung_text"]?.trim()) {
    kuendigung["begruendung_text"] = a["kuendigung.begruendung_text"]?.trim();
  }
  if (a["kuendigung.kuendigungstermin_gemaess_schreiben"]) {
    kuendigung["kuendigungstermin_gemaess_schreiben"] =
      a["kuendigung.kuendigungstermin_gemaess_schreiben"];
  }

  const wohnung: Record<string, unknown> = {
    familienwohnung: alsBool(a["wohnung.familienwohnung"]),
  };
  if (a["wohnung.familienwohnung"] === "ja") {
    wohnung["separate_zustellung_beide"] = alsBool(a["wohnung.separate_zustellung_beide"]);
  }

  const vertrag: Record<string, unknown> = {
    beginn: a["vertrag.beginn"],
    befristet: alsBool(a["vertrag.befristet"]),
  };
  if (a["vertrag.orts_gemeinde"]?.trim()) {
    vertrag["orts_gemeinde"] = a["vertrag.orts_gemeinde"]?.trim();
  }

  const sperrfrist: Record<string, unknown> = {
    verfahren_letzte_3_jahre: alsBool(a["sperrfrist.verfahren_letzte_3_jahre"]),
    verfahren_haengig: alsBool(a["sperrfrist.verfahren_haengig"]),
  };
  if (a["sperrfrist.rechte_geltend_gemacht"] === "ja" || a["sperrfrist.rechte_geltend_gemacht"] === "nein") {
    sperrfrist["rechte_geltend_gemacht"] = alsBool(a["sperrfrist.rechte_geltend_gemacht"]);
  }

  return {
    schema_version: "0.1.0",
    rechtsgebiet: "mietrecht_kuendigung",
    kanton: a["kanton"],
    rolle: a["rolle"],
    kuendigung,
    wohnung,
    vertrag,
    sperrfrist,
    meta: {
      erfasst_am: erfasstAm,
      regelversion: REGELVERSION,
      quellenstand: QUELLENSTAND,
      fixture: false,
    },
  };
}

/**
 * bewerteFall(fall, heute) — deterministischer Einstiegspunkt (AUFTRAG-S1 §2).
 *
 * Regel (Plan §2, Invariante 3): Bei fehlenden oder widerspruechlichen
 * entscheidenden Angaben wird KEIN Fristergebnis ausgegeben — Status LUECKE
 * mit benannten Feldpfaden bzw. Widerspruchsbeschreibungen.
 */
import {
  berechneFristen,
  istIsoDatum,
  istNach,
  istVor,
  P1_ANFECHTUNGSFRIST_TAGE,
} from "./fristen.js";
import {
  FLAG_QUELLE,
  pruefeRegeln,
  REGELVERSION,
  sortiereFlags,
  type ValidierterFall,
} from "./regeln.js";
import { QUELLEN, QUELLENSTAND } from "./quellen.js";
import { baueTrace, hashFallobjekt } from "./trace.js";
import type {
  Ergebnis,
  FlagId,
  IsoDate,
  QuelleId,
  Zustellart,
} from "./types.js";

export { berechneFristen, istIsoDatum, addTage, wochentag, istWochenende, zuTagen, vonTagen, P1_ANFECHTUNGSFRIST_TAGE, P4_ABHOLFRIST_TAGE } from "./fristen.js";
export { FEIERTAGE_LU, FEIERTAGE_LU_JAHRE, istFeiertagLu } from "./feiertage_lu.js";
export { FLAG_QUELLE, FLAG_REIHENFOLGE, pruefeRegeln, REGELVERSION } from "./regeln.js";
export { QUELLEN, QUELLENSTAND, offeneRechtsparameter } from "./quellen.js";
export { baueTrace, hashFallobjekt, sha256Hex, sha256HexBytes, stableStringify } from "./trace.js";
export { erstelleEinschaetzung } from "./einschaetzung.js";
export type {
  Ampel,
  Einschaetzung,
  EinschaetzungLuecke,
  EinschaetzungOk,
  EinschaetzungOption,
  FlagBegruendung,
} from "./einschaetzung.js";
export { erzeugeBrief, platzhalterInVorlage, PFLICHT_PLATZHALTER } from "./brief.js";
export type {
  Brief,
  BriefVorlageId,
  BriefWerte,
  PflichtPlatzhalter,
  PlatzhalterName,
} from "./brief.js";
export {
  EINTRAG_TYPEN,
  exportiereChronologieJson,
  exportiereChronologieMarkdown,
  hashDokument,
  mitEintrag,
  neueChronologie,
} from "./chronologie.js";
export type { ChronikEintrag, Chronologie, EintragTyp } from "./chronologie.js";
export type * from "./types.js";

const ZUSTELLARTEN: readonly string[] = [
  "einschreiben",
  "a_post",
  "persoenlich",
  "unbekannt",
];

const HINWEIS_LUECKE =
  "Bitte die unter 'fehlend' genannten Angaben nachliefern bzw. die genannten " +
  "Widersprueche klaeren; erst dann wird eine Frist berechnet.";

const BEGRUENDUNG_LUECKE =
  "Entscheidende Angaben fehlen oder sind widerspruechlich; nach Invariante 3 " +
  "wird kein Fristergebnis ausgegeben.";

function alsObjekt(wert: unknown): Record<string, unknown> | null {
  if (typeof wert === "object" && wert !== null && !Array.isArray(wert)) {
    return wert as Record<string, unknown>;
  }
  return null;
}

export function bewerteFall(fall: unknown, heute: IsoDate): Ergebnis {
  if (!istIsoDatum(heute)) {
    throw new Error(
      `bewerteFall: 'heute' muss ein gueltiges ISO-Datum (YYYY-MM-DD) sein, erhalten: ${String(heute)}`,
    );
  }

  const hash = hashFallobjekt(fall);

  const luecke = (
    fehlend: string[],
    hinweis: string,
    begruendung: string,
  ): Ergebnis => ({
    status: "LUECKE",
    fehlend,
    hinweis,
    trace: baueTrace({
      heute,
      fallobjektHash: hash,
      alternativen: ["Berechnung nach Nachlieferung der fehlenden Angaben"],
      begruendung,
    }),
  });

  const f = alsObjekt(fall);
  if (!f) {
    return luecke(["fallobjekt"], HINWEIS_LUECKE, BEGRUENDUNG_LUECKE);
  }

  // --- Scope-Pruefung (Plan §3: M1 nur Kanton LU) -------------------------
  const kanton = f["kanton"];
  if (typeof kanton === "string" && kanton !== "" && kanton !== "LU") {
    return luecke(
      [`kanton: '${kanton}' ausserhalb des M1-Scope (nur LU)`],
      "Der Fristenrechner unterstuetzt in M1 ausschliesslich den Kanton " +
        "Luzern (LU). Fuer andere Kantone kann keine Einschaetzung gegeben werden.",
      `Kanton ${kanton} liegt ausserhalb des M1-Scope (ausserhalb_m1_scope); ` +
        "M1 deckt nur den Kanton LU ab.",
    );
  }

  // --- Entscheidende Angaben sammeln --------------------------------------
  const fehlend: string[] = [];
  if (typeof kanton !== "string" || kanton === "") {
    fehlend.push("kanton");
  }

  const ku = alsObjekt(f["kuendigung"]);
  const wo = alsObjekt(f["wohnung"]);
  const ve = alsObjekt(f["vertrag"]);
  const sp = alsObjekt(f["sperrfrist"]);
  if (!ku) fehlend.push("kuendigung");
  if (!wo) fehlend.push("wohnung");
  if (!ve) fehlend.push("vertrag");
  if (!sp) fehlend.push("sperrfrist");

  let zustellart: Zustellart | null = null;
  let empfangEffektiv: IsoDate | null = null;
  let zustellfiktion = false;
  let amtlichesFormular: boolean | null = null;
  let unterschrieben: boolean | null = null;

  if (ku) {
    const za = ku["zustellart"];
    if (typeof za === "string" && ZUSTELLARTEN.includes(za)) {
      zustellart = za as Zustellart;
    } else {
      fehlend.push("kuendigung.zustellart");
    }

    const zugestelltAm = ku["zugestellt_am"];
    const abholfristEnde = ku["abholfrist_ende"];

    if (zugestelltAm !== undefined && !istIsoDatum(zugestelltAm)) {
      fehlend.push("kuendigung.zugestellt_am (ungueltiges Datum)");
    } else if (abholfristEnde !== undefined && !istIsoDatum(abholfristEnde)) {
      fehlend.push("kuendigung.abholfrist_ende (ungueltiges Datum)");
    } else if (zustellart === "einschreiben") {
      // P4: Einschreiben, nicht abgeholt => Zustellfiktion am Ende der
      // 7-taegigen Abholfrist (erfasst als abholfrist_ende). Sonst zugestellt_am.
      if (istIsoDatum(abholfristEnde)) {
        empfangEffektiv = abholfristEnde;
        zustellfiktion = true;
      } else if (istIsoDatum(zugestelltAm)) {
        empfangEffektiv = zugestelltAm;
      } else {
        fehlend.push("kuendigung.zugestellt_am");
        fehlend.push("kuendigung.abholfrist_ende");
      }
    } else if (istIsoDatum(zugestelltAm)) {
      empfangEffektiv = zugestelltAm;
    } else {
      fehlend.push("kuendigung.zugestellt_am");
    }

    if (typeof ku["amtliches_formular"] === "boolean") {
      amtlichesFormular = ku["amtliches_formular"];
    } else {
      fehlend.push("kuendigung.amtliches_formular");
    }
    if (typeof ku["unterschrieben"] === "boolean") {
      unterschrieben = ku["unterschrieben"];
    } else {
      fehlend.push("kuendigung.unterschrieben");
    }
  }

  let familienwohnung: boolean | null = null;
  let separateZustellung: boolean | null = null;
  if (wo) {
    if (typeof wo["familienwohnung"] === "boolean") {
      familienwohnung = wo["familienwohnung"];
      if (familienwohnung === true) {
        // Schema-Pflicht: bei Familienwohnung muss die separate Zustellung
        // an beide als boolean beantwortet sein (Art. 266n OR, P6).
        if (typeof wo["separate_zustellung_beide"] === "boolean") {
          separateZustellung = wo["separate_zustellung_beide"];
        } else {
          fehlend.push("wohnung.separate_zustellung_beide");
        }
      }
    } else {
      fehlend.push("wohnung.familienwohnung");
    }
  }

  let befristet: boolean | null = null;
  if (ve) {
    if (typeof ve["befristet"] === "boolean") {
      befristet = ve["befristet"];
    } else {
      fehlend.push("vertrag.befristet");
    }
  }

  let verfahren3Jahre: boolean | null = null;
  let verfahrenHaengig: boolean | null = null;
  let rechteGeltend: boolean | null = null;
  if (sp) {
    if (typeof sp["verfahren_letzte_3_jahre"] === "boolean") {
      verfahren3Jahre = sp["verfahren_letzte_3_jahre"];
    } else {
      fehlend.push("sperrfrist.verfahren_letzte_3_jahre");
    }
    if (typeof sp["verfahren_haengig"] === "boolean") {
      verfahrenHaengig = sp["verfahren_haengig"];
    } else {
      fehlend.push("sperrfrist.verfahren_haengig");
    }
    if (typeof sp["rechte_geltend_gemacht"] === "boolean") {
      rechteGeltend = sp["rechte_geltend_gemacht"];
    }
  }

  // --- Widersprueche -------------------------------------------------------
  if (ku && ve) {
    const termin = ku["kuendigungstermin_gemaess_schreiben"];
    const beginn = ve["beginn"];
    if (istIsoDatum(termin) && istIsoDatum(beginn) && istVor(termin, beginn)) {
      fehlend.push(
        `widerspruch: kuendigung.kuendigungstermin_gemaess_schreiben (${termin}) ` +
          `liegt vor vertrag.beginn (${beginn})`,
      );
    }
  }
  if (empfangEffektiv !== null && istNach(empfangEffektiv, heute)) {
    fehlend.push(
      `widerspruch: empfangsdatum_effektiv (${empfangEffektiv}) liegt nach heute (${heute})`,
    );
  }

  if (fehlend.length > 0) {
    return luecke(fehlend, HINWEIS_LUECKE, BEGRUENDUNG_LUECKE);
  }

  // --- Flags (P5–P8, Sonderfall befristet) --------------------------------
  const validiert: ValidierterFall = {
    kanton: "LU",
    kuendigung: {
      zustellart: zustellart as Zustellart,
      amtliches_formular: amtlichesFormular as boolean,
      unterschrieben: unterschrieben as boolean,
    },
    empfang: {
      effektiv: empfangEffektiv as IsoDate,
      zustellfiktion,
    },
    wohnung: {
      familienwohnung: familienwohnung as boolean,
      separate_zustellung_beide: separateZustellung,
    },
    vertrag: { befristet: befristet as boolean },
    sperrfrist: {
      verfahren_letzte_3_jahre: verfahren3Jahre as boolean,
      verfahren_haengig: verfahrenHaengig as boolean,
      rechte_geltend_gemacht: rechteGeltend,
    },
  };
  const flags = pruefeRegeln(validiert);

  // --- Fristen (P1, P2, P3; ggf. P4 bereits im Empfang) -------------------
  const frist = berechneFristen(validiert.empfang.effektiv, heute);
  if (!frist.ok) {
    return luecke(
      [`feiertagsdaten: Jahr ${frist.fehlendes_feiertagsjahr} nicht hinterlegt`],
      "Fuer das Jahr des Fristendes sind keine Feiertagsdaten (Kanton LU) " +
        "hinterlegt; ohne diese Daten wird keine Frist ausgegeben.",
      `Feiertagsdaten fuer das Jahr ${frist.fehlendes_feiertagsjahr} sind nicht ` +
        "hinterlegt; keine sichere Fristverschiebungspruefung (P3) moeglich.",
    );
  }

  const alleFlags = sortiereFlags(
    frist.frist_abgelaufen ? [...flags, "frist_abgelaufen" as FlagId] : flags,
  );

  // --- Quellenliste (alle herangezogenen Quellen, deterministisch) --------
  const quellen: QuelleId[] = ["P1", "P2"];
  if (validiert.empfang.zustellfiktion) quellen.push("P4");
  quellen.push("P3", "FEIERTAGE_LU");
  for (const flag of alleFlags) {
    const q = FLAG_QUELLE[flag];
    if (!quellen.includes(q)) quellen.push(q);
  }

  // --- Begruendung (deterministisch aus den Rechenschritten) --------------
  let begruendung =
    `Empfang effektiv ${frist.empfangsdatum_effektiv}` +
    (validiert.empfang.zustellfiktion
      ? " (Zustellfiktion nach P4, Ende der Abholfrist)"
      : "") +
    `; Fristbeginn am Folgetag (P2); Anfechtungsfrist ${P1_ANFECHTUNGSFRIST_TAGE} Tage (P1); ` +
    `Fristende ${frist.anfechtungsfrist_bis}` +
    (frist.verschoben
      ? `, verschoben vom ${frist.fristende_roh} auf den naechsten Werktag (P3).`
      : " (P3 geprueft, keine Verschiebung).");
  if (alleFlags.includes("befristetes_verhaeltnis_sonderfall")) {
    begruendung +=
      " Sonderrechtslage befristetes Mietverhaeltnis: Anwendbarkeit der " +
      "Anfechtungsfrist fachlich zu verifizieren; berechnete Frist ist keine " +
      "Anfechtungsfrist-Aussage.";
  }

  return {
    status: "OK",
    fristen: {
      empfangsdatum_effektiv: frist.empfangsdatum_effektiv,
      anfechtungsfrist_bis: frist.anfechtungsfrist_bis,
      frist_abgelaufen: frist.frist_abgelaufen,
    },
    flags: alleFlags,
    quellen,
    regelversion: REGELVERSION,
    quellenstand: QUELLENSTAND,
    trace: baueTrace({
      heute,
      fallobjektHash: hash,
      alternativen: ["keine realistische Alternative"],
      begruendung,
    }),
  };
}

/** Metadaten der Quellenlage fuer Abnahme-Reports. */
export function quellenReport(): {
  regelversion: string;
  quellenstand: string;
  fachlich_zu_verifizieren: QuelleId[];
} {
  return {
    regelversion: REGELVERSION,
    quellenstand: QUELLENSTAND,
    fachlich_zu_verifizieren: (Object.keys(QUELLEN) as QuelleId[]).filter(
      (id) => QUELLEN[id].pruefstand === "fachlich_zu_verifizieren",
    ),
  };
}

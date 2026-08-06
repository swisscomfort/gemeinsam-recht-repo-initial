// migrate.ts — deterministische Migration S1 → Wissens-Register (AUFTRAG-W0 Teil B).
//
// Aufgabe 1 (einmalig): erzeugt aus den bestehenden Parametern P1–P8 und den
// Regel-Flags aus core/ die ersten Register-Eintraege unter wissen/register/.
// Die Rechtswerte unten sind WOERTLICH aus core/src/quellen.ts, regeln.ts und
// fristen.ts (Stand vor der Migration) uebernommen — nie inhaltlich veraendert
// (herkunft: auftrag, pruefstand unveraendert). Bestehende Register-Dateien
// werden NIE ueberschrieben: das Register ist die Quelle der Wahrheit.
//
// Aufgabe 2 (wiederholbar): liest wissen/register/*.json und regeneriert
// core/src/register.gen.ts — damit liest core Quellen und Regel-Metadaten aus
// dem Register (eine Quelle der Wahrheit), ohne Laufzeit-Dateizugriff und ohne
// Verhaltensaenderung.
//
// Kein LLM, kein Netzwerk, keine Systemzeit.

import { istDirektAufruf, leseRegister, wissenPfad } from "./umgebung.ts";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface RegisterQuelle {
  artikel: string;
  fundstelle: string;
}

export interface RegisterEintrag {
  id: string;
  regel: string;
  wenn: string[];
  dann: string[];
  quellen: RegisterQuelle[];
  zeitstand: string;
  regelversion: string;
  pruefstand: "technisch_validiert" | "fachlich_zu_verifizieren" | "fachlich_verifiziert";
  herkunft: "gesetz" | "entscheid" | "auftrag" | "fall_destillat" | "redaktion";
  fall_anker?: string;
  entscheid_quelle?: string;
  review?: { wer: string; wann: string };
}

/** Zeitstand aller migrierten Eintraege = QUELLENSTAND aus core (S1). */
const ZEITSTAND = "2026-08-05";
/** Regelversion aller migrierten Eintraege = REGELVERSION aus core (S1). */
const REGELVERSION = "0.1.0";

/**
 * Zuordnung core-QuelleId -> Register-Regel-ID. Diese Zuordnung ist
 * technisches Migrations-Metadatum (kein Rechtswert) und wird in die
 * generierte Datei core/src/register.gen.ts uebernommen.
 */
export const QUELLE_ZU_REGEL: Readonly<Record<string, string>> = {
  P1: "R-CH-0001",
  P2: "R-CH-0002",
  P3: "R-CH-0003",
  P4: "R-CH-0004",
  P5: "R-CH-0005",
  P6: "R-CH-0006",
  P7: "R-CH-0007",
  P8: "R-CH-0008",
  Q_BEFRISTET: "R-CH-0009",
  Q_SCOPE: "R-CH-0010",
  FEIERTAGE_LU: "R-LU-0001",
};

/** Die ersten Register-Eintraege — migriert aus core (S1), herkunft: auftrag. */
export const SEED: readonly RegisterEintrag[] = [
  {
    id: "R-CH-0001",
    regel:
      "Die Kuendigung kann innert 30 Tagen nach Empfang bei der Schlichtungsbehoerde angefochten werden; nach Fristablauf gilt die Frist als abgelaufen.",
    wenn: ["rechtsgebiet=mietrecht_kuendigung", "empfangsdatum_effektiv liegt vor"],
    dann: ["parameter:anfechtungsfrist_tage=30", "flag:frist_abgelaufen"],
    quellen: [{ artikel: "Art. 273 Abs. 1 OR", fundstelle: "OR (SR 220)" }],
    zeitstand: ZEITSTAND,
    regelversion: REGELVERSION,
    pruefstand: "fachlich_zu_verifizieren",
    herkunft: "auftrag",
  },
  {
    id: "R-CH-0002",
    regel: "Der Empfangstag zaehlt nicht mit; die Frist laeuft ab dem Folgetag.",
    wenn: ["eine Frist nach R-CH-0001 wird berechnet"],
    dann: ["folge:fristbeginn_am_folgetag"],
    quellen: [{ artikel: "Fristenrecht OR", fundstelle: "OR (SR 220), allgemeines Fristenrecht" }],
    zeitstand: ZEITSTAND,
    regelversion: REGELVERSION,
    pruefstand: "fachlich_zu_verifizieren",
    herkunft: "auftrag",
  },
  {
    id: "R-CH-0003",
    regel:
      "Faellt das Fristende auf einen Samstag, Sonntag oder gesetzlichen Feiertag, verschiebt es sich auf den naechsten Werktag.",
    wenn: ["ein berechnetes Fristende faellt auf Samstag, Sonntag oder Feiertag"],
    dann: ["folge:fristende_verschiebung_auf_naechsten_werktag"],
    quellen: [{ artikel: "Fristenrecht/ZPO", fundstelle: "OR (SR 220) / ZPO (SR 272)" }],
    zeitstand: ZEITSTAND,
    regelversion: REGELVERSION,
    pruefstand: "fachlich_zu_verifizieren",
    herkunft: "auftrag",
  },
  {
    id: "R-CH-0004",
    regel:
      "Ein nicht abgeholtes Einschreiben gilt am Ende der 7-taegigen Abholfrist als zugestellt (Zustellfiktion).",
    wenn: ["kuendigung.zustellart=einschreiben", "abholfrist_ende ist erfasst (nicht abgeholt)"],
    dann: ["parameter:abholfrist_tage=7", "folge:zustellfiktion_am_ende_der_abholfrist"],
    quellen: [
      {
        artikel: "Zustellrecht",
        fundstelle: "Zustellrecht (Zustellfiktion Einschreiben, 7-taegige Abholfrist)",
      },
    ],
    zeitstand: ZEITSTAND,
    regelversion: REGELVERSION,
    pruefstand: "fachlich_zu_verifizieren",
    herkunft: "auftrag",
  },
  {
    id: "R-CH-0005",
    regel:
      "Eine Kuendigung ohne amtliches Formular oder ohne Unterschrift kann nichtig sein.",
    wenn: [
      "kuendigung.amtliches_formular=false oder kuendigung.unterschrieben=false",
    ],
    dann: ["flag:nichtig_formular_fehlt", "flag:nichtig_unterschrift_fehlt"],
    quellen: [{ artikel: "Art. 266l / 266o OR", fundstelle: "OR (SR 220)" }],
    zeitstand: ZEITSTAND,
    regelversion: REGELVERSION,
    pruefstand: "fachlich_zu_verifizieren",
    herkunft: "auftrag",
  },
  {
    id: "R-CH-0006",
    regel:
      "Bei einer Familienwohnung muss die Kuendigung beiden Partnern separat zugestellt werden; sonst kann sie nichtig sein.",
    wenn: [
      "wohnung.familienwohnung=true",
      "wohnung.separate_zustellung_beide=false",
    ],
    dann: ["flag:nichtig_familienwohnung_zustellung"],
    quellen: [{ artikel: "Art. 266n / 266o OR", fundstelle: "OR (SR 220)" }],
    zeitstand: ZEITSTAND,
    regelversion: REGELVERSION,
    pruefstand: "fachlich_zu_verifizieren",
    herkunft: "auftrag",
  },
  {
    id: "R-CH-0007",
    regel:
      "Wegen eines Verfahrens aus dem Mietverhaeltnis kann eine Sperrfrist bestehen; die Kuendigung kann anfechtbar sein.",
    wenn: [
      "sperrfrist.verfahren_letzte_3_jahre=true oder sperrfrist.verfahren_haengig=true (haengiges Verfahren: offene fachliche Frage, siehe core/src/regeln.ts)",
    ],
    dann: ["flag:sperrfrist_271a_moeglich"],
    quellen: [{ artikel: "Art. 271a OR", fundstelle: "OR (SR 220)" }],
    zeitstand: ZEITSTAND,
    regelversion: REGELVERSION,
    pruefstand: "fachlich_zu_verifizieren",
    herkunft: "auftrag",
  },
  {
    id: "R-CH-0008",
    regel:
      "Wurden kurz vor der Kuendigung Rechte aus dem Mietverhaeltnis geltend gemacht, kann das ein Hinweis auf eine anfechtbare Rachekuendigung sein.",
    wenn: ["sperrfrist.rechte_geltend_gemacht=true"],
    dann: ["flag:rachekuendigung_indiz"],
    quellen: [{ artikel: "Art. 271a OR", fundstelle: "OR (SR 220)" }],
    zeitstand: ZEITSTAND,
    regelversion: REGELVERSION,
    pruefstand: "fachlich_zu_verifizieren",
    herkunft: "auftrag",
  },
  {
    id: "R-CH-0009",
    regel:
      "Sonderrechtslage befristetes Mietverhaeltnis: Ob und wie die Anfechtungsfrist gilt, ist fachlich zu klaeren; es wird keine Fristaussage gemacht.",
    wenn: ["vertrag.befristet=true"],
    dann: ["flag:befristetes_verhaeltnis_sonderfall"],
    quellen: [
      {
        artikel: "offen — Sonderrechtslage befristetes Mietverhaeltnis, fachlich zu klaeren",
        fundstelle: "AUFTRAG-S1 §4 (Flag-Katalog); keine Quellenangabe im Auftrag",
      },
    ],
    zeitstand: ZEITSTAND,
    regelversion: REGELVERSION,
    pruefstand: "fachlich_zu_verifizieren",
    herkunft: "auftrag",
  },
  {
    id: "R-CH-0010",
    regel:
      "Produktiv abgedeckt ist in M1 ausschliesslich der Kanton Luzern; fuer andere Kantone wird keine Einschaetzung ausgegeben.",
    wenn: ["kanton ungleich LU"],
    dann: ["flag:ausserhalb_m1_scope"],
    quellen: [
      {
        artikel: "M1-Scope: nur Kanton Luzern produktiv",
        fundstelle: "DER_PLAN_v1.0_FROZEN.md §3; ADR-0002",
      },
    ],
    zeitstand: ZEITSTAND,
    regelversion: REGELVERSION,
    pruefstand: "technisch_validiert",
    herkunft: "auftrag",
  },
  {
    id: "R-LU-0001",
    regel:
      "Fuer die Fristverschiebung nach R-CH-0003 gelten die gesetzlichen Feiertage des Kantons Luzern.",
    wenn: ["kanton=LU", "ein Fristende wird auf Verschiebung geprueft"],
    dann: ["folge:feiertagsliste_lu_massgeblich"],
    quellen: [
      {
        artikel: "Gesetzliche Feiertage Kanton Luzern",
        fundstelle: "kantonales Recht LU (Feiertagsliste, siehe feiertage_lu.ts)",
      },
    ],
    zeitstand: ZEITSTAND,
    regelversion: REGELVERSION,
    pruefstand: "fachlich_zu_verifizieren",
    herkunft: "auftrag",
  },
];

/* ---------- Generierung von core/src/register.gen.ts ---------- */

/** Parst die dann-Konvention "parameter:<name>=<ganzzahl>" ueber alle Eintraege. */
export function parameterAus(eintraege: readonly RegisterEintrag[]): Record<string, number> {
  const parameter: Record<string, number> = {};
  for (const eintrag of eintraege) {
    for (const folge of eintrag.dann) {
      const treffer = /^parameter:([a-z_]+)=([0-9]+)$/.exec(folge);
      if (!treffer) continue;
      const name = treffer[1] as string;
      const wert = Number(treffer[2]);
      if (name in parameter && parameter[name] !== wert) {
        throw new Error(
          `Register widerspruechlich: Parameter '${name}' ist doppelt mit abweichendem Wert (Eintrag ${eintrag.id}).`,
        );
      }
      parameter[name] = wert;
    }
  }
  return parameter;
}

/** Einheitlicher Wert ueber alle Eintraege; Fehler bei Abweichung. */
function einheitlich(
  eintraege: readonly RegisterEintrag[],
  feld: "regelversion" | "zeitstand",
): string {
  const werte = new Set(eintraege.map((e) => e[feld]));
  if (werte.size !== 1) {
    throw new Error(
      `Register nicht einheitlich: Feld '${feld}' hat mehrere Werte (${[...werte].join(", ")}). ` +
        "core/src/register.gen.ts braucht dafuer eine Erweiterung (Change am Werkzeug, kein Handedit der Gen-Datei).",
    );
  }
  return [...werte][0] as string;
}

/**
 * Erzeugt den vollstaendigen Inhalt von core/src/register.gen.ts aus den
 * Register-Eintraegen (deterministisch; gleiche Eingabe => gleiche Datei).
 */
export function erzeugeRegisterGen(eintraege: readonly RegisterEintrag[]): string {
  const sortiert = [...eintraege].sort((a, b) => (a.id < b.id ? -1 : 1));
  const ids = new Set(sortiert.map((e) => e.id));
  for (const [quelleId, regelId] of Object.entries(QUELLE_ZU_REGEL)) {
    if (!ids.has(regelId)) {
      throw new Error(`Zuordnung ${quelleId} -> ${regelId}: Register-Eintrag fehlt.`);
    }
  }
  const regelversion = einheitlich(sortiert, "regelversion");
  const zeitstand = einheitlich(sortiert, "zeitstand");
  const parameter = parameterAus(sortiert);

  const eintraegeJson = JSON.stringify(sortiert, null, 2);
  const mappingJson = JSON.stringify(QUELLE_ZU_REGEL, null, 2);
  const parameterJson = JSON.stringify(parameter, null, 2);

  return `/**
 * GENERIERT von wissen/tools/migrate.ts aus wissen/register/*.json —
 * NICHT von Hand aendern (AUFTRAG-W0 Teil B).
 *
 * Quelle der Wahrheit fuer Quellen und Regel-Metadaten ist das
 * Wissens-Register (wissen/register/). Aenderungen dort vornehmen und
 * anschliessend \`cd wissen && npm run migrate\` ausfuehren.
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
export const REGISTER: readonly RegisterEintrag[] = ${eintraegeJson};

/** Zuordnung core-QuelleId -> Register-Regel-ID (Migrations-Metadatum). */
export const QUELLE_ZU_REGEL: Readonly<Record<QuelleId, string>> = ${mappingJson};

/** Einheitliche Regelversion aller Register-Eintraege. */
export const REGISTER_REGELVERSION = ${JSON.stringify(regelversion)};

/** Einheitlicher Zeitstand aller Register-Eintraege. */
export const REGISTER_ZEITSTAND: IsoDate = ${JSON.stringify(zeitstand)};

/** Rechtsparameter aus der dann-Konvention "parameter:<name>=<ganzzahl>". */
export const REGISTER_PARAMETER: Readonly<Record<string, number>> = ${parameterJson};
`;
}

/* ---------- CLI ---------- */

function hauptlauf(): void {
  const registerVerzeichnis = wissenPfad("register");
  mkdirSync(registerVerzeichnis, { recursive: true });

  // Aufgabe 1: Seed — bestehende Dateien werden NIE ueberschrieben.
  for (const eintrag of SEED) {
    const dateipfad = join(registerVerzeichnis, `${eintrag.id}.json`);
    if (existsSync(dateipfad)) {
      const vorhanden = JSON.stringify(JSON.parse(readFileSync(dateipfad, "utf8")));
      if (vorhanden !== JSON.stringify(eintrag)) {
        console.log(
          `~ ${eintrag.id}: vorhandener Eintrag weicht vom Seed ab — bleibt unveraendert (Register ist Quelle der Wahrheit).`,
        );
      }
      continue;
    }
    writeFileSync(dateipfad, `${JSON.stringify(eintrag, null, 2)}\n`);
    console.log(`+ ${eintrag.id}.json angelegt`);
  }

  // Aufgabe 2: register.gen.ts aus dem Register (Quelle der Wahrheit) erzeugen.
  const eintraege = leseRegister() as RegisterEintrag[];
  const genPfad = wissenPfad("..", "core", "src", "register.gen.ts");
  writeFileSync(genPfad, erzeugeRegisterGen(eintraege));
  console.log(`core/src/register.gen.ts regeneriert (${eintraege.length} Eintraege).`);
}

if (istDirektAufruf(import.meta.url)) {
  hauptlauf();
}

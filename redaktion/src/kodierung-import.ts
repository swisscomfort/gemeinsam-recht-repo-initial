// kodierung-import.ts — CLI `npm run kodierung-import -- --datei <pfad>`
// (MANIFEST v2.1 §5).
//
// Liest eine Zweitlauf-Antwortdatei (Format: Array von
// { id, lauf, datum, wert, textstelle }), vergleicht sie je Story mit dem
// bisherigen (Lauf-1-)Wert aus meta.yaml und schreibt kodierung_status +
// kodierung_quellen zurueck: gleiche Wertemenge -> doppelt_bestaetigt,
// abweichend -> strittig (beide Laeufe bleiben in kodierung_quellen
// nachvollziehbar). Gibt am Ende die Liste der strittigen Faelle aus.
// Stories ohne passenden Zweitlauf-Eintrag bleiben unveraendert.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  leseKodierungsQuellen,
  leseSkalar,
  schreibeAktualisiertesMeta,
  vergleicheZweitlauf,
  type AktuelleKodierung,
  type ZweitlaufAntwort,
} from "./kodierung.js";

function wurzelVerzeichnis(): string {
  // dist/kodierung-import.js -> redaktion/
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

function argument(name: string): string | null {
  const stelle = process.argv.indexOf(`--${name}`);
  if (stelle === -1 || stelle + 1 >= process.argv.length) return null;
  return process.argv[stelle + 1] ?? null;
}

interface Fundstelle {
  id: string;
  metaPfad: string;
  metaRoh: string;
}

function findeAlleMetaDateien(verzeichnis: string): Fundstelle[] {
  let namen: string[];
  try {
    namen = readdirSync(verzeichnis, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
  const gefunden: Fundstelle[] = [];
  for (const name of namen) {
    const metaPfad = join(verzeichnis, name, "meta.yaml");
    let metaRoh: string;
    try {
      metaRoh = readFileSync(metaPfad, "utf8");
    } catch {
      continue;
    }
    const id = leseSkalar(metaRoh, "id") ?? name;
    gefunden.push({ id, metaPfad, metaRoh });
  }
  return gefunden;
}

function haupt(): void {
  const datei = argument("datei");
  if (!datei) {
    throw new Error("Aufruf: npm run kodierung-import -- --datei <pfad-zur-zweitlauf-antwort.json>");
  }
  const antworten = JSON.parse(readFileSync(datei, "utf8")) as ZweitlaufAntwort[];

  const wurzel = wurzelVerzeichnis();
  const repoWurzel = join(wurzel, "..");
  const fundstellen = [
    ...findeAlleMetaDateien(join(repoWurzel, "prototypen", "stories")),
    ...findeAlleMetaDateien(join(repoWurzel, "redaktion", "entwuerfe")),
  ];
  const fundstelleProId = new Map(fundstellen.map((f) => [f.id, f]));

  const antwortIds = new Set(antworten.map((a) => a.id));
  const aktuelle: AktuelleKodierung[] = [];
  for (const id of antwortIds) {
    const fund = fundstelleProId.get(id);
    if (!fund) {
      console.warn(`Uebersprungen: "${id}" aus der Zweitlauf-Datei hat keine passende Story im Repo.`);
      continue;
    }
    const quellen = leseKodierungsQuellen(fund.metaRoh);
    if (quellen.length === 0) {
      console.warn(`Uebersprungen: "${id}" hat keinen Lauf-1-Eintrag in kodierung_quellen.`);
      continue;
    }
    aktuelle.push({ id, ersterLauf: quellen[0]! });
  }

  const { ergebnisse, strittig, ohneZweitlauf } = vergleicheZweitlauf(aktuelle, antworten);

  for (const eintrag of ergebnisse) {
    const fund = fundstelleProId.get(eintrag.id)!;
    const neu = schreibeAktualisiertesMeta(fund.metaRoh, eintrag.kodierung_status, eintrag.kodierung_quellen);
    writeFileSync(fund.metaPfad, neu, "utf8");
  }

  console.log(`Zweitlauf-Import: ${ergebnisse.length} Story/Stories verglichen.`);
  console.log(`  doppelt_bestaetigt: ${ergebnisse.length - strittig.length}`);
  console.log(`  strittig:           ${strittig.length}`);
  if (ohneZweitlauf.length > 0) {
    console.log(`  ohne Zweitlauf-Eintrag (unveraendert): ${ohneZweitlauf.join(", ")}`);
  }
  if (strittig.length > 0) {
    console.log("\nStrittige Faelle (zur menschlichen Entscheidung):");
    for (const eintrag of strittig) {
      const [lauf1, lauf2] = eintrag.kodierung_quellen;
      console.log(
        `  ${eintrag.id}: ${lauf1!.lauf}=[${lauf1!.wert.join(",")}] vs. ${lauf2!.lauf}=[${lauf2!.wert.join(",")}]`,
      );
    }
  }
}

haupt();

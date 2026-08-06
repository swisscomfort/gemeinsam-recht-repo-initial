// kandidaten.ts — CLI `npm run kandidaten` (AUFTRAG-R0 §2).
//
// Holt oeffentlich publizierte Entscheide (ab 2025-01-01 bis heute) fuer die
// in filter.json aktiven Rechtsgebiete von entscheidsuche.ch und schreibt
// Monatslisten nach redaktion/kandidaten/JJJJ-MM.md — nur Metadaten und
// Links. Das Tagesdatum wird hier am Werkzeugrand gelesen und in die reine
// Formatlogik injiziert (die Fachmodule lesen keine Uhr).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { holeTreffer } from "./abruf.js";
import { kandidatenAus, monatsListen, type Kandidat } from "./format.js";

const START_DATUM = "2025-01-01";

interface FilterKonfiguration {
  aktiv: string[];
  rechtsgebiete: Record<string, { name: string; suchanfrage: string }>;
}

function wurzelVerzeichnis(): string {
  // dist/kandidaten.js -> redaktion/
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

function heuteISO(): string {
  const jetzt = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${jetzt.getFullYear()}-${pad(jetzt.getMonth() + 1)}-${pad(jetzt.getDate())}`;
}

function argument(name: string): string | null {
  const stelle = process.argv.indexOf(`--${name}`);
  if (stelle === -1 || stelle + 1 >= process.argv.length) return null;
  return process.argv[stelle + 1] ?? null;
}

function pruefeDatum(wert: string, name: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(wert)) {
    throw new Error(`--${name} muss die Form JJJJ-MM-TT haben, erhalten: "${wert}"`);
  }
  return wert;
}

async function haupt(): Promise<void> {
  const wurzel = wurzelVerzeichnis();
  const von = pruefeDatum(argument("von") ?? START_DATUM, "von");
  const bis = pruefeDatum(argument("bis") ?? heuteISO(), "bis");

  const filter = JSON.parse(
    readFileSync(join(wurzel, "filter.json"), "utf8"),
  ) as FilterKonfiguration;
  const aktive = filter.aktiv.filter((g) => filter.rechtsgebiete[g] !== undefined);
  if (aktive.length === 0) {
    throw new Error('filter.json: kein aktives Rechtsgebiet gefunden (Feld "aktiv").');
  }

  console.log(`Kandidaten-Abruf von entscheidsuche.ch · Zeitraum ${von} bis ${bis}`);
  console.log(`Aktive Rechtsgebiete: ${aktive.map((g) => filter.rechtsgebiete[g]!.name).join(", ")}`);
  console.log("Nur Metadaten und Links — keine Volltexte. Abruf gedrosselt (1 Seite/Sekunde).");

  const gesehen = new Set<string>();
  const kandidaten: Kandidat[] = [];
  for (const gebiet of aktive) {
    const { name, suchanfrage } = filter.rechtsgebiete[gebiet]!;
    console.log(`\nRechtsgebiet ${name}:`);
    const ergebnis = await holeTreffer(suchanfrage, von, bis, (text) => console.log(text));
    for (const kandidat of kandidatenAus({ hits: { hits: ergebnis.treffer } })) {
      if (gesehen.has(kandidat.link)) continue;
      gesehen.add(kandidat.link);
      kandidaten.push(kandidat);
    }
  }

  const dateien = monatsListen(
    kandidaten,
    bis,
    aktive.map((g) => filter.rechtsgebiete[g]!.name),
  );
  const zielVerzeichnis = join(wurzel, "kandidaten");
  mkdirSync(zielVerzeichnis, { recursive: true });
  for (const [monat, inhalt] of dateien) {
    writeFileSync(join(zielVerzeichnis, `${monat}.md`), inhalt, "utf8");
  }

  console.log(`\nFertig: ${kandidaten.length} Kandidaten in ${dateien.size} Monatsliste(n).`);
  for (const monat of dateien.keys()) {
    console.log(`  kandidaten/${monat}.md`);
  }
  if (kandidaten.length === 0) {
    console.log("Keine Treffer im Zeitraum — es wurde keine Datei geschrieben.");
  }
}

haupt().catch((fehler: unknown) => {
  const meldung = fehler instanceof Error ? fehler.message : String(fehler);
  console.error(`\nAbbruch: ${meldung}`);
  process.exitCode = 1;
});

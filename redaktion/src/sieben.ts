// sieben.ts — CLI `npm run sieben` (AUFTRAG-R1 §1, Stufe 1).
//
// Liest alle Monatslisten redaktion/kandidaten/*.md, siebt sie deterministisch
// nach redaktion/sieb.json und schreibt redaktion/gesiebt/JJJJ-MM-TT.md sowie
// redaktion/gesiebt/spaeter-fr-it.md. Arbeitet strikt OHNE Netz; das
// Tagesdatum wird hier am Werkzeugrand gelesen und in die reine Sieblogik
// injiziert (die Fachmodule lesen keine Uhr).

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  gesiebtListe,
  parseKandidatenListe,
  siebe,
  spaeterListe,
  type KandidatZeile,
  type SiebKonfiguration,
} from "./sieb.js";

function wurzelVerzeichnis(): string {
  // dist/sieben.js -> redaktion/
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

function heuteISO(): string {
  const jetzt = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${jetzt.getFullYear()}-${pad(jetzt.getMonth() + 1)}-${pad(jetzt.getDate())}`;
}

function haupt(): void {
  const wurzel = wurzelVerzeichnis();
  const konfig = JSON.parse(readFileSync(join(wurzel, "sieb.json"), "utf8")) as SiebKonfiguration;

  const kandidatenVerzeichnis = join(wurzel, "kandidaten");
  const dateien = readdirSync(kandidatenVerzeichnis)
    .filter((name) => /^\d{4}-\d{2}\.md$/.test(name))
    .sort();
  if (dateien.length === 0) {
    throw new Error(
      "Keine Monatslisten unter redaktion/kandidaten/ gefunden — zuerst `npm run kandidaten` ausfuehren.",
    );
  }

  const zeilen: KandidatZeile[] = [];
  for (const datei of dateien) {
    zeilen.push(...parseKandidatenListe(readFileSync(join(kandidatenVerzeichnis, datei), "utf8")));
  }

  const ergebnis = siebe(zeilen, konfig);
  const heute = heuteISO();
  const zielVerzeichnis = join(wurzel, "gesiebt");
  mkdirSync(zielVerzeichnis, { recursive: true });
  writeFileSync(join(zielVerzeichnis, `${heute}.md`), gesiebtListe(ergebnis, heute, dateien), "utf8");
  writeFileSync(join(zielVerzeichnis, "spaeter-fr-it.md"), spaeterListe(ergebnis, heute), "utf8");

  console.log(`Metadaten-Sieb (ohne Netz) ueber ${zeilen.length} Kandidatenzeilen aus ${dateien.length} Monatsliste(n).`);
  console.log(`  Deutsch, sortiert:      ${ergebnis.deutsch.length} → gesiebt/${heute}.md`);
  console.log(`  Spaeter (FR/IT):        ${ergebnis.spaeter.length} → gesiebt/spaeter-fr-it.md`);
  console.log(`  Instanzen-Dubletten:    ${ergebnis.dubletten.length} ausgeblendet (im Dokument ausgewiesen)`);
}

try {
  haupt();
} catch (fehler) {
  const meldung = fehler instanceof Error ? fehler.message : String(fehler);
  console.error(`\nAbbruch: ${meldung}`);
  process.exitCode = 1;
}

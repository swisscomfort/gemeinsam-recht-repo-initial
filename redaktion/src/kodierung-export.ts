// kodierung-export.ts — CLI `npm run kodierung-export` (MANIFEST v2.1 §5).
//
// Liest alle NACHERZAEHLT_OEFFENTLICH-Geschichten aus prototypen/stories/ und
// redaktion/entwuerfe/ mit kodierung_status "vorschlag" (oder fehlendem
// Schluessel, Default) und schreibt EINE Exportdatei pro Stapel nach
// redaktion/kodierung/zweitlauf-JJJJ-MM-TT.json — Story-ID, voller Text
// (story.md) und die Werteliste aus wissen/scheiterpunkte.json. Der
// Lauf-1-Vorschlag (meta.yaml: scheiterpunkt/kodierung_quellen) wird nicht
// gelesen und erscheint nicht im Export, damit der Zweitlauf unbeeinflusst
// bleibt (§5: "verschiedene Modelle, nicht derselbe Lauf zweimal"). Das
// Tagesdatum wird hier am Werkzeugrand gelesen und injiziert — keine
// Systemzeit in kodierung.ts.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { baueZweitlaufExport, leseSkalar, type ExportEintrag } from "./kodierung.js";

function wurzelVerzeichnis(): string {
  // dist/kodierung-export.js -> redaktion/
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

function heuteISO(): string {
  const jetzt = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${jetzt.getFullYear()}-${pad(jetzt.getMonth() + 1)}-${pad(jetzt.getDate())}`;
}

function sammleKandidaten(verzeichnis: string): ExportEintrag[] {
  let namen: string[];
  try {
    namen = readdirSync(verzeichnis, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
  const kandidaten: ExportEintrag[] = [];
  for (const name of namen) {
    const metaPfad = join(verzeichnis, name, "meta.yaml");
    const storyPfad = join(verzeichnis, name, "story.md");
    let meta: string;
    let story: string;
    try {
      meta = readFileSync(metaPfad, "utf8");
      story = readFileSync(storyPfad, "utf8");
    } catch {
      continue;
    }
    const kennzeichnung = leseSkalar(meta, "kennzeichnung");
    if (kennzeichnung !== "NACHERZAEHLT_OEFFENTLICH") continue;
    const status = leseSkalar(meta, "kodierung_status") ?? "vorschlag";
    if (status !== "vorschlag") continue;
    const id = leseSkalar(meta, "id") ?? name;
    kandidaten.push({ id, textauszug: story.trim() });
  }
  return kandidaten;
}

function haupt(): void {
  const wurzel = wurzelVerzeichnis();
  const repoWurzel = join(wurzel, "..");
  const scheiterpunkte = JSON.parse(
    readFileSync(join(repoWurzel, "wissen", "scheiterpunkte.json"), "utf8"),
  ) as { version: string; werte: string[] };

  const kandidaten = [
    ...sammleKandidaten(join(repoWurzel, "prototypen", "stories")),
    ...sammleKandidaten(join(repoWurzel, "redaktion", "entwuerfe")),
  ];

  const heute = heuteISO();
  const zielVerzeichnis = join(wurzel, "kodierung");
  mkdirSync(zielVerzeichnis, { recursive: true });
  const zielDatei = join(zielVerzeichnis, `zweitlauf-${heute}.json`);

  const exportDatei = baueZweitlaufExport(kandidaten, scheiterpunkte.werte, scheiterpunkte.version, heute, heute);
  writeFileSync(zielDatei, `${JSON.stringify(exportDatei, null, 2)}\n`, "utf8");

  console.log(
    `Zweitlauf-Export: ${kandidaten.length} Geschichte(n) mit kodierung_status "vorschlag" -> ${zielDatei}`,
  );
  if (kandidaten.length === 0) {
    console.log("Keine offenen Vorschlaege — nichts zu exportieren.");
  }
}

haupt();

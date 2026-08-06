// umgebung.ts — gemeinsame Hilfsfunktionen der wissen-Werkzeuge.
// Nur lokale Dateizugriffe; kein Netzwerk, keine Systemzeit.

import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Absoluter Pfad relativ zur wissen/-Wurzel. */
export function wissenPfad(...teile: string[]): string {
  const toolsVerzeichnis = dirname(fileURLToPath(import.meta.url));
  return join(dirname(toolsVerzeichnis), ...teile);
}

/**
 * true, wenn das Modul direkt via `node tools/<name>.ts` laeuft (CLI),
 * false bei Import durch Tests oder andere Module.
 */
export function istDirektAufruf(importMetaUrl: string): boolean {
  const aufgerufen = process.argv[1];
  if (!aufgerufen) return false;
  return basename(importMetaUrl) === basename(aufgerufen);
}

/** Liest und parst eine JSON-Datei. */
export function leseJson(pfad: string): unknown {
  return JSON.parse(readFileSync(pfad, "utf8"));
}

/** Alle Register-Eintraege aus wissen/register/*.json, nach Dateiname sortiert. */
export function leseRegister(): unknown[] {
  const verzeichnis = wissenPfad("register");
  return readdirSync(verzeichnis)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => leseJson(join(verzeichnis, name)));
}

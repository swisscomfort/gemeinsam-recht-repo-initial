// umgebung.ts — gemeinsame Hilfsfunktionen der messkorpus-Werkzeuge.
// Nur lokale Dateizugriffe; kein Netzwerk, keine Systemzeit.
// Angelegt wie wissen/tools/umgebung.ts (gleiche Architektur, kein zweiter Stil).

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Absoluter Pfad relativ zur messkorpus/-Wurzel. */
export function messkorpusPfad(...teile: string[]): string {
  const toolsVerzeichnis = dirname(fileURLToPath(import.meta.url));
  return join(dirname(toolsVerzeichnis), ...teile);
}

/** Absoluter Pfad relativ zur Repo-Wurzel (eine Ebene ueber messkorpus/). */
export function repoPfad(...teile: string[]): string {
  const toolsVerzeichnis = dirname(fileURLToPath(import.meta.url));
  return join(dirname(dirname(toolsVerzeichnis)), ...teile);
}

/** true, wenn das Modul direkt via `node tools/<name>.ts` laeuft (CLI). */
export function istDirektAufruf(importMetaUrl: string): boolean {
  const aufgerufen = process.argv[1];
  if (!aufgerufen) return false;
  return basename(importMetaUrl) === basename(aufgerufen);
}

export function leseJson(pfad: string): unknown {
  return JSON.parse(readFileSync(pfad, "utf8"));
}

export function leseText(pfad: string): string {
  return readFileSync(pfad, "utf8");
}

/** Alle Messdefinitionen aus messkorpus/definitionen/*.json, nach Dateiname sortiert. */
export function leseDefinitionen(): { datei: string; inhalt: unknown; roh: string }[] {
  const verzeichnis = messkorpusPfad("definitionen");
  if (!existsSync(verzeichnis)) return [];
  return readdirSync(verzeichnis)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const roh = readFileSync(join(verzeichnis, name), "utf8");
      return { datei: name, inhalt: JSON.parse(roh) as unknown, roh };
    });
}

/** Alle Messlaeufe aus messkorpus/laeufe/<ID>/lauf.json, nach Verzeichnis sortiert. */
export function leseLaeufe(): { verzeichnis: string; inhalt: unknown }[] {
  const wurzel = messkorpusPfad("laeufe");
  if (!existsSync(wurzel)) return [];
  return readdirSync(wurzel)
    .sort()
    .map((name) => ({ verzeichnis: name, pfad: join(wurzel, name, "lauf.json") }))
    .filter((eintrag) => existsSync(eintrag.pfad))
    .map((eintrag) => ({
      verzeichnis: eintrag.verzeichnis,
      inhalt: JSON.parse(readFileSync(eintrag.pfad, "utf8")) as unknown,
    }));
}

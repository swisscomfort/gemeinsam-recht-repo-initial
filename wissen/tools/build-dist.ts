// build-dist.ts — oeffentliche Sicht, NUR LOKAL gebaut (AUFTRAG-W0 Teil E).
//
// Erzeugt wissen/dist/ nach dem OSM-CH-Muster: index.json (version, zeitstand,
// anzahl, signatur: null als Platzhalter) + nach pruefstand gefilterte Sichten
// (alle.json, verifiziert.json) + versionen.json (Ergaenzung E2: regel_id ->
// aktuelle regelversion, damit Clients lokal pruefen koennen, ob eine
// verwendete Regel inzwischen korrigiert wurde; seit Konzept v2 §5.3 zusaetzlich
// je Kodierliste, z. B. "KL-SCHEITERPUNKTE" -> Version aus scheiterpunkte.json,
// analog zu den Regeln, additiv ueber den optionalen zweiten Parameter).
//
// Kein Deploy, kein Upload — Veroeffentlichung ist ein separater menschlicher
// Entscheid. Deterministisch: zeitstand ist der juengste Eintrags-Zeitstand
// (keine Systemzeit), Sortierung stets nach id.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RegisterEintrag } from "./migrate.ts";
import { istDirektAufruf, leseJson, leseRegister, wissenPfad } from "./umgebung.ts";
import { pruefeErkenntnis } from "./validierung.ts";

/** Formatversion der dist-Sicht (nicht die Regelversion der Eintraege). */
export const DIST_VERSION = "0.1.0";

export interface DistIndex {
  version: string;
  zeitstand: string;
  anzahl: number;
  signatur: null;
}

export interface Dist {
  index: DistIndex;
  alle: RegisterEintrag[];
  verifiziert: RegisterEintrag[];
  versionen: Record<string, string>;
}

/**
 * Baut die dist-Sichten aus Register-Eintraegen (rein, deterministisch).
 * `kodierlisten` (optional, Default leer — bestehende Aufrufe unveraendert)
 * registriert zusaetzliche Eintraege in versionen.json, id -> Version,
 * analog zu den Regeln (Konzept v2 §5.3, z. B. "KL-SCHEITERPUNKTE").
 */
export function baueDist(
  eintraege: readonly RegisterEintrag[],
  kodierlisten: Readonly<Record<string, string>> = {},
): Dist {
  for (const eintrag of eintraege) {
    const schema = pruefeErkenntnis(eintrag);
    if (!schema.ok) {
      throw new Error(
        `Register-Eintrag ungueltig (${(eintrag as { id?: string }).id ?? "?"}): ${schema.fehler.join("; ")}`,
      );
    }
  }
  const alle = [...eintraege].sort((a, b) => (a.id < b.id ? -1 : 1));
  const zeitstand = alle.reduce(
    (juengster, e) => (e.zeitstand > juengster ? e.zeitstand : juengster),
    "0000-00-00",
  );
  const versionen: Record<string, string> = { ...kodierlisten };
  for (const eintrag of alle) versionen[eintrag.id] = eintrag.regelversion;
  return {
    index: { version: DIST_VERSION, zeitstand, anzahl: alle.length, signatur: null },
    alle,
    verifiziert: alle.filter((e) => e.pruefstand === "fachlich_verifiziert"),
    versionen,
  };
}

/* ---------- CLI ---------- */

if (istDirektAufruf(import.meta.url)) {
  const scheiterpunkte = leseJson(wissenPfad("scheiterpunkte.json")) as { version: string };
  const dist = baueDist(leseRegister() as RegisterEintrag[], {
    "KL-SCHEITERPUNKTE": scheiterpunkte.version,
  });
  const verzeichnis = wissenPfad("dist");
  mkdirSync(verzeichnis, { recursive: true });
  const schreibe = (name: string, wert: unknown): void => {
    writeFileSync(join(verzeichnis, name), `${JSON.stringify(wert, null, 2)}\n`);
  };
  schreibe("index.json", dist.index);
  schreibe("alle.json", dist.alle);
  schreibe("verifiziert.json", dist.verifiziert);
  schreibe("versionen.json", dist.versionen);
  console.log(
    `wissen/dist/ gebaut: ${dist.index.anzahl} Eintraege, davon ${dist.verifiziert.length} fachlich verifiziert. Kein Deploy — nur lokal.`,
  );
}

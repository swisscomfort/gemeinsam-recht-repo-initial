// faelle.ts — liest die dokumentierten Faelle als KodierteStory ein.
//
// Der meta.yaml-Leser wird NICHT ein drittes Mal geschrieben: leseSkalar und
// leseListe kommen unveraendert aus redaktion/src/kodierung.ts (dort ohne
// eigene Importe, deshalb direkt nutzbar). Der Typ KodierteStory kommt aus
// wissen/tools/kodierung-quoten.ts. Dieses Modul verbindet nur beides.
//
// Kein Netz, keine Systemzeit.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { leseListe, leseSkalar } from "../../redaktion/src/kodierung.ts";
import type { KodierteStory, KodierungStatus } from "../../wissen/tools/kodierung-quoten.ts";
import { repoPfad } from "./umgebung.ts";

/** Verzeichnisse, in denen Faelle liegen: freigegebene Geschichten und Entwuerfe. */
export const FALL_VERZEICHNISSE = [
  ["prototypen", "stories"],
  ["redaktion", "entwuerfe"],
] as const;

export interface FallMitHerkunft extends KodierteStory {
  /** true, wenn der Fall noch Entwurf ist (redaktion/entwuerfe/). */
  entwurf: boolean;
  /**
   * Fassung der Kodierliste, unter der die Werte vergeben wurden. Muss
   * mitgelesen werden: jede materialisierte Quote fuehrt sie mit, sonst
   * fehlt der Rueckbezug auf die Liste, gegen die kodiert wurde.
   */
  kodierliste_version?: string;
}

function ausMeta(roh: string, entwurf: boolean): FallMitHerkunft | null {
  const id = leseSkalar(roh, "id");
  const kennzeichnung = leseSkalar(roh, "kennzeichnung");
  if (!id || !kennzeichnung) return null;

  const status = leseSkalar(roh, "kodierung_status");
  return {
    id,
    kennzeichnung,
    regel_id: leseSkalar(roh, "regel_id") ?? undefined,
    rechtskraft_status: leseSkalar(roh, "rechtskraft_status") ?? undefined,
    kodierung_status: (status as KodierungStatus | null) ?? undefined,
    ausgang: leseSkalar(roh, "ausgang") ?? undefined,
    scheiterpunkt: leseListe(roh, "scheiterpunkt") ?? undefined,
    kodierliste_version: leseSkalar(roh, "kodierliste_version") ?? undefined,
    entwurf,
  };
}

/** Alle Faelle, nach ID. Fehlende Verzeichnisse sind kein Fehler. */
export function leseFaelle(): Map<string, FallMitHerkunft> {
  const faelle = new Map<string, FallMitHerkunft>();
  for (const teile of FALL_VERZEICHNISSE) {
    const wurzel = repoPfad(...teile);
    if (!existsSync(wurzel)) continue;
    const entwurf = teile[0] === "redaktion";
    for (const name of readdirSync(wurzel).sort()) {
      const metaPfad = join(wurzel, name, "meta.yaml");
      if (!existsSync(metaPfad)) continue;
      const fall = ausMeta(readFileSync(metaPfad, "utf8"), entwurf);
      if (fall) faelle.set(fall.id, fall);
    }
  }
  return faelle;
}

/** Aktenzeichen -> Fall-ID, fuer die Zuordnung von Treffern zu Faellen. */
export function nachAktenzeichen(): Map<string, string> {
  const zuordnung = new Map<string, string>();
  for (const teile of FALL_VERZEICHNISSE) {
    const wurzel = repoPfad(...teile);
    if (!existsSync(wurzel)) continue;
    for (const name of readdirSync(wurzel).sort()) {
      const metaPfad = join(wurzel, name, "meta.yaml");
      if (!existsSync(metaPfad)) continue;
      const roh = readFileSync(metaPfad, "utf8");
      const id = leseSkalar(roh, "id");
      const aktenzeichen = leseSkalar(roh, "aktenzeichen");
      if (id && aktenzeichen) zuordnung.set(aktenzeichen, id);
    }
  }
  return zuordnung;
}

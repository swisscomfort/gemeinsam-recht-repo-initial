// inventar.ts — CLI `npm run inventar` (Prioritaet 2).
//
// Beantwortet fuer jeden dokumentierten Fall genau eine Frage: Was fehlt ihm
// noch, um in einer Quote zaehlen zu koennen? Die Ausschlussregeln sind
// dieselben wie in wissen/tools/kodierung-quoten.ts — hier werden sie nicht
// gezaehlt, sondern je Fall benannt, damit sichtbar wird, wo der Engpass
// wirklich liegt.
//
// Nur lesend, kein Netz, keine Systemzeit.

import { leseFaelle, type FallMitHerkunft } from "./faelle.ts";
import { istDirektAufruf } from "./umgebung.ts";

export type Hindernis =
  | "kennzeichnung_fiktiv_oder_platzhalter"
  | "regel_id_offen"
  | "regel_id_fehlt"
  | "nicht_rechtskraeftig"
  | "rechtskraft_unbekannt"
  | "kodierung_nicht_bestaetigt"
  | "kein_messkorpus";

export interface Inventareintrag {
  id: string;
  entwurf: boolean;
  hindernisse: Hindernis[];
}

/**
 * Hindernisse eines Falls. `imMesskorpus` sagt, ob der Fall ueber einen
 * Messlauf in eine Population gelangt ist — ohne das zaehlt er auch dann
 * nicht, wenn sonst alles stimmt (sonst waere der Nenner wieder der
 * Bestand statt der Population).
 */
export function hindernisse(fall: FallMitHerkunft, imMesskorpus: boolean): Hindernis[] {
  const liste: Hindernis[] = [];

  if (fall.kennzeichnung !== "NACHERZAEHLT_OEFFENTLICH") {
    liste.push("kennzeichnung_fiktiv_oder_platzhalter");
    return liste; // Fiktive Faelle brauchen keine weitere Pruefung.
  }

  if (fall.regel_id === undefined) liste.push("regel_id_fehlt");
  else if (fall.regel_id.startsWith("OFFEN:")) liste.push("regel_id_offen");

  if (fall.rechtskraft_status === undefined || fall.rechtskraft_status === "unbekannt") {
    liste.push("rechtskraft_unbekannt");
  } else if (fall.rechtskraft_status !== "rechtskraeftig") {
    liste.push("nicht_rechtskraeftig");
  }

  if (fall.kodierung_status !== "doppelt_bestaetigt" && fall.kodierung_status !== "mensch_bestaetigt") {
    liste.push("kodierung_nicht_bestaetigt");
  }

  if (!imMesskorpus) liste.push("kein_messkorpus");

  return liste;
}

export interface Inventar {
  eintraege: Inventareintrag[];
  zaehlfaehig: string[];
  haeufigkeit: { hindernis: Hindernis; anzahl: number }[];
}

export function inventar(
  faelle: ReadonlyMap<string, FallMitHerkunft>,
  imMesskorpus: ReadonlySet<string>,
): Inventar {
  const eintraege: Inventareintrag[] = [];
  const zaehler = new Map<Hindernis, number>();

  for (const fall of [...faelle.values()].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const liste = hindernisse(fall, imMesskorpus.has(fall.id));
    eintraege.push({ id: fall.id, entwurf: fall.entwurf, hindernisse: liste });
    for (const hindernis of liste) zaehler.set(hindernis, (zaehler.get(hindernis) ?? 0) + 1);
  }

  return {
    eintraege,
    zaehlfaehig: eintraege.filter((e) => e.hindernisse.length === 0).map((e) => e.id),
    haeufigkeit: [...zaehler.entries()]
      .map(([hindernis, anzahl]) => ({ hindernis, anzahl }))
      .sort((a, b) => b.anzahl - a.anzahl || (a.hindernis < b.hindernis ? -1 : 1)),
  };
}

/** Zaehlt nur die realen Faelle (die anderen sind nie Messgegenstand). */
export function realfaelle(faelle: ReadonlyMap<string, FallMitHerkunft>): FallMitHerkunft[] {
  return [...faelle.values()].filter((f) => f.kennzeichnung === "NACHERZAEHLT_OEFFENTLICH");
}

/* ---------- CLI ---------- */

if (istDirektAufruf(import.meta.url)) {
  const faelle = leseFaelle();
  const ergebnis = inventar(faelle, new Set());
  const real = realfaelle(faelle);

  console.log(`Faelle gesamt: ${faelle.size} · davon real (NACHERZAEHLT_OEFFENTLICH): ${real.length}`);
  console.log(`Zaehlfaehig (ohne jedes Hindernis): ${ergebnis.zaehlfaehig.length}`);
  console.log("");
  console.log("Haeufigkeit der Hindernisse:");
  for (const { hindernis, anzahl } of ergebnis.haeufigkeit) {
    console.log(`  ${String(anzahl).padStart(3)}x ${hindernis}`);
  }
  console.log("");
  console.log("Je Fall:");
  for (const eintrag of ergebnis.eintraege) {
    if (eintrag.hindernisse[0] === "kennzeichnung_fiktiv_oder_platzhalter") continue;
    const marke = eintrag.entwurf ? " (Entwurf)" : "";
    console.log(`  ${eintrag.id}${marke}: ${eintrag.hindernisse.join(", ") || "zaehlfaehig"}`);
  }
}

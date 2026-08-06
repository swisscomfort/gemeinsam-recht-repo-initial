// serien.ts — Journey-Komposition des Leser-Modus (AUFTRAG-F1 §1).
//
// Serien verteilen ihre Etappen ueber aufeinanderfolgende Ausgaben
// (Fortsetzungsgefuehl): Welche Etappe eine Serie an einem Tag zeigt,
// ist reine Arithmetik ueber das injizierte Datum — kein Zufall, keine
// Systemzeit, kein gespeicherter Fortschritt. Gleiche Stories + gleiche
// Tagesfolge ergeben damit immer dieselbe Ausgabenfolge (Determinismus).
//
// Datums-Arithmetik kommt aus dem deterministischen Kern (core wird nur
// genutzt, nie veraendert): zuTagen/addTage/istIsoDatum sind dort getestet.

import { addTage, istIsoDatum, zuTagen } from "@core/index";
import { ABSCHLUSS, MAX_KARTEN, MIN_KARTEN, badgeFuer, fnv1a } from "./ausgabe";
import type { Story } from "./story";

export const UPDATE_HINWEIS = "Update zu deiner Serie";

/** Karte einer Journey-Ausgabe (Felder wie F0-Karte plus Journey-Zusaetze). */
export interface JourneyKarte {
  id: string;
  storyId: string;
  storyTitel: string;
  etappeNr: number;
  etappenTotal: number;
  etappeTitel: string;
  text: string;
  missionsStatus: string;
  prinzipien: string[];
  badge: string;
  rechtsgebiet: string;
  /** true bei gefolgter Serie, deren Etappe sich seit dem letzten Lesen geaendert hat. */
  updateHinweis: boolean;
  /** true fuer Karten mit rechtsgebiet mietrecht_* — traegt den Knopf "Betrifft mich das?". */
  betrifftMich: boolean;
}

export interface JourneyAusgabe {
  datum: string;
  karten: JourneyKarte[];
  abschluss: string;
  wenigerAlsDrei: boolean;
}

/** Lesestand: gefolgte Serien + zuletzt gesehene Etappe je Serie. Keine Zeiten. */
export interface LeseZustand {
  gefolgt: string[];
  gesehen: Record<string, number>;
}

export function neuerLeseZustand(): LeseZustand {
  return { gefolgt: [], gesehen: {} };
}

/** Naechster Morgen der simulierten Zeit (deterministisch, Kern-Arithmetik). */
export function naechsterMorgen(datumISO: string): string {
  return addTage(datumISO, 1);
}

/**
 * Etappe einer Serie am gegebenen Tag: Tagesnummer plus ID-Versatz,
 * zyklisch ueber die Etappenzahl. Aufeinanderfolgende Tage zeigen
 * aufeinanderfolgende Etappen; der Versatz staffelt die Serien, damit
 * nicht alle gleichzeitig bei Etappe 1 stehen.
 */
export function etappeAmTag(story: Story, datumISO: string): number {
  const total = story.meta.etappen;
  return ((zuTagen(datumISO) + (fnv1a(story.meta.id) % total)) % total) + 1;
}

function journeyKarte(story: Story, datumISO: string, zustand: LeseZustand): JourneyKarte {
  const etappeNr = etappeAmTag(story, datumISO);
  const etappe = story.etappen[etappeNr - 1];
  if (!etappe) {
    throw new Error(`Story ${story.meta.id}: Etappe ${etappeNr} fehlt`);
  }
  const gefolgt = zustand.gefolgt.includes(story.meta.id);
  const zuletzt = zustand.gesehen[story.meta.id];
  return {
    id: `${story.meta.id}-E${etappe.nr}`,
    storyId: story.meta.id,
    storyTitel: story.meta.titel,
    etappeNr: etappe.nr,
    etappenTotal: story.meta.etappen,
    etappeTitel: etappe.titel,
    text: etappe.text,
    missionsStatus: story.meta.missions_status[etappe.nr - 1] ?? "",
    prinzipien: [...story.meta.prinzipien],
    badge: badgeFuer(story),
    rechtsgebiet: story.meta.rechtsgebiet,
    updateHinweis: gefolgt && zuletzt !== undefined && zuletzt !== etappe.nr,
    betrifftMich: story.meta.rechtsgebiet.startsWith("mietrecht_"),
  };
}

/**
 * Journey-Ausgabe fuer ein injiziertes Datum: je Serie genau eine Karte
 * (die Etappe des Tages). Gefolgte Serien mit Update zuerst, dann uebrige
 * gefolgte, dann der Rest in der datums-rotierten F0-Reihenfolge; harte
 * Kappung bei MAX_KARTEN. Unter MIN_KARTEN wird nichts erfunden, sondern
 * der Hinweis gesetzt (Invariante 12). Endet immer mit "Fertig für heute".
 */
export function journeyAusgabe(
  stories: Story[],
  datumISO: string,
  zustand: LeseZustand,
): JourneyAusgabe {
  if (!istIsoDatum(datumISO)) {
    throw new Error("Datum muss injiziert werden und die Form JJJJ-MM-TT haben");
  }
  const sortiert = [...stories].sort((a, b) => a.meta.id.localeCompare(b.meta.id));
  const rotation = sortiert.length > 0 ? fnv1a(datumISO) % sortiert.length : 0;
  const rotiert = [...sortiert.slice(rotation), ...sortiert.slice(0, rotation)];

  const alleKarten = rotiert.map((story) => journeyKarte(story, datumISO, zustand));
  const mitUpdate = alleKarten.filter((k) => k.updateHinweis);
  const gefolgtOhneUpdate = alleKarten.filter(
    (k) => !k.updateHinweis && zustand.gefolgt.includes(k.storyId),
  );
  const uebrige = alleKarten.filter((k) => !zustand.gefolgt.includes(k.storyId));

  const karten = [...mitUpdate, ...gefolgtOhneUpdate, ...uebrige].slice(0, MAX_KARTEN);

  return {
    datum: datumISO,
    karten,
    abschluss: ABSCHLUSS,
    wenigerAlsDrei: karten.length < MIN_KARTEN,
  };
}

/** Serie folgen bzw. entfolgen (Stern); liefert einen neuen Zustand. */
export function folgeUmschalten(zustand: LeseZustand, storyId: string): LeseZustand {
  const gefolgt = zustand.gefolgt.includes(storyId)
    ? zustand.gefolgt.filter((id) => id !== storyId)
    : [...zustand.gefolgt, storyId].sort();
  return { gefolgt, gesehen: { ...zustand.gesehen } };
}

/** Beim Verlassen einer Ausgabe: gezeigte Etappen als gesehen merken. */
export function merkeGesehen(zustand: LeseZustand, ausgabe: JourneyAusgabe): LeseZustand {
  const gesehen = { ...zustand.gesehen };
  for (const karte of ausgabe.karten) {
    gesehen[karte.storyId] = karte.etappeNr;
  }
  return { gefolgt: [...zustand.gefolgt], gesehen };
}

/** Laedt einen gespeicherten Lesestand; bei jeder Abweichung: frischer Zustand. */
export function ladeLeseZustand(rohJson: string | null): LeseZustand {
  if (rohJson === null) return neuerLeseZustand();
  try {
    const geparst = JSON.parse(rohJson) as unknown;
    if (typeof geparst !== "object" || geparst === null || Array.isArray(geparst)) {
      return neuerLeseZustand();
    }
    const kandidat = geparst as Record<string, unknown>;
    const schluessel = Object.keys(kandidat).sort();
    if (schluessel.join(",") !== "gefolgt,gesehen") return neuerLeseZustand();
    const gefolgt = kandidat["gefolgt"];
    const gesehen = kandidat["gesehen"];
    if (!Array.isArray(gefolgt) || gefolgt.some((e) => typeof e !== "string")) {
      return neuerLeseZustand();
    }
    if (typeof gesehen !== "object" || gesehen === null || Array.isArray(gesehen)) {
      return neuerLeseZustand();
    }
    if (Object.values(gesehen).some((w) => typeof w !== "number")) {
      return neuerLeseZustand();
    }
    return {
      gefolgt: [...(gefolgt as string[])],
      gesehen: { ...(gesehen as Record<string, number>) },
    };
  } catch {
    return neuerLeseZustand();
  }
}

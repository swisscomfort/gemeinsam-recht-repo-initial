// messquote.ts — Quote AUS einem Messkorpus, nicht aus dem Bestand.
//
// Der Unterschied zur bisherigen Zaehlung ist der Nenner. Bisher zaehlte,
// was an Geschichten da war; wer die Faelle auswaehlt, bestimmt dann das
// Ergebnis. Hier ist der Nenner die eingeschlossene Population eines
// Messlaufs — festgelegt, bevor irgendein Ausgang bekannt war.
//
// Die Zaehllogik selbst wird NICHT neu geschrieben: ausgangQuote,
// scheiterpunktQuote und die Mindestfallzahl kommen unveraendert aus
// wissen/tools/kodierung-quoten.ts. Dieses Modul liefert die Population und
// die Sperren.
//
// Rein und deterministisch: Zeitstand wird injiziert, kein Netz.

import {
  MINDESTFALLZAHL,
  ausgangQuote,
  mitMindestfallzahl,
  scheiterpunktQuote,
  type KodierteStory,
  type QuoteDarstellung,
  type Uebereinstimmungsquote,
} from "../../wissen/tools/kodierung-quoten.ts";
import { darfQuoteMaterialisieren, type Messdefinition } from "./definition.ts";
import { bilanz, pruefeLauf, type Bilanz, type Messlauf } from "./lauf.ts";

export { MINDESTFALLZAHL };

export interface Messquote {
  messdefinition: { id: string; version: string; sha256: string };
  messlauf: string;
  zeitstand: string;
  korpus: Bilanz;
  /** Eingeschlossene Treffer ohne dokumentierten Fall — Luecken im Nenner. */
  ohne_fall: number;
  quote: QuoteDarstellung;
  uebereinstimmungsquote: Uebereinstimmungsquote;
  kodierliste_version: string | null;
}

export interface Sperre {
  ok: boolean;
  gruende: string[];
}

/**
 * Darf aus diesem Lauf eine Quote materialisiert werden?
 *
 * Die dritte Bedingung ist die wichtigste und die am leichtesten zu
 * uebersehende: jeder eingeschlossene Treffer braucht einen dokumentierten
 * Fall. Sonst schrumpft der Nenner still auf die Faelle zusammen, die
 * jemand aufgeschrieben hat — und genau das ist die Selektionsverzerrung,
 * gegen die der ganze Messkorpus gebaut ist.
 */
export function sperren(
  lauf: Messlauf,
  definition: Messdefinition,
  stories: ReadonlyMap<string, KodierteStory>,
): Sperre {
  const gruende: string[] = [];

  const definitionsBefund = darfQuoteMaterialisieren(definition);
  gruende.push(...definitionsBefund.fehler);

  const laufBefund = pruefeLauf(lauf, definition);
  gruende.push(...laufBefund.fehler);

  const b = bilanz(lauf);
  if (b.ungeklaert > 0) {
    gruende.push(
      `${b.ungeklaert} Treffer sind noch "ungeklaert" — solange nicht jeder Treffer eingeschlossen oder mit Grund ausgeschlossen ist, gibt es keinen vollstaendigen Nenner.`,
    );
  }

  const ohneFall = eingeschlosseneOhneFall(lauf, stories);
  if (ohneFall.length > 0) {
    gruende.push(
      `${ohneFall.length} eingeschlossene Treffer haben keinen dokumentierten Fall (${ohneFall
        .slice(0, 5)
        .join(", ")}${ohneFall.length > 5 ? " …" : ""}). Ein unvollstaendig aufgenommener Messkorpus ergibt einen verzerrten Nenner.`,
    );
  }

  return { ok: gruende.length === 0, gruende };
}

/** IDs eingeschlossener Treffer, zu denen kein Fall vorliegt. */
export function eingeschlosseneOhneFall(
  lauf: Messlauf,
  stories: ReadonlyMap<string, KodierteStory>,
): string[] {
  return lauf.treffer
    .filter((t) => t.status === "eingeschlossen")
    .filter((t) => t.story_id === undefined || !stories.has(t.story_id))
    .map((t) => t.quelle_id);
}

/** Die Faelle des Nenners: dokumentierte Faelle der eingeschlossenen Treffer. */
export function korpusFaelle(
  lauf: Messlauf,
  stories: ReadonlyMap<string, KodierteStory>,
): KodierteStory[] {
  const faelle: KodierteStory[] = [];
  for (const treffer of lauf.treffer) {
    if (treffer.status !== "eingeschlossen" || treffer.story_id === undefined) continue;
    const story = stories.get(treffer.story_id);
    if (story) faelle.push(story);
  }
  return faelle;
}

export interface QuoteAuftrag {
  /** Gemessener Ausgang, z. B. "durchgesetzt". */
  ausgang: string;
  /** Datum als Zeitstand der Quote (JJJJ-MM-TT) — injiziert, nie aus der Uhr. */
  zeitstand: string;
}

/**
 * Berechnet die Quote. Wirft, wenn eine Sperre greift — eine Quote aus
 * unvollstaendigem Korpus darf gar nicht erst entstehen.
 */
export function berechneMessquote(
  lauf: Messlauf,
  definition: Messdefinition,
  stories: ReadonlyMap<string, KodierteStory>,
  auftrag: QuoteAuftrag,
): Messquote {
  const sperre = sperren(lauf, definition, stories);
  if (!sperre.ok) {
    throw new Error(`Quote gesperrt:\n- ${sperre.gruende.join("\n- ")}`);
  }

  const faelle = korpusFaelle(lauf, stories);
  const roh = ausgangQuote(faelle, auftrag.ausgang);
  const scheiter = scheiterpunktQuote(faelle, "");
  const kodierlisten = new Set(
    faelle.map((f) => (f as { kodierliste_version?: string }).kodierliste_version).filter(Boolean),
  );

  return {
    messdefinition: { id: definition.id, version: definition.version, sha256: lauf.messdefinition.sha256 },
    messlauf: lauf.id,
    zeitstand: auftrag.zeitstand,
    korpus: bilanz(lauf),
    ohne_fall: eingeschlosseneOhneFall(lauf, stories).length,
    quote: mitMindestfallzahl(roh),
    uebereinstimmungsquote: scheiter.uebereinstimmungsquote,
    kodierliste_version: kodierlisten.size === 1 ? ([...kodierlisten][0] as string) : null,
  };
}

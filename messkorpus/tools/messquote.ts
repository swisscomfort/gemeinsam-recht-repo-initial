// messquote.ts — Quote AUS einem Messkorpus, nicht aus dem Bestand.
//
// Zwei Unterschiede zur bisherigen Zaehlung, beide entscheidend:
//
// 1. Der NENNER ist die eingeschlossene Population eines Messlaufs,
//    festgelegt bevor irgendein Ausgang bekannt war — nicht das, was an
//    Geschichten zufaellig da ist. Gezaehlt werden Zaehleinheiten
//    (Rechtsstreitigkeiten), nicht Suchtreffer: mehrere Entscheide desselben
//    Streits sind ein Fall.
//
// 2. Der ZAEHLER ist der Ausgang bezueglich der gemessenen Norm
//    (`messausgang`), nicht der allgemeine Verfahrensausgang der Geschichte
//    (`ausgang`). Eine Mietpartei kann teilweise obsiegen, waehrend die
//    gemessene Norm gerade nicht durchgesetzt wurde. Wer hier den
//    Story-Ausgang zaehlt, misst etwas anderes als das, was die Quote
//    behauptet.
//
// Die Zaehllogik selbst wird NICHT neu geschrieben: quoteNachPraedikat und
// die Mindestfallzahl kommen aus wissen/tools/kodierung-quoten.ts. Dieses
// Modul liefert Population, Normausgang und die Sperren.
//
// Rein und deterministisch: Zeitstand wird injiziert, kein Netz.

import {
  MINDESTFALLZAHL,
  mitMindestfallzahl,
  quoteNachPraedikat,
  scheiterpunktQuote,
  type KodierteStory,
  type QuoteDarstellung,
  type Uebereinstimmungsquote,
} from "../../wissen/tools/kodierung-quoten.ts";
import { darfQuoteMaterialisieren, type Messdefinition } from "./definition.ts";
import { bilanz, pruefeLauf, zaehleinheiten, type Bilanz, type MessausgangWert, type Messlauf } from "./lauf.ts";

export { MINDESTFALLZAHL };

export interface Messquote {
  messdefinition: { id: string; version: string; sha256: string };
  messlauf: string;
  zeitstand: string;
  /** Gemessener Normausgang — steht in jeder Ausgabe, damit klar ist, was gezaehlt wurde. */
  gemessener_wert: MessausgangWert;
  korpus: Bilanz;
  zaehleinheiten: number;
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
 * Die unauffaelligste Sperre ist die wichtigste: jeder eingeschlossene
 * Treffer braucht einen dokumentierten Fall. Sonst schrumpft der Nenner
 * still auf die Faelle zusammen, die jemand aufgeschrieben hat — und genau
 * das ist die Selektionsverzerrung, gegen die der ganze Messkorpus gebaut ist.
 */
export function sperren(
  lauf: Messlauf,
  definition: Messdefinition,
  stories: ReadonlyMap<string, KodierteStory>,
): Sperre {
  const gruende: string[] = [];

  gruende.push(...darfQuoteMaterialisieren(definition).fehler);
  gruende.push(...pruefeLauf(lauf, definition).fehler);

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

  const einheiten = zaehleinheiten(lauf, definition);
  gruende.push(...einheiten.fehler);

  for (const einheit of einheiten.einheiten) {
    if (einheit.abschluss_status !== "abgeschlossen") {
      gruende.push(
        `Zaehleinheit ${einheit.id}: Abschlussstatus "${einheit.abschluss_status}". ` +
          `Ein rechtskraeftiger Entscheid ist noch kein abgeschlossener Fall — bei einer Rueckweisung ist die gemessene Rechtsfrage offen.`,
      );
    }
    if (!einheit.messausgang) {
      gruende.push(
        `Zaehleinheit ${einheit.id}: kein Normausgang zu ${definition.id}. ` +
          `Der allgemeine Verfahrensausgang der Geschichte ersetzt ihn nicht.`,
      );
    }
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

/**
 * Die Faelle des Nenners: je Zaehleinheit hoechstens einer. Zurueck kommt
 * zusaetzlich der Normausgang je Fall — der Zaehler zaehlt nur diesen.
 */
export function korpusFaelle(
  lauf: Messlauf,
  definition: Messdefinition,
  stories: ReadonlyMap<string, KodierteStory>,
): { faelle: KodierteStory[]; normausgang: Map<string, MessausgangWert> } {
  const faelle: KodierteStory[] = [];
  const normausgang = new Map<string, MessausgangWert>();

  for (const einheit of zaehleinheiten(lauf, definition).einheiten) {
    if (einheit.story_id === undefined) continue;
    const story = stories.get(einheit.story_id);
    if (!story) continue;
    faelle.push(story);
    if (einheit.messausgang) normausgang.set(story.id, einheit.messausgang.wert);
  }

  return { faelle, normausgang };
}

export interface QuoteAuftrag {
  /** Gemessener Normausgang, z. B. "durchgesetzt". */
  wert: MessausgangWert;
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

  const { faelle, normausgang } = korpusFaelle(lauf, definition, stories);
  const roh = quoteNachPraedikat(faelle, (story) => normausgang.get(story.id) === auftrag.wert);
  const scheiter = scheiterpunktQuote(faelle, "");
  const kodierlisten = new Set(
    faelle.map((f) => (f as { kodierliste_version?: string }).kodierliste_version).filter(Boolean),
  );

  return {
    messdefinition: { id: definition.id, version: definition.version, sha256: lauf.messdefinition.sha256 },
    messlauf: lauf.id,
    zeitstand: auftrag.zeitstand,
    gemessener_wert: auftrag.wert,
    korpus: bilanz(lauf),
    zaehleinheiten: zaehleinheiten(lauf, definition).einheiten.length,
    ohne_fall: eingeschlosseneOhneFall(lauf, stories).length,
    quote: mitMindestfallzahl(roh),
    uebereinstimmungsquote: scheiter.uebereinstimmungsquote,
    kodierliste_version: kodierlisten.size === 1 ? ([...kodierlisten][0] as string) : null,
  };
}

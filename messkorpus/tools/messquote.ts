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
import {
  auflösungsFehler,
  darfQuoteMaterialisieren,
  findeFassung,
  sammleFassungen,
  type Messdefinition,
} from "./definition.ts";
import { leseFaelle } from "./faelle.ts";
import {
  bilanz,
  istZaehlbar,
  pruefeLauf,
  zaehleinheiten,
  type Bilanz,
  type MessausgangWert,
  type Messlauf,
} from "./lauf.ts";
import { istDirektAufruf, leseDefinitionen, leseLaeufe } from "./umgebung.ts";

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
 * Faelle tragen die Fassung der Kodierliste; KodierteStory in wissen/ kennt
 * das Feld nicht, weil es dort fuer die Zaehlung ohne Belang ist. Hier wird
 * es gebraucht — leseFaelle() liest es mit.
 */
export interface MitKodierliste {
  kodierliste_version?: string;
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
    if (einheit.offen) {
      gruende.push(
        `Zaehleinheit ${einheit.id}: Messausgang "offen" — die endgueltige Rechtswirkung auf den gemessenen Sachverhalt steht noch aus. ` +
          `Eine offene Einheit zaehlt weder als Erfolg noch als Misserfolg; sie waere ein Nenner ohne Zaehler.`,
      );
    }
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

/**
 * Ist der gemessene Wert ueberhaupt zaehlbar? "offen" bezeichnet das Fehlen
 * eines Ausgangs — eine "Quote der offenen Faelle" waere keine
 * Durchsetzungsquote, sondern eine Aussage ueber den Erhebungsstand, die als
 * Quote gelesen wuerde.
 */
export function nichtZaehlbarerWert(wert: MessausgangWert): string | null {
  return istZaehlbar(wert)
    ? null
    : `Gemessener Wert "${wert}": kein zaehlbarer Messausgang. ` +
        `"offen" heisst, dass die endgueltige Rechtswirkung aussteht — daraus entsteht keine Quote.`;
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
  const unzaehlbar = nichtZaehlbarerWert(auftrag.wert);
  if (unzaehlbar) throw new Error(`Quote gesperrt:\n- ${unzaehlbar}`);

  const sperre = sperren(lauf, definition, stories);
  if (!sperre.ok) {
    throw new Error(`Quote gesperrt:\n- ${sperre.gruende.join("\n- ")}`);
  }

  const { faelle, normausgang } = korpusFaelle(lauf, definition, stories);
  const roh = quoteNachPraedikat(faelle, (story) => normausgang.get(story.id) === auftrag.wert);
  const scheiter = scheiterpunktQuote(faelle, "");

  // Die Fassung der Kodierliste gehoert in jede Quote (MANIFEST §10). Sie
  // steht nur dann drin, wenn ALLE Faelle dieselbe tragen — uneinheitliche
  // oder fehlende Angaben werden nicht zu einer plausiblen zusammengefasst.
  const versionen = faelle.map((fall) => (fall as MitKodierliste).kodierliste_version);
  const einheitlich =
    versionen.length > 0 && versionen.every((v) => v !== undefined && v === versionen[0]);

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
    kodierliste_version: einheitlich ? (versionen[0] as string) : null,
  };
}

/* ---------- CLI ---------- */

/**
 * Bericht zu einem Lauf: entweder die Quote oder die Gruende, warum es
 * keine gibt. Rein — Lauf, Definition, Faelle und Zeitstand kommen von
 * aussen, damit dieselbe Funktion in Tests laeuft wie im CLI.
 */
export function quoteBericht(
  lauf: Messlauf,
  definition: Messdefinition,
  stories: ReadonlyMap<string, KodierteStory>,
  auftrag: QuoteAuftrag,
): { zeilen: string[]; ok: boolean } {
  const unzaehlbar = nichtZaehlbarerWert(auftrag.wert);
  const sperre = sperren(lauf, definition, stories);
  const gruende = unzaehlbar ? [unzaehlbar, ...sperre.gruende] : sperre.gruende;
  if (gruende.length > 0) {
    return {
      ok: false,
      zeilen: [
        `Keine Quote fuer ${lauf.id} (${definition.id} v${definition.version}, gemessen: ${auftrag.wert}).`,
        "Gesperrt durch:",
        ...gruende.map((grund) => `  · ${grund}`),
      ],
    };
  }

  const quote = berechneMessquote(lauf, definition, stories, auftrag);
  return {
    ok: true,
    zeilen: [
      `${definition.id} v${definition.version} · Lauf ${quote.messlauf} · Stand ${quote.zeitstand}`,
      `Gemessen: ${quote.gemessener_wert} (Normausgang, nicht der allgemeine Verfahrensausgang)`,
      `Quote: ${quote.quote.anzeige}`,
      `Nenner: ${quote.zaehleinheiten} Zaehleinheiten aus ${quote.korpus.eingeschlossen} eingeschlossenen Treffern`,
      `Korpus: ${quote.korpus.roh} roh · ${quote.korpus.ausgeschlossen} ausgeschlossen · ${quote.korpus.ungeklaert} ungeklaert · ${quote.korpus.duplikate} Duplikate`,
      ...quote.korpus.ausschluesse.map((a) => `  ausgeschlossen ${a.anzahl}x ${a.grund}`),
      ...quote.quote.ausschluesse.map((a) => `  nicht gezaehlt ${a.anzahl}x ${a.grund}`),
      `Uebereinstimmung der Kodierlaeufe: ${quote.uebereinstimmungsquote.zaehler}/${quote.uebereinstimmungsquote.nenner}`,
      `Kodierliste: ${quote.kodierliste_version ?? "uneinheitlich oder fehlend"}`,
      `Messdefinition sha256: ${quote.messdefinition.sha256}`,
    ],
  };
}

if (istDirektAufruf(import.meta.url)) {
  const arg = (name: string): string | null => {
    const stelle = process.argv.indexOf(`--${name}`);
    return stelle === -1 ? null : (process.argv[stelle + 1] ?? null);
  };
  const laufId = arg("lauf");
  const wert = (arg("wert") ?? "durchgesetzt") as MessausgangWert;
  const zeitstand = arg("zeitstand");

  if (!laufId || !zeitstand) {
    console.error(
      "Aufruf: npm run quote -- --lauf ML-001 --zeitstand JJJJ-MM-TT [--wert durchgesetzt]\n" +
        "Der Zeitstand wird uebergeben, nicht aus der Uhr gelesen — jede Quote traegt ihn (MANIFEST §10).",
    );
    process.exitCode = 1;
  } else {
    const laeufe = leseLaeufe();
    const eintrag = laeufe.find((l) => (l.inhalt as Messlauf).id === laufId);
    if (!eintrag) {
      console.error(`Messlauf ${laufId} nicht gefunden. Vorhanden: ${laeufe.map((l) => l.verzeichnis).join(", ") || "(keiner)"}`);
      process.exitCode = 1;
    } else {
      const lauf = eintrag.inhalt as Messlauf;
      // Dieselbe Auflösung wie in pruefen.ts: id UND version, ueber den
      // gemeinsamen Resolver. Frueher suchte dieses CLI nur nach id und
      // nahm die erste passende Datei, waehrend pruefen.ts die letzte nahm —
      // bei zwei Fassungen derselben id konnten beide Werkzeuge verschiedene
      // Fassungen erwischen.
      const register = sammleFassungen(
        leseDefinitionen().map((d) => ({ datei: d.datei, inhalt: d.inhalt as Messdefinition })),
      );
      const auflösung = findeFassung(register, lauf.messdefinition);
      if (auflösung.art !== "gefunden") {
        console.error(auflösungsFehler(lauf.messdefinition, auflösung));
        process.exitCode = 1;
      } else {
        const bericht = quoteBericht(lauf, auflösung.definition, leseFaelle(), { wert, zeitstand });
        for (const zeile of bericht.zeilen) console.log(zeile);
        if (!bericht.ok) process.exitCode = 1;
      }
    }
  }
}

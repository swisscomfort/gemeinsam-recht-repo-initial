// kodierstoff.ts — reine Logik des Kodierpakets.
//
// Der Dateizugriff steht in kodierstoff-export.ts; hier steht nur, was ohne
// Platte entscheidbar ist: welche Bezeichner ins Paket kommen, in welcher
// Reihenfolge, was an Regeln mitgeht und wann gar kein Paket entsteht.
//
// EIN Paket, nicht zwei. Beide Kodierer bekommen dieselbe Datei — deshalb
// entsteht sie genau einmal und traegt keinen Kodierernamen. Waeren es zwei
// Dateien, muesste man beweisen, dass sie gleich sind; so ist es dieselbe.
//
// Deterministisch: gleiche Eingabe, Byte fuer Byte gleiche Ausgabe. Keine
// Systemzeit, kein Zufall, keine Reihenfolge, die von der Platte kommt. Ein
// Paket, dessen Hash sich beim erneuten Erzeugen aendert, taugt nicht als
// Bezugspunkt fuer zwei Antworten.
//
// Nicht im Paket: irgendetwas aus einem anderen Kodierlauf, ein vorbelegter
// Status, ein Vorschlag, ein Modellname (MANIFEST v2.1 §5).

import { antwortschema, KODIERSCHEMA_ID, ZAEHLEINHEIT_REGEL, type KodierKontext } from "./kodierschema.js";
import { sha256, trefferAusLauf, type DokumentBefund } from "./volltexte.js";

/** Der Rohlauf, soweit das Paket ihn braucht. */
export interface Lauf {
  id: string;
  datenstand: string;
  messdefinition: { id: string; version: string; sha256: string };
}

/** Der im Repository verankerte Provenienzanker des Volltextbundles. */
export interface Anker {
  raw_checkpoint: string;
  bundle: { sha256: string | null };
  messdefinition: { id: string; version: string; sha256: string };
  documents: DokumentBefund[];
}

/** Die eingefrorene Messdefinition, soweit sie in das Paket eingeht. */
export interface Definition {
  id: string;
  version: string;
  status: string;
  messfrage: string;
  einschluss: unknown;
  ausschluss: unknown;
  rechtskraft_regel: Record<string, unknown>;
  abschluss_regel: Record<string, unknown>;
  zaehleinheit: Record<string, unknown>;
}

export interface KodierstoffQuellen {
  lauf: unknown;
  anker: Anker;
  definition: Definition;
  /** Liefert den Volltext zu einem Bezeichner, oder `null`, wenn keiner vorliegt. */
  volltext: (quelleId: string) => string | null;
}

export interface KodierstoffDokument {
  quelle_id: string;
  aktenzeichen: string | null;
  datum: string | null;
  gericht: string | null;
  link: string | null;
  text_sha256: string;
  volltext: string;
}

export interface Kodierstoffpaket {
  schema: string;
  messlauf: string;
  datenstand: string;
  raw_checkpoint: string;
  bundle_sha256: string | null;
  messdefinition: { id: string; version: string; sha256: string };
  auftrag: string;
  regeln: Record<string, unknown>;
  antwortschema: object;
  dokumente: KodierstoffDokument[];
}

const AUFTRAGSTEXT =
  "Beurteile jeden Treffer allein anhand seines Volltextes nach der unten stehenden, eingefrorenen " +
  "Messdefinition. Schliesse nur ein, wenn alle drei Einschlusskriterien SICHER erfuellt sind; sonst " +
  "ungeklaert. Erfinde nichts: laesst sich etwas nicht sicher feststellen, ist der Treffer ungeklaert " +
  "(CR-03 Auflage E2 Ziff. 6). Jede Feststellung braucht eine konkrete Textstelle als Beleg. Recherche " +
  "nur innerhalb der dokumentierten Verfahrenskette, keine offene Suche.";

/**
 * Baut das Kodierpaket. Wirft, sobald etwas nicht zusammenpasst — ein Paket
 * aus Texten, die nicht die des versiegelten Bundles sind, waere wertlos, und
 * ein halbes Paket saehe aus wie ein ganzes.
 */
export function baueKodierstoff(quellen: KodierstoffQuellen): Kodierstoffpaket {
  const { anker, definition, volltext } = quellen;
  const lauf = quellen.lauf as Lauf;

  if (typeof lauf.id !== "string" || typeof lauf.datenstand !== "string") {
    throw new Error("Die Laufdatei nennt keine id oder keinen Datenstand — kein gueltiger Messlauf.");
  }
  if (anker.messdefinition.sha256 !== lauf.messdefinition.sha256) {
    throw new Error("Provenienzanker und Rohlauf nennen verschiedene Definitionshashes. Kein Paket.");
  }
  if (definition.id !== lauf.messdefinition.id || definition.version !== lauf.messdefinition.version) {
    throw new Error(
      `Der Lauf gehoert zu ${lauf.messdefinition.id}@${lauf.messdefinition.version}, die Definition nennt ` +
        `${definition.id}@${definition.version}. Kein Paket.`,
    );
  }
  if (definition.status !== "eingefroren") {
    throw new Error(
      `Die Messdefinition steht auf "${definition.status}" — es wird nur gegen eine eingefrorene kodiert.`,
    );
  }
  if (typeof anker.raw_checkpoint !== "string" || anker.raw_checkpoint.trim() === "") {
    throw new Error("Der Provenienzanker nennt keinen raw_checkpoint. Ohne ihn steht die Rohpopulation nicht fest.");
  }
  if (typeof anker.bundle.sha256 !== "string" || anker.bundle.sha256.trim() === "") {
    throw new Error("Der Provenienzanker nennt keinen bundle.sha256. Das Bundle ist nicht versiegelt.");
  }

  /* trefferAusLauf liefert alle Bezeichner sortiert und ohne Doppelte — die
     Reihenfolge kommt damit aus dem Rohlauf, nie aus einem Verzeichnis. */
  const treffer = trefferAusLauf(quellen.lauf);
  const befunde = new Map(anker.documents.map((d) => [d.quelle_id, d]));

  const dokumente: KodierstoffDokument[] = treffer.map((t) => {
    const befund = befunde.get(t.quelle_id);
    if (!befund) throw new Error(`${t.quelle_id} steht im Rohlauf, aber nicht im Provenienzanker. Kein Paket.`);
    const text = volltext(t.quelle_id);
    if (text === null) throw new Error(`Volltext fehlt: ${t.quelle_id}. Kein Paket.`);
    const hash = sha256(text);
    if (hash !== befund.text_sha256) {
      throw new Error(
        `${t.quelle_id}: der vorliegende Volltext ist nicht der verankerte (sha256 ${hash.slice(0, 12)}… statt ` +
          `${befund.text_sha256.slice(0, 12)}…). Kein Paket.`,
      );
    }
    return {
      quelle_id: t.quelle_id,
      aktenzeichen: t.aktenzeichen ?? null,
      datum: t.datum ?? null,
      gericht: t.gericht ?? null,
      link: t.link ?? null,
      text_sha256: hash,
      volltext: text,
    };
  });

  const ueberzaehlig = anker.documents.filter((d) => !treffer.some((t) => t.quelle_id === d.quelle_id));
  if (ueberzaehlig.length > 0) {
    throw new Error(
      `${ueberzaehlig.length} Dokumente des Provenienzankers stehen nicht im Rohlauf ` +
        `(${ueberzaehlig.map((d) => d.quelle_id).join(", ")}). Kein Paket.`,
    );
  }

  return {
    schema: "gemeinsam-recht.kodierstoff.v1",
    messlauf: lauf.id,
    datenstand: lauf.datenstand,
    raw_checkpoint: anker.raw_checkpoint,
    bundle_sha256: anker.bundle.sha256,
    messdefinition: lauf.messdefinition,
    auftrag: AUFTRAGSTEXT,
    regeln: {
      messfrage: definition.messfrage,
      einschluss: definition.einschluss,
      ausschluss: definition.ausschluss,
      rechtskraft_regel: definition.rechtskraft_regel,
      abschluss_regel: definition.abschluss_regel,
      zaehleinheit_definition: definition.zaehleinheit,
      zaehleinheit_kanonische_regel: ZAEHLEINHEIT_REGEL,
      antwortschema_id: KODIERSCHEMA_ID,
    },
    antwortschema: antwortschema(),
    dokumente,
  };
}

/**
 * Waehlt aus den vorliegenden Definitionsdateien die richtige — ueber `id`
 * UND `version`, nie ueber den Dateinamen.
 *
 * Der erste Entwurf leitete den Namen aus der Versionsnummer ab und suchte
 * `MD-001-v3-1-0-…`; im Bestand heissen die Fassungen uneinheitlich
 * (`MD-001-…`, `MD-001-v3-…`, `MD-001-v3-1-…`). Der Name entscheidet nicht
 * darueber, welche Definition gilt. Zwei Dateien mit derselben id und Version
 * sind ein Widerspruch und werden abgelehnt, statt nach Namen aufgeloest zu
 * werden.
 */
export function findeDefinitionsdatei(
  kandidaten: readonly { datei: string; inhalt: unknown }[],
  gesucht: { id: string; version: string },
): string {
  const treffer = kandidaten
    .filter(({ inhalt }) => {
      const d = inhalt as { id?: unknown; version?: unknown } | null;
      return d !== null && typeof d === "object" && d.id === gesucht.id && d.version === gesucht.version;
    })
    .map(({ datei }) => datei);

  if (treffer.length === 0) throw new Error(`Keine Messdefinition ${gesucht.id}@${gesucht.version} gefunden.`);
  if (treffer.length > 1) {
    throw new Error(
      `Mehrere Dateien tragen ${gesucht.id}@${gesucht.version}: ${treffer.join(", ")}. ` +
        `Zwei Fassungen derselben Liste sind ein Bruch.`,
    );
  }
  return treffer[0] as string;
}

/** Die deklarierten Ausschlusscodes der Definition, in ihrer Reihenfolge. */
export function ausschlussgruende(definition: Pick<Definition, "ausschluss">): string[] {
  if (!Array.isArray(definition.ausschluss)) return [];
  return (definition.ausschluss as Array<Record<string, unknown>>)
    .map((eintrag) => eintrag.code)
    .filter((code): code is string => typeof code === "string");
}

/**
 * Der Pruefkontext, gegen den beide Antworten gemessen werden — vollstaendig
 * aus dem Paket abgeleitet. Beide Kodierer bekommen damit denselben Massstab,
 * und zwar denselben, den sie im Paket gelesen haben.
 */
export function kodierkontext(
  paket: Kodierstoffpaket,
  paketSha256: string,
  definition: Pick<Definition, "ausschluss">,
): KodierKontext {
  const regel = paket.regeln.rechtskraft_regel as { art?: unknown } | undefined;
  return {
    messlauf: paket.messlauf,
    datenstand: paket.datenstand,
    messdefinition: paket.messdefinition,
    kodierstoff_sha256: paketSha256,
    quelle_ids: paket.dokumente.map((d) => d.quelle_id),
    ausschlussgruende: ausschlussgruende(definition),
    verlangt_verfahrensrecht_nachweis: regel?.art === "bundesgericht_uebergangsrecht_art132_bgg",
  };
}

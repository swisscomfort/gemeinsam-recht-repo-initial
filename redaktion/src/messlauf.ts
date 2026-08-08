// messlauf.ts — reine Logik der Messkorpus-Erhebung (Priorität 1).
//
// Der Netzabruf steht in messlauf-erheben.ts; hier steht nur, was ohne Netz
// entscheidbar ist: Fensterteilung, Gerichtsfilter, Abbildung der Treffer,
// kanonischer Hash der Messdefinition. Kein Netz, keine Systemzeit.
//
// Zur Fensterteilung: Die Quelle liefert hoechstens MAX_TREFFER Treffer je
// Abfrage. Ein gekappter Abruf ist als Messkorpus wertlos, weil unbekannt
// viele Faelle fehlen. Statt zu kappen wird der Zeitraum rekursiv geteilt,
// bis jedes Fenster vollstaendig passt — die Population bleibt dieselbe,
// nur die Zahl der Abrufe steigt.
//
// Zum Hash: kanonisch()/definitionsHash() sind ABSICHTLICH gleich zu
// messkorpus/tools/definition.ts dupliziert. Grund ist derselbe wie bei
// kodierung.ts: der CLI-Rand dieses Pakets wird mit rootDir "src"
// kompiliert, Importe ausserhalb von redaktion/src sind dort verboten. Die
// Gleichheit beider Fassungen sichert messkorpus/tests/konsistenz.test.ts.

import { createHash } from "node:crypto";

/* ---------- Kanonischer Hash (Duplikat, siehe Kopf) ---------- */

export function kanonisch(wert: unknown): string {
  if (wert === null || typeof wert !== "object") return JSON.stringify(wert) ?? "null";
  if (Array.isArray(wert)) return `[${wert.map(kanonisch).join(",")}]`;
  const eintraege = Object.entries(wert as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${eintraege.map(([k, v]) => `${JSON.stringify(k)}:${kanonisch(v)}`).join(",")}}`;
}

export function definitionsHash(definition: unknown): string {
  return createHash("sha256").update(kanonisch(definition), "utf8").digest("hex");
}

/* ---------- Zeitfenster ---------- */

export interface Fenster {
  von: string;
  bis: string;
}

function alsTag(iso: string): number {
  return Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
  ) / 86_400_000;
}

function alsISO(tag: number): string {
  const datum = new Date(tag * 86_400_000);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${datum.getUTCFullYear()}-${pad(datum.getUTCMonth() + 1)}-${pad(datum.getUTCDate())}`;
}

/** Laenge eines Fensters in Tagen (beide Enden eingeschlossen). */
export function tage(fenster: Fenster): number {
  return alsTag(fenster.bis) - alsTag(fenster.von) + 1;
}

/**
 * Teilt ein Fenster in zwei etwa gleich grosse Haelften. Ein Fenster von
 * einem Tag laesst sich nicht teilen — das meldet der Aufrufer als Fehler,
 * nie als stille Kappung.
 */
export function teile(fenster: Fenster): [Fenster, Fenster] | null {
  const laenge = tage(fenster);
  if (laenge < 2) return null;
  const mitte = alsTag(fenster.von) + Math.floor(laenge / 2) - 1;
  return [
    { von: fenster.von, bis: alsISO(mitte) },
    { von: alsISO(mitte + 1), bis: fenster.bis },
  ];
}

/** Startfenster: ganze Jahre, damit ein Lauf nicht mit einer Riesenabfrage beginnt. */
export function jahresfenster(zeitraum: Fenster): Fenster[] {
  const fenster: Fenster[] = [];
  const ersterJahr = Number(zeitraum.von.slice(0, 4));
  const letzterJahr = Number(zeitraum.bis.slice(0, 4));
  for (let jahr = ersterJahr; jahr <= letzterJahr; jahr += 1) {
    const von = jahr === ersterJahr ? zeitraum.von : `${jahr}-01-01`;
    const bis = jahr === letzterJahr ? zeitraum.bis : `${jahr}-12-31`;
    fenster.push({ von, bis });
  }
  return fenster;
}

/* ---------- Treffer ---------- */

export interface MesslaufTreffer {
  quelle_id: string;
  aktenzeichen?: string;
  datum?: string;
  gericht?: string;
  link?: string;
  metadaten_fingerprint: string;
  status: "ungeklaert";
}

/**
 * Protokoll eines einzelnen Fensterabrufs. Es ist der eigentliche Nachweis,
 * dass nichts verloren ging — "roh_treffer = Laenge der Liste" waere
 * zirkulaer, weil beide Zahlen am selben Ende entstehen.
 */
export interface AbrufProtokoll {
  von: string;
  bis: string;
  gemeldet_total: number;
  gemeldet_relation: "eq" | "gte" | "unbekannt";
  empfangen: number;
  ohne_id: number;
  vor_gerichtsfilter: number;
  nach_gerichtsfilter: number;
}

/**
 * SHA-256 ueber die kanonische Form der uebernommenen Quellmetadaten.
 * Gleiche Definition wie messkorpus/tools/lauf.ts (Duplikat aus demselben
 * Grund wie kanonisch(); durch messkorpus/tests/konsistenz.test.ts gebunden).
 */
export function metadatenFingerprint(metadaten: {
  quelle_id: string;
  aktenzeichen?: string;
  datum?: string;
  gericht?: string;
  link?: string;
}): string {
  return createHash("sha256")
    .update(
      kanonisch({
        quelle_id: metadaten.quelle_id,
        aktenzeichen: metadaten.aktenzeichen,
        datum: metadaten.datum,
        gericht: metadaten.gericht,
        link: metadaten.link,
      }),
      "utf8",
    )
    .digest("hex");
}

/** Liest die Trefferzahl-Relation der Quelle; alles Unbekannte ist "unbekannt". */
export function relationAus(total: unknown): "eq" | "gte" | "unbekannt" {
  if (typeof total !== "object" || total === null) return "unbekannt";
  const wert = (total as { relation?: unknown }).relation;
  if (wert === "eq") return "eq";
  if (wert === "gte") return "gte";
  return "unbekannt";
}

interface RohTreffer {
  _id?: unknown;
  _source?: { date?: unknown; hierarchy?: unknown; title?: unknown } | null;
}

function sprachfeld(wert: unknown): string | null {
  if (typeof wert !== "object" || wert === null) return null;
  const felder = wert as Record<string, unknown>;
  for (const sprache of ["de", "fr", "it"]) {
    const inhalt = felder[sprache];
    if (typeof inhalt === "string" && inhalt.trim() !== "") return inhalt;
  }
  return null;
}

/**
 * Gehoert ein Treffer zu einem der verlangten Gerichte? Geprueft wird die
 * Hierarchie-Signatur und ersatzweise die Quell-ID, die mit derselben
 * Signatur beginnt. Leerer Filter heisst: alle.
 */
export function gehoertZuGericht(roh: unknown, gerichtsfilter: readonly string[]): boolean {
  if (gerichtsfilter.length === 0) return true;
  const treffer = roh as RohTreffer;
  const hierarchie = Array.isArray(treffer._source?.hierarchy)
    ? (treffer._source?.hierarchy as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const id = typeof treffer._id === "string" ? treffer._id : "";
  return gerichtsfilter.some(
    (signatur) => hierarchie.some((stufe) => stufe === signatur) || id.startsWith(`${signatur}_`),
  );
}

/**
 * Bildet einen Rohtreffer der Quelle auf einen Messlauf-Treffer ab.
 * `null` heisst: kein verwertbarer Bezeichner. Solche Treffer duerfen NICHT
 * still weggefiltert werden — der Aufrufer zaehlt sie als `ohne_id`, und der
 * Lauf gilt dadurch als nachweislich unvollstaendig.
 */
export function alsMesslaufTreffer(roh: unknown, viewBasis: string): MesslaufTreffer | null {
  const treffer = roh as RohTreffer;
  if (typeof treffer._id !== "string" || treffer._id === "") return null;
  const datum = typeof treffer._source?.date === "string" ? treffer._source.date : undefined;
  const titel = sprachfeld(treffer._source?.title);
  const hierarchie = Array.isArray(treffer._source?.hierarchy)
    ? (treffer._source?.hierarchy as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  const metadaten = {
    quelle_id: treffer._id,
    aktenzeichen: aktenzeichenAus(titel, datum),
    datum,
    gericht: hierarchie[hierarchie.length - 1],
    link: `${viewBasis}${treffer._id}`,
  };

  return { ...metadaten, metadaten_fingerprint: metadatenFingerprint(metadaten), status: "ungeklaert" };
}

/**
 * Aktenzeichen aus dem Quelltitel "<Gericht> TT.MM.JJJJ <Aktenzeichen>".
 * Findet sich das Datum nicht, wird nichts erfunden.
 */
export function aktenzeichenAus(titel: string | null, isoDatum: string | undefined): string | undefined {
  if (titel === null || isoDatum === undefined) return undefined;
  const [jahr, monat, tag] = isoDatum.split("-");
  const stelle = titel.indexOf(`${tag}.${monat}.${jahr}`);
  if (stelle === -1) return undefined;
  const rest = titel.slice(stelle + 10).trim();
  return rest === "" ? undefined : rest;
}

export interface Vereinigung {
  treffer: MesslaufTreffer[];
  /** Wie viele Eintraege beim Zusammenfuehren als Doppel entfielen. */
  duplikate: number;
}

/**
 * Fuegt Treffer zusammen: nach Quell-ID eindeutig, nach ID sortiert.
 * Die Sortierung macht den Lauf reproduzierbar — die Reihenfolge der
 * Abrufe darf die Datei nicht beeinflussen. Die Zahl der entfernten Doppel
 * wird mitgegeben, damit die Bilanz spaeter aufgeht.
 */
export function vereinige(teile: readonly MesslaufTreffer[][]): Vereinigung {
  const nachId = new Map<string, MesslaufTreffer>();
  let duplikate = 0;
  for (const teil of teile) {
    for (const treffer of teil) {
      if (nachId.has(treffer.quelle_id)) duplikate += 1;
      else nachId.set(treffer.quelle_id, treffer);
    }
  }
  return {
    treffer: [...nachId.values()].sort((a, b) =>
      a.quelle_id < b.quelle_id ? -1 : a.quelle_id > b.quelle_id ? 1 : 0,
    ),
    duplikate,
  };
}

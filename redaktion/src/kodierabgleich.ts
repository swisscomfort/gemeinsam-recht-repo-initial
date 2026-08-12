// kodierabgleich.ts — mechanischer A/B-Abgleich fuer ML-003.
//
// Einzelartefakte werden VOR dem Vergleich gegen dasselbe Paket validiert.
// Verglichen werden ausschliesslich die nach AUFTRAG-ML003-DOPPELKODIERUNG §4
// konsensblockierenden strukturierten Pflichtfelder. Freitext wird nie auf
// Wortgleichheit verglichen. Bei jedem strukturierten Konflikt bleibt der
// ganze Roh-Treffer ungeklaert; es werden keine Felder aus A und B gemischt.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  pruefeKodierartefakt,
  type KodierKontext,
  type Kodierartefakt,
  type Kodiereintrag,
} from "./kodierschema.js";
import { kodierkontext, type Kodierstoffpaket } from "./kodierstoff.js";

export const KODIERABGLEICH_SCHEMA = "gemeinsam-recht.ml003.kodierabgleich.v1";
export const MINDESTFALLZAHL = 10;

type Vergleichswert = string | null;

export interface Feldkonflikt {
  feld: string;
  a: Vergleichswert;
  b: Vergleichswert;
}

export interface KonsensKlassifikation {
  status: "eingeschlossen" | "ausgeschlossen" | "ungeklaert";
  ausschlussgrund?: string;
  zaehleinheit?: string;
  abschluss_status?: string;
  erledigungsweg?: {
    modus: string;
    prozessgrund: string | null;
    stand_datum: string;
    quelle: string;
  };
  messausgang?: {
    wert: string;
    quelle: string;
  };
  verfahrensrecht_nachweis?: {
    regime: string;
    quelle: string;
  };
}

export interface AbgleichEintrag {
  quelle_id: string;
  ergebnis: "uebereinstimmung" | "konflikt";
  konsens: KonsensKlassifikation;
  konflikte: Feldkonflikt[];
}

export interface AbgleichQuote {
  zulaessig: boolean;
  zaehleinheiten: number;
  durchgesetzt: number;
  nicht_durchgesetzt: number;
  nicht_anwendbar: number;
  quote_durchgesetzt: number | null;
  gruende: string[];
}

export interface AbgleichErgebnis {
  eintraege: AbgleichEintrag[];
  vergleich: {
    roh_treffer: number;
    uebereinstimmung: number;
    konflikte: number;
    statuskonflikte: number;
    feldkonflikte: number;
    doppelt_ungeklaert: number;
    agreement_rate: number;
  };
  quote: AbgleichQuote;
}

function wert(w: unknown): Vergleichswert {
  if (w === null) return null;
  if (typeof w === "string") return w;
  throw new Error(`Interner Abgleichfehler: erwarteter Vergleichswert ist ${typeof w}.`);
}

function vergleichen(konflikte: Feldkonflikt[], feld: string, a: unknown, b: unknown): void {
  const av = wert(a);
  const bv = wert(b);
  if (av !== bv) konflikte.push({ feld, a: av, b: bv });
}

function struktur(e: Kodiereintrag): KonsensKlassifikation {
  if (e.status === "ausgeschlossen") {
    return { status: "ausgeschlossen", ausschlussgrund: e.ausschlussgrund! };
  }
  if (e.status === "ungeklaert") return { status: "ungeklaert" };
  if (e.status !== "eingeschlossen") {
    throw new Error(`Interner Abgleichfehler: unbekannter Status "${e.status}".`);
  }
  const weg = e.erledigungsweg!;
  const messausgang = e.messausgang!;
  const konsens: KonsensKlassifikation = {
    status: "eingeschlossen",
    zaehleinheit: e.zaehleinheit!,
    abschluss_status: e.abschluss_status!,
    erledigungsweg: {
      modus: weg.modus,
      prozessgrund: weg.prozessgrund,
      stand_datum: weg.stand_datum,
      quelle: weg.quelle,
    },
    messausgang: {
      wert: messausgang.wert,
      quelle: messausgang.quelle,
    },
  };
  if (e.abschluss_status === "abgeschlossen") {
    const nachweis = e.verfahrensrecht_nachweis!;
    konsens.verfahrensrecht_nachweis = { regime: nachweis.regime, quelle: nachweis.quelle };
  }
  return konsens;
}

/**
 * Vergleicht zwei bereits gueltige Eintraege derselben quelle_id.
 * Bei Statuskonflikt wird nur der Status als Streitfeld gefuehrt: die
 * statusabhaengigen Felder sind dann nicht dieselben Pflichtfelder und werden
 * nicht kuenstlich gegeneinander gestellt.
 */
export function vergleicheEintrag(a: Kodiereintrag, b: Kodiereintrag): AbgleichEintrag {
  if (a.quelle_id !== b.quelle_id) {
    throw new Error(`Interner Abgleichfehler: verschiedene quelle_id (${a.quelle_id} / ${b.quelle_id}).`);
  }
  if (a.status !== b.status) {
    return {
      quelle_id: a.quelle_id,
      ergebnis: "konflikt",
      konsens: { status: "ungeklaert" },
      konflikte: [{ feld: "status", a: wert(a.status), b: wert(b.status) }],
    };
  }

  const konflikte: Feldkonflikt[] = [];
  if (a.status === "ausgeschlossen") {
    vergleichen(konflikte, "ausschlussgrund", a.ausschlussgrund!, b.ausschlussgrund!);
  } else if (a.status === "eingeschlossen") {
    vergleichen(konflikte, "zaehleinheit", a.zaehleinheit!, b.zaehleinheit!);
    vergleichen(konflikte, "abschluss_status", a.abschluss_status!, b.abschluss_status!);
    vergleichen(konflikte, "erledigungsweg.modus", a.erledigungsweg!.modus, b.erledigungsweg!.modus);
    vergleichen(
      konflikte,
      "erledigungsweg.prozessgrund",
      a.erledigungsweg!.prozessgrund,
      b.erledigungsweg!.prozessgrund,
    );
    vergleichen(
      konflikte,
      "erledigungsweg.stand_datum",
      a.erledigungsweg!.stand_datum,
      b.erledigungsweg!.stand_datum,
    );
    vergleichen(konflikte, "erledigungsweg.quelle", a.erledigungsweg!.quelle, b.erledigungsweg!.quelle);
    vergleichen(konflikte, "messausgang.wert", a.messausgang!.wert, b.messausgang!.wert);
    vergleichen(konflikte, "messausgang.quelle", a.messausgang!.quelle, b.messausgang!.quelle);

    // Der Verfahrensrechtsnachweis ist Pflicht bei eingeschlossen + abgeschlossen.
    // Bei rueckweisung_offen ist er kein Pflichtfeld und blockiert den Konsens nicht.
    if (a.abschluss_status === "abgeschlossen" && b.abschluss_status === "abgeschlossen") {
      vergleichen(
        konflikte,
        "verfahrensrecht_nachweis.regime",
        a.verfahrensrecht_nachweis!.regime,
        b.verfahrensrecht_nachweis!.regime,
      );
      vergleichen(
        konflikte,
        "verfahrensrecht_nachweis.quelle",
        a.verfahrensrecht_nachweis!.quelle,
        b.verfahrensrecht_nachweis!.quelle,
      );
    }
  }

  return {
    quelle_id: a.quelle_id,
    ergebnis: konflikte.length === 0 ? "uebereinstimmung" : "konflikt",
    konsens: konflikte.length === 0 ? struktur(a) : { status: "ungeklaert" },
    konflikte,
  };
}

function terminaleMessbilanz(eintraege: readonly AbgleichEintrag[]): AbgleichQuote {
  const gruende: string[] = [];
  const ungeklaert = eintraege.filter((e) => e.konsens.status === "ungeklaert").length;
  if (ungeklaert > 0) {
    gruende.push(
      `${ungeklaert} Roh-Treffer bleiben im A/B-Konsens ungeklaert; ohne vollstaendige Zuordnung gibt es keinen vollstaendigen Nenner.`,
    );
  }

  const gruppen = new Map<string, KonsensKlassifikation[]>();
  for (const e of eintraege) {
    if (e.konsens.status !== "eingeschlossen") continue;
    const id = e.konsens.zaehleinheit!;
    const liste = gruppen.get(id) ?? [];
    liste.push(e.konsens);
    gruppen.set(id, liste);
  }

  let durchgesetzt = 0;
  let nichtDurchgesetzt = 0;
  let nichtAnwendbar = 0;

  for (const [id, liste] of gruppen) {
    const spaetestes = liste.reduce(
      (max, k) => (k.erledigungsweg!.stand_datum > max ? k.erledigungsweg!.stand_datum : max),
      "",
    );
    const letzte = liste.filter((k) => k.erledigungsweg!.stand_datum === spaetestes);
    const zustand = new Set(
      letzte.map((k) => `${k.abschluss_status}/${k.erledigungsweg!.modus}/${k.messausgang!.wert}`),
    );
    if (zustand.size !== 1) {
      gruende.push(
        `Zaehleinheit ${id} traegt am terminalen Standdatum ${spaetestes} mehrere verschiedene Endstaende (${[
          ...zustand,
        ].join(" / ")}).`,
      );
      continue;
    }
    const terminal = letzte[0]!;
    if (terminal.abschluss_status !== "abgeschlossen" || terminal.messausgang!.wert === "offen") {
      gruende.push(`Zaehleinheit ${id} ist am terminalen Stand ${spaetestes} nicht abgeschlossen.`);
      continue;
    }
    if (terminal.messausgang!.wert === "durchgesetzt") durchgesetzt += 1;
    else if (terminal.messausgang!.wert === "nicht_durchgesetzt") nichtDurchgesetzt += 1;
    else if (terminal.messausgang!.wert === "nicht_anwendbar") nichtAnwendbar += 1;
    else gruende.push(`Zaehleinheit ${id} traegt den nicht zaehlbaren Messausgang "${terminal.messausgang!.wert}".`);
  }

  if (gruppen.size < MINDESTFALLZAHL) {
    gruende.push(`Die Konsenspopulation umfasst ${gruppen.size} Zaehleinheiten und liegt unter der Mindestfallzahl ${MINDESTFALLZAHL}.`);
  }

  const zulaessig = gruende.length === 0;
  return {
    zulaessig,
    zaehleinheiten: gruppen.size,
    durchgesetzt,
    nicht_durchgesetzt: nichtDurchgesetzt,
    nicht_anwendbar: nichtAnwendbar,
    quote_durchgesetzt: zulaessig && gruppen.size > 0 ? durchgesetzt / gruppen.size : null,
    gruende,
  };
}

/** Vergleicht zwei vollstaendig validierte Kodierartefakte in Paket-Reihenfolge. */
export function vergleicheKodierungen(
  a: Kodierartefakt,
  b: Kodierartefakt,
  reihenfolge?: readonly string[],
): AbgleichErgebnis {
  const aNachId = new Map(a.eintraege.map((e) => [e.quelle_id, e]));
  const bNachId = new Map(b.eintraege.map((e) => [e.quelle_id, e]));
  const ids = reihenfolge ?? a.eintraege.map((e) => e.quelle_id);
  const eintraege = ids.map((id) => {
    const ae = aNachId.get(id);
    const be = bNachId.get(id);
    if (!ae || !be) throw new Error(`Interner Abgleichfehler: ${id} fehlt trotz vorheriger Validierung.`);
    return vergleicheEintrag(ae, be);
  });

  const statuskonflikte = eintraege.filter((e) => e.konflikte.some((k) => k.feld === "status")).length;
  const konflikte = eintraege.filter((e) => e.ergebnis === "konflikt").length;
  const feldkonflikte = konflikte - statuskonflikte;
  const uebereinstimmung = eintraege.length - konflikte;
  const doppeltUngeklaert = eintraege.filter(
    (e) => e.ergebnis === "uebereinstimmung" && e.konsens.status === "ungeklaert",
  ).length;

  return {
    eintraege,
    vergleich: {
      roh_treffer: eintraege.length,
      uebereinstimmung,
      konflikte,
      statuskonflikte,
      feldkonflikte,
      doppelt_ungeklaert: doppeltUngeklaert,
      agreement_rate: eintraege.length === 0 ? 0 : uebereinstimmung / eintraege.length,
    },
    quote: terminaleMessbilanz(eintraege),
  };
}

/** Fail-closed-Eingangstor: beide Einzelartefakte werden validiert, erst dann verglichen. */
export function pruefeAbgleichEingaben(
  a: Kodierartefakt,
  b: Kodierartefakt,
  kontext: KodierKontext,
): string[] {
  const fehler: string[] = [];
  for (const meldung of pruefeKodierartefakt(a, kontext)) fehler.push(`A: ${meldung}`);
  for (const meldung of pruefeKodierartefakt(b, kontext)) fehler.push(`B: ${meldung}`);
  if (a.kodierer.rolle !== "A") fehler.push(`A-Datei nennt kodierer.rolle "${a.kodierer.rolle}" statt "A".`);
  if (b.kodierer.rolle !== "B") fehler.push(`B-Datei nennt kodierer.rolle "${b.kodierer.rolle}" statt "B".`);
  return fehler;
}

function sha256(datei: string): string {
  return createHash("sha256").update(readFileSync(datei)).digest("hex");
}

function argument(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 || i + 1 >= process.argv.length ? null : (process.argv[i + 1] ?? null);
}

function leseJson<T>(pfad: string): T {
  return JSON.parse(readFileSync(pfad, "utf8")) as T;
}

function istDirektAufruf(): boolean {
  return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}

function haupt(): void {
  const paketPfad = argument("paket");
  const aPfad = argument("a");
  const bPfad = argument("b");
  const outPfad = argument("out");
  if (!paketPfad || !aPfad || !bPfad || !outPfad) {
    throw new Error("Aufruf: npm run kodierabgleich -- --paket <kodierstoff.json> --a <A.json> --b <B.json> --out <audit.json>");
  }

  const paketHash = sha256(paketPfad);
  const aHash = sha256(aPfad);
  const bHash = sha256(bPfad);
  const paket = leseJson<Kodierstoffpaket>(paketPfad);
  const a = leseJson<Kodierartefakt>(aPfad);
  const b = leseJson<Kodierartefakt>(bPfad);
  const kontext = kodierkontext(paket, paketHash, { ausschluss: paket.regeln.ausschluss });
  const fehler = pruefeAbgleichEingaben(a, b, kontext);
  if (fehler.length > 0) {
    throw new Error(`A/B-Abgleich abgebrochen; Einzelvalidierung fehlgeschlagen:\n- ${fehler.join("\n- ")}`);
  }

  const ergebnis = vergleicheKodierungen(a, b, paket.dokumente.map((d) => d.quelle_id));
  const audit = {
    schema: KODIERABGLEICH_SCHEMA,
    messlauf: paket.messlauf,
    datenstand: paket.datenstand,
    raw_checkpoint: paket.raw_checkpoint,
    messdefinition: paket.messdefinition,
    bundle_sha256: paket.bundle_sha256,
    kodierstoff_sha256: paketHash,
    kodierer_a: { rolle: a.kodierer.rolle, modell: a.kodierer.modell, artefakt_sha256: aHash, artefakt_im_repository: false },
    kodierer_b: { rolle: b.kodierer.rolle, modell: b.kodierer.modell, artefakt_sha256: bHash, artefakt_im_repository: false },
    konsensregel:
      "Nur vollstaendige Uebereinstimmung aller strukturierten Pflichtfelder des jeweiligen Status wird uebernommen. Jeder Status- oder Feldkonflikt laesst den ganzen Roh-Treffer ungeklaert; Freitext wird nicht auf Wortgleichheit verglichen.",
    vergleich: ergebnis.vergleich,
    eintraege: ergebnis.eintraege,
    quote: ergebnis.quote,
    ablage:
      "Die vollstaendigen A- und B-Kodierartefakte bleiben ausserhalb des Repositoriums und sind im Audit ausschliesslich ueber ihre SHA-256-Werte verankert. lauf.json wird durch diesen Schritt nicht veraendert.",
  };
  writeFileSync(outPfad, `${JSON.stringify(audit, null, 2)}\n`, "utf8");

  console.log("ML-003 A/B ABGLEICH");
  console.log(`A_VALIDIERUNG OK`);
  console.log(`B_VALIDIERUNG OK`);
  console.log(`EINTRAEGE ${ergebnis.vergleich.roh_treffer}`);
  console.log(`UEBEREINSTIMMUNG ${ergebnis.vergleich.uebereinstimmung}`);
  console.log(`KONFLIKTE ${ergebnis.vergleich.konflikte}`);
  console.log(`STATUSKONFLIKTE ${ergebnis.vergleich.statuskonflikte}`);
  console.log(`FELDKONFLIKTE ${ergebnis.vergleich.feldkonflikte}`);
  console.log(`DOPPELT_UNGEKLAERT ${ergebnis.vergleich.doppelt_ungeklaert}`);
  console.log(`QUOTE_ZULAESSIG ${ergebnis.quote.zulaessig ? "JA" : "NEIN"}`);
  console.log(`ZAEHLEINHEITEN ${ergebnis.quote.zaehleinheiten}`);
  console.log(`ERGEBNIS ${outPfad}`);
  console.log("STATUS OK");
}

if (istDirektAufruf()) haupt();


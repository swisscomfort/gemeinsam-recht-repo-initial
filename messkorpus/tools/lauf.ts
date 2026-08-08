// lauf.ts — Messlauf: Invarianten der Trefferliste.
//
// Der Lauf ist der Nachweis, dass nichts still verschwunden ist. Deshalb
// gilt hier nicht "die eingeschlossenen Faelle sind gespeichert", sondern:
// jeder einzelne Treffer der Abfrage bleibt mit genau einem Status stehen,
// und die Rohtrefferzahl muss zur Liste passen.
//
// Rein und deterministisch: keine Systemzeit, kein Netz.

import type { Messdefinition } from "./definition.ts";
import { definitionsHash } from "./definition.ts";

export type TrefferStatus = "eingeschlossen" | "ausgeschlossen" | "ungeklaert";

export interface Treffer {
  quelle_id: string;
  aktenzeichen?: string;
  datum?: string;
  gericht?: string;
  link?: string;
  status: TrefferStatus;
  ausschlussgrund?: string;
  notiz?: string;
  story_id?: string;
}

export interface Messlauf {
  id: string;
  messdefinition: { id: string; version: string; sha256: string };
  durchgefuehrt_am: string;
  datenstand: string;
  roh_treffer: number;
  gekappt: boolean;
  treffer: Treffer[];
}

export interface Befund {
  ok: boolean;
  fehler: string[];
}

/**
 * Prueft einen Lauf gegen seine Messdefinition. Fehlerhafte Laeufe sind
 * kein Messkorpus — sie werden nicht "bereinigt", sondern abgelehnt.
 */
export function pruefeLauf(lauf: Messlauf, definition: Messdefinition): Befund {
  const fehler: string[] = [];

  /* Definition: Identitaet und Unveraendertheit */
  if (lauf.messdefinition.id !== definition.id) {
    fehler.push(`Lauf ${lauf.id} verweist auf ${lauf.messdefinition.id}, geprueft wurde gegen ${definition.id}.`);
  }
  if (lauf.messdefinition.version !== definition.version) {
    fehler.push(
      `Lauf ${lauf.id} wurde gegen Version ${lauf.messdefinition.version} erhoben, die Definition steht auf ${definition.version}. ` +
        `Alte Laeufe bleiben gueltig — sie gehoeren zu ihrer damaligen Fassung, nicht zur neuen.`,
    );
  }
  const hash = definitionsHash(definition);
  if (lauf.messdefinition.sha256 !== hash) {
    fehler.push(
      `Lauf ${lauf.id}: Definitions-Hash weicht ab (Lauf ${lauf.messdefinition.sha256.slice(0, 12)}…, Datei ${hash.slice(0, 12)}…). ` +
        `Die Messdefinition wurde nach dem Lauf inhaltlich geaendert.`,
    );
  }

  /* Kein stiller Verlust */
  if (lauf.gekappt) {
    fehler.push(
      `Lauf ${lauf.id} ist gekappt (Obergrenze der Quelle erreicht) — als Messkorpus unbrauchbar, weil unbekannt viele Treffer fehlen. ` +
        `Zeitraum verkleinern oder Abfrage praezisieren und neu erheben.`,
    );
  }
  if (lauf.roh_treffer !== lauf.treffer.length) {
    fehler.push(
      `Lauf ${lauf.id}: roh_treffer ${lauf.roh_treffer}, gespeicherte Treffer ${lauf.treffer.length} — Differenz ${
        lauf.roh_treffer - lauf.treffer.length
      }. Jeder Treffer muss stehen bleiben.`,
    );
  }

  /* Treffer: Eindeutigkeit und Status */
  const gesehen = new Set<string>();
  const ausschlussCodes = new Set(definition.ausschluss.map((k) => k.code));
  for (const treffer of lauf.treffer) {
    if (gesehen.has(treffer.quelle_id)) {
      fehler.push(`Lauf ${lauf.id}: Treffer ${treffer.quelle_id} kommt mehrfach vor.`);
    }
    gesehen.add(treffer.quelle_id);

    if (treffer.status === "ausgeschlossen") {
      if (!treffer.ausschlussgrund) {
        fehler.push(`Lauf ${lauf.id}: Treffer ${treffer.quelle_id} ist ausgeschlossen, nennt aber keinen Grund.`);
      } else if (!ausschlussCodes.has(treffer.ausschlussgrund)) {
        fehler.push(
          `Lauf ${lauf.id}: Treffer ${treffer.quelle_id} nennt den Ausschlussgrund "${treffer.ausschlussgrund}", ` +
            `der in ${definition.id} nicht vorher deklariert ist. Gruende werden vor der Sichtung festgelegt.`,
        );
      }
    } else if (treffer.ausschlussgrund) {
      fehler.push(
        `Lauf ${lauf.id}: Treffer ${treffer.quelle_id} hat Status "${treffer.status}", traegt aber einen Ausschlussgrund.`,
      );
    }
  }

  return { ok: fehler.length === 0, fehler };
}

export interface Bilanz {
  roh: number;
  eingeschlossen: number;
  ausgeschlossen: number;
  ungeklaert: number;
  ausschluesse: { grund: string; anzahl: number }[];
}

/** Vollstaendige Bilanz eines Laufs — die Zahlen, die jede Quote mitfuehren muss. */
export function bilanz(lauf: Messlauf): Bilanz {
  const zaehler = new Map<string, number>();
  let eingeschlossen = 0;
  let ausgeschlossen = 0;
  let ungeklaert = 0;

  for (const treffer of lauf.treffer) {
    if (treffer.status === "eingeschlossen") eingeschlossen += 1;
    else if (treffer.status === "ungeklaert") ungeklaert += 1;
    else {
      ausgeschlossen += 1;
      const grund = treffer.ausschlussgrund ?? "(ohne Grund)";
      zaehler.set(grund, (zaehler.get(grund) ?? 0) + 1);
    }
  }

  return {
    roh: lauf.treffer.length,
    eingeschlossen,
    ausgeschlossen,
    ungeklaert,
    ausschluesse: [...zaehler.entries()]
      .map(([grund, anzahl]) => ({ grund, anzahl }))
      .sort((a, b) => (b.anzahl - a.anzahl) || (a.grund < b.grund ? -1 : 1)),
  };
}

/**
 * Die Population eines Laufs: sortierte Liste der Treffer-IDs mit Status.
 * Zwei Laeufe derselben Definition auf demselben Datenstand muessen exakt
 * dieselbe Population ergeben — das ist die pruefbare Fassung von
 * "reproduzierbar".
 */
export function population(lauf: Messlauf): string {
  return lauf.treffer
    .map((t) => `${t.quelle_id}\t${t.status}\t${t.ausschlussgrund ?? ""}`)
    .sort()
    .join("\n");
}

/** Gleiche Population? Vergleicht nur, was die Messung ausmacht. */
export function gleichePopulation(a: Messlauf, b: Messlauf): boolean {
  return population(a) === population(b);
}

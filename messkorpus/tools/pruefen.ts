// pruefen.ts — CLI `npm run pruefen`.
//
// Prueft alle Messdefinitionen und Messlaeufe: Schema, inhaltliche
// Selektionsneutralitaet, Lauf-Invarianten, Zuordnung zu Faellen. Gibt fuer
// jeden Lauf die vollstaendige Bilanz aus (roh, eingeschlossen,
// ausgeschlossen je Grund, ungeklaert) und nennt die Sperren, die einer
// Quote noch entgegenstehen.
//
// Nur lesend. Kein Netz.

import { pruefeDefinitionInhalt, definitionsHash, type Messdefinition } from "./definition.ts";
import { leseFaelle } from "./faelle.ts";
import { bilanz, pruefeLauf, type Messlauf } from "./lauf.ts";
import { sperren } from "./messquote.ts";
import { istDirektAufruf, leseDefinitionen, leseLaeufe } from "./umgebung.ts";
import { pruefeMessdefinition, pruefeMesslauf } from "./validierung.ts";

export interface Bericht {
  zeilen: string[];
  fehler: number;
}

export function berichte(): Bericht {
  const zeilen: string[] = [];
  let fehler = 0;

  const definitionen = new Map<string, Messdefinition>();

  zeilen.push("MESSDEFINITIONEN");
  const dateien = leseDefinitionen();
  if (dateien.length === 0) zeilen.push("  (keine)");
  for (const { datei, inhalt } of dateien) {
    const schema = pruefeMessdefinition(inhalt);
    if (!schema.ok) {
      fehler += schema.fehler.length;
      zeilen.push(`  ${datei}: SCHEMA-FEHLER`);
      for (const f of schema.fehler) zeilen.push(`    - ${f}`);
      continue;
    }
    const definition = inhalt as Messdefinition;
    definitionen.set(definition.id, definition);

    const inhaltlich = pruefeDefinitionInhalt(definition);
    const marke = inhaltlich.ok ? "ok" : "INHALT-FEHLER";
    zeilen.push(
      `  ${definition.id} v${definition.version} [${definition.status}] ${marke} · sha256 ${definitionsHash(definition).slice(0, 12)}…`,
    );
    zeilen.push(`    Norm: ${definition.norm.norm_fundstelle} (${definition.norm.pruefstand})`);
    zeilen.push(
      `    Rechtskraft-Regel: ${definition.rechtskraft_regel.art} · ${definition.rechtskraft_regel.rechtsquelle} (${definition.rechtskraft_regel.pruefstand})`,
    );
    zeilen.push(`    Abschlussregel: ${definition.abschluss_regel.art} (${definition.abschluss_regel.pruefstand})`);
    zeilen.push(`    Zaehleinheit: ${definition.zaehleinheit.art}`);
    for (const f of inhaltlich.fehler) {
      fehler += 1;
      zeilen.push(`    - ${f}`);
    }
  }

  zeilen.push("");
  zeilen.push("MESSLAEUFE");
  const laeufe = leseLaeufe();
  if (laeufe.length === 0) zeilen.push("  (keine)");
  const faelle = leseFaelle();

  for (const { verzeichnis, inhalt } of laeufe) {
    const schema = pruefeMesslauf(inhalt);
    if (!schema.ok) {
      fehler += schema.fehler.length;
      zeilen.push(`  ${verzeichnis}: SCHEMA-FEHLER`);
      for (const f of schema.fehler) zeilen.push(`    - ${f}`);
      continue;
    }
    const lauf = inhalt as Messlauf;
    const definition = definitionen.get(lauf.messdefinition.id);
    if (!definition) {
      fehler += 1;
      zeilen.push(`  ${lauf.id}: Messdefinition ${lauf.messdefinition.id} nicht gefunden.`);
      continue;
    }

    const befund = pruefeLauf(lauf, definition);
    const b = bilanz(lauf);
    zeilen.push(`  ${lauf.id} (${definition.id} v${lauf.messdefinition.version}, Datenstand ${lauf.datenstand}) ${befund.ok ? "ok" : "FEHLER"}`);
    zeilen.push(
      `    Bilanz: ${b.roh} roh · ${b.eingeschlossen} eingeschlossen · ${b.ausgeschlossen} ausgeschlossen · ${b.ungeklaert} ungeklaert`,
    );
    for (const a of b.ausschluesse) zeilen.push(`      ausgeschlossen ${a.anzahl}x ${a.grund}`);
    for (const f of befund.fehler) {
      fehler += 1;
      zeilen.push(`    - ${f}`);
    }

    const sperre = sperren(lauf, definition, faelle);
    if (sperre.ok) {
      zeilen.push("    Quote: keine Sperre — materialisierbar.");
    } else {
      zeilen.push("    Quote gesperrt:");
      for (const grund of sperre.gruende) zeilen.push(`      · ${grund}`);
    }
  }

  return { zeilen, fehler };
}

/* ---------- CLI ---------- */

if (istDirektAufruf(import.meta.url)) {
  const bericht = berichte();
  for (const zeile of bericht.zeilen) console.log(zeile);
  if (bericht.fehler > 0) {
    console.error(`\n${bericht.fehler} Fehler.`);
    process.exitCode = 1;
  }
}

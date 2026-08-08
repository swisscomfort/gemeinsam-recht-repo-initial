// Tests der Trennung von Messkorpus und Redaktionskorpus — der Punkt, an dem
// das ganze Modul haengt. Doppelkodierung schuetzt gegen Kodierfehler, nicht
// gegen Selektionsverzerrung; diese Tests halten die Trennung fest, damit sie
// nicht spaeter aus Bequemlichkeit wieder verschwimmt.
//
// Ausserdem: die reale Messdefinition MD-001 gegen Schema und Inhalt, und der
// Konsistenztest der absichtlich duplizierten Hash-Funktion.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { definitionsHash, pruefeDefinitionInhalt, type Messdefinition } from "../tools/definition.ts";
import { definitionsHash as hashAusRedaktion, kanonisch as kanonischAusRedaktion } from "../../redaktion/src/messlauf.ts";
import { kanonisch } from "../tools/definition.ts";
import { leseDefinitionen, messkorpusPfad, repoPfad } from "../tools/umgebung.ts";
import { pruefeMessdefinition } from "../tools/validierung.ts";

describe("Messdefinitionen im Repository", () => {
  const definitionen = leseDefinitionen();

  it("es gibt mindestens eine", () => {
    expect(definitionen.length).toBeGreaterThan(0);
  });

  it.each(leseDefinitionen().map((d) => [d.datei, d.inhalt] as const))(
    "%s haelt das Schema ein",
    (_datei, inhalt) => {
      const befund = pruefeMessdefinition(inhalt);
      expect(befund.fehler).toEqual([]);
      expect(befund.ok).toBe(true);
    },
  );

  it.each(leseDefinitionen().map((d) => [d.datei, d.inhalt] as const))(
    "%s ist selektionsneutral",
    (_datei, inhalt) => {
      const befund = pruefeDefinitionInhalt(inhalt as Messdefinition);
      expect(befund.fehler).toEqual([]);
    },
  );

  it("jede Datei heisst wie ihre ID", () => {
    for (const { datei, inhalt } of definitionen) {
      expect(datei.startsWith(`${(inhalt as Messdefinition).id}-`)).toBe(true);
    }
  });

  it("keine Definition ist ohne fachliche Bestaetigung eingefroren", () => {
    // Einfrieren ist eine menschliche Entscheidung; ein Werkzeug darf sie
    // nicht vorwegnehmen. Faellt dieser Test, wurde sie es doch.
    for (const { datei, inhalt } of definitionen) {
      const definition = inhalt as Messdefinition;
      if (definition.status === "eingefroren") {
        expect(definition.norm.pruefstand, `${datei}: eingefroren, aber Norm unbestaetigt`).toBe(
          "fachlich_bestaetigt",
        );
        expect(
          definition.rechtskraft_regel.pruefstand,
          `${datei}: eingefroren, aber Rechtskraft-Regel unbestaetigt`,
        ).toBe("fachlich_bestaetigt");
      }
    }
  });
});

describe("Trennung vom Redaktionstrichter", () => {
  /** Kommentare entfernen: geprueft wird, was der Code tut, nicht was er erklaert. */
  function ohneKommentare(quelltext: string): string {
    return quelltext.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
  }

  const quellen = readdirSync(messkorpusPfad("tools"))
    .filter((name) => name.endsWith(".ts"))
    .map((name) => ({
      name,
      inhalt: ohneKommentare(readFileSync(join(messkorpusPfad("tools"), name), "utf8")),
    }));

  it("kein Werkzeug des Messkorpus liest sieb.json oder die Redaktionsmappe", () => {
    // Die Woerter "sieb"/"mappe" duerfen vorkommen — definition.ts fuehrt sie
    // als verbotenes Vokabular. Verboten ist der Zugriff: ein Import oder ein
    // Dateizugriff auf den Redaktionstrichter.
    const zugriff = /\b(import|require|readFileSync|leseJson|leseText|join)\b/;
    for (const { name, inhalt } of quellen) {
      const verdaechtig = inhalt
        .split("\n")
        .filter((zeile) => /sieb|mappe|gesiebt|vorschlaege/i.test(zeile))
        .filter((zeile) => zugriff.test(zeile));
      expect(verdaechtig, `${name} greift auf den Redaktionstrichter zu`).toEqual([]);
    }
  });

  it("die Erhebung benutzt das Sieb ebenfalls nicht", () => {
    const erhebung = ohneKommentare(
      readFileSync(repoPfad("redaktion", "src", "messlauf-erheben.ts"), "utf8"),
    );
    expect(erhebung).not.toContain("./sieb.js");
    expect(erhebung).not.toContain("sieb.json");
  });

  it("kein Werkzeug des Messkorpus geht ins Netz", () => {
    for (const { name, inhalt } of quellen) {
      expect(inhalt, `${name} enthaelt einen Netzaufruf`).not.toMatch(/\bfetch\s*\(/);
      expect(inhalt, `${name} nennt eine http-Adresse`).not.toMatch(/https?:\/\//);
    }
  });

  it("kein Werkzeug des Messkorpus liest die Uhr", () => {
    for (const { name, inhalt } of quellen) {
      expect(inhalt, `${name} liest die Systemzeit`).not.toContain("Date.now(");
      expect(inhalt, `${name} liest die Systemzeit`).not.toContain("new Date(");
    }
  });
});

describe("Konsistenz der duplizierten Hash-Funktion", () => {
  // redaktion/src/messlauf.ts fuehrt kanonisch()/definitionsHash() absichtlich
  // ein zweites Mal (rootDir-Grenze des CLI-Pakets, wie bei kodierung.ts).
  // Weichen die beiden je voneinander ab, passt kein erhobener Lauf mehr zu
  // seiner Definition — deshalb dieser Test.
  const proben: unknown[] = [
    { b: 1, a: [3, 2, 1], c: { z: null, y: "x" } },
    [],
    { leer: {} },
    "text",
    42,
  ];

  it.each(proben.map((p, i) => [i, p] as const))("Probe %i ergibt dieselbe kanonische Form", (_i, probe) => {
    expect(kanonischAusRedaktion(probe)).toBe(kanonisch(probe));
  });

  it("beide Fassungen hashen jede Messdefinition gleich", () => {
    for (const { inhalt } of leseDefinitionen()) {
      expect(hashAusRedaktion(inhalt)).toBe(definitionsHash(inhalt));
    }
  });
});

describe("Messlaeufe im Repository", () => {
  it("laeufe/ existiert und enthaelt nur vollstaendige Laeufe", () => {
    const wurzel = messkorpusPfad("laeufe");
    if (!existsSync(wurzel)) return;
    for (const name of readdirSync(wurzel)) {
      expect(existsSync(join(wurzel, name, "lauf.json")), `${name} ohne lauf.json`).toBe(true);
    }
  });
});

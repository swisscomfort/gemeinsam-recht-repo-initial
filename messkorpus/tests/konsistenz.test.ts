// Konsistenztest der absichtlich duplizierten Implementierungen.
//
// redaktion/src/messlauf.ts fuehrt kanonisch(), definitionsHash() und
// metadatenFingerprint() ein zweites Mal: der CLI-Rand des Redaktionspakets
// wird mit rootDir "src" kompiliert, Importe aus messkorpus/ sind dort
// verboten (dieselbe Lage wie bei kodierung.ts). Weichen die Fassungen je
// voneinander ab, passt kein erhobener Lauf mehr zu seiner Definition und
// jeder Fingerprint schlaegt falschen Alarm.
//
// Ein Kommentar, der auf diesen Test verweist, ist kein Test. Deshalb steht
// er hier — unter genau dem Namen, den die Kommentare nennen.

import { describe, expect, it } from "vitest";
import { definitionsHash, kanonisch } from "../tools/definition.ts";
import { metadatenFingerprint } from "../tools/lauf.ts";
import {
  definitionsHash as definitionsHashRedaktion,
  kanonisch as kanonischRedaktion,
  metadatenFingerprint as fingerprintRedaktion,
} from "../../redaktion/src/messlauf.ts";
import { leseDefinitionen } from "../tools/umgebung.ts";

const PROBEN: unknown[] = [
  { b: 1, a: [3, 2, 1], c: { z: null, y: "x" } },
  { gleich: { anders: "sortiert" }, a: 1 },
  [],
  [[], [{}]],
  { leer: {} },
  { mitUmlaut: "Kündigung · Erstreckung" },
  "text",
  42,
  null,
  true,
];

describe("kanonisch", () => {
  it.each(PROBEN.map((p, i) => [i, p] as const))("Probe %i ergibt in beiden Fassungen dieselbe Form", (_i, probe) => {
    expect(kanonischRedaktion(probe)).toBe(kanonisch(probe));
  });

  it("ist unabhaengig von der Schluesselreihenfolge — in beiden Fassungen", () => {
    const a = { x: 1, y: { b: 2, a: 1 } };
    const b = { y: { a: 1, b: 2 }, x: 1 };
    expect(kanonisch(a)).toBe(kanonisch(b));
    expect(kanonischRedaktion(a)).toBe(kanonischRedaktion(b));
  });
});

describe("definitionsHash", () => {
  it("beide Fassungen hashen jede reale Messdefinition gleich", () => {
    const definitionen = leseDefinitionen();
    expect(definitionen.length).toBeGreaterThan(0);
    for (const { datei, inhalt } of definitionen) {
      expect(definitionsHashRedaktion(inhalt), `${datei}`).toBe(definitionsHash(inhalt));
    }
  });

  it.each(PROBEN.map((p, i) => [i, p] as const))("Probe %i ergibt denselben Hash", (_i, probe) => {
    expect(definitionsHashRedaktion(probe)).toBe(definitionsHash(probe));
  });
});

describe("metadatenFingerprint", () => {
  const metadaten = {
    quelle_id: "CH_BGer_001_4A-123-2024_2024-05-01",
    aktenzeichen: "4A_123/2024",
    datum: "2024-05-01",
    gericht: "CH_BGer",
    link: "https://entscheidsuche.ch/view/CH_BGer_001_4A-123-2024_2024-05-01",
  };

  it("beide Fassungen liefern denselben Fingerprint", () => {
    expect(fingerprintRedaktion(metadaten)).toBe(metadatenFingerprint(metadaten));
  });

  it("aendert sich, wenn die Quelle ihre Metadaten aendert — in beiden Fassungen", () => {
    const geaendert = { ...metadaten, aktenzeichen: "4A_124/2024" };
    expect(metadatenFingerprint(geaendert)).not.toBe(metadatenFingerprint(metadaten));
    expect(fingerprintRedaktion(geaendert)).not.toBe(fingerprintRedaktion(metadaten));
    expect(fingerprintRedaktion(geaendert)).toBe(metadatenFingerprint(geaendert));
  });

  it("unterscheidet fehlendes Feld von leerem Feld", () => {
    const ohne = { ...metadaten, gericht: undefined };
    const leer = { ...metadaten, gericht: "" };
    expect(metadatenFingerprint(ohne)).not.toBe(metadatenFingerprint(leer));
    expect(fingerprintRedaktion(ohne)).toBe(metadatenFingerprint(ohne));
  });
});

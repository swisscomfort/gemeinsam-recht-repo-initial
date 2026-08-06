// validierung.ts — Schema-Pruefung mit ajv (draft-07), gemeinsame Basis der
// Werkzeuge und Tests. Entscheidet nichts; prueft nur.

import Ajv, { type ValidateFunction } from "ajv";
import { leseJson, wissenPfad } from "./umgebung.ts";

const ajv = new Ajv({ allErrors: true });
const geladen = new Map<string, ValidateFunction>();

function validator(schemaDatei: string): ValidateFunction {
  let v = geladen.get(schemaDatei);
  if (!v) {
    v = ajv.compile(leseJson(wissenPfad("schema", schemaDatei)) as object);
    geladen.set(schemaDatei, v);
  }
  return v;
}

export interface Pruefergebnis {
  ok: boolean;
  fehler: string[];
}

function pruefe(schemaDatei: string, wert: unknown): Pruefergebnis {
  const v = validator(schemaDatei);
  const ok = v(wert) as boolean;
  const fehler = (v.errors ?? []).map(
    (e) => `${e.instancePath || "(wurzel)"} ${e.message ?? ""}`.trim(),
  );
  return { ok, fehler };
}

export function pruefeErkenntnis(wert: unknown): Pruefergebnis {
  return pruefe("erkenntnis.schema.json", wert);
}

export function pruefeKandidat(wert: unknown): Pruefergebnis {
  return pruefe("kandidat.schema.json", wert);
}

export function pruefeQuote(wert: unknown): Pruefergebnis {
  return pruefe("quote.schema.json", wert);
}

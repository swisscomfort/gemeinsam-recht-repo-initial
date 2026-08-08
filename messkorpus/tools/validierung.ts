// validierung.ts — Schema-Pruefung mit ajv (draft-07). Entscheidet nichts;
// prueft nur. Angelegt wie wissen/tools/validierung.ts.

import Ajv, { type ValidateFunction } from "ajv";
import { leseJson, messkorpusPfad } from "./umgebung.ts";

const ajv = new Ajv({ allErrors: true });
const geladen = new Map<string, ValidateFunction>();

function validator(schemaDatei: string): ValidateFunction {
  let v = geladen.get(schemaDatei);
  if (!v) {
    v = ajv.compile(leseJson(messkorpusPfad("schema", schemaDatei)) as object);
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

export function pruefeMessdefinition(wert: unknown): Pruefergebnis {
  return pruefe("messdefinition.schema.json", wert);
}

export function pruefeMesslauf(wert: unknown): Pruefergebnis {
  return pruefe("messlauf.schema.json", wert);
}

// uebernehmen.ts — Werkzeug fuer die menschliche Uebernahme Eingang -> Register
// (AUFTRAG-W0 Teil C). Die Uebernahme selbst ist eine menschliche Entscheidung
// (Review-Gate, LEGAL_AI_OPERATING_RULES §2.1); dieses Werkzeug prueft nur das
// Schema, vergibt die naechste freie id und traegt den Review-Vermerk ein —
// es entscheidet nichts. Fehlermeldungen (E1) werden nie uebernommen.
//
// Aufruf: node tools/uebernehmen.ts <kandidat.json> <REGION> <wer> <wann>
//   REGION: CH oder Kantonskuerzel (bestimmt die id R-<REGION>-####)
//   wer/wann: Review-Vermerk als freie Angabe

import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RegisterEintrag } from "./migrate.ts";
import { istDirektAufruf, leseJson, leseRegister, wissenPfad } from "./umgebung.ts";
import { pruefeErkenntnis, pruefeKandidat } from "./validierung.ts";

const REGIONEN = [
  "CH", "AG", "AI", "AR", "BE", "BL", "BS", "FR", "GE", "GL", "GR", "JU", "LU",
  "NE", "NW", "OW", "SG", "SH", "SO", "SZ", "TG", "TI", "UR", "VD", "VS", "ZG", "ZH",
] as const;

export type UebernahmeErgebnis =
  | { ok: true; eintrag: RegisterEintrag }
  | { ok: false; fehler: string[] };

/** Naechste freie id fuer eine Region (R-<REGION>-####, fortlaufend). */
export function naechsteId(vorhandeneIds: readonly string[], region: string): string {
  const muster = new RegExp(`^R-${region}-([0-9]{4})$`);
  let hoechste = 0;
  for (const id of vorhandeneIds) {
    const treffer = muster.exec(id);
    if (treffer) hoechste = Math.max(hoechste, Number(treffer[1]));
  }
  return `R-${region}-${String(hoechste + 1).padStart(4, "0")}`;
}

/**
 * Prueft einen Eingangs-Eintrag und baut daraus den Register-Eintrag.
 * Reine Funktion; schreibt nichts und entscheidet nichts.
 */
export function uebernehmeKandidat(
  kandidat: unknown,
  vorhandeneIds: readonly string[],
  region: string,
  wer: string,
  wann: string,
): UebernahmeErgebnis {
  if (!REGIONEN.includes(region as (typeof REGIONEN)[number])) {
    return { ok: false, fehler: [`Unbekannte Region '${region}' (erlaubt: ${REGIONEN.join(", ")})`] };
  }
  if (wer.trim() === "" || wann.trim() === "") {
    return { ok: false, fehler: ["Review-Vermerk unvollstaendig: wer und wann sind Pflicht."] };
  }
  const schema = pruefeKandidat(kandidat);
  if (!schema.ok) {
    return { ok: false, fehler: ["Eingangs-Schema verletzt:", ...schema.fehler] };
  }
  const eintrag = kandidat as Record<string, unknown>;
  if (eintrag["status"] === "fehlermeldung") {
    return {
      ok: false,
      fehler: [
        "Fehlermeldungen werden nicht ins Register uebernommen — sie sind Anlass fuer eine menschliche Pruefung der genannten Regel.",
      ],
    };
  }

  const { status: _status, begruendung: _begruendung, ...rest } = eintrag as unknown as {
    status: string;
    begruendung: string;
  } & RegisterEintrag;
  const neu: RegisterEintrag = {
    ...rest,
    id: naechsteId(vorhandeneIds, region),
    review: { wer: wer.trim(), wann: wann.trim() },
  };

  const erkenntnis = pruefeErkenntnis(neu);
  if (!erkenntnis.ok) {
    return { ok: false, fehler: ["Ergebnis verletzt erkenntnis.schema.json:", ...erkenntnis.fehler] };
  }
  return { ok: true, eintrag: neu };
}

/* ---------- CLI ---------- */

function hauptlauf(): void {
  const [, , datei, region, wer, wann] = process.argv;
  if (!datei || !region || !wer || !wann) {
    console.log("Aufruf: node tools/uebernehmen.ts <kandidat.json> <REGION> <wer> <wann>");
    process.exitCode = 1;
    return;
  }
  const vorhandene = (leseRegister() as RegisterEintrag[]).map((e) => e.id);
  const ergebnis = uebernehmeKandidat(leseJson(datei), vorhandene, region, wer, wann);
  if (!ergebnis.ok) {
    for (const fehler of ergebnis.fehler) console.log(`! ${fehler}`);
    process.exitCode = 1;
    return;
  }
  const zielPfad = join(wissenPfad("register"), `${ergebnis.eintrag.id}.json`);
  if (existsSync(zielPfad)) {
    console.log(`! Ziel ${zielPfad} existiert bereits — Abbruch.`);
    process.exitCode = 1;
    return;
  }
  writeFileSync(zielPfad, `${JSON.stringify(ergebnis.eintrag, null, 2)}\n`);
  console.log(`+ ${ergebnis.eintrag.id}.json angelegt (Review: ${wer}, ${wann}).`);
  console.log(
    "Hinweis: Danach `npm run migrate` ausfuehren, damit core/src/register.gen.ts nachzieht.",
  );
}

if (istDirektAufruf(import.meta.url)) {
  hauptlauf();
}

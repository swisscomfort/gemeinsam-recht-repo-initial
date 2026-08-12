// kodierstoff-export.ts — CLI `npm run kodierstoff-export`.
//
// Schritt [1] des Doppelkodierungs-Ablaufs: erzeugt aus dem versiegelten
// Volltextbundle EIN Kodierpaket. Beide Kodierer bekommen genau diese Datei.
//
// Hier steht nur der Rand: Argumente, Platte, Ablageort. Was ins Paket gehoert
// und wann keines entsteht, steht in kodierstoff.ts; das Antwortschema in
// kodierschema.ts.
//
// Kein Netz. Ablage ausserhalb des Repositoriums — Volltexte gehoeren nie
// nach Git.
//
// Aufruf:
//   npm run kodierstoff-export -- --lauf ML-003 \
//     --bundle ~/gr-volltexte/ML-003 --ziel ~/gr-kodierung/ML-003

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { baueKodierstoff, findeDefinitionsdatei, type Anker, type Definition } from "./kodierstoff.js";
import { alsDatei, liegtImRepo, sha256 } from "./volltexte.js";

function repoWurzel(): string {
  return dirname(dirname(dirname(fileURLToPath(import.meta.url))));
}

function argument(name: string): string | null {
  const stelle = process.argv.indexOf(`--${name}`);
  if (stelle === -1 || stelle + 1 >= process.argv.length) return null;
  return process.argv[stelle + 1] ?? null;
}

/** Liest alle Definitionsdateien eines Verzeichnisses in stabiler Reihenfolge. */
function definitionsdateien(verzeichnis: string): Array<{ datei: string; inhalt: unknown }> {
  return readdirSync(verzeichnis)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const datei = join(verzeichnis, name);
      try {
        return { datei, inhalt: JSON.parse(readFileSync(datei, "utf8")) as unknown };
      } catch {
        return { datei, inhalt: null };
      }
    });
}

function haupt(): void {
  const wurzel = repoWurzel();
  const laufId = argument("lauf");
  const bundleRoh = argument("bundle");
  const zielRoh = argument("ziel");

  if (!laufId || !bundleRoh || !zielRoh) {
    throw new Error(
      "Aufruf: npm run kodierstoff-export -- --lauf ML-003 --bundle <bundleverzeichnis> " +
        "--ziel <verzeichnis ausserhalb des Repos>",
    );
  }
  if (!/^ML-\d{3}$/.test(laufId)) throw new Error(`--lauf muss die Form ML-003 haben, erhalten: "${laufId}"`);

  const bundle = resolve(process.cwd(), bundleRoh);
  const ziel = resolve(process.cwd(), zielRoh);
  for (const [was, pfad] of [
    ["Bundle", bundle],
    ["Ziel", ziel],
  ] as const) {
    if (liegtImRepo(pfad, wurzel)) {
      throw new Error(`${was}verzeichnis ${pfad} liegt im Repository. Volltexte gehoeren nie dorthin.`);
    }
  }

  const laufPfad = join(wurzel, "messkorpus", "laeufe", laufId, "lauf.json");
  const ankerPfad = join(wurzel, "messkorpus", "laeufe", laufId, "volltext-bundle-manifest.json");
  for (const pfad of [laufPfad, ankerPfad]) {
    if (!existsSync(pfad)) throw new Error(`${pfad} fehlt — ohne verankerten Rohlauf und Provenienzanker kein Paket.`);
  }

  const lauf = JSON.parse(readFileSync(laufPfad, "utf8")) as { messdefinition: { id: string; version: string } };
  const anker = JSON.parse(readFileSync(ankerPfad, "utf8")) as Anker;
  const definitionsPfad = findeDefinitionsdatei(
    definitionsdateien(join(wurzel, "messkorpus", "definitionen")),
    lauf.messdefinition,
  );
  const definition = JSON.parse(readFileSync(definitionsPfad, "utf8")) as Definition;

  const paket = baueKodierstoff({
    lauf,
    anker,
    definition,
    volltext: (id) => {
      const pfad = join(bundle, "volltext", `${id}.txt`);
      return existsSync(pfad) ? readFileSync(pfad, "utf8") : null;
    },
  });

  mkdirSync(ziel, { recursive: true });
  const pfad = join(ziel, `${laufId}-kodierstoff.json`);
  const inhalt = alsDatei(paket);
  writeFileSync(pfad, inhalt);

  console.log(`Kodierpaket geschrieben: ${pfad}`);
  console.log(`  ${paket.dokumente.length} Dokumente · sha256 ${sha256(inhalt)}`);
  console.log(`  Definition ${paket.messdefinition.id}@${paket.messdefinition.version} [${definition.status}]`);
  console.log(`  raw_checkpoint ${paket.raw_checkpoint} · bundle ${paket.bundle_sha256}`);
  console.log(`  Jeder Volltext gegen den Provenienzanker geprueft — alle stimmen.`);
  console.log("\nBeide Kodierer erhalten GENAU diese Datei: kein Kodierername darin, kein Vorschlag,");
  console.log("nichts aus einem anderen Lauf. Die Antworten gehoeren in getrennte Dateien und tragen");
  console.log("Rolle und Modell nur in ihrem Kopf.");
}

try {
  haupt();
} catch (fehler: unknown) {
  console.error(fehler instanceof Error ? fehler.message : String(fehler));
  process.exitCode = 1;
}

// volltexte-abschliessen.ts — CLI `npm run volltexte-abschliessen`.
//
// Der Abschluss-Schritt nach volltexte-holen: das Bundle packen, seinen
// SHA-256 bilden, das Manifest vervollstaendigen und die Deckung mit dem
// Rohlauf nachrechnen. Kein Netz — es wird nichts mehr beschafft, nur noch
// geprueft und versiegelt.
//
// Die Reihenfolge ist Absicht: erst nachrechnen, dann packen, dann
// vervollstaendigen. Ein Bundle-Hash ueber Material, das nicht zum Manifest
// passt, waere ein Siegel auf der falschen Kiste.
//
// Deterministisch gepackt (sortiert, ohne Zeitstempel, ohne Eigentuemer):
// zweimal packen ergibt denselben Hash. Ein Hash, der sich beim erneuten
// Packen aendert, beglaubigt nichts.
//
// Was hier NICHT passiert: messkorpus/laeufe/<ML>/lauf.json wird nicht
// gelesen zum Schreiben und nie veraendert; kein Volltext gelangt ins
// Repository. Mit --verankern entsteht dort ausschliesslich die
// Manifestdatei.
//
// Aufruf:
//   npm run volltexte-abschliessen -- --lauf ML-003 --ziel ~/gr-volltexte/ML-003 \
//     --raw-checkpoint <sha> --verankern

import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import {
  alsDatei,
  liegtImRepo,
  packeTar,
  pruefeAblage,
  sha256,
  sha256Bytes,
  trefferAusLauf,
  vollstaendigkeit,
  type BundleDatei,
  type DokumentBefund,
  type GelesenesDokument,
} from "./volltexte.js";

function repoWurzel(): string {
  return dirname(dirname(dirname(fileURLToPath(import.meta.url))));
}

function argument(name: string): string | null {
  const stelle = process.argv.indexOf(`--${name}`);
  if (stelle === -1 || stelle + 1 >= process.argv.length) return null;
  return process.argv[stelle + 1] ?? null;
}

function schalter(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function lies(pfad: string): { text: string; roh: Buffer } {
  const roh = readFileSync(pfad);
  return { text: roh.toString("utf8"), roh };
}

async function haupt(): Promise<void> {
  const wurzel = repoWurzel();
  const laufId = argument("lauf");
  const zielRoh = argument("ziel");
  const rawCheckpoint = argument("raw-checkpoint");
  const verankern = schalter("verankern");

  if (!laufId || !zielRoh) {
    throw new Error(
      "Aufruf: npm run volltexte-abschliessen -- --lauf ML-003 --ziel <verzeichnis> [--raw-checkpoint <sha>] [--verankern]",
    );
  }
  if (!/^ML-\d{3}$/.test(laufId)) throw new Error(`--lauf muss die Form ML-003 haben, erhalten: "${laufId}"`);

  const ziel = resolve(process.cwd(), zielRoh);
  if (liegtImRepo(ziel, wurzel)) {
    throw new Error(
      `Das Bundleverzeichnis ${ziel} liegt INNERHALB des Repositoriums (${wurzel}). ` +
        `Volltexte gehoeren nie ins Repository.`,
    );
  }

  /* 1. Rohlauf: die Bezeichner, gegen die alles zu decken ist. */
  const laufPfad = join(wurzel, "messkorpus", "laeufe", laufId, "lauf.json");
  if (!existsSync(laufPfad)) throw new Error(`${laufId} hat keine lauf.json unter ${laufPfad}.`);
  const lauf = JSON.parse(readFileSync(laufPfad, "utf8")) as {
    messdefinition: { id: string; version: string; sha256: string };
  };
  const rawIds = trefferAusLauf(JSON.parse(readFileSync(laufPfad, "utf8"))).map((t) => t.quelle_id);

  /* 2. Manifest, wie volltexte-holen es hinterlassen hat. */
  const manifestPfad = join(ziel, `${laufId}-volltext-bundle-manifest.json`);
  if (!existsSync(manifestPfad)) {
    throw new Error(
      `Kein Manifest unter ${manifestPfad}. Zuerst "npm run volltexte-holen" ausfuehren — ` +
        `dieses Werkzeug beschafft nichts.`,
    );
  }
  const manifest = JSON.parse(readFileSync(manifestPfad, "utf8")) as Record<string, unknown> & {
    documents: DokumentBefund[];
    bundle: Record<string, unknown>;
    messdefinition: { id: string; version: string; sha256: string };
  };

  console.log(`Abschluss ${laufId} (${lauf.messdefinition.id} v${lauf.messdefinition.version})`);
  console.log(`Definitions-Hash: ${lauf.messdefinition.sha256}`);
  console.log(`Bundleverzeichnis: ${ziel}\n`);

  if (manifest.messdefinition.sha256 !== lauf.messdefinition.sha256) {
    throw new Error(
      `Das Manifest gehoert zu Definitionshash ${manifest.messdefinition.sha256}, der Lauf zu ` +
        `${lauf.messdefinition.sha256}. Nichts versiegelt.`,
    );
  }

  /* 3. Jede abgelegte Datei nachrechnen und das Material einsammeln. */
  const gelesen = new Map<string, GelesenesDokument>();
  const dateien: BundleDatei[] = [];
  const fehlendeDateien: string[] = [];

  for (const id of rawIds) {
    const pfade = {
      volltext: join(ziel, "volltext", `${id}.txt`),
      dokument: join(ziel, "dokument", `${id}.json`),
      roh: join(ziel, "roh", `${id}.json`),
    };
    const fehlt = Object.entries(pfade).filter(([, p]) => !existsSync(p));
    if (fehlt.length > 0) {
      fehlendeDateien.push(`${id}: ${fehlt.map(([was]) => was).join(", ")}`);
      continue;
    }
    const v = lies(pfade.volltext);
    const d = lies(pfade.dokument);
    const r = lies(pfade.roh);
    gelesen.set(id, {
      volltext: { sha256: sha256(v.text), bytes: v.roh.length },
      dokument: { sha256: sha256(d.text), bytes: d.roh.length },
      roh: { sha256: sha256(r.text), bytes: r.roh.length },
    });
    dateien.push(
      { name: `volltext/${id}.txt`, inhalt: v.roh },
      { name: `dokument/${id}.json`, inhalt: d.roh },
      { name: `roh/${id}.json`, inhalt: r.roh },
    );
  }

  if (fehlendeDateien.length > 0) {
    throw new Error(
      `${fehlendeDateien.length} Bezeichner haben keine vollstaendige Ablage:\n  ` +
        `${fehlendeDateien.join("\n  ")}\nNichts gepackt, nichts versiegelt.`,
    );
  }

  /* 4. Deckung mit dem Rohlauf — in beide Richtungen. */
  const bilanz = vollstaendigkeit(rawIds, manifest.documents.map((d) => d.quelle_id));
  console.log(`Deckung gegen den Rohlauf: ${bilanz.beschafft}/${bilanz.erwartet}`);
  if (!bilanz.vollstaendig) {
    throw new Error(
      `Das Manifest deckt den Rohlauf nicht: ${bilanz.fehlend.length} fehlend` +
        `${bilanz.fehlend.length ? ` (${bilanz.fehlend.join(", ")})` : ""}, ` +
        `${bilanz.unerwartet.length} unerwartet` +
        `${bilanz.unerwartet.length ? ` (${bilanz.unerwartet.join(", ")})` : ""}. Nichts versiegelt.`,
    );
  }

  /* 5. Die Zahlen des Manifests gegen die Dateien auf der Platte. */
  const abweichungen = pruefeAblage(manifest.documents, gelesen);
  if (abweichungen.length > 0) {
    throw new Error(
      `Das Manifest passt nicht zu den abgelegten Dateien:\n  ${abweichungen.join("\n  ")}\n` +
        `Nichts versiegelt — ein Bundle-Hash ueber abweichendes Material waere ein Siegel auf der falschen Kiste.`,
    );
  }
  console.log(`Nachgerechnet: ${manifest.documents.length} Dokumente, je drei Dateien — alle Hashes stimmen.`);

  /* 6. Deterministisch packen und versiegeln. */
  const bundleName = String(manifest.bundle.filename ?? `${laufId}-volltexte.tar.gz`);
  const bundlePfad = join(ziel, bundleName);
  const gepackt = gzipSync(packeTar(dateien), { level: 9 });
  writeFileSync(bundlePfad, gepackt);
  const bundleSha = sha256Bytes(gepackt);
  console.log(`Bundle: ${bundlePfad}`);
  console.log(`  ${statSync(bundlePfad).size} Bytes · sha256 ${bundleSha}`);

  /* 7. Manifest vervollstaendigen — nur die beiden offenen Felder. */
  const vollstaendig = {
    ...manifest,
    raw_checkpoint: rawCheckpoint ?? manifest.raw_checkpoint,
    bundle: { ...manifest.bundle, filename: bundleName, sha256: bundleSha },
  };
  if (!vollstaendig.raw_checkpoint) {
    throw new Error(
      "Im Manifest fehlt der raw_checkpoint. Bitte mit --raw-checkpoint <sha> nennen — " +
        "ohne ihn ist nicht belegt, gegen welche Rohpopulation das Bundle steht.",
    );
  }
  writeFileSync(manifestPfad, alsDatei(vollstaendig));
  console.log(`Manifest vervollstaendigt: ${manifestPfad}`);

  /* 8. Nur das Manifest ins Repository — nie ein Volltext. */
  if (verankern) {
    const ankerPfad = join(wurzel, "messkorpus", "laeufe", laufId, "volltext-bundle-manifest.json");
    mkdirSync(dirname(ankerPfad), { recursive: true });
    writeFileSync(ankerPfad, alsDatei(vollstaendig));
    console.log(`\nIm Repository verankert: ${ankerPfad}`);
    console.log("Ausschliesslich diese eine Datei — lauf.json ist unberuehrt, kein Volltext im Repository.");
    console.log("\nNaechster Schritt:");
    console.log(`  git add messkorpus/laeufe/${laufId}/volltext-bundle-manifest.json`);
    console.log(`  git diff --cached --name-only   # muss genau diese eine Datei zeigen`);
    console.log(`  git commit -m "${laufId}: anchor external fulltext bundle provenance"`);
  } else {
    console.log("\nOhne --verankern wurde im Repository nichts geschrieben.");
  }
}

haupt().catch((fehler: unknown) => {
  console.error(fehler instanceof Error ? fehler.message : String(fehler));
  process.exitCode = 1;
});

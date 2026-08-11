// kodierstoff-export.ts — CLI `npm run kodierstoff-export`.
//
// Erzeugt EIN Kodierpaket zu einem Messlauf: die Volltexte, die Kriterien der
// eingefrorenen Messdefinition und das verlangte Antwortschema. Beide
// Kodierer bekommen dieselbe Datei — deshalb entsteht sie genau einmal und
// traegt keinen Kodierernamen. Waeren es zwei Dateien, muesste man beweisen,
// dass sie gleich sind; so ist es dieselbe.
//
// Das Paket enthaelt NICHTS aus einem anderen Kodierlauf (MANIFEST v2.1 §5:
// "verschiedene Modelle, nicht derselbe Lauf zweimal") und keine Vorschlaege.
//
// Vor dem Schreiben wird jeder Volltext gegen den im Repository verankerten
// Provenienzanker geprueft. Ein Paket aus Texten, die nicht die des
// versiegelten Bundles sind, waere wertlos.
//
// Kein Netz. Ablage ausserhalb des Repositoriums.
//
// Aufruf:
//   npm run kodierstoff-export -- --lauf ML-003 \
//     --bundle ~/gr-volltexte/ML-003 --ziel ~/gr-kodierung/ML-003

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { alsDatei, liegtImRepo, sha256, trefferAusLauf, type DokumentBefund } from "./volltexte.js";

function repoWurzel(): string {
  return dirname(dirname(dirname(fileURLToPath(import.meta.url))));
}

function argument(name: string): string | null {
  const stelle = process.argv.indexOf(`--${name}`);
  if (stelle === -1 || stelle + 1 >= process.argv.length) return null;
  return process.argv[stelle + 1] ?? null;
}

/**
 * Die kanonische Zaehleinheit-Regel. Sie steht hier als Text, weil beide
 * Kodierer sie WOERTLICH gleich anwenden muessen — weichen ihre Bezeichner
 * ab, ist das nach der Konsensregel ein Feldkonflikt.
 *
 * Sie kennt keinen Ausgang und keine Klassifikation: rein mechanisch aus dem
 * Aktenzeichen bzw. dem Kopf des Entscheids.
 */
const ZAEHLEINHEIT_REGEL = [
  "Die Zaehleinheit ist die zugrunde liegende Streitigkeit, nicht der einzelne Entscheid.",
  "1. Traegt der Treffer ein Aktenzeichen des Bundesgerichts (Form 4A_281/2025), ist die",
  "   Zaehleinheit exakt dieses Aktenzeichen — unveraendert, ohne Zusatz.",
  "2. Ist der Treffer ein BGE-Publikationsauszug ohne Aktenzeichen in den Metadaten, ist die",
  "   Zaehleinheit das im Entscheidkopf genannte Aktenzeichen des zugrunde liegenden",
  "   Bundesgerichtsverfahrens (wieder Form 4A_281/2025). Die BGE-Fundstelle selbst ist NICHT",
  "   die Zaehleinheit.",
  "3. Nennt der Text mehrere verbundene Verfahren, gilt das zuerst im Kopf genannte.",
  "4. Laesst sich das Aktenzeichen nicht sicher bestimmen, wird keines erfunden: der Treffer",
  "   bleibt ungeklaert.",
  "Folge: ein BGE-Auszug und der ihm zugrunde liegende Bundesgerichtsentscheid teilen dieselbe",
  "Zaehleinheit und zaehlen zusammen einmal.",
].join("\n");

const ANTWORTSCHEMA = {
  hinweis:
    "Ein Eintrag je quelle_id, alle Bezeichner des Pakets, keine zusaetzlichen. " +
    "Felder nur setzen, wo sie fuer den gewaehlten status verlangt sind.",
  eintrag: {
    quelle_id: "<Bezeichner aus dem Paket>",
    status: "eingeschlossen | ausgeschlossen | ungeklaert",
    begruendung: "<kurz, sachlich; bei ungeklaert zusaetzlich die offene Frage>",
    ausschlussgrund: "<nur bei ausgeschlossen; einer der deklarierten Codes>",
    zaehleinheit: "<nur bei eingeschlossen; nach der kanonischen Regel>",
    abschluss_status: "<nur bei eingeschlossen: abgeschlossen | rueckweisung_offen>",
    erledigungsweg: {
      modus: "materiell_entschieden | prozessual_erledigt | rueckweisung_offen",
      prozessgrund: "<nur bei prozessual_erledigt einer der Gruende, sonst ausdruecklich null>",
      beleg: "<konkrete Textstelle>",
      stand_datum: "<JJJJ-MM-TT, nie nach dem Datenstand des Laufs>",
      quelle: "<Primaerquelle: der Treffer selbst oder ein verknuepfter Folgeentscheid>",
    },
    messausgang: {
      wert: "durchgesetzt | nicht_durchgesetzt | nicht_anwendbar | offen",
      beleg: "<konkrete Textstelle>",
      quelle: "<Primaerquelle>",
    },
    verfahrensrecht_nachweis: {
      regime: "bgg | og | ungeklaert",
      beleg: "<konkrete Textstelle zum anwendbaren Verfahrensrecht>",
      quelle: "<Primaerquelle>",
    },
  },
};

/**
 * Findet die Fassung ueber `id` UND `version`, nicht ueber den Dateinamen.
 * Zwei Dateien mit derselben id und Version waeren ein Widerspruch und werden
 * abgelehnt statt nach Namen aufgeloest.
 */
function findeDefinition(verzeichnis: string, gesucht: { id: string; version: string }): string {
  const treffer = readdirSync(verzeichnis)
    .filter((name) => name.endsWith(".json"))
    .map((name) => join(verzeichnis, name))
    .filter((pfad) => {
      try {
        const d = JSON.parse(readFileSync(pfad, "utf8")) as { id?: unknown; version?: unknown };
        return d.id === gesucht.id && d.version === gesucht.version;
      } catch {
        return false;
      }
    });
  if (treffer.length === 0) {
    throw new Error(`Keine Messdefinition ${gesucht.id}@${gesucht.version} in ${verzeichnis}.`);
  }
  if (treffer.length > 1) {
    throw new Error(
      `Mehrere Dateien tragen ${gesucht.id}@${gesucht.version}: ${treffer.join(", ")}. Zwei Fassungen derselben Liste sind ein Bruch.`,
    );
  }
  return treffer[0] as string;
}

function haupt(): void {
  const wurzel = repoWurzel();
  const laufId = argument("lauf");
  const bundleRoh = argument("bundle");
  const zielRoh = argument("ziel");

  if (!laufId || !bundleRoh || !zielRoh) {
    throw new Error(
      "Aufruf: npm run kodierstoff-export -- --lauf ML-003 --bundle <bundleverzeichnis> --ziel <verzeichnis ausserhalb des Repos>",
    );
  }
  if (!/^ML-\d{3}$/.test(laufId)) throw new Error(`--lauf muss die Form ML-003 haben, erhalten: "${laufId}"`);

  const bundle = resolve(process.cwd(), bundleRoh);
  const ziel = resolve(process.cwd(), zielRoh);
  for (const [was, pfad] of [["Bundle", bundle], ["Ziel", ziel]] as const) {
    if (liegtImRepo(pfad, wurzel)) {
      throw new Error(`${was}verzeichnis ${pfad} liegt im Repository. Volltexte gehoeren nie dorthin.`);
    }
  }

  const laufPfad = join(wurzel, "messkorpus", "laeufe", laufId, "lauf.json");
  const ankerPfad = join(wurzel, "messkorpus", "laeufe", laufId, "volltext-bundle-manifest.json");
  for (const pfad of [laufPfad, ankerPfad]) {
    if (!existsSync(pfad)) throw new Error(`${pfad} fehlt — ohne verankerten Rohlauf und Provenienzanker kein Paket.`);
  }

  const lauf = JSON.parse(readFileSync(laufPfad, "utf8")) as {
    id: string;
    datenstand: string;
    messdefinition: { id: string; version: string; sha256: string };
  };
  const anker = JSON.parse(readFileSync(ankerPfad, "utf8")) as {
    raw_checkpoint: string;
    bundle: { sha256: string };
    messdefinition: { id: string; version: string; sha256: string };
    documents: DokumentBefund[];
  };
  if (anker.messdefinition.sha256 !== lauf.messdefinition.sha256) {
    throw new Error("Provenienzanker und Rohlauf nennen verschiedene Definitionshashes. Kein Paket.");
  }

  // Aufloesung ueber id UND version, nie ueber den Dateinamen: die Fassungen
  // heissen im Bestand uneinheitlich, und der Name entscheidet nicht darueber,
  // welche Definition gilt (dieselbe Regel wie im kanonischen Resolver).
  const definitionsPfad = findeDefinition(join(wurzel, "messkorpus", "definitionen"), lauf.messdefinition);
  const definition = JSON.parse(readFileSync(definitionsPfad, "utf8")) as Record<string, unknown> & {
    status: string;
    messfrage: string;
    einschluss: unknown;
    ausschluss: unknown;
    rechtskraft_regel: Record<string, unknown>;
    abschluss_regel: Record<string, unknown>;
    zaehleinheit: Record<string, unknown>;
  };
  if (definition.status !== "eingefroren") {
    throw new Error(`Die Messdefinition steht auf "${definition.status}" — es wird nur gegen eine eingefrorene kodiert.`);
  }

  const treffer = trefferAusLauf(lauf as unknown);
  const befundeNachId = new Map(anker.documents.map((d) => [d.quelle_id, d]));

  const dokumente = treffer.map((t) => {
    const pfad = join(bundle, "volltext", `${t.quelle_id}.txt`);
    if (!existsSync(pfad)) throw new Error(`Volltext fehlt: ${pfad}. Kein Paket.`);
    const text = readFileSync(pfad, "utf8");
    const befund = befundeNachId.get(t.quelle_id);
    if (!befund) throw new Error(`${t.quelle_id} steht im Rohlauf, aber nicht im Provenienzanker. Kein Paket.`);
    if (sha256(text) !== befund.text_sha256) {
      throw new Error(
        `${t.quelle_id}: der Volltext auf der Platte ist nicht der verankerte (sha256 weicht ab). Kein Paket.`,
      );
    }
    return {
      quelle_id: t.quelle_id,
      aktenzeichen: t.aktenzeichen ?? null,
      datum: t.datum ?? null,
      gericht: t.gericht ?? null,
      link: t.link ?? null,
      volltext: text,
    };
  });

  const paket = {
    schema: "gemeinsam-recht.kodierstoff.v1",
    messlauf: lauf.id,
    datenstand: lauf.datenstand,
    raw_checkpoint: anker.raw_checkpoint,
    bundle_sha256: anker.bundle.sha256,
    messdefinition: lauf.messdefinition,
    auftrag:
      "Beurteile jeden Treffer allein anhand seines Volltextes nach der unten stehenden, eingefrorenen " +
      "Messdefinition. Schliesse nur ein, wenn alle drei Einschlusskriterien SICHER erfuellt sind; sonst " +
      "ungeklaert. Erfinde nichts: laesst sich etwas nicht sicher feststellen, ist der Treffer ungeklaert " +
      "(CR-03 Auflage E2 Ziff. 6). Jede Feststellung braucht eine konkrete Textstelle als Beleg.",
    regeln: {
      messfrage: definition.messfrage,
      einschluss: definition.einschluss,
      ausschluss: definition.ausschluss,
      rechtskraft_regel: definition.rechtskraft_regel,
      abschluss_regel: definition.abschluss_regel,
      zaehleinheit_definition: definition.zaehleinheit,
      zaehleinheit_kanonische_regel: ZAEHLEINHEIT_REGEL,
      messausgang_werte: ["durchgesetzt", "nicht_durchgesetzt", "nicht_anwendbar", "offen"],
      erledigungsweg_modi: ["materiell_entschieden", "prozessual_erledigt", "rueckweisung_offen"],
      prozessgruende: [
        "rechtsmittelbegruendung_unzureichend",
        "aktivlegitimation_fehlte",
        "klagebewilligung_fehlte_oder_ungueltig",
        "anfechtungsfrist_verwirkt",
        "instanzverwirkung",
        "nichteintreten_sonstiger_grund",
        "sonstiger_prozessgrund",
      ],
      kopplungen: [
        "rueckweisung_offen <=> abschluss_status rueckweisung_offen <=> messausgang offen",
        "materiell_entschieden oder prozessual_erledigt => abschluss_status abgeschlossen und zaehlbarer Messausgang",
        "eingeschlossen UND abgeschlossen => verfahrensrecht_nachweis mit belegtem regime bgg; og oder ungeklaert tragen keinen Einschluss",
        "erledigungsweg.stand_datum nie nach dem Datenstand des Laufs",
      ],
    },
    antwortschema: ANTWORTSCHEMA,
    dokumente,
  };

  mkdirSync(ziel, { recursive: true });
  const pfad = join(ziel, `${laufId}-kodierstoff.json`);
  const inhalt = alsDatei(paket);
  writeFileSync(pfad, inhalt);

  console.log(`Kodierpaket geschrieben: ${pfad}`);
  console.log(`  ${dokumente.length} Dokumente · sha256 ${sha256(inhalt)}`);
  console.log(`  Definition ${lauf.messdefinition.id}@${lauf.messdefinition.version} [${definition.status}]`);
  console.log(`  Jeder Volltext gegen den Provenienzanker geprueft — alle stimmen.`);
  console.log("\nBeide Kodierer erhalten GENAU diese Datei. Kein Kodierername darin, kein Vorschlag,");
  console.log("nichts aus einem anderen Lauf. Die Antworten gehoeren in getrennte Dateien.");
}

try {
  haupt();
} catch (fehler: unknown) {
  console.error(fehler instanceof Error ? fehler.message : String(fehler));
  process.exitCode = 1;
}

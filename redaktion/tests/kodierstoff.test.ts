// Tests des Kodierpakets (kodierstoff.ts). Kein Netz, keine Volltexte im
// Repository: die Texte sind synthetisch, die Metadaten kommen aus dem echten
// verankerten ML-003-Rohlauf und seinem Provenienzanker.
//
// Der Kern ist zweierlei. Erstens Determinismus: zweimal erzeugt ergibt Byte
// fuer Byte dasselbe Paket — sonst taugte sein Hash nicht als gemeinsamer
// Bezugspunkt zweier Antworten. Zweitens Blindheit: im Paket steht kein
// Kodierername, kein Modell, kein vorbelegter Status.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ausschlussgruende,
  baueKodierstoff,
  findeDefinitionsdatei,
  kodierkontext,
  type Anker,
  type Definition,
} from "../src/kodierstoff.js";
import { alsDatei, sha256 } from "../src/volltexte.js";
import { KODIERSCHEMA_ID } from "../src/kodierschema.js";

const WURZEL = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const ML003 = join(WURZEL, "messkorpus", "laeufe", "ML-003");
const DEFINITIONEN = join(WURZEL, "messkorpus", "definitionen");

/* Die drei Werte, an denen ML-003 haengt. Sie stehen hier als Literale, damit
   eine stille Aenderung an Lauf oder Anker hier auffaellt und nicht erst in
   einem Paket, das schon bei den Kodierern liegt. */
const DEFINITIONSHASH = "c03d1279245b977ea247c70ec789ec9514506f80d92dc8ab3463cc97e4a462d9";
const RAW_CHECKPOINT = "7d93a0ccca36a168a4f92d060d08c7e852cfe08f";
const BUNDLE_SHA = "c2f55926000a828c821d80c04f5c9fbeda00bdefff34dbcb1b2d8ab9d0b4b954";

function lies(pfad: string): unknown {
  return JSON.parse(readFileSync(pfad, "utf8")) as unknown;
}

const echterLauf = lies(join(ML003, "lauf.json")) as {
  id: string;
  datenstand: string;
  messdefinition: { id: string; version: string; sha256: string };
  treffer: Array<{ quelle_id: string }>;
};
const echterAnker = lies(join(ML003, "volltext-bundle-manifest.json")) as Anker;

function definitionsdateien(): Array<{ datei: string; inhalt: unknown }> {
  return readdirSync(DEFINITIONEN)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => ({ datei: join(DEFINITIONEN, name), inhalt: lies(join(DEFINITIONEN, name)) }));
}

const echteDefinition = lies(
  findeDefinitionsdatei(definitionsdateien(), echterLauf.messdefinition),
) as Definition;

/** Ein synthetischer Volltext zu einem Bezeichner — reproduzierbar. */
function text(id: string): string {
  return `FX-SYNTHETISCH ${id}\nDieser Text ist kein Entscheid.\n`;
}

/**
 * Der echte Anker, aber mit den Hashes der synthetischen Texte. So tragen die
 * 129 Dokumente ihre echten Bezeichner, Links und Gerichte, ohne dass ein
 * Volltext ins Repository muesste.
 */
function ankerMitSynthetischenTexten(): Anker {
  return {
    ...echterAnker,
    documents: echterAnker.documents.map((d) => ({ ...d, text_sha256: sha256(text(d.quelle_id)) })),
  };
}

function baueEchtesPaket() {
  return baueKodierstoff({
    lauf: echterLauf,
    anker: ankerMitSynthetischenTexten(),
    definition: echteDefinition,
    volltext: (id) => text(id),
  });
}

describe("Ausgangslage von ML-003", () => {
  it("der Rohlauf traegt 129 eindeutige Bezeichner", () => {
    const ids = echterLauf.treffer.map((t) => t.quelle_id);
    expect(ids).toHaveLength(129);
    expect(new Set(ids).size).toBe(129);
  });

  it("Rohlauf und Provenienzanker decken sich genau", () => {
    const roh = [...echterLauf.treffer.map((t) => t.quelle_id)].sort();
    const anker = [...echterAnker.documents.map((d) => d.quelle_id)].sort();
    expect(anker).toEqual(roh);
  });

  it("Lauf, Anker und Definition nennen denselben Definitionshash", () => {
    expect(echterLauf.messdefinition.sha256).toBe(DEFINITIONSHASH);
    expect(echterAnker.messdefinition.sha256).toBe(DEFINITIONSHASH);
    expect(echteDefinition.id).toBe("MD-001");
    expect(echteDefinition.version).toBe("3.1.0");
    expect(echteDefinition.status).toBe("eingefroren");
  });

  it("der Anker nennt Raw-Checkpoint und versiegeltes Bundle", () => {
    expect(echterAnker.raw_checkpoint).toBe(RAW_CHECKPOINT);
    expect(echterAnker.bundle.sha256).toBe(BUNDLE_SHA);
  });
});

describe("findeDefinitionsdatei", () => {
  it("loest ueber id und version auf, nicht ueber den Dateinamen", () => {
    // Der Bestand heisst uneinheitlich; der Name entscheidet nicht darueber,
    // welche Definition gilt.
    const pfad = findeDefinitionsdatei(definitionsdateien(), { id: "MD-001", version: "3.1.0" });
    expect(pfad.endsWith("MD-001-v3-1-kuendigungsschutz-bger.json")).toBe(true);
  });

  it("weist zwei Dateien mit derselben id und Version ab", () => {
    const doppelt = [
      { datei: "a.json", inhalt: { id: "MD-001", version: "3.1.0" } },
      { datei: "b.json", inhalt: { id: "MD-001", version: "3.1.0" } },
    ];
    expect(() => findeDefinitionsdatei(doppelt, { id: "MD-001", version: "3.1.0" })).toThrow(/Mehrere Dateien/);
  });

  it("findet keine unbekannte Fassung", () => {
    expect(() => findeDefinitionsdatei(definitionsdateien(), { id: "MD-001", version: "9.9.9" })).toThrow(
      /Keine Messdefinition/,
    );
  });
});

describe("baueKodierstoff", () => {
  it("nimmt alle 129 Bezeichner auf, eindeutig und aufsteigend sortiert", () => {
    const paket = baueEchtesPaket();
    const ids = paket.dokumente.map((d) => d.quelle_id);
    expect(ids).toHaveLength(129);
    expect(new Set(ids).size).toBe(129);
    expect([...ids].sort()).toEqual(ids);
  });

  it("bindet Definition, Raw-Checkpoint und Bundle-Hash ins Paket", () => {
    const paket = baueEchtesPaket();
    expect(paket.messlauf).toBe("ML-003");
    expect(paket.messdefinition).toEqual({ id: "MD-001", version: "3.1.0", sha256: DEFINITIONSHASH });
    expect(paket.raw_checkpoint).toBe(RAW_CHECKPOINT);
    expect(paket.bundle_sha256).toBe(BUNDLE_SHA);
    expect(paket.regeln.antwortschema_id).toBe(KODIERSCHEMA_ID);
  });

  it("fuehrt zu jedem Dokument den geprueften text_sha256", () => {
    const paket = baueEchtesPaket();
    for (const dokument of paket.dokumente) {
      expect(dokument.text_sha256).toBe(sha256(dokument.volltext));
    }
  });

  it("ergibt zweimal erzeugt Byte fuer Byte dasselbe Paket", () => {
    // Ohne das taugte der Hash des Pakets nicht als gemeinsamer Bezugspunkt
    // zweier unabhaengiger Antworten.
    expect(alsDatei(baueEchtesPaket())).toBe(alsDatei(baueEchtesPaket()));
  });

  it("nennt kein Modell und kein Ergebnis", () => {
    // Das Antwortschema nennt den Schluessel `kodierer` als Platzhalter — dort
    // GEHOERT die Rolle hin. Was nicht vorkommen darf, ist eine Modellidentitaet
    // oder ein vorbelegter Befund.
    const roh = alsDatei(baueEchtesPaket());
    for (const wort of ["GPT", "Opus", "Sol", "Claude", "Kodierer A", "Kodierer B", "kodierabgleich"]) {
      expect(roh.includes(wort), `Das Paket nennt "${wort}"`).toBe(false);
    }
    for (const dokument of baueEchtesPaket().dokumente) {
      expect(Object.keys(dokument).sort()).toEqual([
        "aktenzeichen",
        "datum",
        "gericht",
        "link",
        "quelle_id",
        "text_sha256",
        "volltext",
      ]);
    }
  });

  it("traegt die kanonische Zaehleinheit-Regel — quelle_id, nicht Aktenzeichen", () => {
    const regel = String(baueEchtesPaket().regeln.zaehleinheit_kanonische_regel);
    expect(regel).toMatch(/lexikographisch kleinste quelle_id/);
    expect(regel).not.toMatch(/Aktenzeichen des Bundesgerichts/);
  });

  it("bricht ab, wenn ein Volltext nicht der verankerte ist", () => {
    // Gegen den ECHTEN Anker: ein beliebiger Text hat nicht dessen Hash.
    expect(() =>
      baueKodierstoff({
        lauf: echterLauf,
        anker: echterAnker,
        definition: echteDefinition,
        volltext: () => "irgendein Text",
      }),
    ).toThrow(/ist nicht der verankerte/);
  });

  it("bricht ab, wenn ein Volltext fehlt", () => {
    const fehlt = echterLauf.treffer[7]?.quelle_id as string;
    expect(() =>
      baueKodierstoff({
        lauf: echterLauf,
        anker: ankerMitSynthetischenTexten(),
        definition: echteDefinition,
        volltext: (id) => (id === fehlt ? null : text(id)),
      }),
    ).toThrow(new RegExp(`Volltext fehlt: ${fehlt}`));
  });

  it("bricht ab, wenn der Anker ein Dokument fuehrt, das nicht im Rohlauf steht", () => {
    const anker = ankerMitSynthetischenTexten();
    const erstes = anker.documents[0] as (typeof anker.documents)[number];
    anker.documents = [...anker.documents, { ...erstes, quelle_id: "CH_BGer_FREMD_2011" }];
    expect(() =>
      baueKodierstoff({ lauf: echterLauf, anker, definition: echteDefinition, volltext: (id) => text(id) }),
    ).toThrow(/nicht im Rohlauf/);
  });

  it("bricht ab, wenn ein Bezeichner des Rohlaufs im Anker fehlt", () => {
    const anker = ankerMitSynthetischenTexten();
    anker.documents = anker.documents.slice(1);
    expect(() =>
      baueKodierstoff({ lauf: echterLauf, anker, definition: echteDefinition, volltext: (id) => text(id) }),
    ).toThrow(/nicht im Provenienzanker/);
  });

  it("bricht ab, wenn Anker und Rohlauf verschiedene Definitionshashes nennen", () => {
    const anker = ankerMitSynthetischenTexten();
    anker.messdefinition = { ...anker.messdefinition, sha256: "0".repeat(64) };
    expect(() =>
      baueKodierstoff({ lauf: echterLauf, anker, definition: echteDefinition, volltext: (id) => text(id) }),
    ).toThrow(/verschiedene Definitionshashes/);
  });

  it("bricht ab, wenn die Definition nicht eingefroren ist", () => {
    expect(() =>
      baueKodierstoff({
        lauf: echterLauf,
        anker: ankerMitSynthetischenTexten(),
        definition: { ...echteDefinition, status: "entwurf" },
        volltext: (id) => text(id),
      }),
    ).toThrow(/nur gegen eine eingefrorene/);
  });

  it("bricht ab, wenn der Anker keinen Raw-Checkpoint nennt", () => {
    const anker = { ...ankerMitSynthetischenTexten(), raw_checkpoint: "" };
    expect(() =>
      baueKodierstoff({ lauf: echterLauf, anker, definition: echteDefinition, volltext: (id) => text(id) }),
    ).toThrow(/raw_checkpoint/);
  });

  it("bricht ab, wenn das Bundle nicht versiegelt ist", () => {
    const anker = { ...ankerMitSynthetischenTexten(), bundle: { sha256: null } };
    expect(() =>
      baueKodierstoff({ lauf: echterLauf, anker, definition: echteDefinition, volltext: (id) => text(id) }),
    ).toThrow(/nicht versiegelt/);
  });
});

describe("kodierkontext", () => {
  it("leitet den Massstab vollstaendig aus dem Paket ab", () => {
    const paket = baueEchtesPaket();
    const paketSha = sha256(alsDatei(paket));
    const kontext = kodierkontext(paket, paketSha, echteDefinition);

    expect(kontext.messlauf).toBe("ML-003");
    expect(kontext.datenstand).toBe(echterLauf.datenstand);
    expect(kontext.kodierstoff_sha256).toBe(paketSha);
    expect(kontext.quelle_ids).toHaveLength(129);
    expect(kontext.messdefinition.sha256).toBe(DEFINITIONSHASH);
  });

  it("verlangt unter dem Uebergangsrecht den Verfahrensrechtsnachweis", () => {
    const paket = baueEchtesPaket();
    expect(kodierkontext(paket, "x", echteDefinition).verlangt_verfahrensrecht_nachweis).toBe(true);
  });

  it("verlangt ihn nicht, wenn der Korpus einheitlich dem BGG untersteht", () => {
    const paket = baueEchtesPaket();
    paket.regeln.rechtskraft_regel = { art: "bundesgericht_art61_bgg" };
    expect(kodierkontext(paket, "x", echteDefinition).verlangt_verfahrensrecht_nachweis).toBe(false);
  });

  it("uebernimmt die deklarierten Ausschlusscodes unveraendert", () => {
    expect(ausschlussgruende(echteDefinition)).toEqual([
      "andere_rechtsfrage",
      "nur_erstreckung",
      "kein_mietverhaeltnis",
      "nur_prozessuale_nebenfrage",
      "text_nicht_zugaenglich",
    ]);
  });
});

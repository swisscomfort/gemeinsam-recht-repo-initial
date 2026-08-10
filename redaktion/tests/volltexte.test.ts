// Tests der reinen Volltextlogik (volltexte.ts). Kein Netz — die Antworten
// sind Fixtures im Format der Quelle.
//
// Der Kern ist eine Verweigerung: wo sich kein Volltext bestimmen laesst,
// wird keiner erfunden, und wo die Bezeichner nicht exakt zum Rohlauf passen,
// gilt das Bundle als unvollstaendig. Beides wird hier festgehalten.

import { describe, expect, it } from "vitest";
import {
  alsDatei,
  argumentName,
  baueManifest,
  bytes,
  feldAus,
  sha256,
  trefferAusLauf,
  vollstaendigkeit,
  volltextAus,
  type DokumentBefund,
} from "../src/volltexte.js";

function lauf(ids: string[]): unknown {
  return {
    id: "ML-999",
    treffer: ids.map((id) => ({
      quelle_id: id,
      aktenzeichen: "4A_1/2020",
      datum: "2020-01-01",
      gericht: "CH_BGer_004",
      link: `https://entscheidsuche.invalid/view/${id}`,
      status: "ungeklaert",
    })),
  };
}

describe("trefferAusLauf", () => {
  it("nimmt alle Bezeichner des Laufs in stabiler Reihenfolge", () => {
    const treffer = trefferAusLauf(lauf(["b2", "a1", "c3"]));
    expect(treffer.map((t) => t.quelle_id)).toEqual(["a1", "b2", "c3"]);
    expect(treffer[0]?.link).toBe("https://entscheidsuche.invalid/view/a1");
  });

  it("weist einen doppelten Bezeichner ab — sonst stimmt die Bilanz nicht mehr", () => {
    expect(() => trefferAusLauf(lauf(["a1", "a1"]))).toThrow(/mehrfach/);
  });

  it("weist einen Treffer ohne Bezeichner ab", () => {
    expect(() => trefferAusLauf({ id: "ML-999", treffer: [{ datum: "2020-01-01" }] })).toThrow(/quelle_id/);
  });

  it("weist an, was gar kein Messlauf ist", () => {
    expect(() => trefferAusLauf({ irgendwas: true })).toThrow(/Messlauf/);
  });
});

describe("volltextAus", () => {
  it("nimmt den Text aus dem strukturierten Dokument", () => {
    expect(volltextAus({ text: "Urteilstext", url: "u" }, ["egal"])).toBe("Urteilstext");
    expect(volltextAus({ volltext: "Zweitname" }, [])).toBe("Zweitname");
  });

  it("faellt auf die Textteile der Antwort zurueck", () => {
    expect(volltextAus(null, ["Teil 1", "Teil 2"])).toBe("Teil 1\nTeil 2");
  });

  it("erfindet nichts, wenn nichts da ist", () => {
    expect(volltextAus(null, [])).toBeNull();
    expect(volltextAus({ text: "   " }, ["  "])).toBeNull();
    expect(volltextAus({ titel: "nur Metadaten" }, [])).toBeNull();
  });
});

describe("argumentName", () => {
  it("erkennt ein eindeutiges Pflichtfeld", () => {
    expect(argumentName({ required: ["docId"], properties: { docId: { type: "string" } } })).toBe("docId");
  });

  it("erkennt eine einzige Eigenschaft ohne Pflichtangabe", () => {
    expect(argumentName({ properties: { id: { type: "string" } } })).toBe("id");
  });

  it("raet nicht, wenn es mehrdeutig ist", () => {
    expect(
      argumentName({ required: ["a", "b"], properties: { a: { type: "string" }, b: { type: "string" } } }),
    ).toBeNull();
    expect(argumentName({ properties: { a: {}, b: {} } })).toBeNull();
    expect(argumentName(null)).toBeNull();
  });
});

describe("vollstaendigkeit", () => {
  it("ist nur bei genauer Deckung vollstaendig", () => {
    expect(vollstaendigkeit(["a", "b"], ["b", "a"]).vollstaendig).toBe(true);
  });

  it("meldet fehlende Bezeichner", () => {
    const b = vollstaendigkeit(["a", "b", "c"], ["a", "c"]);
    expect(b.vollstaendig).toBe(false);
    expect(b.fehlend).toEqual(["b"]);
    expect(b.beschafft).toBe(2);
  });

  it("meldet auch unerwartete Bezeichner — sie stammen nicht aus dem Rohlauf", () => {
    const b = vollstaendigkeit(["a"], ["a", "x"]);
    expect(b.vollstaendig).toBe(false);
    expect(b.unerwartet).toEqual(["x"]);
  });
});

describe("baueManifest", () => {
  const befund = (id: string): DokumentBefund => ({
    quelle_id: id,
    aktenzeichen: "4A_1/2020",
    raw_datum: "2020-01-01",
    document_url: `https://entscheidsuche.invalid/docs/${id}.html`,
    original_url: null,
    text_sha256: sha256(id),
    text_bytes: bytes(id),
    document_json_sha256: sha256(`${id}-doc`),
    document_json_bytes: 10,
    raw_mcp_sha256: sha256(`${id}-roh`),
    raw_mcp_bytes: 20,
  });

  const manifest = baueManifest(
    {
      laufId: "ML-999",
      rawCheckpoint: "0".repeat(40),
      messdefinition: { id: "MD-999", version: "1.0.0", sha256: "a".repeat(64) },
      bundleDatei: "ML-999-volltexte-20260810.tar.gz",
      bundleSha256: null,
      quelle: { provider: "entscheidsuche.ch", mcp_endpoint: "https://mcp.invalid/mcp", tool: "fetch_document" },
      stand: "2026-08-10",
    },
    [befund("b2"), befund("a1")],
  ) as Record<string, unknown>;

  it("sagt ausdruecklich, dass die Volltexte ausserhalb von Git bleiben", () => {
    expect(manifest.bundle).toMatchObject({ storage: "external_to_git", fulltexts_committed: false });
    expect(manifest.classification_status_at_anchor).toBe("none");
  });

  it("haelt die Auswahlregel fest: exakt die Raw-IDs, keine Suche", () => {
    expect((manifest.source as { selection: string }).selection).toContain("no search");
    expect((manifest.source as { selection: string }).selection).toContain("ML-999");
  });

  it("sortiert die Dokumente stabil und enthaelt keinen einzigen Volltext", () => {
    const dokumente = manifest.documents as DokumentBefund[];
    expect(dokumente.map((d) => d.quelle_id)).toEqual(["a1", "b2"]);
    const alsText = JSON.stringify(manifest);
    expect(alsText).not.toContain("Urteilstext");
    for (const d of dokumente) {
      expect(Object.keys(d)).not.toContain("text");
    }
  });

  it("wird deterministisch serialisiert", () => {
    expect(alsDatei(manifest)).toBe(`${JSON.stringify(manifest, null, 2)}\n`);
  });
});

describe("feldAus", () => {
  it("liest nur nichtleere Zeichenketten", () => {
    expect(feldAus({ url: "u" }, "url")).toBe("u");
    expect(feldAus({ url: "" }, "url")).toBeNull();
    expect(feldAus({ url: 5 }, "url")).toBeNull();
    expect(feldAus(null, "url")).toBeNull();
  });
});

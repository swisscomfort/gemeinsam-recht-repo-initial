// Tests der PWA-Schicht: Anmelde-Entscheidung, Web-App-Manifest und die
// Grenzen des Service Workers. Kein Netzwerkzugriff — alle Dateien werden
// ueber den Vite-Glob als Text gelesen.

import { describe, expect, it } from "vitest";
import { sollRegistrieren, type PwaUmgebung } from "../src/pwa";

const dateien = import.meta.glob("../public/*", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const bilder = import.meta.glob("../public/*.png", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

function lies(name: string): string {
  const text = dateien[`../public/${name}`];
  if (text === undefined) throw new Error(`public/${name} fehlt`);
  return text;
}

const UMGEBUNG: PwaUmgebung = { produktion: true, sichererKontext: true, unterstuetzt: true };

describe("sollRegistrieren", () => {
  it("meldet nur an, wenn gebaut, sicher und unterstuetzt", () => {
    expect(sollRegistrieren(UMGEBUNG)).toBe(true);
  });

  it("meldet im Dev-Server nicht an", () => {
    expect(sollRegistrieren({ ...UMGEBUNG, produktion: false })).toBe(false);
  });

  it("meldet ohne sicheren Kontext nicht an", () => {
    expect(sollRegistrieren({ ...UMGEBUNG, sichererKontext: false })).toBe(false);
  });

  it("meldet ohne Browser-Unterstuetzung nicht an", () => {
    expect(sollRegistrieren({ ...UMGEBUNG, unterstuetzt: false })).toBe(false);
  });
});

describe("manifest.webmanifest", () => {
  const manifest = JSON.parse(lies("manifest.webmanifest")) as Record<string, unknown>;

  it("ist installierbar: Name, Anzeigeart, Startadresse", () => {
    expect(manifest.name).toBeTypeOf("string");
    expect(manifest.short_name).toBeTypeOf("string");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("./");
    expect(manifest.scope).toBe("./");
  });

  it("nennt nur relative Adressen — die Auslieferung darf in einem Unterpfad liegen", () => {
    const adressen = [
      manifest.start_url,
      manifest.scope,
      ...(manifest.icons as { src: string }[]).map((symbol) => symbol.src),
    ];
    for (const adresse of adressen) {
      expect(adresse).toBeTypeOf("string");
      expect(String(adresse).startsWith("./")).toBe(true);
    }
  });

  it("bringt die von Android verlangten Groessen mit, davon eine maskierbare", () => {
    const symbole = manifest.icons as { src: string; sizes: string; purpose: string }[];
    expect(symbole.map((s) => s.sizes)).toContain("192x192");
    expect(symbole.map((s) => s.sizes)).toContain("512x512");
    expect(symbole.some((s) => s.purpose === "maskable")).toBe(true);
  });

  it("verweist ausschliesslich auf vorhandene Symboldateien", () => {
    const vorhanden = new Set(Object.keys(bilder).map((pfad) => pfad.replace("../public/", "./")));
    for (const symbol of manifest.icons as { src: string }[]) {
      expect(vorhanden).toContain(symbol.src);
    }
  });
});

describe("sw.js", () => {
  const quelle = lies("sw.js");

  it("benennt seinen Zwischenspeicher versioniert und raeumt alte Staende ab", () => {
    expect(quelle).toMatch(/const VERSION = "v\d+";/);
    expect(quelle).toContain("caches.delete");
  });

  it("bedient nur Anfragen gleicher Herkunft und nur GET", () => {
    expect(quelle).toContain('anfrage.method !== "GET"');
    expect(quelle).toContain("adresse.origin !== self.location.origin");
  });

  it("enthaelt keine fremde Adresse — der Prototyp bleibt ohne Netzverbindung", () => {
    const fremd = quelle.match(/https?:\/\/[^\s"')]+/g) ?? [];
    expect(fremd).toEqual([]);
  });

  it("faellt bei Seitenaufrufen offline auf die zwischengespeicherte Ausgabe zurueck", () => {
    expect(quelle).toContain('anfrage.mode === "navigate"');
    expect(quelle).toContain('speicher.match("./index.html")');
  });
});

describe("index.html", () => {
  const seite = import.meta.glob("../index.html", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;
  const inhalt = seite["../index.html"] ?? "";

  it("verweist auf das Manifest und ein Symbol", () => {
    expect(inhalt).toContain('rel="manifest" href="./manifest.webmanifest"');
    expect(inhalt).toContain('rel="apple-touch-icon"');
  });

  it("laedt keine externe Ressource nach", () => {
    expect(inhalt).not.toMatch(/(src|href)="https?:\/\//);
  });
});

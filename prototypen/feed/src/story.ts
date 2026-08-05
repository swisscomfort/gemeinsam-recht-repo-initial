// story.ts — Laden und Pruefen synthetischer Geschichten (AUFTRAG-F0, Teil A).
//
// Quelle ist ausschliesslich prototypen/stories/<ID>/meta.yaml + story.md.
// Verweigerung ist die Standardreaktion auf jede Abweichung; unbekannte oder
// falsch geschriebene Schluessel werden nie stillschweigend ignoriert
// (Praezisierung des Projektinhabers zur Freigabe, 2026-08-05).
//
// Der Parser ist bewusst KEIN YAML-Parser: Er liest exakt das in FS-001
// belegte Subset (Skalare und einzeilige Listen) und lehnt alles andere ab.
// Kein LLM, kein Netz, keine Systemzeit.

export const PFLICHT_SCHLUESSEL = [
  "id",
  "titel",
  "kennzeichnung",
  "rechtsgebiet",
  "schutzstufe",
  "etappen",
  "missions_status",
  "prinzipien",
  "emotions_ziel",
  "autor",
  "erstellt",
] as const;

// "fixture" ist als Markierung synthetischer Test-Stories zulaessig
// (Invariante 2, Analogie zur Fixture-Regel in CLAUDE.md), fuehrt aber
// immer zur Verweigerung fuer den Feed.
export const ERLAUBTE_SCHLUESSEL: ReadonlySet<string> = new Set([
  ...PFLICHT_SCHLUESSEL,
  "fixture",
]);

export const LISTEN_SCHLUESSEL = ["missions_status", "prinzipien", "emotions_ziel"] as const;

export type MetaWert = string | string[];

export interface StoryMeta {
  id: string;
  titel: string;
  rechtsgebiet: string;
  schutzstufe: string;
  etappen: number;
  missions_status: string[];
  prinzipien: string[];
  emotions_ziel: string[];
  autor: string;
  erstellt: string;
}

export interface Etappe {
  nr: number;
  titel: string;
  text: string;
}

export interface Story {
  meta: StoryMeta;
  etappen: Etappe[];
}

export interface Verweigerung {
  quelle: string;
  gruende: string[];
}

export type PruefErgebnis =
  | { ok: true; story: Story }
  | { ok: false; verweigerung: Verweigerung };

interface GeparsteMeta {
  werte: Map<string, MetaWert>;
  gruende: string[];
}

function parseListe(inhalt: string, zeileNr: number, gruende: string[]): string[] | null {
  const eintraege: string[] = [];
  let aktuell = "";
  let inAnfuehrung = false;
  for (const zeichen of inhalt) {
    if (zeichen === '"') {
      inAnfuehrung = !inAnfuehrung;
      continue;
    }
    if (zeichen === "," && !inAnfuehrung) {
      eintraege.push(aktuell.trim());
      aktuell = "";
      continue;
    }
    aktuell += zeichen;
  }
  if (inAnfuehrung) {
    gruende.push(`Zeile ${zeileNr}: Liste mit nicht geschlossenem Anfuehrungszeichen`);
    return null;
  }
  eintraege.push(aktuell.trim());
  if (eintraege.some((e) => e.length === 0)) {
    gruende.push(`Zeile ${zeileNr}: Liste enthaelt leere Eintraege`);
    return null;
  }
  return eintraege;
}

function parseSkalar(wert: string): string {
  if (wert.length >= 2 && wert.startsWith('"') && wert.endsWith('"')) {
    return wert.slice(1, -1);
  }
  return wert;
}

/** Liest das meta.yaml-Subset. Jede Abweichung wird als Grund gesammelt. */
export function parseMetaYaml(roh: string): GeparsteMeta {
  const werte = new Map<string, MetaWert>();
  const gruende: string[] = [];
  const zeilen = roh.split(/\r?\n/);

  zeilen.forEach((zeileRoh, index) => {
    const zeileNr = index + 1;
    const zeile = zeileRoh.trim();
    if (zeile === "" || zeile.startsWith("#")) return;

    const treffer = /^([^\s:][^:]*):\s*(.*)$/.exec(zeile);
    if (!treffer) {
      gruende.push(`Zeile ${zeileNr}: nicht als "schluessel: wert" lesbar`);
      return;
    }
    const schluessel = treffer[1]!.trim();
    const wertRoh = treffer[2]!.trim();

    if (werte.has(schluessel)) {
      gruende.push(`Doppelter Schluessel: "${schluessel}"`);
      return;
    }
    if (wertRoh === "") {
      gruende.push(`Zeile ${zeileNr}: leerer Wert fuer "${schluessel}"`);
      return;
    }

    if (wertRoh.startsWith("[")) {
      if (!wertRoh.endsWith("]")) {
        gruende.push(`Zeile ${zeileNr}: Liste ohne schliessende Klammer`);
        return;
      }
      const liste = parseListe(wertRoh.slice(1, -1), zeileNr, gruende);
      if (liste !== null) werte.set(schluessel, liste);
      return;
    }
    werte.set(schluessel, parseSkalar(wertRoh));
  });

  return { werte, gruende };
}

interface GeparsterText {
  kennzeichnungszeileVorhanden: boolean;
  etappen: Etappe[];
}

/** Zerlegt story.md in Etappen (eine je "## "-Ueberschrift). */
export function parseStoryText(roh: string): GeparsterText {
  const zeilen = roh.split(/\r?\n/);
  const kennzeichnungszeileVorhanden = zeilen.some((z) =>
    /KENNZEICHNUNG:\s*FIKTIV/.test(z),
  );

  const etappen: Etappe[] = [];
  let aktuelleTitel: string | null = null;
  let aktuelleZeilen: string[] = [];
  const abschliessen = () => {
    if (aktuelleTitel !== null) {
      etappen.push({
        nr: etappen.length + 1,
        titel: aktuelleTitel,
        text: aktuelleZeilen.join("\n").trim(),
      });
    }
  };
  for (const zeile of zeilen) {
    if (zeile.startsWith("## ")) {
      abschliessen();
      aktuelleTitel = zeile.slice(3).trim();
      aktuelleZeilen = [];
    } else if (aktuelleTitel !== null) {
      aktuelleZeilen.push(zeile);
    }
  }
  abschliessen();

  return { kennzeichnungszeileVorhanden, etappen };
}

const SCHUTZSTUFEN = new Set(["S1", "S2", "S3", "S4", "S5"]);

/**
 * Prueft eine Geschichte vollstaendig. Ergebnis ist entweder eine Story
 * oder eine Verweigerung mit ALLEN festgestellten Gruenden.
 */
export function pruefeStory(quelle: string, metaRoh: string, storyRoh: string): PruefErgebnis {
  const gruende: string[] = [];
  const { werte, gruende: parseGruende } = parseMetaYaml(metaRoh);
  gruende.push(...parseGruende);

  for (const schluessel of werte.keys()) {
    if (!ERLAUBTE_SCHLUESSEL.has(schluessel)) {
      gruende.push(`Unbekannter oder falsch geschriebener Schluessel: "${schluessel}"`);
    }
  }
  for (const schluessel of PFLICHT_SCHLUESSEL) {
    if (!werte.has(schluessel)) {
      gruende.push(`Pflichtschluessel fehlt: "${schluessel}"`);
    }
  }

  const kennzeichnung = werte.get("kennzeichnung");
  if (werte.has("kennzeichnung") && kennzeichnung !== "FIKTIV") {
    gruende.push('Kennzeichnung ist nicht exakt "FIKTIV" — Geschichte wird verweigert (Invariante 2)');
  }

  if (werte.has("fixture")) {
    gruende.push("Als Test-Fixture markiert (fixture) — Fixtures erscheinen nie im Feed (Invariante 2)");
  }

  const schutzstufe = werte.get("schutzstufe");
  if (typeof schutzstufe === "string") {
    if (!SCHUTZSTUFEN.has(schutzstufe)) {
      gruende.push(`Unbekannte Schutzstufe: "${schutzstufe}"`);
    } else if (schutzstufe === "S4" || schutzstufe === "S5") {
      gruende.push(
        `Schutzstufe ${schutzstufe} — wird im Feed-Prototyp nicht angezeigt (Belastungsschutz, F1; Operating Rules Nr. 8)`,
      );
    }
  } else if (werte.has("schutzstufe")) {
    gruende.push("Schutzstufe muss ein Skalar sein");
  }

  let etappenSoll: number | null = null;
  const etappenWert = werte.get("etappen");
  if (werte.has("etappen")) {
    if (typeof etappenWert === "string" && /^[1-9]\d*$/.test(etappenWert)) {
      etappenSoll = Number(etappenWert);
    } else {
      gruende.push('"etappen" muss eine positive ganze Zahl sein');
    }
  }

  for (const schluessel of LISTEN_SCHLUESSEL) {
    const wert = werte.get(schluessel);
    if (werte.has(schluessel) && !Array.isArray(wert)) {
      gruende.push(`"${schluessel}" muss eine Liste sein`);
    }
  }
  for (const schluessel of PFLICHT_SCHLUESSEL) {
    if ((LISTEN_SCHLUESSEL as readonly string[]).includes(schluessel)) continue;
    const wert = werte.get(schluessel);
    if (werte.has(schluessel) && schluessel !== "etappen" && Array.isArray(wert)) {
      gruende.push(`"${schluessel}" muss ein Skalar sein`);
    }
  }

  const missionsStatus = werte.get("missions_status");
  if (etappenSoll !== null && Array.isArray(missionsStatus) && missionsStatus.length !== etappenSoll) {
    gruende.push(
      `"missions_status" hat ${missionsStatus.length} Eintraege, "etappen" verlangt ${etappenSoll}`,
    );
  }

  const text = parseStoryText(storyRoh);
  if (!text.kennzeichnungszeileVorhanden) {
    gruende.push('story.md enthaelt keine sichtbare Kennzeichnungszeile ("KENNZEICHNUNG: FIKTIV…")');
  }
  if (etappenSoll !== null && text.etappen.length !== etappenSoll) {
    gruende.push(
      `story.md hat ${text.etappen.length} Etappen-Ueberschriften ("## "), meta.yaml verlangt ${etappenSoll}`,
    );
  }

  if (gruende.length > 0) {
    return { ok: false, verweigerung: { quelle, gruende } };
  }

  const meta: StoryMeta = {
    id: werte.get("id") as string,
    titel: werte.get("titel") as string,
    rechtsgebiet: werte.get("rechtsgebiet") as string,
    schutzstufe: schutzstufe as string,
    etappen: etappenSoll as number,
    missions_status: missionsStatus as string[],
    prinzipien: werte.get("prinzipien") as string[],
    emotions_ziel: werte.get("emotions_ziel") as string[],
    autor: werte.get("autor") as string,
    erstellt: werte.get("erstellt") as string,
  };
  return { ok: true, story: { meta, etappen: text.etappen } };
}

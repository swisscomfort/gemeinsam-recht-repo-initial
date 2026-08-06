// story.ts — Laden und Pruefen der Geschichten (AUFTRAG-F0, Teil A;
// erweitert durch AUFTRAG-R0 §1: Kategorie NACHERZAEHLT_OEFFENTLICH).
//
// Quelle ist ausschliesslich prototypen/stories/<ID>/meta.yaml + story.md.
// Verweigerung ist die Standardreaktion auf jede Abweichung; unbekannte oder
// falsch geschriebene Schluessel werden nie stillschweigend ignoriert
// (Praezisierung des Projektinhabers zur Freigabe, 2026-08-05).
//
// Der Parser ist bewusst KEIN YAML-Parser: Er liest exakt das in FS-001
// belegte Subset (Skalare und einzeilige Listen) und lehnt alles andere ab.
// Kein LLM, kein Netz, keine Systemzeit — das Pruefdatum fuer
// NACHERZAEHLT_OEFFENTLICH ("entscheid_datum in der Vergangenheit") wird
// injiziert; ohne injiziertes Datum wird die Kategorie verweigert.

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

export const KENNZEICHNUNGEN = ["FIKTIV", "NACHERZAEHLT_OEFFENTLICH"] as const;
export type Kennzeichnung = (typeof KENNZEICHNUNGEN)[number];

/** Zusaetzliche Pflichtfelder der Kategorie NACHERZAEHLT_OEFFENTLICH (R0 §1). */
export const NACHERZAEHLT_PFLICHT_SCHLUESSEL = [
  "quelle",
  "gericht",
  "entscheid_datum",
  "verfahren_abgeschlossen",
] as const;

// "fixture" ist als Markierung synthetischer Test-Stories zulaessig
// (Invariante 2, Analogie zur Fixture-Regel in CLAUDE.md), fuehrt aber
// immer zur Verweigerung fuer den Feed.
export const ERLAUBTE_SCHLUESSEL: ReadonlySet<string> = new Set([
  ...PFLICHT_SCHLUESSEL,
  "fixture",
]);

/** Fuer NACHERZAEHLT_OEFFENTLICH sind zusaetzlich die Quellfelder erlaubt. */
export const ERLAUBTE_SCHLUESSEL_NACHERZAEHLT: ReadonlySet<string> = new Set([
  ...ERLAUBTE_SCHLUESSEL,
  ...NACHERZAEHLT_PFLICHT_SCHLUESSEL,
]);

export const LISTEN_SCHLUESSEL = ["missions_status", "prinzipien", "emotions_ziel"] as const;

export type MetaWert = string | string[];

export interface StoryMeta {
  id: string;
  titel: string;
  kennzeichnung: Kennzeichnung;
  rechtsgebiet: string;
  schutzstufe: string;
  etappen: number;
  missions_status: string[];
  prinzipien: string[];
  emotions_ziel: string[];
  autor: string;
  erstellt: string;
  /** Nur bei NACHERZAEHLT_OEFFENTLICH gesetzt: Aktenzeichen, z. B. "BGer 4A_123/2025". */
  quelle?: string;
  gericht?: string;
  entscheid_datum?: string;
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
 *
 * `heuteISO` (JJJJ-MM-TT) wird von der UI-Schicht injiziert und dient
 * ausschliesslich der Vergangenheits-Pruefung von `entscheid_datum`
 * (R0 §1). Ohne injiziertes Datum wird NACHERZAEHLT_OEFFENTLICH
 * verweigert — nie stillschweigend akzeptiert.
 */
export function pruefeStory(
  quelle: string,
  metaRoh: string,
  storyRoh: string,
  heuteISO?: string,
): PruefErgebnis {
  if (heuteISO !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(heuteISO)) {
    throw new Error("Pruefdatum muss injiziert werden und die Form JJJJ-MM-TT haben");
  }
  const gruende: string[] = [];
  const { werte, gruende: parseGruende } = parseMetaYaml(metaRoh);
  gruende.push(...parseGruende);

  const kennzeichnung = werte.get("kennzeichnung");
  const istNacherzaehlt = kennzeichnung === "NACHERZAEHLT_OEFFENTLICH";
  const erlaubte = istNacherzaehlt ? ERLAUBTE_SCHLUESSEL_NACHERZAEHLT : ERLAUBTE_SCHLUESSEL;

  for (const schluessel of werte.keys()) {
    if (!erlaubte.has(schluessel)) {
      gruende.push(`Unbekannter oder falsch geschriebener Schluessel: "${schluessel}"`);
    }
  }
  for (const schluessel of PFLICHT_SCHLUESSEL) {
    if (!werte.has(schluessel)) {
      gruende.push(`Pflichtschluessel fehlt: "${schluessel}"`);
    }
  }

  if (
    werte.has("kennzeichnung") &&
    !(KENNZEICHNUNGEN as readonly string[]).includes(kennzeichnung as string)
  ) {
    gruende.push(
      'Kennzeichnung ist nicht exakt "FIKTIV" oder "NACHERZAEHLT_OEFFENTLICH" — Geschichte wird verweigert (Invariante 2)',
    );
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
    } else if (istNacherzaehlt && schutzstufe === "S3") {
      gruende.push(
        "Schutzstufe S3 — fuer NACHERZAEHLT_OEFFENTLICH ist hoechstens S2 zulaessig (R0 §1)",
      );
    }
  } else if (werte.has("schutzstufe")) {
    gruende.push("Schutzstufe muss ein Skalar sein");
  }

  /* Zusatzpruefungen der Kategorie NACHERZAEHLT_OEFFENTLICH (R0 §1). */
  let nacherzaehltQuelle: string | null = null;
  if (istNacherzaehlt) {
    for (const schluessel of NACHERZAEHLT_PFLICHT_SCHLUESSEL) {
      if (!werte.has(schluessel)) {
        gruende.push(`Pflichtschluessel fehlt: "${schluessel}"`);
        continue;
      }
      if (Array.isArray(werte.get(schluessel))) {
        gruende.push(`"${schluessel}" muss ein Skalar sein`);
      }
    }
    const quelleWert = werte.get("quelle");
    if (typeof quelleWert === "string") {
      if (quelleWert.trim() === "") {
        gruende.push('"quelle" ist leer — ohne Aktenzeichen keine nacherzaehlte Geschichte (R0 §1)');
      } else {
        nacherzaehltQuelle = quelleWert.trim();
      }
    }
    const entscheidDatum = werte.get("entscheid_datum");
    if (typeof entscheidDatum === "string") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entscheidDatum)) {
        gruende.push('"entscheid_datum" muss die Form JJJJ-MM-TT haben');
      } else if (heuteISO === undefined) {
        gruende.push(
          "Kein Pruefdatum injiziert — NACHERZAEHLT_OEFFENTLICH kann ohne injiziertes Heute-Datum nicht geprueft werden (keine Systemzeit in der Fachlogik)",
        );
      } else if (entscheidDatum > heuteISO) {
        gruende.push(
          `"entscheid_datum" ${entscheidDatum} liegt in der Zukunft (Pruefdatum ${heuteISO}) — nur vergangene Entscheide (R0 §1)`,
        );
      }
    }
    const abgeschlossen = werte.get("verfahren_abgeschlossen");
    if (werte.has("verfahren_abgeschlossen") && abgeschlossen !== "true") {
      gruende.push(
        '"verfahren_abgeschlossen" ist nicht exakt true — nur abgeschlossene Verfahren werden nacherzaehlt (R0 §1; keine Live-Faelle, Plan §3)',
      );
    }
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
  if (istNacherzaehlt) {
    // Pflichtzeile analog FIKTIV (R0 §1): "NACH ECHTEM ENTSCHEID — nacherzählt;
    // Quelle: <quelle>. Namen ersetzt." — geprueft werden die drei festen
    // Bestandteile auf EINER Zeile, inklusive der exakten Quelle aus meta.yaml.
    const zeileVorhanden =
      nacherzaehltQuelle !== null &&
      storyRoh
        .split(/\r?\n/)
        .some(
          (z) =>
            z.includes("NACH ECHTEM ENTSCHEID") &&
            z.includes(`Quelle: ${nacherzaehltQuelle}`) &&
            z.includes("Namen ersetzt"),
        );
    if (!zeileVorhanden) {
      gruende.push(
        'story.md enthaelt keine sichtbare Kennzeichnungszeile ("NACH ECHTEM ENTSCHEID — nacherzählt; Quelle: <quelle>. Namen ersetzt.")',
      );
    }
  } else if (!text.kennzeichnungszeileVorhanden) {
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
    kennzeichnung: kennzeichnung as Kennzeichnung,
    rechtsgebiet: werte.get("rechtsgebiet") as string,
    schutzstufe: schutzstufe as string,
    etappen: etappenSoll as number,
    missions_status: missionsStatus as string[],
    prinzipien: werte.get("prinzipien") as string[],
    emotions_ziel: werte.get("emotions_ziel") as string[],
    autor: werte.get("autor") as string,
    erstellt: werte.get("erstellt") as string,
  };
  if (istNacherzaehlt) {
    meta.quelle = nacherzaehltQuelle as string;
    meta.gericht = werte.get("gericht") as string;
    meta.entscheid_datum = werte.get("entscheid_datum") as string;
  }
  return { ok: true, story: { meta, etappen: text.etappen } };
}

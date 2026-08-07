// sieb.ts — deterministisches Metadaten-Sieb (AUFTRAG-R1 §1, Stufe 1).
//
// Dieses Modul ist rein: kein Netz, keine Uhr, keine Dateizugriffe — alles
// wird injiziert. Eingabe sind die Zeilen der Monatslisten
// redaktion/kandidaten/JJJJ-MM.md (nur Metadaten und Links), Ausgabe sind
// die Inhalte von redaktion/gesiebt/JJJJ-MM-TT.md (sortiert nach Score)
// und redaktion/gesiebt/spaeter-fr-it.md (nicht-deutsche Treffer).
//
// Dokumentierte Auslegungen (Details im Abschlussbericht R1):
// - Gerichts-Gewicht: Die Monatslisten tragen das Roh-Feld "hierarchy" nicht
//   mehr; seine Signatur steckt aber am Anfang der Link-ID (z. B.
//   "CH_BGer_004_…", "NW_OG_001_…"). Gewichtet wird deshalb ueber die
//   Link-Signatur: CH_BGer/CH_BGE hoch · *_OG/KG/TC/APG mittel · uebrige tief.
// - Sprache: Ein Sprachfeld ist in den Monatslisten nicht vorhanden. Bestes
//   verfuegbares Feld ist das Kantonskuerzel der Link-Signatur (VD/GE/NE/JU/TI
//   -> Spaeter-Liste), ergaenzt um eine Wort-Heuristik ueber Betreff und
//   Gerichtsname (franzoesische/italienische Marker).
// - Instanzen-Dublette: Best-Effort ueber den Betreff — (a) das Aktenzeichen
//   eines Eintrags erscheint im Betreff eines anderen (Vorinstanz zitiert),
//   (b) identischer, hinreichend spezifischer Betreff (enthaelt Ziffern,
//   >= 12 Zeichen) bei verschiedenen Instanzhoehen. Behalten wird die
//   hoehere, bei gleicher Hoehe die spaetere Instanz; Entferntes wird im
//   Ausgabedokument sichtbar ausgewiesen, nie still verworfen.

export interface SiebWort {
  kuerzel: string;
  muster: string[];
}

export interface SiebKonfiguration {
  version: string;
  stand: string;
  punkte: {
    positiv: number;
    negativ: number;
    gericht_hoch: number;
    gericht_mittel: number;
    gericht_tief: number;
    kanton_lu_bonus: number;
  };
  positiv: SiebWort[];
  negativ: SiebWort[];
  gericht: {
    hoch_signaturen: string[];
    mittel_gerichtsteile: string[];
    hoch_kuerzel: string;
  };
  sprache: {
    fr_it_kantone: string[];
    fr_it_muster: string[];
  };
}

export interface KandidatZeile {
  entscheidDatum: string;
  gericht: string;
  aktenzeichen: string;
  betreff: string;
  link: string;
  original: string;
}

export interface Bewertung {
  zeile: KandidatZeile;
  punkte: number;
  kuerzel: string[];
}

export interface Dublette {
  entfernt: KandidatZeile;
  behalten: KandidatZeile;
  grund: string;
}

export interface SiebErgebnis {
  deutsch: Bewertung[];
  spaeter: Bewertung[];
  dubletten: Dublette[];
}

/**
 * Liest die "- "-Zeilen einer Monatsliste. Das Zeilenformat ist
 * "Datum · Gericht · Aktenzeichen · Betreff · Link"; enthaelt der Betreff
 * selbst das Trennzeichen, wird er aus den Mittelfeldern zusammengesetzt
 * (erste drei Felder und das Link-Feld sind fest). Unlesbare Zeilen werden
 * verworfen — nie ergaenzt.
 */
export function parseKandidatenListe(markdown: string): KandidatZeile[] {
  const zeilen: KandidatZeile[] = [];
  for (const roh of markdown.split(/\r?\n/)) {
    if (!roh.startsWith("- ")) continue;
    const teile = roh.slice(2).split(" · ");
    if (teile.length < 5) continue;
    const datum = teile[0]!.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) continue;
    const link = teile[teile.length - 1]!.trim();
    if (!link.startsWith("https://entscheidsuche.ch/view/")) continue;
    zeilen.push({
      entscheidDatum: datum,
      gericht: teile[1]!.trim(),
      aktenzeichen: teile[2]!.trim(),
      betreff: teile.slice(3, -1).join(" · ").trim(),
      link,
      original: roh,
    });
  }
  return zeilen;
}

/** Kleinschreibung, Umlaute/Akzente vereinheitlicht, Satzzeichen zu Leerraum. */
export function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Teilstring-Treffer auf normalisiertem Text (Muster sind normalisiert). */
function trifft(normalisiert: string, muster: string): boolean {
  return normalisiert.includes(muster);
}

/** "https://entscheidsuche.ch/view/NW_OG_001_…" -> ["NW", "OG"]. */
export function linkSignatur(link: string): [string, string] {
  const id = link.slice(link.lastIndexOf("/") + 1);
  const teile = id.split("_");
  return [teile[0] ?? "", teile[1] ?? ""];
}

type GerichtsStufe = "hoch" | "mittel" | "tief";

export function gerichtsStufe(link: string, konfig: SiebKonfiguration): GerichtsStufe {
  const [kanton, gericht] = linkSignatur(link);
  if (konfig.gericht.hoch_signaturen.includes(`${kanton}_${gericht}`)) return "hoch";
  if (konfig.gericht.mittel_gerichtsteile.includes(gericht)) return "mittel";
  return "tief";
}

/** FR/IT-Erkennung: Kantonskuerzel der Signatur, sonst Wort-Heuristik. */
export function istFrOderIt(zeile: KandidatZeile, konfig: SiebKonfiguration): boolean {
  const [kanton] = linkSignatur(zeile.link);
  if (konfig.sprache.fr_it_kantone.includes(kanton)) return true;
  const text = normalisiere(`${zeile.gericht} ${zeile.betreff}`);
  return konfig.sprache.fr_it_muster.some((m) => trifft(text, normalisiere(m)));
}

/**
 * Bewertet eine Zeile: Wort-Treffer im Betreff (Titel), Gerichts-Gewicht
 * ueber die Link-Signatur, LU-Bonus. Kuerzel-Reihenfolge: Positive ·
 * Gericht · Negative — z. B. "[+kuendigung +BGer −uR]".
 */
export function bewerte(zeile: KandidatZeile, konfig: SiebKonfiguration): Bewertung {
  const betreff = normalisiere(zeile.betreff);
  let punkte = 0;
  const kuerzel: string[] = [];

  for (const wort of konfig.positiv) {
    if (wort.muster.some((m) => trifft(betreff, normalisiere(m)))) {
      punkte += konfig.punkte.positiv;
      kuerzel.push(`+${wort.kuerzel}`);
    }
  }

  const stufe = gerichtsStufe(zeile.link, konfig);
  if (stufe === "hoch") {
    punkte += konfig.punkte.gericht_hoch;
    kuerzel.push(`+${konfig.gericht.hoch_kuerzel}`);
  } else if (stufe === "mittel") {
    punkte += konfig.punkte.gericht_mittel;
    kuerzel.push(`+${linkSignatur(zeile.link)[1]}`);
  } else {
    punkte += konfig.punkte.gericht_tief;
  }
  if (linkSignatur(zeile.link)[0] === "LU") {
    punkte += konfig.punkte.kanton_lu_bonus;
    kuerzel.push("+LU");
  }

  for (const wort of konfig.negativ) {
    if (wort.muster.some((m) => trifft(betreff, normalisiere(m)))) {
      punkte += konfig.punkte.negativ;
      kuerzel.push(`−${wort.kuerzel}`);
    }
  }

  return { zeile, punkte, kuerzel };
}

const STUFEN_RANG: Record<GerichtsStufe, number> = { hoch: 2, mittel: 1, tief: 0 };

/** Betreff spezifisch genug fuer einen Gleichheits-Vergleich (Sachbezug)? */
function istSpezifisch(betreff: string): boolean {
  return /\d/.test(betreff) && betreff.length >= 12;
}

/**
 * Instanzen-Dubletten (Best-Effort, siehe Kopfkommentar): behalten wird die
 * hoehere Instanz, bei gleicher Hoehe die mit spaeterem Entscheiddatum.
 * Nichts wird still verworfen — Entferntes wird zurueckgemeldet.
 */
export function entferneDubletten(
  zeilen: KandidatZeile[],
  konfig: SiebKonfiguration,
): { behalten: KandidatZeile[]; dubletten: Dublette[] } {
  const entfernteLinks = new Set<string>();
  const dubletten: Dublette[] = [];

  const rang = (z: KandidatZeile): number => STUFEN_RANG[gerichtsStufe(z.link, konfig)];
  const istEntfernt = (z: KandidatZeile): boolean => entfernteLinks.has(z.link);
  const entferne = (entfernt: KandidatZeile, behalten: KandidatZeile, grund: string): void => {
    entfernteLinks.add(entfernt.link);
    dubletten.push({ entfernt, behalten, grund });
  };

  for (let i = 0; i < zeilen.length; i++) {
    for (let j = i + 1; j < zeilen.length; j++) {
      const a = zeilen[i]!;
      const b = zeilen[j]!;
      if (a.link === b.link || istEntfernt(a) || istEntfernt(b)) continue;

      const azA = normalisiere(a.aktenzeichen);
      const azB = normalisiere(b.aktenzeichen);
      const betreffA = normalisiere(a.betreff);
      const betreffB = normalisiere(b.betreff);

      // (a) Aktenzeichen des einen erscheint im Betreff des anderen:
      //     Wer zitiert, ist die spaetere Instanz — die zitierte fliegt.
      if (azA.length >= 5 && betreffB.includes(azA)) {
        entferne(a, b, "Aktenzeichen im Betreff der spaeteren Instanz");
        continue;
      }
      if (azB.length >= 5 && betreffA.includes(azB)) {
        entferne(b, a, "Aktenzeichen im Betreff der spaeteren Instanz");
        continue;
      }

      // (b) identischer, spezifischer Betreff: hoehere Instanz behalten,
      //     bei gleicher Hoehe die spaetere; voelliger Gleichstand bleibt stehen.
      if (istSpezifisch(a.betreff) && betreffA === betreffB) {
        if (rang(a) > rang(b) || (rang(a) === rang(b) && a.entscheidDatum > b.entscheidDatum)) {
          entferne(b, a, "gleicher Betreff");
        } else if (rang(b) > rang(a) || a.entscheidDatum !== b.entscheidDatum) {
          entferne(a, b, "gleicher Betreff");
        }
      }
    }
  }

  return { behalten: zeilen.filter((z) => !entfernteLinks.has(z.link)), dubletten };
}

/**
 * Das vollstaendige Sieb: Dubletten raus, Sprache trennen, bewerten,
 * sortieren (Score absteigend · Datum absteigend · Aktenzeichen aufsteigend).
 */
export function siebe(zeilen: KandidatZeile[], konfig: SiebKonfiguration): SiebErgebnis {
  const { behalten, dubletten } = entferneDubletten(zeilen, konfig);
  const deutsch: Bewertung[] = [];
  const spaeter: Bewertung[] = [];
  for (const zeile of behalten) {
    const bewertung = bewerte(zeile, konfig);
    (istFrOderIt(zeile, konfig) ? spaeter : deutsch).push(bewertung);
  }
  const sortiere = (liste: Bewertung[]): void => {
    liste.sort(
      (a, b) =>
        b.punkte - a.punkte ||
        b.zeile.entscheidDatum.localeCompare(a.zeile.entscheidDatum) ||
        a.zeile.aktenzeichen.localeCompare(b.zeile.aktenzeichen),
    );
  };
  sortiere(deutsch);
  sortiere(spaeter);
  return { deutsch, spaeter, dubletten };
}

function bewertungsZeile(b: Bewertung): string {
  const kuerzel = b.kuerzel.length > 0 ? ` ${b.kuerzel.join(" ")}` : "";
  return `${b.zeile.original} [${b.punkte}${kuerzel}]`;
}

/** Inhalt von redaktion/gesiebt/JJJJ-MM-TT.md (Datum wird injiziert). */
export function gesiebtListe(
  ergebnis: SiebErgebnis,
  standDatum: string,
  quellDateien: string[],
): string {
  const zeilen = [
    `# Gesiebte Kandidaten — Stand ${standDatum}`,
    "",
    `Metadaten-Sieb (AUFTRAG-R1 §1) ueber ${quellDateien.length} Monatsliste(n): ${quellDateien.join(", ")}.`,
    "Deterministisch, ohne Netz. Sortierung: Score absteigend · Datum absteigend · Aktenzeichen.",
    "Zeilenformat: Original-Kandidatenzeile + [Score + Kuerzel] gemaess redaktion/sieb.json.",
    "",
    ...ergebnis.deutsch.map(bewertungsZeile),
    "",
  ];
  if (ergebnis.dubletten.length > 0) {
    zeilen.push(
      "## Instanzen-Dubletten — ausgeblendet, nur hoechste/letzte Instanz behalten",
      "",
      ...ergebnis.dubletten.map(
        (d) =>
          `- entfernt: ${d.entfernt.link} (${d.grund}) → behalten: ${d.behalten.link}`,
      ),
      "",
    );
  }
  return zeilen.join("\n");
}

/** Inhalt von redaktion/gesiebt/spaeter-fr-it.md. */
export function spaeterListe(ergebnis: SiebErgebnis, standDatum: string): string {
  return [
    `# Spaeter: franzoesisch-/italienischsprachige Kandidaten — Stand ${standDatum}`,
    "",
    "Nicht verworfen, nur zurueckgestellt (AUFTRAG-R1 §1): Erkennung ueber",
    "Kantonskuerzel der Link-Signatur und Wort-Heuristik (redaktion/sieb.json).",
    "",
    ...ergebnis.spaeter.map(bewertungsZeile),
    "",
  ].join("\n");
}

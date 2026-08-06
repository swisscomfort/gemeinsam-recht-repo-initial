// lauf.ts — synthetischer Lauf-Modus (AUFTRAG-F0 Teil D, erweitert durch
// AUFTRAG-F1 §4: Emotions-Lauf ueber die ganze Journey).
//
// Aufgezeichnet werden NUR: Lauf-ID, injiziertes Ausgabedatum, Station
// (Stelle + Art), gewaehlte Emotion, Notiz, Abbruchstelle. Verweildauer,
// Zeitstempel je Klick, Klick- oder Wiederkehrraten sind technisch nicht
// erfassbar — unzulaessige Zwecke nach F1 duerfen gar nicht erst messbar
// sein. Emotionserfassung an echten Nutzern findet nie statt.

export const ZWECKBINDUNG = "F1 — synthetische Laeufe, keine echten Nutzer";

/** Ziel-Emotionskurve fuer den Ernstfall-Abschnitt (Soll im Log-Kopf, F1 §4). */
export const SOLL_ERNSTFALL =
  "Schreck/Angst -> Orientierung -> Handlungsfaehigkeit -> Erleichterung";

export const EMOTIONEN = [
  "verstanden",
  "neugierig",
  "aha_moment",
  "ueberfordert",
  "beunruhigt",
] as const;
export type Emotion = (typeof EMOTIONEN)[number];

/** Stationsarten der Journey: Karten, Uebergangsmomente, Fragebaum, Ergebnis, Fallkarte. */
export const STATION_ARTEN = [
  "karte",
  "uebergang",
  "fragebaum_schritt",
  "ergebnis",
  "mein_fall",
] as const;
export type StationArt = (typeof STATION_ARTEN)[number];

export interface LaufEintrag {
  stelle: string;
  art: StationArt;
  emotion: Emotion;
  notiz: string;
}

export interface Lauf {
  laufId: number;
  datum: string;
  eintraege: LaufEintrag[];
  abbruchstelle: string | null;
  abgeschlossen: boolean;
}

export interface LaufSammlung {
  zweckbindung: string;
  soll_ernstfall: string;
  /** Abgeschlossene Durchlaeufe insgesamt (F0-Zaehler, bleibt erhalten). */
  durchlaeufeGesamt: number;
  /** Abgeschlossene VOLLSTAENDIGE Journey-Durchlaeufe — der 100er-Zaehler (F1 §4). */
  journeysGesamt: number;
  laeufe: Lauf[];
}

/** Abschliessende Liste der Schluessel, die ein Export enthalten darf (F1-Waechter). */
export const EXPORT_ERLAUBTE_SCHLUESSEL: ReadonlySet<string> = new Set([
  "zweckbindung",
  "soll_ernstfall",
  "durchlaeufeGesamt",
  "journeysGesamt",
  "laeufe",
  "laufId",
  "datum",
  "eintraege",
  "stelle",
  "art",
  "emotion",
  "notiz",
  "abbruchstelle",
  "abgeschlossen",
]);

export function neueSammlung(): LaufSammlung {
  return {
    zweckbindung: ZWECKBINDUNG,
    soll_ernstfall: SOLL_ERNSTFALL,
    durchlaeufeGesamt: 0,
    journeysGesamt: 0,
    laeufe: [],
  };
}

export function starteLauf(sammlung: LaufSammlung, datum: string): Lauf {
  const lauf: Lauf = {
    laufId: sammlung.laeufe.length + 1,
    datum,
    eintraege: [],
    abbruchstelle: null,
    abgeschlossen: false,
  };
  sammlung.laeufe.push(lauf);
  return lauf;
}

/** Erfasst eine Journey-Station (F1 §4): Stelle + Art + Emotion + Notiz. */
export function erfasseStation(
  lauf: Lauf,
  art: string,
  stelle: string,
  emotion: string,
  notiz: string,
): void {
  if (lauf.abgeschlossen || lauf.abbruchstelle !== null) {
    throw new Error("Lauf ist bereits beendet");
  }
  if (!(STATION_ARTEN as readonly string[]).includes(art)) {
    throw new Error(`Unbekannte Stationsart: "${art}" — nur die feste Liste ist zulaessig (F1)`);
  }
  if (!(EMOTIONEN as readonly string[]).includes(emotion)) {
    throw new Error(`Unbekannte Emotion: "${emotion}" — nur die feste Liste ist zulaessig (F1)`);
  }
  lauf.eintraege.push({ stelle, art: art as StationArt, emotion: emotion as Emotion, notiz });
}

/** F0-Aufruf: eine Karte erfassen (bleibt als Station der Art "karte" erhalten). */
export function erfasseKarte(lauf: Lauf, karteId: string, emotion: string, notiz: string): void {
  erfasseStation(lauf, "karte", karteId, emotion, notiz);
}

/** Bereits erfasste Stellen eines Laufs (verhindert Doppel-Erfassung in der UI). */
export function erfassteStellen(lauf: Lauf): Set<string> {
  return new Set(lauf.eintraege.map((e) => e.stelle));
}

/**
 * Vollstaendige Journey (F1 §0/§4): mindestens eine Karte, ein
 * Uebergangsmoment, ein Fragebaum-Schritt, das Ergebnis und die private
 * Fallkarte "Mein Fall" wurden durchlaufen.
 */
export function istVollstaendigeJourney(lauf: Lauf): boolean {
  const arten = new Set(lauf.eintraege.map((e) => e.art));
  return STATION_ARTEN.every((art) => arten.has(art));
}

export function bricheAb(sammlung: LaufSammlung, lauf: Lauf, stelle: string): void {
  if (lauf.abgeschlossen || lauf.abbruchstelle !== null) {
    throw new Error("Lauf ist bereits beendet");
  }
  lauf.abbruchstelle = stelle;
  aktualisiereZaehler(sammlung);
}

export function schliesseAb(sammlung: LaufSammlung, lauf: Lauf): void {
  if (lauf.abgeschlossen || lauf.abbruchstelle !== null) {
    throw new Error("Lauf ist bereits beendet");
  }
  lauf.abgeschlossen = true;
  aktualisiereZaehler(sammlung);
}

function aktualisiereZaehler(sammlung: LaufSammlung): void {
  const abgeschlossen = sammlung.laeufe.filter((l) => l.abgeschlossen);
  sammlung.durchlaeufeGesamt = abgeschlossen.length;
  sammlung.journeysGesamt = abgeschlossen.filter(istVollstaendigeJourney).length;
}

export function exportiere(sammlung: LaufSammlung): string {
  return JSON.stringify(sammlung, null, 2);
}

/** Sammelt rekursiv alle Objektschluessel — Grundlage des F1-Schema-Tests. */
export function alleSchluessel(wert: unknown, gefunden: Set<string> = new Set()): Set<string> {
  if (Array.isArray(wert)) {
    for (const eintrag of wert) alleSchluessel(eintrag, gefunden);
  } else if (wert !== null && typeof wert === "object") {
    for (const [schluessel, unter] of Object.entries(wert)) {
      gefunden.add(schluessel);
      alleSchluessel(unter, gefunden);
    }
  }
  return gefunden;
}

/** Laedt eine gespeicherte Sammlung; bei jeder Abweichung: frische Sammlung. */
export function ladeSammlung(rohJson: string | null): LaufSammlung {
  if (rohJson === null) return neueSammlung();
  try {
    const geparst = JSON.parse(rohJson) as unknown;
    const verletzungen = [...alleSchluessel(geparst)].filter(
      (s) => !EXPORT_ERLAUBTE_SCHLUESSEL.has(s),
    );
    if (verletzungen.length > 0) return neueSammlung();
    const sammlung = geparst as LaufSammlung;
    if (sammlung.zweckbindung !== ZWECKBINDUNG || !Array.isArray(sammlung.laeufe)) {
      return neueSammlung();
    }
    sammlung.soll_ernstfall = SOLL_ERNSTFALL;
    aktualisiereZaehler(sammlung);
    return sammlung;
  } catch {
    return neueSammlung();
  }
}

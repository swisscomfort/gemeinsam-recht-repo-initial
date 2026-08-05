// lauf.ts — synthetischer Lauf-Modus (AUFTRAG-F0, Teil D; Zweckbindung F1).
//
// Aufgezeichnet werden NUR: Lauf-ID, injiziertes Ausgabedatum, Karten-ID,
// gewaehlte Emotion, Notiz, Abbruchstelle. Verweildauer, Zeitstempel je
// Klick, Klick- oder Wiederkehrraten sind technisch nicht erfassbar —
// unzulaessige Zwecke nach F1 duerfen gar nicht erst messbar sein.
// Emotionserfassung an echten Nutzern findet nie statt.

export const ZWECKBINDUNG = "F1 — synthetische Laeufe, keine echten Nutzer";

export const EMOTIONEN = [
  "verstanden",
  "neugierig",
  "aha_moment",
  "ueberfordert",
  "beunruhigt",
] as const;
export type Emotion = (typeof EMOTIONEN)[number];

export interface LaufEintrag {
  karteId: string;
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
  durchlaeufeGesamt: number;
  laeufe: Lauf[];
}

/** Abschliessende Liste der Schluessel, die ein Export enthalten darf (F1-Waechter). */
export const EXPORT_ERLAUBTE_SCHLUESSEL: ReadonlySet<string> = new Set([
  "zweckbindung",
  "durchlaeufeGesamt",
  "laeufe",
  "laufId",
  "datum",
  "eintraege",
  "karteId",
  "emotion",
  "notiz",
  "abbruchstelle",
  "abgeschlossen",
]);

export function neueSammlung(): LaufSammlung {
  return { zweckbindung: ZWECKBINDUNG, durchlaeufeGesamt: 0, laeufe: [] };
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

export function erfasseKarte(lauf: Lauf, karteId: string, emotion: string, notiz: string): void {
  if (lauf.abgeschlossen || lauf.abbruchstelle !== null) {
    throw new Error("Lauf ist bereits beendet");
  }
  if (!(EMOTIONEN as readonly string[]).includes(emotion)) {
    throw new Error(`Unbekannte Emotion: "${emotion}" — nur die feste Liste ist zulaessig (F1)`);
  }
  lauf.eintraege.push({ karteId, emotion: emotion as Emotion, notiz });
}

export function bricheAb(sammlung: LaufSammlung, lauf: Lauf, karteId: string): void {
  if (lauf.abgeschlossen || lauf.abbruchstelle !== null) {
    throw new Error("Lauf ist bereits beendet");
  }
  lauf.abbruchstelle = karteId;
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
  sammlung.durchlaeufeGesamt = sammlung.laeufe.filter((l) => l.abgeschlossen).length;
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
    aktualisiereZaehler(sammlung);
    return sammlung;
  } catch {
    return neueSammlung();
  }
}

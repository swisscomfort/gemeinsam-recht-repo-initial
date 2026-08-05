/**
 * Deterministische Fristarithmetik (AUFTRAG-S1 §3).
 *
 * Reine Ganzzahl-Arithmetik auf Kalendertagen (kein Date-Objekt, keine
 * Zeitzonen, keine Systemzeit). Zeit wird ausschliesslich als `heute`
 * injiziert.
 *
 * Parameter:
 *  P1 Anfechtungsfrist 30 Tage (Art. 273 Abs. 1 OR)
 *  P2 Fristbeginn: Empfangstag zaehlt nicht mit; Frist laeuft ab Folgetag
 *     => letzter Fristtag = Empfang + 30 Kalendertage
 *  P3 Fristende auf Sa/So/Feiertag (LU) verschiebt auf naechsten Werktag
 */
import { istFeiertagLu, jahrAbgedeckt } from "./feiertage_lu.js";
import type { IsoDate } from "./types.js";

/** P1: Dauer der Anfechtungsfrist in Tagen. Quelle: QUELLEN.P1. */
export const P1_ANFECHTUNGSFRIST_TAGE = 30;

/** P4: Dauer der postalischen Abholfrist in Tagen (dokumentarisch; das
 *  Fristende wird als `abholfrist_ende` erfasst, nicht berechnet). Quelle: QUELLEN.P4. */
export const P4_ABHOLFRIST_TAGE = 7;

const DATUM_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function istSchaltjahr(jahr: number): boolean {
  return (jahr % 4 === 0 && jahr % 100 !== 0) || jahr % 400 === 0;
}

function tageImMonat(jahr: number, monat: number): number {
  const lengths = [31, istSchaltjahr(jahr) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return lengths[monat - 1] as number;
}

/** Prueft Format YYYY-MM-DD und Kalender-Gueltigkeit. */
export function istIsoDatum(wert: unknown): wert is IsoDate {
  if (typeof wert !== "string") return false;
  const m = DATUM_RE.exec(wert);
  if (!m) return false;
  const jahr = Number(m[1]);
  const monat = Number(m[2]);
  const tag = Number(m[3]);
  if (monat < 1 || monat > 12) return false;
  if (tag < 1 || tag > tageImMonat(jahr, monat)) return false;
  return true;
}

export function jahrVon(datum: IsoDate): number {
  return Number(datum.slice(0, 4));
}

/** Tage seit 1970-01-01 (days_from_civil, Hinnant). */
export function zuTagen(datum: IsoDate): number {
  const m = DATUM_RE.exec(datum);
  if (!m || !istIsoDatum(datum)) {
    throw new Error(`Ungueltiges ISO-Datum: ${String(datum)}`);
  }
  let j = Number(m[1]);
  const mo = Number(m[2]);
  const t = Number(m[3]);
  j -= mo <= 2 ? 1 : 0;
  const era = Math.floor(j / 400);
  const yoe = j - era * 400;
  const doy = Math.floor((153 * (mo + (mo > 2 ? -3 : 9)) + 2) / 5) + t - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Umkehrung von zuTagen (civil_from_days, Hinnant). */
export function vonTagen(z: number): IsoDate {
  z += 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const j = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const t = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const mo = mp + (mp < 10 ? 3 : -9);
  const jahr = j + (mo <= 2 ? 1 : 0);
  const pad = (n: number, len: number) => String(n).padStart(len, "0");
  return `${pad(jahr, 4)}-${pad(mo, 2)}-${pad(t, 2)}`;
}

export function addTage(datum: IsoDate, tage: number): IsoDate {
  return vonTagen(zuTagen(datum) + tage);
}

/** Wochentag: 0=Montag … 5=Samstag, 6=Sonntag (1970-01-01 war ein Donnerstag). */
export function wochentag(datum: IsoDate): number {
  const d = zuTagen(datum);
  return (((d + 3) % 7) + 7) % 7;
}

export function istWochenende(datum: IsoDate): boolean {
  return wochentag(datum) >= 5;
}

export function istVor(a: IsoDate, b: IsoDate): boolean {
  return zuTagen(a) < zuTagen(b);
}

export function istNach(a: IsoDate, b: IsoDate): boolean {
  return zuTagen(a) > zuTagen(b);
}

export type FristResultat =
  | {
      ok: true;
      empfangsdatum_effektiv: IsoDate;
      /** Fristende vor Anwendung von P3 (Werktagsverschiebung). */
      fristende_roh: IsoDate;
      anfechtungsfrist_bis: IsoDate;
      verschoben: boolean;
      frist_abgelaufen: boolean;
    }
  | {
      ok: false;
      /** Jahr, fuer das keine Feiertagsdaten hinterlegt sind. */
      fehlendes_feiertagsjahr: number;
    };

/**
 * Berechnet die Anfechtungsfrist deterministisch aus dem effektiven
 * Empfangsdatum und dem injizierten `heute`.
 *
 * Faellt das Fristende in ein Jahr ohne hinterlegte Feiertagsdaten, wird
 * KEIN Ergebnis geraten, sondern die Luecke gemeldet (Invariante 3).
 */
export function berechneFristen(
  empfangsdatumEffektiv: IsoDate,
  heute: IsoDate,
): FristResultat {
  // P2: Empfangstag zaehlt nicht mit; letzter Tag der 30-Tage-Frist (P1)
  // ist damit Empfang + 30 Kalendertage.
  const fristendeRoh = addTage(empfangsdatumEffektiv, P1_ANFECHTUNGSFRIST_TAGE);

  // P3: Sa/So/Feiertag (LU) => naechster Werktag.
  let ende = fristendeRoh;
  for (;;) {
    if (istWochenende(ende)) {
      ende = addTage(ende, 1);
      continue;
    }
    if (!jahrAbgedeckt(jahrVon(ende))) {
      return { ok: false, fehlendes_feiertagsjahr: jahrVon(ende) };
    }
    if (istFeiertagLu(ende)) {
      ende = addTage(ende, 1);
      continue;
    }
    break;
  }

  return {
    ok: true,
    empfangsdatum_effektiv: empfangsdatumEffektiv,
    fristende_roh: fristendeRoh,
    anfechtungsfrist_bis: ende,
    verschoben: ende !== fristendeRoh,
    frist_abgelaufen: istNach(heute, ende),
  };
}

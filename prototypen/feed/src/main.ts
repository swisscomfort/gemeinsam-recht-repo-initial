// main.ts — Oberflaeche des privaten Feed-Prototyps.
// AUFTRAG-F0 (Morgenausgabe, Werkbank) + AUFTRAG-F1 (Leser-Journey).
//
// Kein Server, keine Uebertragung, kein Tracking, keine externen Ressourcen.
// Simulierte Zeit: Startdatum aus URL-Parameter ?datum= oder aus der
// UI-Schicht (wie webflow); die Fachlogik (core, serien, ausgabe) erhaelt
// jedes Datum injiziert und liest nie selbst die Systemzeit.
// Der Fragebaum ist der bestehende S2-Fragebaum: webflow/src/fragen.ts wird
// als gemeinsames Modul importiert, bewertet wird ausschliesslich im
// deterministischen Kern (core) — hier wird nur gerendert.

import "./stil.css";
import { ladeAlle } from "./quelle";
import { MIN_KARTEN } from "./ausgabe";
import {
  UPDATE_HINWEIS,
  folgeUmschalten,
  journeyAusgabe,
  ladeLeseZustand,
  merkeGesehen,
  naechsterMorgen,
  type JourneyAusgabe,
  type JourneyKarte,
  type LeseZustand,
} from "./serien";
import {
  PHASE_S_HINWEIS,
  PRIVAT_BADGE,
  fallStatusAus,
  fallStatusZeilen,
  ladeFall,
  exportiereFall,
  type MeinFall,
} from "./fall";
import {
  EMOTIONEN,
  SOLL_ERNSTFALL,
  bricheAb,
  erfasseStation,
  erfassteStellen,
  exportiere,
  istVollstaendigeJourney,
  ladeSammlung,
  schliesseAb,
  starteLauf,
  type Lauf,
  type LaufSammlung,
  type StationArt,
} from "./lauf";
import {
  baueFallobjekt,
  sichtbareFragen,
  type Antworten,
  type Frage,
} from "../../../webflow/src/fragen";
import {
  QUELLENSTAND,
  REGELVERSION,
  bewerteFall,
  erstelleEinschaetzung,
  type Einschaetzung,
} from "@core/index";

/* ---------- Speicher (nur localStorage dieses Browsers) ---------- */

const LAUF_SPEICHER = "gemeinsam-recht-feed-laeufe-v1";
const LESER_SPEICHER = "gemeinsam-recht-feed-leser-v1";
const FALL_SPEICHER = "gemeinsam-recht-feed-mein-fall-v1";

const EMOTION_BESCHRIFTUNG: Record<(typeof EMOTIONEN)[number], string> = {
  verstanden: "Verstanden",
  neugierig: "Neugierig",
  aha_moment: "Aha-Moment",
  ueberfordert: "Überfordert",
  beunruhigt: "Beunruhigt",
};

/* ---------- Beispieldaten (synthetische Fixture FX-001, Invariante 2) ---------- */

const FX001_ANTWORTEN: Antworten = {
  kanton: "LU",
  rolle: "mieter",
  "kuendigung.zustellart": "a_post",
  "kuendigung.zugestellt_am": "2026-09-02",
  "kuendigung.amtliches_formular": "ja",
  "kuendigung.unterschrieben": "ja",
  "kuendigung.begruendung_angegeben": "nein",
  "wohnung.familienwohnung": "nein",
  "vertrag.beginn": "2024-04-01",
  "vertrag.befristet": "nein",
  "vertrag.orts_gemeinde": "Luzern",
  "sperrfrist.verfahren_letzte_3_jahre": "nein",
  "sperrfrist.verfahren_haengig": "nein",
  "sperrfrist.rechte_geltend_gemacht": "nein",
};

/* ---------- Zustand (im Speicher dieser Seite) ---------- */

const geladen = ladeAlle();
let sammlung: LaufSammlung = ladeSammlung(localStorage.getItem(LAUF_SPEICHER));
let leseZustand: LeseZustand = ladeLeseZustand(localStorage.getItem(LESER_SPEICHER));
let meinFall: MeinFall | null = ladeFall(localStorage.getItem(FALL_SPEICHER));
let aktiverLauf: Lauf | null = null;
let aktuelleAusgabe: JourneyAusgabe | null = null;
let simDatum = initialesDatum();

// Werkzeug (S2-Fragebaum) — Zustand nur im Speicher dieser Seite.
let antworten: Antworten = {};
let schrittIndex = 0;
let wzEinschaetzung: Einschaetzung | null = null;

function initialesDatum(): string {
  const parameter = new URLSearchParams(location.search).get("datum");
  if (parameter && /^\d{4}-\d{2}-\d{2}$/.test(parameter)) return parameter;
  // UI-Schicht bestimmt das Startdatum der Simulation (wie webflow);
  // die Fachlogik erhaelt es ausschliesslich injiziert.
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function speichereLauf(): void {
  localStorage.setItem(LAUF_SPEICHER, exportiere(sammlung));
}
function speichereLeser(): void {
  localStorage.setItem(LESER_SPEICHER, JSON.stringify(leseZustand));
}
function speichereFall(): void {
  if (meinFall === null) {
    localStorage.removeItem(FALL_SPEICHER);
  } else {
    localStorage.setItem(FALL_SPEICHER, exportiereFall(meinFall));
  }
}

/* ---------- Hilfsfunktionen ---------- */

const wurzel = document.getElementById("app")!;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  klasse?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const knoten = document.createElement(tag);
  if (klasse) knoten.className = klasse;
  if (text !== undefined) knoten.textContent = text;
  return knoten;
}

function knopf(text: string, klasse: string, handler: () => void): HTMLButtonElement {
  const k = el("button", klasse, text);
  k.type = "button";
  k.addEventListener("click", handler);
  return k;
}

function bannerKompakt(): HTMLElement {
  return el(
    "p",
    "kopfhinweis kompakt",
    "Privater Prototyp (Plan v1.1 §4, CR-001/F1) · alle Geschichten FIKTIV · alles bleibt lokal in diesem Browser.",
  );
}

function bannerVoll(): HTMLElement {
  return el(
    "p",
    "kopfhinweis",
    "Privater Prototyp (Plan v1.1 §4, CR-001) · alle Geschichten sind synthetisch und als FIKTIV gekennzeichnet · nichts hiervon ist öffentlich · alle Daten bleiben in diesem Browser.",
  );
}

/* ---------- Emotions-Erfassung (nur im aktiven Lauf, F1 §4) ---------- */

function emotionsZeile(stelle: string, art: StationArt): HTMLElement | null {
  if (aktiverLauf === null || erfassteStellen(aktiverLauf).has(stelle)) return null;
  const zeile = el("div", "emotion-erfassung");
  zeile.dataset["stelle"] = stelle;
  zeile.dataset["art"] = art;
  zeile.append(el("p", "emotion-frage", "Wie wirkt dieser Moment? (Durchlauf aktiv)"));
  const gruppe = el("div", "emotionen");
  for (const emotion of EMOTIONEN) {
    const beschriftung = el("label");
    const eingabe = document.createElement("input");
    eingabe.type = "radio";
    eingabe.name = `emo-${stelle}`;
    eingabe.value = emotion;
    beschriftung.append(eingabe, EMOTION_BESCHRIFTUNG[emotion]);
    gruppe.append(beschriftung);
  }
  zeile.append(gruppe);
  const notiz = document.createElement("input");
  notiz.type = "text";
  notiz.className = "notiz";
  notiz.placeholder = "Notiz (optional, z. B. unklare Stelle)";
  zeile.append(notiz);
  return zeile;
}

/** Liest eine Emotions-Zeile aus und erfasst sie; false, wenn nichts gewaehlt. */
function erfasseZeile(zeile: HTMLElement): boolean {
  if (aktiverLauf === null) return true;
  const gewaehlt = zeile.querySelector<HTMLInputElement>("input[type=radio]:checked");
  if (!gewaehlt) return false;
  const notiz = zeile.querySelector<HTMLInputElement>("input.notiz")?.value.trim() ?? "";
  erfasseStation(
    aktiverLauf,
    zeile.dataset["art"]!,
    zeile.dataset["stelle"]!,
    gewaehlt.value,
    notiz,
  );
  speichereLauf();
  return true;
}

function alleEmotionsZeilen(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(".emotion-erfassung")];
}

/** Erfasst alle Zeilen; false und Meldung, wenn eine Wahl fehlt (Pflicht). */
function erfasseAlleZeilen(): boolean {
  if (aktiverLauf === null) return true;
  const zeilen = alleEmotionsZeilen();
  if (zeilen.some((z) => !z.querySelector("input[type=radio]:checked"))) {
    meldeFehler("Bitte zu jeder Karte eine Emotion wählen — ein interner Durchlauf ist aktiv.");
    return false;
  }
  for (const zeile of zeilen) erfasseZeile(zeile);
  return true;
}

/** Erfasst nur Zeilen, in denen bereits eine Emotion gewaehlt wurde. */
function erfasseGewaehlteZeilen(): void {
  if (aktiverLauf === null) return;
  for (const zeile of alleEmotionsZeilen()) {
    if (zeile.querySelector("input[type=radio]:checked")) erfasseZeile(zeile);
  }
}

function meldeFehler(text: string): void {
  const feld = document.getElementById("fehler");
  if (feld) feld.textContent = text;
}

/* ---------- Laufbar (sichtbar in allen Ansichten, solange ein Lauf laeuft) ---------- */

function laufbar(aktuelleStelle: string): HTMLElement | null {
  if (aktiverLauf === null) return null;
  const lauf = aktiverLauf;
  const leiste = el("div", "laufbar");
  leiste.append(
    el(
      "span",
      undefined,
      `Interner Durchlauf ${lauf.laufId} aktiv · ${lauf.eintraege.length} Stationen erfasst` +
        (istVollstaendigeJourney(lauf) ? " · Journey vollständig" : ""),
    ),
  );
  leiste.append(
    knopf("Durchlauf abschliessen", "sekundaer klein", () => {
      erfasseGewaehlteZeilen();
      schliesseAb(sammlung, lauf);
      aktiverLauf = null;
      speichereLauf();
      zeigeWerkbank();
    }),
    knopf("Durchlauf hier abbrechen", "sekundaer klein", () => {
      erfasseGewaehlteZeilen();
      bricheAb(sammlung, lauf, aktuelleStelle);
      aktiverLauf = null;
      speichereLauf();
      zeigeLeser();
    }),
  );
  return leiste;
}

/* ---------- Leser-Modus (Standard beim Oeffnen, F1 §1) ---------- */

function meinFallKarte(fall: MeinFall): HTMLElement {
  const artikel = el("article", "karte mein-fall");
  artikel.append(el("span", "badge badge-privat", PRIVAT_BADGE));
  artikel.append(el("h2", undefined, "Mein Fall"));
  artikel.append(
    el("p", "etappe-info", `Aus dem Fragebaum vom ${fall.erstelltAm} (simulierte Zeit).`),
  );
  for (const zeile of fallStatusZeilen(fall)) {
    artikel.append(el("p", undefined, zeile));
  }
  artikel.append(el("p", "grau-hinweis", PHASE_S_HINWEIS));
  const zeile = emotionsZeile("mein-fall", "mein_fall");
  if (zeile) artikel.append(zeile);
  artikel.append(
    knopf("Fall entfernen", "sekundaer", () => {
      meinFall = null;
      speichereFall();
      zeigeLeser();
    }),
  );
  return artikel;
}

function journeyKarteAnsicht(karte: JourneyKarte): HTMLElement {
  const artikel = el("article", "karte");
  artikel.append(el("span", "badge", karte.badge));
  if (karte.updateHinweis) {
    artikel.append(el("p", "update-hinweis", UPDATE_HINWEIS));
  }
  artikel.append(el("h2", undefined, karte.storyTitel));
  artikel.append(
    el(
      "p",
      "etappe-info",
      `Etappe ${karte.etappeNr} von ${karte.etappenTotal} · ${karte.etappeTitel} · Missions-Status: ${karte.missionsStatus}`,
    ),
  );
  for (const absatz of karte.text.split(/\n\s*\n/)) {
    if (absatz.trim() !== "") artikel.append(el("p", undefined, absatz.trim()));
  }
  const chips = el("div", "chips");
  for (const prinzip of karte.prinzipien) chips.append(el("span", "chip", prinzip));
  artikel.append(chips);

  const zeile = emotionsZeile(karte.id, "karte");
  if (zeile) artikel.append(zeile);

  const aktionen = el("div", "karten-aktionen");
  const gefolgt = leseZustand.gefolgt.includes(karte.storyId);
  aktionen.append(
    knopf(gefolgt ? "★ Serie gefolgt" : "☆ Serie folgen", "sekundaer klein", () => {
      erfasseGewaehlteZeilen();
      leseZustand = folgeUmschalten(leseZustand, karte.storyId);
      speichereLeser();
      zeigeLeser();
    }),
  );
  if (karte.betrifftMich) {
    aktionen.append(
      knopf("Betrifft mich das?", "klein", () => {
        starteUebergang(`betrifft_mich:${karte.id}`);
      }),
    );
  }
  artikel.append(aktionen);
  return artikel;
}

function zeigeLeser(): void {
  aktuelleAusgabe = journeyAusgabe(geladen.akzeptiert, simDatum, leseZustand);
  const ausgabe = aktuelleAusgabe;
  const haupt = el("main");
  haupt.append(bannerKompakt());

  const kopf = el("header", "leser-kopf");
  kopf.append(el("h1", undefined, "Morgenausgabe"));
  kopf.append(el("p", "untertitel", `Ausgabe vom ${ausgabe.datum} (simulierte Zeit) · ${ausgabe.karten.length} Karten`));

  const steuerung = el("div", "steuerung");
  steuerung.append(
    knopf("Nächster Morgen", "primaer", () => {
      if (!erfasseAlleZeilen()) return;
      leseZustand = merkeGesehen(leseZustand, ausgabe);
      speichereLeser();
      simDatum = naechsterMorgen(simDatum);
      zeigeLeser();
    }),
  );
  const datumFeld = document.createElement("input");
  datumFeld.type = "date";
  datumFeld.value = simDatum;
  steuerung.append(datumFeld);
  steuerung.append(
    knopf("Zu diesem Datum", "sekundaer", () => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(datumFeld.value)) return;
      if (!erfasseAlleZeilen()) return;
      leseZustand = merkeGesehen(leseZustand, ausgabe);
      speichereLeser();
      simDatum = datumFeld.value;
      zeigeLeser();
    }),
  );
  kopf.append(steuerung);

  const einstieg = el("div", "einstieg");
  einstieg.append(
    knopf("Ich habe Post bekommen", "sekundaer", () => {
      starteUebergang("post_bekommen");
    }),
  );
  const werkbankLink = el("a", "werkbank-link", "Werkbank");
  werkbankLink.href = "#werkbank";
  werkbankLink.addEventListener("click", (ereignis) => {
    ereignis.preventDefault();
    erfasseGewaehlteZeilen();
    zeigeWerkbank();
  });
  einstieg.append(werkbankLink);
  kopf.append(einstieg);
  haupt.append(kopf);

  if (meinFall !== null) {
    haupt.append(meinFallKarte(meinFall));
  }
  if (ausgabe.wenigerAlsDrei) {
    haupt.append(
      el(
        "p",
        "hinweis-wenig",
        `Heute weniger als ${MIN_KARTEN} Karten verfügbar — es werden keine Inhalte erfunden, um aufzufüllen.`,
      ),
    );
  }
  for (const karte of ausgabe.karten) haupt.append(journeyKarteAnsicht(karte));

  const abschluss = el("article", "karte abschluss");
  abschluss.append(el("strong", undefined, ausgabe.abschluss));
  abschluss.append(
    el(
      "p",
      undefined,
      "Diese Ausgabe ist abgeschlossen. Es wird nichts nachgeladen und nichts automatisch fortgesetzt.",
    ),
  );
  haupt.append(abschluss);
  haupt.append(el("p", "fehler", ""));
  haupt.lastElementChild!.id = "fehler";

  const leiste = laufbar(`ausgabe:${simDatum}`);
  if (leiste) haupt.append(leiste);
  wurzel.replaceChildren(haupt);
}

/* ---------- Uebergangsmoment "Es betrifft mich" (F1 §2) ---------- */

function starteUebergang(stelle: string): void {
  erfasseGewaehlteZeilen();
  const voll = `uebergang:${stelle}`;
  if (aktiverLauf !== null && !erfassteStellen(aktiverLauf).has(voll)) {
    zeigeUebergang(voll, () => starteWerkzeug());
  } else {
    starteWerkzeug();
  }
}

function zeigeUebergang(stelle: string, weiter: () => void): void {
  const haupt = el("main");
  haupt.append(bannerKompakt());
  const karte = el("section", "karte");
  karte.append(el("h2", undefined, "Übergangsmoment"));
  karte.append(
    el(
      "p",
      "hilfe",
      "Kurz festhalten, wie sich dieser Moment im Durchlauf anfühlt — dann geht es weiter.",
    ),
  );
  const zeile = emotionsZeile(stelle, "uebergang");
  if (zeile) karte.append(zeile);
  karte.append(el("p", "fehler", ""));
  karte.lastElementChild!.id = "fehler";
  karte.append(
    knopf("Weiter", "primaer", () => {
      const offen = alleEmotionsZeilen();
      if (offen.length > 0 && !offen.every((z) => erfasseZeile(z))) {
        meldeFehler("Bitte eine Emotion wählen.");
        return;
      }
      weiter();
    }),
  );
  haupt.append(karte);
  const leiste = laufbar(stelle);
  if (leiste) haupt.append(leiste);
  wurzel.replaceChildren(haupt);
}

/* ---------- Werkzeug: eingebetteter S2-Fragebaum (F1 §2) ---------- */

function starteWerkzeug(): void {
  antworten = {};
  schrittIndex = 0;
  wzEinschaetzung = null;
  zeigeFrage();
}

function zurueckZurAusgabe(): void {
  // Rueckweg ohne Datenverlust der Ausgabe-Ansicht: simuliertes Datum und
  // Lesestand bleiben unveraendert; die Ausgabe wird deterministisch neu
  // aufgebaut (gleiches Datum + gleicher Zustand => gleiche Karten).
  if (aktiverLauf !== null && !erfassteStellen(aktiverLauf).has("uebergang:zurueck_zur_ausgabe")) {
    zeigeUebergang("uebergang:zurueck_zur_ausgabe", () => zeigeLeser());
  } else {
    zeigeLeser();
  }
}

function werkzeugKopf(): HTMLElement {
  const kopf = el("header");
  kopf.append(bannerKompakt());
  kopf.append(el("h1", undefined, "Kündigung prüfen (Kanton Luzern)"));
  kopf.append(
    el(
      "p",
      "hilfe",
      "Der bestehende geführte S2-Fragebaum; alle Angaben bleiben in Ihrem Browser. Bewertet wird ausschliesslich im deterministischen Kern.",
    ),
  );
  return kopf;
}

function eingabeFuer(frage: Frage): HTMLElement {
  const wert = antworten[frage.id] ?? frage.vorauswahl ?? "";
  if (frage.typ === "janein" || frage.typ === "auswahl") {
    if ((frage.optionen ?? []).length <= 4) {
      const gruppe = el("div", "optionen");
      gruppe.setAttribute("role", "radiogroup");
      for (const option of frage.optionen ?? []) {
        const beschriftung = el("label", "option");
        const eingabe = document.createElement("input");
        eingabe.type = "radio";
        eingabe.name = frage.id;
        eingabe.value = option.wert;
        if (wert === option.wert) eingabe.checked = true;
        beschriftung.append(eingabe, option.label);
        gruppe.append(beschriftung);
      }
      return gruppe;
    }
    const auswahl = document.createElement("select");
    auswahl.id = "eingabe";
    for (const option of frage.optionen ?? []) {
      const o = document.createElement("option");
      o.value = option.wert;
      o.textContent = option.label;
      if (wert === option.wert) o.selected = true;
      auswahl.append(o);
    }
    const huelle = el("div");
    huelle.append(auswahl);
    return huelle;
  }
  if (frage.typ === "datum") {
    const eingabe = document.createElement("input");
    eingabe.type = "date";
    eingabe.id = "eingabe";
    eingabe.value = wert;
    const huelle = el("div");
    huelle.append(eingabe);
    return huelle;
  }
  const eingabe = document.createElement("textarea");
  eingabe.id = "eingabe";
  eingabe.rows = 3;
  eingabe.maxLength = frage.maxLaenge ?? 500;
  eingabe.value = wert;
  const huelle = el("div");
  huelle.append(eingabe);
  return huelle;
}

function gelesenerWert(frage: Frage): string {
  if (frage.typ === "janein" || (frage.typ === "auswahl" && (frage.optionen ?? []).length <= 4)) {
    const gewaehlt = document.querySelector<HTMLInputElement>(`input[name="${frage.id}"]:checked`);
    return gewaehlt?.value ?? "";
  }
  const feld = document.getElementById("eingabe") as
    | HTMLInputElement
    | HTMLSelectElement
    | HTMLTextAreaElement
    | null;
  return feld?.value?.trim() ?? "";
}

function zeigeFrage(): void {
  const fragen = sichtbareFragen(antworten);
  if (schrittIndex >= fragen.length) {
    schliesseErfassungAb();
    return;
  }
  const frage = fragen[schrittIndex] as Frage;
  const haupt = el("main");
  haupt.append(werkzeugKopf());

  const karte = el("section", "karte");
  karte.append(el("p", "fortschritt", `Frage ${schrittIndex + 1} von ${fragen.length}`));
  karte.append(el("h2", undefined, frage.titel));
  karte.append(el("p", "hilfe", frage.hilfe));
  karte.append(eingabeFuer(frage));

  if (aktiverLauf !== null) {
    const beispiel = el("div", "beispieldaten");
    beispiel.append(
      knopf("Beispieldaten einsetzen (FX-001)", "sekundaer klein", () => {
        antworten = { ...FX001_ANTWORTEN };
        zeigeFrage();
      }),
    );
    beispiel.append(
      el(
        "p",
        "grau-hinweis",
        "Synthetische Fixture-Werte (FX-001, meta.fixture=true) — nur für schnelle interne Durchläufe; kein realer Fall. FX-001 rechnet mit Zustellung am 2026-09-02: Liegt das simulierte Datum davor, meldet der Kern korrekt eine Lücke (Widerspruch).",
      ),
    );
    karte.append(beispiel);
  }

  const zeile = emotionsZeile(frage.id, "fragebaum_schritt");
  if (zeile) karte.append(zeile);
  karte.append(el("p", "fehler", ""));
  karte.lastElementChild!.id = "fehler";

  const navigation = el("div", "navigation");
  if (schrittIndex > 0) {
    navigation.append(
      knopf("Zurück", "sekundaer", () => {
        schrittIndex -= 1;
        zeigeFrage();
      }),
    );
  }
  navigation.append(
    knopf(schrittIndex + 1 >= fragen.length ? "Einschätzung anzeigen" : "Weiter", "primaer", () => {
      const wert = gelesenerWert(frage);
      if (frage.pflicht && wert === "") {
        meldeFehler("Bitte beantworten Sie diese Frage, bevor es weitergeht.");
        return;
      }
      if (!erfasseAlleZeilen()) return;
      if (wert === "") {
        delete antworten[frage.id];
      } else {
        antworten[frage.id] = wert;
      }
      // Antworten auf inzwischen unsichtbare Fragen verwerfen (Fragebaum).
      const sichtbar = new Set(sichtbareFragen(antworten).map((f) => f.id));
      for (const id of Object.keys(antworten)) {
        if (!sichtbar.has(id)) delete antworten[id];
      }
      schrittIndex += 1;
      zeigeFrage();
    }),
  );
  navigation.append(knopf("Zurück zur Ausgabe", "sekundaer", zurueckZurAusgabe));
  karte.append(navigation);
  haupt.append(karte);

  const leiste = laufbar(`frage:${frage.id}`);
  if (leiste) haupt.append(leiste);
  wurzel.replaceChildren(haupt);
}

/* ---------- Ergebnis + private Fallkarte (F1 §3) ---------- */

const AMPEL_TEXT: Record<string, { label: string; klasse: string }> = {
  GRUEN: { label: "Grün — die Angaben deuten auf einen Mangel der Kündigung hin", klasse: "ampel-gruen" },
  GELB: { label: "Gelb — kein besonderer Hinweis, Anfechtung kann möglich sein", klasse: "ampel-gelb" },
  ROT: { label: "Rot — die berechnete Frist ist abgelaufen", klasse: "ampel-rot" },
};

function schliesseErfassungAb(): void {
  // Simulierte Zeit wird als "heute" in den Kern injiziert (F1: die
  // Journey lebt in der simulierten Zeit; die Fachlogik liest keine Uhr).
  const fallobjekt = baueFallobjekt(antworten, `${simDatum}T08:00:00.000Z`);
  const ergebnis = bewerteFall(fallobjekt, simDatum);
  wzEinschaetzung = erstelleEinschaetzung(ergebnis);
  meinFall = fallStatusAus(wzEinschaetzung, simDatum);
  speichereFall();
  zeigeErgebnis();
}

function zeigeErgebnis(): void {
  const einschaetzung = wzEinschaetzung;
  if (!einschaetzung) {
    zeigeLeser();
    return;
  }
  const haupt = el("main");
  haupt.append(werkzeugKopf());
  const karte = el("section", "karte");

  if (einschaetzung.status === "LUECKE") {
    karte.append(el("h2", undefined, "Keine Einschätzung möglich"));
    karte.append(el("p", undefined, einschaetzung.textbaustein));
    karte.append(el("h3", undefined, "Diese Punkte fehlen oder sind widersprüchlich:"));
    const liste = el("ul");
    for (const punkt of einschaetzung.fehlende_punkte) liste.append(el("li", undefined, punkt));
    karte.append(liste);
  } else {
    const ampel = AMPEL_TEXT[einschaetzung.ampel] ?? { label: einschaetzung.ampel, klasse: "" };
    karte.append(el("h2", undefined, "Ihre unverbindliche Ersteinschätzung"));
    karte.append(el("p", `ampel ${ampel.klasse}`, ampel.label));
    karte.append(el("p", undefined, einschaetzung.textbaustein));
    if (einschaetzung.frist_datum && !einschaetzung.frist_abgelaufen) {
      karte.append(
        el(
          "p",
          "fristwarnung",
          `Wichtige Frist: Anfechtung bis ${einschaetzung.frist_datum} (berechnet, Prüfstand: fachlich zu verifizieren).`,
        ),
      );
    }
    for (const hinweis of einschaetzung.zusatzhinweise) karte.append(el("p", "hilfe", hinweis));
    if (einschaetzung.begruendungen.length > 0) {
      karte.append(el("h3", undefined, "Begründung"));
      const liste = el("ul");
      for (const begruendung of einschaetzung.begruendungen) {
        liste.append(el("li", undefined, begruendung.text));
      }
      karte.append(liste);
    }
    karte.append(el("h3", undefined, "Ihre nächsten Schritte"));
    const optionen = el("ul");
    for (const option of einschaetzung.optionen) optionen.append(el("li", undefined, option.text));
    karte.append(optionen);
    karte.append(el("h3", undefined, "Herangezogene Quellen"));
    const quellen = el("ul", "quellenliste");
    for (const quelle of einschaetzung.artikel) {
      quellen.append(
        el(
          "li",
          undefined,
          `${quelle.artikel} — ${quelle.fundstelle} (Zeitstand ${quelle.zeitstand}, Prüfstand: ${quelle.pruefstand.replace(/_/g, " ")})`,
        ),
      );
    }
    karte.append(quellen);
    karte.append(
      el(
        "p",
        "hilfe",
        "Brief-Vorlagen und Fallchronologie stehen im S2-Webflow bereit; diese Journey merkt sich den Status als private Fallkarte in Ihrer nächsten Ausgabe.",
      ),
    );
  }

  const zeile = emotionsZeile("ergebnis", "ergebnis");
  if (zeile) karte.append(zeile);
  karte.append(el("p", "fehler", ""));
  karte.lastElementChild!.id = "fehler";
  const navigation = el("div", "navigation");
  navigation.append(
    knopf("Zurück zur Ausgabe", "primaer", () => {
      if (!erfasseAlleZeilen()) return;
      zurueckZurAusgabe();
    }),
  );
  karte.append(navigation);
  haupt.append(karte);
  haupt.append(
    el(
      "p",
      "fusszeile",
      `Unverbindliche Einschätzung, kein verbindlicher Entscheid und keine Rechtsberatung. Regelversion ${REGELVERSION} · Quellenstand ${QUELLENSTAND} · Prüfstand: fachlich zu verifizieren.`,
    ),
  );

  const leiste = laufbar("ergebnis");
  if (leiste) haupt.append(leiste);
  wurzel.replaceChildren(haupt);
}

/* ---------- Werkbank (F0 vollstaendig erhalten, hinter dezentem Link) ---------- */

function zeigeWerkbank(): void {
  const haupt = el("main");
  haupt.append(bannerVoll());
  haupt.append(el("h1", undefined, "Werkbank"));
  haupt.append(
    el("p", "untertitel", "Interne synthetische Durchläufe (Zweckbindung F1) · Verweigerte Geschichten · Export."),
  );

  const laufBereich = el("section", "lauf");
  laufBereich.append(el("h2", undefined, "Journey-Durchläufe"));
  laufBereich.append(
    el(
      "p",
      "zaehler",
      `Vollständige Journey-Durchläufe: ${sammlung.journeysGesamt} · Ziel vor Launch-Gate: 100 (Plan §4) · ` +
        `abgeschlossene Durchläufe gesamt: ${sammlung.durchlaeufeGesamt} · aufgezeichnet werden nur Station, Emotion, Notiz und Abbruchstelle — keine Zeiten, keine Klickraten.`,
    ),
  );
  laufBereich.append(
    el("p", "zaehler", `Soll-Emotionskurve für den Ernstfall-Abschnitt: ${SOLL_ERNSTFALL}`),
  );

  const startKnopf = knopf("Journey-Durchlauf starten", "primaer", () => {
    aktiverLauf = starteLauf(sammlung, simDatum);
    speichereLauf();
    zeigeLeser();
  });
  startKnopf.disabled = aktiverLauf !== null;
  const exportKnopf = knopf("Läufe als JSON exportieren", "sekundaer", () => {
    const blob = new Blob([exportiere(sammlung)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "laeufe-export.json";
    a.click();
    URL.revokeObjectURL(url);
  });
  const knoepfe = el("div", "chips");
  knoepfe.append(startKnopf, exportKnopf);
  laufBereich.append(knoepfe);
  if (aktiverLauf !== null) {
    laufBereich.append(
      el("p", "hilfe", "Ein Durchlauf ist aktiv — zurück zur Ausgabe, um Stationen zu erfassen."),
    );
  }
  haupt.append(laufBereich);

  const verweigert = el("section", "verweigert");
  verweigert.append(el("h2", undefined, `Verweigerte Geschichten (${geladen.verweigert.length})`));
  if (geladen.verweigert.length === 0) {
    verweigert.append(el("p", undefined, "Keine."));
  } else {
    const liste = el("ul");
    for (const verweigerung of geladen.verweigert) {
      liste.append(el("li", undefined, `${verweigerung.quelle}: ${verweigerung.gruende.join(" · ")}`));
    }
    verweigert.append(liste);
  }
  haupt.append(verweigert);

  const navigation = el("div", "navigation");
  navigation.append(knopf("Zurück zur Ausgabe", "sekundaer", () => zeigeLeser()));
  haupt.append(navigation);

  const leiste = laufbar("werkbank");
  if (leiste) haupt.append(leiste);
  wurzel.replaceChildren(haupt);
}

/* ---------- Start: Leser-Modus ist der Standard (F1 §1) ---------- */

zeigeLeser();

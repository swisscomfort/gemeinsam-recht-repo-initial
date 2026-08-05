// main.ts — Oberflaeche des privaten Feed-Prototyps (AUFTRAG-F0, Teil C/D).
//
// Kein Server, keine Uebertragung, kein Tracking, keine externen Ressourcen.
// Das Ausgabedatum wird injiziert (URL-Parameter ?datum= oder Eingabefeld);
// die Fachlogik liest nie die Systemzeit.

import "./stil.css";
import { ladeAlle } from "./quelle";
import { morgenausgabe, MIN_KARTEN, type Karte, type Morgenausgabe } from "./ausgabe";
import {
  EMOTIONEN,
  bricheAb,
  erfasseKarte,
  exportiere,
  ladeSammlung,
  schliesseAb,
  starteLauf,
  type Lauf,
  type LaufSammlung,
} from "./lauf";

const SPEICHER_SCHLUESSEL = "gemeinsam-recht-feed-laeufe-v1";

const EMOTION_BESCHRIFTUNG: Record<(typeof EMOTIONEN)[number], string> = {
  verstanden: "Verstanden",
  neugierig: "Neugierig",
  aha_moment: "Aha-Moment",
  ueberfordert: "Überfordert",
  beunruhigt: "Beunruhigt",
};

const geladen = ladeAlle();
let sammlung: LaufSammlung = ladeSammlung(localStorage.getItem(SPEICHER_SCHLUESSEL));
let aktuelleAusgabe: Morgenausgabe | null = null;

function speichere(): void {
  localStorage.setItem(SPEICHER_SCHLUESSEL, exportiere(sammlung));
}

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

function karteAnsicht(karte: Karte): HTMLElement {
  const artikel = el("article", "karte");
  artikel.append(el("span", "badge", karte.badge));
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
  return artikel;
}

function abschlussAnsicht(ausgabe: Morgenausgabe): HTMLElement {
  const artikel = el("article", "karte abschluss");
  const stark = el("strong", undefined, ausgabe.abschluss);
  artikel.append(stark);
  artikel.append(
    el(
      "p",
      undefined,
      "Diese Ausgabe ist abgeschlossen. Es wird nichts nachgeladen und nichts automatisch fortgesetzt.",
    ),
  );
  return artikel;
}

function zeigeAusgabe(datum: string): void {
  const bereich = document.getElementById("ausgabe")!;
  bereich.replaceChildren();
  aktuelleAusgabe = morgenausgabe(geladen.akzeptiert, datum);

  bereich.append(el("p", "untertitel", `Ausgabe vom ${datum} · ${aktuelleAusgabe.karten.length} Karten`));
  if (aktuelleAusgabe.wenigerAlsDrei) {
    bereich.append(
      el(
        "p",
        "hinweis-wenig",
        `Heute weniger als ${MIN_KARTEN} Karten verfügbar — es werden keine Inhalte erfunden, um aufzufüllen.`,
      ),
    );
  }
  for (const karte of aktuelleAusgabe.karten) bereich.append(karteAnsicht(karte));
  bereich.append(abschlussAnsicht(aktuelleAusgabe));
  zeigeLaufBereich();
}

function zeigeLaufBereich(): void {
  const bereich = document.getElementById("lauf")!;
  bereich.replaceChildren();
  bereich.append(el("h2", undefined, "Interne synthetische Durchläufe (Zweckbindung F1)"));
  bereich.append(
    el(
      "p",
      "zaehler",
      `Abgeschlossene Durchläufe: ${sammlung.durchlaeufeGesamt} · Ziel vor Launch-Gate: 100 (Plan §4) · aufgezeichnet werden nur Karte, Emotion, Notiz und Abbruchstelle — keine Zeiten, keine Klickraten.`,
    ),
  );

  const startKnopf = el("button", undefined, "Internen Durchlauf starten");
  startKnopf.disabled = aktuelleAusgabe === null || aktuelleAusgabe.karten.length === 0;
  startKnopf.addEventListener("click", () => {
    if (aktuelleAusgabe === null) return;
    const lauf = starteLauf(sammlung, aktuelleAusgabe.datum);
    speichere();
    zeigeLaufKarte(lauf, 0);
  });

  const exportKnopf = el("button", "sekundaer", "Läufe als JSON exportieren");
  exportKnopf.addEventListener("click", () => {
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
  bereich.append(knoepfe);
}

function zeigeLaufKarte(lauf: Lauf, index: number): void {
  const bereich = document.getElementById("lauf")!;
  const ausgabe = aktuelleAusgabe!;
  bereich.replaceChildren();

  if (index >= ausgabe.karten.length) {
    schliesseAb(sammlung, lauf);
    speichere();
    bereich.append(el("h2", undefined, ausgabe.abschluss));
    bereich.append(
      el("p", undefined, `Durchlauf ${lauf.laufId} abgeschlossen und lokal gespeichert.`),
    );
    const weiter = el("button", "sekundaer", "Zurück zur Übersicht");
    weiter.addEventListener("click", zeigeLaufBereich);
    bereich.append(weiter);
    return;
  }

  const karte = ausgabe.karten[index]!;
  bereich.append(el("h2", undefined, `Durchlauf ${lauf.laufId} · Karte ${index + 1} von ${ausgabe.karten.length}`));
  bereich.append(karteAnsicht(karte));
  bereich.append(el("p", undefined, "Wie wirkt diese Karte? (Pflichtwahl, feste Liste — F1)"));

  const emotionen = el("div", "emotionen");
  for (const emotion of EMOTIONEN) {
    const beschriftung = el("label");
    const eingabe = document.createElement("input");
    eingabe.type = "radio";
    eingabe.name = "emotion";
    eingabe.value = emotion;
    beschriftung.append(eingabe, EMOTION_BESCHRIFTUNG[emotion]);
    emotionen.append(beschriftung);
  }
  bereich.append(emotionen);

  const notiz = document.createElement("textarea");
  notiz.rows = 2;
  notiz.placeholder = "Notiz (optional, z. B. unklare Stelle)";
  notiz.style.width = "100%";
  bereich.append(notiz);

  const weiter = el("button", undefined, "Weiter");
  weiter.addEventListener("click", () => {
    const gewaehlt = bereich.querySelector<HTMLInputElement>('input[name="emotion"]:checked');
    if (!gewaehlt) return;
    erfasseKarte(lauf, karte.id, gewaehlt.value, notiz.value.trim());
    speichere();
    zeigeLaufKarte(lauf, index + 1);
  });

  const abbrechen = el("button", "sekundaer", "Durchlauf hier abbrechen");
  abbrechen.addEventListener("click", () => {
    bricheAb(sammlung, lauf, karte.id);
    speichere();
    zeigeLaufBereich();
  });

  const knoepfe = el("div", "chips");
  knoepfe.append(weiter, abbrechen);
  bereich.append(knoepfe);
}

function zeigeVerweigerte(): void {
  const bereich = document.getElementById("verweigert")!;
  bereich.replaceChildren();
  bereich.append(el("h2", undefined, `Verweigerte Geschichten (${geladen.verweigert.length})`));
  if (geladen.verweigert.length === 0) {
    bereich.append(el("p", undefined, "Keine."));
    return;
  }
  const liste = el("ul");
  for (const verweigerung of geladen.verweigert) {
    const eintrag = el("li", undefined, `${verweigerung.quelle}: ${verweigerung.gruende.join(" · ")}`);
    liste.append(eintrag);
  }
  bereich.append(liste);
}

function start(): void {
  const wurzel = document.getElementById("app")!;
  const haupt = el("main");

  haupt.append(
    el(
      "p",
      "kopfhinweis",
      "Privater Prototyp (Plan v1.1 §4, CR-001) · alle Geschichten sind synthetisch und als FIKTIV gekennzeichnet · nichts hiervon ist öffentlich · alle Daten bleiben in diesem Browser.",
    ),
  );
  haupt.append(el("h1", undefined, "Morgenausgabe"));
  haupt.append(el("p", "untertitel", "Recht des Tages — Prototyp mit 3–5 Karten und festem Ende."));

  const formular = el("form", "datumwahl");
  const datumFeld = document.createElement("input");
  datumFeld.type = "date";
  datumFeld.required = true;
  const parameterDatum = new URLSearchParams(location.search).get("datum");
  if (parameterDatum && /^\d{4}-\d{2}-\d{2}$/.test(parameterDatum)) {
    datumFeld.value = parameterDatum;
  }
  const erzeugen = el("button", undefined, "Ausgabe erstellen");
  erzeugen.type = "submit";
  formular.append(el("label", undefined, "Ausgabedatum: "), datumFeld, erzeugen);
  formular.addEventListener("submit", (ereignis) => {
    ereignis.preventDefault();
    if (datumFeld.value) zeigeAusgabe(datumFeld.value);
  });
  haupt.append(formular);

  const ausgabe = el("section");
  ausgabe.id = "ausgabe";
  const lauf = el("section", "lauf");
  lauf.id = "lauf";
  const verweigert = el("section", "verweigert");
  verweigert.id = "verweigert";
  haupt.append(ausgabe, lauf, verweigert);
  wurzel.append(haupt);

  zeigeLaufBereich();
  zeigeVerweigerte();
  if (datumFeld.value) zeigeAusgabe(datumFeld.value);
}

start();

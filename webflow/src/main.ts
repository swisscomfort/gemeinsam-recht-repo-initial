/**
 * Gefuehrter lokaler Web-Flow (AUFTRAG-S2 §1 D).
 *
 * Alle Daten bleiben im Browser: kein Server, keine Uebertragung, kein
 * Tracking, kein Speicher ausserhalb dieser Seite. Saemtliche Fristen,
 * Flags und Texte stammen aus dem deterministischen Kern (core); diese
 * Datei rendert nur. Die aktuelle Zeit wird hier in der UI-Schicht
 * bestimmt und in den Kern injiziert (Fachlogik ohne Systemzeit).
 */
import {
  bewerteFall,
  erstelleEinschaetzung,
  erzeugeBrief,
  exportiereChronologieJson,
  exportiereChronologieMarkdown,
  hashDokument,
  mitEintrag,
  neueChronologie,
  QUELLENSTAND,
  REGELVERSION,
} from "@core/index";
import type {
  Brief,
  BriefVorlageId,
  BriefWerte,
  Chronologie,
  Einschaetzung,
  Ergebnis,
} from "@core/index";
import { baueFallobjekt, sichtbareFragen, type Antworten, type Frage } from "./fragen";
import "./stil.css";

/* ---------- Zeit (nur UI-Schicht; wird in den Kern injiziert) ---------- */

function jetztIso(): string {
  return new Date().toISOString();
}

function heuteIso(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ---------- Zustand (nur im Speicher dieser Seite) ---------- */

let antworten: Antworten = {};
let schrittIndex = 0;
let fall: unknown = null;
let ergebnis: Ergebnis | null = null;
let einschaetzung: Einschaetzung | null = null;
let chronologie: Chronologie | null = null;
let briefWerte: BriefWerte = {};

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app fehlt in index.html");

/* ---------- Hilfsfunktionen ---------- */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...kinder: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  n.append(...kinder);
  return n;
}

function ladeDatei(name: string, inhalt: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([inhalt], { type: mime }));
  const a = el("a", { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function druckeHtml(html: string): void {
  const iframe = el("iframe", { style: "display:none" });
  document.body.append(iframe);
  iframe.srcdoc = html;
  iframe.addEventListener("load", () => {
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 2000);
  });
}

function chronikEintrag(typ: "brief_erstellt" | "dokument_hinzugefuegt" | "export", beschreibung: string, dokumentHash?: string): void {
  if (!chronologie) return;
  chronologie = mitEintrag(chronologie, {
    zeitpunkt: jetztIso(),
    typ,
    beschreibung,
    ...(dokumentHash ? { dokument_hash: dokumentHash } : {}),
  });
  zeigeChronologie();
}

/* ---------- Fragebaum ---------- */

function zeigeFrage(): void {
  const fragen = sichtbareFragen(antworten);
  if (schrittIndex >= fragen.length) {
    schliesseErfassungAb();
    return;
  }
  const frage = fragen[schrittIndex] as Frage;
  app!.replaceChildren(
    kopfzeile(),
    el(
      "section",
      { class: "karte" },
      el("p", { class: "fortschritt" }, `Frage ${schrittIndex + 1} von ${fragen.length}`),
      el("h2", {}, frage.titel),
      el("p", { class: "hilfe" }, frage.hilfe),
      eingabeFuer(frage),
      navigation(fragen.length),
      el("p", { class: "fehler", id: "fehler", role: "alert" }),
    ),
    fusszeile(),
  );
  document.getElementById("eingabe")?.focus();
}

function eingabeFuer(frage: Frage): HTMLElement {
  const wert = antworten[frage.id] ?? frage.vorauswahl ?? "";
  if (frage.typ === "janein" || frage.typ === "auswahl") {
    if ((frage.optionen ?? []).length <= 4) {
      const gruppe = el("div", { class: "optionen", role: "radiogroup", "aria-label": frage.titel });
      for (const o of frage.optionen ?? []) {
        const input = el("input", {
          type: "radio",
          name: frage.id,
          value: o.wert,
          id: `opt-${o.wert}`,
        }) as HTMLInputElement;
        if (wert === o.wert) input.checked = true;
        gruppe.append(el("label", { class: "option", for: `opt-${o.wert}` }, input, o.label));
      }
      return gruppe;
    }
    const select = el("select", { id: "eingabe" }) as HTMLSelectElement;
    for (const o of frage.optionen ?? []) {
      const opt = el("option", { value: o.wert }, o.label) as HTMLOptionElement;
      if (wert === o.wert) opt.selected = true;
      select.append(opt);
    }
    return el("div", {}, select);
  }
  if (frage.typ === "datum") {
    const input = el("input", { type: "date", id: "eingabe", value: wert }) as HTMLInputElement;
    return el("div", {}, input);
  }
  const input = el("textarea", {
    id: "eingabe",
    rows: "3",
    maxlength: String(frage.maxLaenge ?? 500),
  }) as HTMLTextAreaElement;
  input.value = wert;
  return el("div", {}, input);
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

function navigation(anzahl: number): HTMLElement {
  const weiter = el("button", { class: "primaer", type: "button" },
    schrittIndex + 1 >= anzahl ? "Einschaetzung anzeigen" : "Weiter");
  weiter.addEventListener("click", () => {
    const frage = sichtbareFragen(antworten)[schrittIndex] as Frage;
    const wert = gelesenerWert(frage);
    if (frage.pflicht && wert === "") {
      const fehler = document.getElementById("fehler");
      if (fehler) fehler.textContent = "Bitte beantworten Sie diese Frage, bevor es weitergeht.";
      return;
    }
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
  });
  const zurueck = el("button", { class: "sekundaer", type: "button" }, "Zurueck");
  zurueck.addEventListener("click", () => {
    if (schrittIndex > 0) {
      schrittIndex -= 1;
      zeigeFrage();
    }
  });
  const nav = el("div", { class: "navigation" });
  if (schrittIndex > 0) nav.append(zurueck);
  nav.append(weiter);
  return nav;
}

/* ---------- Ergebnis ---------- */

function schliesseErfassungAb(): void {
  const heute = heuteIso();
  fall = baueFallobjekt(antworten, jetztIso());
  ergebnis = bewerteFall(fall, heute);
  einschaetzung = erstelleEinschaetzung(ergebnis);

  chronologie = mitEintrag(neueChronologie(fall), {
    zeitpunkt: jetztIso(),
    typ: "erfassung",
    beschreibung: "Sachverhalt im Fragebaum erfasst",
  });
  if (ergebnis.status === "OK") {
    chronologie = mitEintrag(chronologie, {
      zeitpunkt: ergebnis.fristen.empfangsdatum_effektiv,
      typ: "kuendigung_erhalten",
      beschreibung: "Kuendigung erhalten (effektives Empfangsdatum gemaess deterministischer Berechnung)",
    });
    briefWerte = {
      kuendigung_datum: ergebnis.fristen.empfangsdatum_effektiv,
      ...(einschaetzung.status === "OK" && einschaetzung.frist_datum
        ? { frist_datum: einschaetzung.frist_datum }
        : {}),
      ort: antworten["vertrag.orts_gemeinde"] ?? "",
      datum: heute,
    };
  }
  zeigeErgebnis();
}

const AMPEL_TEXT: Record<string, { label: string; klasse: string }> = {
  GRUEN: { label: "Gruen — die Angaben deuten auf einen Mangel der Kuendigung hin", klasse: "ampel-gruen" },
  GELB: { label: "Gelb — kein besonderer Hinweis, Anfechtung kann moeglich sein", klasse: "ampel-gelb" },
  ROT: { label: "Rot — die berechnete Frist ist abgelaufen", klasse: "ampel-rot" },
};

function zeigeErgebnis(): void {
  if (!einschaetzung || !ergebnis) return;
  const teile: HTMLElement[] = [kopfzeile()];

  if (einschaetzung.status === "LUECKE") {
    teile.push(
      el(
        "section",
        { class: "karte" },
        el("h2", {}, "Keine Einschaetzung moeglich"),
        el("p", {}, einschaetzung.textbaustein),
        el("h3", {}, "Diese Punkte fehlen oder sind widerspruechlich:"),
        el("ul", {}, ...einschaetzung.fehlende_punkte.map((p) => el("li", {}, p))),
        neustartKnopf("Angaben ergaenzen"),
      ),
    );
  } else {
    const ampel = AMPEL_TEXT[einschaetzung.ampel] ?? { label: einschaetzung.ampel, klasse: "" };
    const abschnitt = el(
      "section",
      { class: "karte" },
      el("h2", {}, "Ihre unverbindliche Ersteinschaetzung"),
      el("p", { class: `ampel ${ampel.klasse}` }, ampel.label),
      el("p", {}, einschaetzung.textbaustein),
    );
    if (einschaetzung.frist_datum && !einschaetzung.frist_abgelaufen) {
      abschnitt.append(
        el(
          "p",
          { class: "fristwarnung" },
          `Wichtige Frist: Anfechtung bis ${einschaetzung.frist_datum} (berechnet, Pruefstand: fachlich zu verifizieren).`,
        ),
      );
    }
    for (const hinweis of einschaetzung.zusatzhinweise) {
      abschnitt.append(el("p", { class: "hinweis" }, hinweis));
    }
    if (einschaetzung.begruendungen.length > 0) {
      abschnitt.append(
        el("h3", {}, "Begruendung"),
        el("ul", {}, ...einschaetzung.begruendungen.map((b) => el("li", {}, b.text))),
      );
    }
    abschnitt.append(
      el("h3", {}, "Ihre naechsten Schritte"),
      el("ul", {}, ...einschaetzung.optionen.map((o) => el("li", {}, o.text))),
      el("h3", {}, "Herangezogene Quellen"),
      el(
        "ul",
        { class: "quellen" },
        ...einschaetzung.artikel.map((q) =>
          el("li", {}, `${q.artikel} — ${q.fundstelle} (Zeitstand ${q.zeitstand}, Pruefstand: ${q.pruefstand.replace(/_/g, " ")})`),
        ),
      ),
      neustartKnopf("Neu beginnen"),
    );
    teile.push(abschnitt);

    const briefe = einschaetzung.optionen
      .map((o) => o.brief)
      .filter((b): b is BriefVorlageId => b !== null);
    if (briefe.length > 0) {
      teile.push(briefBereich(briefe));
    }
    teile.push(chronologieBereich());
  }

  teile.push(fusszeile());
  app!.replaceChildren(...teile);
  zeigeBriefVorschau();
  zeigeChronologie();
}

function neustartKnopf(text: string): HTMLElement {
  const knopf = el("button", { class: "sekundaer", type: "button" }, text);
  knopf.addEventListener("click", () => {
    schrittIndex = 0;
    fall = null;
    ergebnis = null;
    einschaetzung = null;
    chronologie = null;
    zeigeFrage();
  });
  return el("div", { class: "navigation" }, knopf);
}

/* ---------- Briefe ---------- */

const PLATZHALTER_FELDER: { name: keyof BriefWerte; label: string; mehrzeilig: boolean }[] = [
  { name: "name_mieter", label: "Ihr Name", mehrzeilig: false },
  { name: "adresse_mieter", label: "Ihre Adresse", mehrzeilig: true },
  { name: "name_vermieter", label: "Name der Vermieterschaft", mehrzeilig: false },
  { name: "adresse_vermieter", label: "Adresse der Vermieterschaft", mehrzeilig: true },
  { name: "wohnungsadresse", label: "Adresse der gekuendigten Wohnung", mehrzeilig: false },
  { name: "adresse_schlichtungsbehoerde", label: "Adresse der Schlichtungsbehoerde (bitte selbst nachschlagen)", mehrzeilig: true },
  { name: "ort", label: "Ort der Unterzeichnung", mehrzeilig: false },
  { name: "datum", label: "Datum der Unterzeichnung", mehrzeilig: false },
];

let aktiveBriefe: BriefVorlageId[] = [];

function briefBereich(briefe: BriefVorlageId[]): HTMLElement {
  aktiveBriefe = briefe;
  const felder = el("div", { class: "felder" });
  for (const feld of PLATZHALTER_FELDER) {
    const eingabe = (feld.mehrzeilig
      ? el("textarea", { rows: "2", "data-platzhalter": feld.name })
      : el("input", { type: "text", "data-platzhalter": feld.name })) as
      | HTMLInputElement
      | HTMLTextAreaElement;
    eingabe.value = briefWerte[feld.name] ?? "";
    eingabe.addEventListener("input", () => {
      briefWerte[feld.name] = eingabe.value;
      zeigeBriefVorschau();
    });
    felder.append(el("label", { class: "feld" }, feld.label, eingabe));
  }
  return el(
    "section",
    { class: "karte" },
    el("h2", {}, "Ihr Brief"),
    el(
      "p",
      { class: "hilfe" },
      "Fuellen Sie die Felder aus; der Brief wird direkt hier auf Ihrem Geraet erstellt. Gelb markierte Stellen sind noch zu ergaenzen.",
    ),
    felder,
    el("div", { id: "brief-vorschau" }),
  );
}

function zeigeBriefVorschau(): void {
  const container = document.getElementById("brief-vorschau");
  if (!container || !einschaetzung || einschaetzung.status !== "OK") return;
  container.replaceChildren();
  for (const vorlage of aktiveBriefe) {
    const brief = erzeugeBrief(vorlage, briefWerte);
    container.append(briefKarte(brief));
  }
}

function briefKarte(brief: Brief): HTMLElement {
  const laden = el("button", { class: "sekundaer", type: "button" }, "Als HTML herunterladen");
  laden.addEventListener("click", () => {
    const aktuell = erzeugeBrief(brief.vorlage, briefWerte);
    ladeDatei(`brief-${aktuell.vorlage.toLowerCase()}.html`, aktuell.html, "text/html");
    chronikEintrag("brief_erstellt", `Brief ${aktuell.vorlage} als HTML heruntergeladen`);
  });
  const drucken = el("button", { class: "sekundaer", type: "button" }, "Drucken / als PDF sichern");
  drucken.addEventListener("click", () => {
    const aktuell = erzeugeBrief(brief.vorlage, briefWerte);
    druckeHtml(aktuell.html);
    chronikEintrag("brief_erstellt", `Brief ${aktuell.vorlage} gedruckt (Browser-Druck)`);
  });
  const offen =
    brief.offene_platzhalter.length > 0
      ? el(
          "p",
          { class: "hinweis" },
          `Noch zu ergaenzen: ${brief.offene_platzhalter.join(", ")}`,
        )
      : el("p", { class: "hinweis ok" }, "Alle Platzhalter sind ausgefuellt.");
  return el(
    "article",
    { class: "brief" },
    el("h3", {}, `${brief.vorlage}: ${brief.titel}`),
    el("p", { class: "hilfe" }, `Mustertext, Pruefstand: ${brief.pruefstand.replace(/_/g, " ")} — bitte vor dem Versand pruefen.`),
    offen,
    el("pre", { class: "vorschau" }, brief.markdown),
    el("div", { class: "navigation" }, laden, drucken),
  );
}

/* ---------- Chronologie ---------- */

function chronologieBereich(): HTMLElement {
  const datei = el("input", { type: "file", id: "dokument-datei" }) as HTMLInputElement;
  datei.addEventListener("change", async () => {
    const gewaehlt = datei.files?.[0];
    if (!gewaehlt) return;
    const bytes = new Uint8Array(await gewaehlt.arrayBuffer());
    chronikEintrag(
      "dokument_hinzugefuegt",
      `Dokument lokal gehasht: ${gewaehlt.name}`,
      hashDokument(bytes),
    );
    datei.value = "";
  });

  const jsonKnopf = el("button", { class: "sekundaer", type: "button" }, "Chronologie als JSON");
  jsonKnopf.addEventListener("click", () => {
    if (!chronologie) return;
    ladeDatei("fallchronologie.json", exportiereChronologieJson(chronologie, jetztIso()), "application/json");
    chronikEintrag("export", "Chronologie als JSON heruntergeladen");
  });
  const mdKnopf = el("button", { class: "sekundaer", type: "button" }, "Chronologie als Markdown");
  mdKnopf.addEventListener("click", () => {
    if (!chronologie) return;
    ladeDatei("fallchronologie.md", exportiereChronologieMarkdown(chronologie, jetztIso()), "text/markdown");
    chronikEintrag("export", "Chronologie als Markdown heruntergeladen");
  });

  return el(
    "section",
    { class: "karte" },
    el("h2", {}, "Fallchronologie"),
    el(
      "p",
      { class: "hilfe" },
      "Die Chronologie sammelt die Schritte Ihres Falls; von Dokumenten wird nur ein lokaler Pruefwert (SHA-256) gespeichert, nie der Inhalt.",
    ),
    el("div", { id: "chronologie-liste" }),
    el("label", { class: "feld" }, "Dokument lokal hinzufuegen (es verlaesst Ihr Geraet nicht)", datei),
    el("div", { class: "navigation" }, jsonKnopf, mdKnopf),
  );
}

function zeigeChronologie(): void {
  const liste = document.getElementById("chronologie-liste");
  if (!liste || !chronologie) return;
  liste.replaceChildren(
    el(
      "ul",
      {},
      ...chronologie.eintraege.map((e) =>
        el(
          "li",
          {},
          `${e.zeitpunkt} — ${e.typ}: ${e.beschreibung}` +
            (e.dokument_hash ? ` (SHA-256 ${e.dokument_hash.slice(0, 12)}…)` : ""),
        ),
      ),
    ),
  );
}

/* ---------- Rahmen ---------- */

function kopfzeile(): HTMLElement {
  return el(
    "header",
    {},
    el("h1", {}, "Gemeinsam Recht — Kuendigung pruefen (Kanton Luzern)"),
    el(
      "p",
      { class: "hilfe" },
      "Gefuehrte Ersteinschaetzung zu einer Wohnungskuendigung; alle Angaben bleiben in Ihrem Browser.",
    ),
  );
}

function fusszeile(): HTMLElement {
  return el(
    "footer",
    {},
    el(
      "p",
      {},
      "Unverbindliche Einschaetzung, kein verbindlicher Entscheid und keine Rechtsberatung. " +
        `Regelversion ${REGELVERSION} · Quellenstand ${QUELLENSTAND} · Pruefstand: fachlich zu verifizieren.`,
    ),
    el(
      "p",
      {},
      "Datenschutz: Es gibt keinen Server, keine Uebertragung und kein Tracking; beim Schliessen der Seite sind alle Angaben weg.",
    ),
  );
}

zeigeFrage();

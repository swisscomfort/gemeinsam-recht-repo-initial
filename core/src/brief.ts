/**
 * Mustertexte M1 und M2 als deterministische Templates (AUFTRAG-S2 §1 B).
 *
 *   M1 "Anfechtungsbegehren an die Schlichtungsbehoerde (Kanton LU)"
 *   M2 "Mitteilung Nichtigkeit an die Vermieterschaft"
 *
 * Pflicht-Platzhalter gemaess Auftrag; die Behoerdenadresse wird nie
 * erfunden, sondern als VOM_NUTZER_ZU_ERGAENZEN vorbelegt. Nicht gefuellte
 * Platzhalter bleiben sichtbar als {{name}} stehen und werden unter
 * `offene_platzhalter` gemeldet.
 *
 * Ausgabe: Markdown + druckfaehiges, eigenstaendiges HTML (Druck ueber den
 * Browser als PDF-Weg; dokumentierte Auslegung zu Plan-L2 "PDF").
 * Zitierte Artikel stammen ausschliesslich aus dem Quellenregister.
 * Alle Mustertexte tragen pruefstand "fachlich_zu_verifizieren".
 */
import { QUELLEN, QUELLENSTAND } from "./quellen.js";
import { REGELVERSION } from "./regeln.js";
import type { Pruefstand } from "./types.js";

export type BriefVorlageId = "M1" | "M2";

/** Pflicht-Platzhalter gemaess Auftrag §1 B. */
export const PFLICHT_PLATZHALTER = [
  "name_mieter",
  "adresse_mieter",
  "name_vermieter",
  "adresse_vermieter",
  "wohnungsadresse",
  "kuendigung_datum",
  "frist_datum",
  "adresse_schlichtungsbehoerde",
] as const;

export type PflichtPlatzhalter = (typeof PFLICHT_PLATZHALTER)[number];

/** Zusaetzliche Platzhalter fuer Ort und Datum der Unterzeichnung. */
export type PlatzhalterName = PflichtPlatzhalter | "ort" | "datum";

export type BriefWerte = Partial<Record<PlatzhalterName, string>>;

export interface Brief {
  vorlage: BriefVorlageId;
  titel: string;
  markdown: string;
  html: string;
  /** Platzhalter, die im Text noch nicht mit Nutzerangaben gefuellt sind. */
  offene_platzhalter: PlatzhalterName[];
  pruefstand: Pruefstand;
  regelversion: string;
  quellenstand: string;
}

/* ---------- Vorlagenstruktur ---------- */

type Block =
  | { art: "adressblock"; zeilen: string[] }
  | { art: "ortdatum"; text: string }
  | { art: "betreff"; text: string }
  | { art: "absatz"; text: string }
  | { art: "liste"; titel: string; punkte: string[] }
  | { art: "unterschrift"; zeilen: string[] };

interface Vorlage {
  id: BriefVorlageId;
  titel: string;
  bloecke: Block[];
}

const M1: Vorlage = {
  id: "M1",
  titel: "Anfechtungsbegehren an die Schlichtungsbehoerde (Kanton LU)",
  bloecke: [
    { art: "adressblock", zeilen: ["{{name_mieter}}", "{{adresse_mieter}}"] },
    {
      art: "adressblock",
      zeilen: [
        "Schlichtungsbehoerde Miete und Pacht",
        "{{adresse_schlichtungsbehoerde}}",
      ],
    },
    { art: "ortdatum", text: "{{ort}}, {{datum}}" },
    {
      art: "betreff",
      text: "Anfechtungsbegehren betreffend Kuendigung der Wohnung {{wohnungsadresse}}",
    },
    { art: "absatz", text: "Sehr geehrte Damen und Herren" },
    {
      art: "absatz",
      text:
        "Am {{kuendigung_datum}} wurde mir die Kuendigung des Mietverhaeltnisses fuer die Wohnung {{wohnungsadresse}} durch {{name_vermieter}}, {{adresse_vermieter}}, zugestellt.",
    },
    {
      art: "absatz",
      text:
        `Hiermit reiche ich fristwahrend ein Begehren um Anfechtung dieser Kuendigung ein (${QUELLEN.P1.artikel}). ` +
        "Nach der mir vorliegenden Berechnung laeuft die Anfechtungsfrist bis am {{frist_datum}}.",
    },
    {
      art: "absatz",
      text:
        "Ich ersuche die Schlichtungsbehoerde, die Kuendigung zu pruefen und einen Schlichtungstermin anzusetzen. Eine naehere Begruendung reiche ich auf Wunsch nach oder lege sie an der Verhandlung dar.",
    },
    {
      art: "liste",
      titel: "Beilagen:",
      punkte: [
        "Kopie der Kuendigung",
        "Kopie des Mietvertrags (soweit vorhanden)",
      ],
    },
    { art: "absatz", text: "Freundliche Gruesse" },
    { art: "unterschrift", zeilen: ["{{name_mieter}}"] },
  ],
};

const M2: Vorlage = {
  id: "M2",
  titel: "Mitteilung Nichtigkeit an die Vermieterschaft",
  bloecke: [
    { art: "adressblock", zeilen: ["{{name_mieter}}", "{{adresse_mieter}}"] },
    { art: "adressblock", zeilen: ["{{name_vermieter}}", "{{adresse_vermieter}}"] },
    { art: "ortdatum", text: "{{ort}}, {{datum}}" },
    {
      art: "betreff",
      text: "Mitteilung zur Kuendigung der Wohnung {{wohnungsadresse}}",
    },
    { art: "absatz", text: "Sehr geehrte Damen und Herren" },
    {
      art: "absatz",
      text:
        "Am {{kuendigung_datum}} habe ich Ihre Kuendigung des Mietverhaeltnisses fuer die Wohnung {{wohnungsadresse}} erhalten.",
    },
    {
      art: "absatz",
      text:
        `Nach meinen Informationen deutet die Form dieser Kuendigung darauf hin, dass sie nichtig sein kann (${QUELLEN.P5.artikel}; bei Familienwohnungen ${QUELLEN.P6.artikel}). ` +
        "Ich gehe deshalb bis zur Klaerung davon aus, dass das Mietverhaeltnis unveraendert weiterlaeuft.",
    },
    {
      art: "absatz",
      text:
        "Ich bitte Sie um eine schriftliche Stellungnahme. Unabhaengig davon behalte ich mir vor, die Kuendigung bis am {{frist_datum}} bei der zustaendigen Schlichtungsbehoerde anzufechten.",
    },
    {
      art: "liste",
      titel: "Beilagen:",
      punkte: ["Kopie der Kuendigung"],
    },
    { art: "absatz", text: "Freundliche Gruesse" },
    { art: "unterschrift", zeilen: ["{{name_mieter}}"] },
  ],
};

const VORLAGEN: Record<BriefVorlageId, Vorlage> = { M1, M2 };

/* ---------- Platzhalter-Ersetzung ---------- */

const PLATZHALTER_RE = /\{\{([a-z_]+)\}\}/g;

const ALLE_PLATZHALTER: readonly PlatzhalterName[] = [
  ...PFLICHT_PLATZHALTER,
  "ort",
  "datum",
];

function istPlatzhalterName(name: string): name is PlatzhalterName {
  return (ALLE_PLATZHALTER as readonly string[]).includes(name);
}

/**
 * Ersetzt gefuellte Platzhalter; nicht gefuellte bleiben als {{name}}
 * sichtbar und werden in `offen` gesammelt. Die Behoerdenadresse wird
 * mangels Angabe mit VOM_NUTZER_ZU_ERGAENZEN vorbelegt (nichts erfinden).
 */
function ersetze(
  text: string,
  werte: BriefWerte,
  offen: Set<PlatzhalterName>,
): string {
  return text.replace(PLATZHALTER_RE, (ganz, name: string) => {
    if (!istPlatzhalterName(name)) return ganz;
    const wert = werte[name];
    if (typeof wert === "string" && wert.trim() !== "") {
      return wert.trim();
    }
    offen.add(name);
    if (name === "adresse_schlichtungsbehoerde") {
      return "VOM_NUTZER_ZU_ERGAENZEN";
    }
    return ganz;
  });
}

/* ---------- Markdown-Ausgabe ---------- */

function blockZuMarkdown(block: Block, fuellen: (t: string) => string): string {
  switch (block.art) {
    case "adressblock":
      return block.zeilen.map((z) => fuellen(z)).join("  \n");
    case "ortdatum":
      return fuellen(block.text);
    case "betreff":
      return `**${fuellen(block.text)}**`;
    case "absatz":
      return fuellen(block.text);
    case "liste":
      return [
        fuellen(block.titel),
        ...block.punkte.map((p) => `- ${fuellen(p)}`),
      ].join("\n");
    case "unterschrift":
      return block.zeilen.map((z) => fuellen(z)).join("  \n");
  }
}

/* ---------- druckfaehiges HTML ---------- */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Hebt im HTML verbliebene {{platzhalter}} sichtbar hervor. */
function markierePlatzhalter(escaped: string): string {
  return escaped.replace(
    /\{\{([a-z_]+)\}\}|VOM_NUTZER_ZU_ERGAENZEN/g,
    (m) => `<mark>${m}</mark>`,
  );
}

function htmlText(text: string, fuellen: (t: string) => string): string {
  return markierePlatzhalter(escapeHtml(fuellen(text)));
}

function blockZuHtml(block: Block, fuellen: (t: string) => string): string {
  switch (block.art) {
    case "adressblock":
      return `<p class="adresse">${block.zeilen
        .map((z) => htmlText(z, fuellen))
        .join("<br>")}</p>`;
    case "ortdatum":
      return `<p class="ortdatum">${htmlText(block.text, fuellen)}</p>`;
    case "betreff":
      return `<p class="betreff">${htmlText(block.text, fuellen)}</p>`;
    case "absatz":
      return `<p>${htmlText(block.text, fuellen)}</p>`;
    case "liste":
      return (
        `<p class="beilagen-titel">${htmlText(block.titel, fuellen)}</p>` +
        `<ul>${block.punkte.map((p) => `<li>${htmlText(p, fuellen)}</li>`).join("")}</ul>`
      );
    case "unterschrift":
      return `<p class="unterschrift">${block.zeilen
        .map((z) => htmlText(z, fuellen))
        .join("<br>")}</p>`;
  }
}

const HTML_STIL = `
  @page { size: A4; margin: 25mm 20mm; }
  body { font-family: "Times New Roman", Georgia, serif; font-size: 12pt;
         line-height: 1.5; color: #000; max-width: 17cm; margin: 2rem auto;
         padding: 0 1rem; background: #fff; }
  p { margin: 0 0 0.9em; }
  .adresse { white-space: pre-line; }
  .ortdatum { text-align: right; margin-top: 1.5em; }
  .betreff { font-weight: bold; margin: 1.5em 0 1.2em; }
  .beilagen-titel { margin-bottom: 0.2em; }
  ul { margin: 0 0 0.9em 1.2em; padding: 0; }
  .unterschrift { margin-top: 3em; }
  mark { background: #fff3a3; padding: 0 0.15em; }
  @media print { body { margin: 0; max-width: none; } mark { background: none; } }
`;

/* ---------- oeffentliche API ---------- */

/**
 * Erzeugt einen Brief aus der Vorlage M1 oder M2. Es werden keine Werte
 * berechnet: Fristdatum usw. muessen aus dem deterministischen Kern
 * stammen und werden hier nur eingesetzt.
 */
export function erzeugeBrief(
  vorlageId: BriefVorlageId,
  werte: BriefWerte = {},
): Brief {
  const vorlage = VORLAGEN[vorlageId];
  if (!vorlage) {
    throw new Error(`Unbekannte Briefvorlage: ${String(vorlageId)}`);
  }

  const offen = new Set<PlatzhalterName>();
  const fuellen = (t: string): string => ersetze(t, werte, offen);

  const markdown =
    `# ${vorlage.titel}\n\n` +
    vorlage.bloecke.map((b) => blockZuMarkdown(b, fuellen)).join("\n\n") +
    "\n";

  const rumpf = vorlage.bloecke.map((b) => blockZuHtml(b, fuellen)).join("\n");
  const html =
    "<!doctype html>\n" +
    `<html lang="de">\n<head>\n<meta charset="utf-8">\n` +
    `<title>${escapeHtml(vorlage.titel)}</title>\n` +
    `<style>${HTML_STIL}</style>\n</head>\n<body>\n${rumpf}\n</body>\n</html>\n`;

  return {
    vorlage: vorlage.id,
    titel: vorlage.titel,
    markdown,
    html,
    offene_platzhalter: [...offen],
    pruefstand: "fachlich_zu_verifizieren",
    regelversion: REGELVERSION,
    quellenstand: QUELLENSTAND,
  };
}

/** Platzhalter, die in einer Vorlage tatsaechlich vorkommen (fuer Tests/UI). */
export function platzhalterInVorlage(
  vorlageId: BriefVorlageId,
): PlatzhalterName[] {
  const vorlage = VORLAGEN[vorlageId];
  const gefunden = new Set<PlatzhalterName>();
  const sammle = (text: string): void => {
    for (const m of text.matchAll(PLATZHALTER_RE)) {
      const name = m[1] as string;
      if (istPlatzhalterName(name)) gefunden.add(name);
    }
  };
  for (const block of vorlage.bloecke) {
    if (block.art === "adressblock" || block.art === "unterschrift") {
      block.zeilen.forEach(sammle);
    } else if (block.art === "liste") {
      sammle(block.titel);
      block.punkte.forEach(sammle);
    } else {
      sammle(block.text);
    }
  }
  return [...gefunden];
}

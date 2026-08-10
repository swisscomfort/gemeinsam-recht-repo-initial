// volltexte-holen.ts — CLI `npm run volltexte-holen`.
//
// Beschafft die Primaertexte zu einem bereits eingefrorenen Rohlauf und legt
// sie AUSSERHALB des Repositoriums ab. Im Repository landet spaeter nur der
// Provenienzanker: Bezeichner, URLs, Groessen, SHA-256. Nie ein Volltext
// (CLAUDE.md; MANIFEST v2.1 §9).
//
// Warum das Werkzeug hier liegt und nicht in messkorpus/: Netzzugriff ist
// ausschliesslich den Redaktionswerkzeugen erlaubt und nur bei der im Auftrag
// benannten Quelle (entscheidsuche.ch, gedrosselt). messkorpus/ bleibt offline.
//
// Die Auswahl kommt ausschliesslich aus dem Rohlauf: exakt seine Bezeichner,
// keine Suche, keine Filter, keine Ergaenzung. Damit ist die Volltextmenge
// dieselbe Population wie der Raw-Checkpoint — und das laesst sich am Ende
// nachrechnen statt behaupten.
//
// Fail closed an drei Stellen:
//   1. Das Zielverzeichnis MUSS ausserhalb des Repositoriums liegen.
//   2. Laesst sich zu einem Bezeichner kein Volltext bestimmen, wird keiner
//      geschrieben; der Bezeichner gilt als nicht beschafft.
//   3. Ein Manifest entsteht NUR bei vollstaendiger Deckung mit dem Rohlauf.
//      Sonst bleibt eine Fehlliste stehen und der Aufruf endet mit Fehler.
//
// Aufruf:
//   npm run volltexte-holen -- --lauf ML-003 --ziel ~/gr-volltexte/ML-003
//   npm run volltexte-holen -- --lauf ML-003 --ziel … --trocken   (ohne Netz)

import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import {
  alsDatei,
  argumentName,
  baueManifest,
  bytes,
  feldAus,
  liegtImRepo,
  sha256,
  trefferAusLauf,
  vollstaendigkeit,
  volltextAus,
  type DokumentBefund,
  type RohTreffer,
} from "./volltexte.js";

const MCP_ENDPUNKT = "https://mcp.entscheidsuche.ch/mcp";
const WERKZEUG = "fetch_document";
const PROVIDER = "entscheidsuche.ch";
const PAUSE_MS = 1000;
const PROTOKOLL_VERSION = "2025-06-18";
const USER_AGENT =
  "gemeinsam-recht-redaktion/0.1 (privates Redaktionswerkzeug, AUFTRAG-R0; Kontakt: swisscomfort@pm.me)";

function repoWurzel(): string {
  // dist/volltexte-holen.js -> redaktion/ -> Repo
  return dirname(dirname(dirname(fileURLToPath(import.meta.url))));
}

function heuteISO(): string {
  const jetzt = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${jetzt.getFullYear()}-${pad(jetzt.getMonth() + 1)}-${pad(jetzt.getDate())}`;
}

function argument(name: string): string | null {
  const stelle = process.argv.indexOf(`--${name}`);
  if (stelle === -1 || stelle + 1 >= process.argv.length) return null;
  return process.argv[stelle + 1] ?? null;
}

function schalter(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function pause(ms: number): Promise<void> {
  return new Promise((aufloesen) => setTimeout(aufloesen, ms));
}

/* ---------- MCP ueber Streamable HTTP ---------- */

interface McpAntwort {
  json: Record<string, unknown> | null;
  sitzung: string | null;
}

/**
 * Fortlaufende JSON-RPC-Nummer. Jede Anfrage bekommt ihre eigene, sonst
 * liesse sich im Ereignisstrom nicht sagen, welche Antwort zu welcher Anfrage
 * gehoert — bei 129 Aufrufen nacheinander waere das eine stille Fehlerquelle.
 */
let naechsteNummer = 0;
function nummer(): number {
  naechsteNummer += 1;
  return naechsteNummer;
}

/**
 * Liest eine SSE-Antwort und gibt die Nachricht zur erwarteten Nummer zurueck.
 * Nachrichten mit fremder Nummer werden uebergangen; eine Antwort ohne
 * passende Nummer gilt als keine.
 */
function ausEreignisstrom(roh: string, erwartet: number): Record<string, unknown> | null {
  for (const zeile of roh.split(/\r?\n/)) {
    if (!zeile.startsWith("data:")) continue;
    const nutzlast = zeile.slice(5).trim();
    if (nutzlast === "" || nutzlast === "[DONE]") continue;
    try {
      const nachricht = JSON.parse(nutzlast) as Record<string, unknown>;
      if (nachricht.id !== erwartet) continue;
      if ("result" in nachricht || "error" in nachricht) return nachricht;
    } catch {
      // Kein JSON in dieser Zeile — weiterlesen statt raten.
    }
  }
  return null;
}

async function mcpAufruf(
  koerper: Record<string, unknown>,
  sitzung: string | null,
): Promise<McpAntwort> {
  const kopf: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "User-Agent": USER_AGENT,
    "MCP-Protocol-Version": PROTOKOLL_VERSION,
  };
  if (sitzung) kopf["Mcp-Session-Id"] = sitzung;

  const antwort = await fetch(MCP_ENDPUNKT, { method: "POST", headers: kopf, body: JSON.stringify(koerper) });
  const neueSitzung = antwort.headers.get("mcp-session-id") ?? sitzung;
  if (!antwort.ok) {
    throw new Error(
      `${MCP_ENDPUNKT} antwortet mit HTTP ${antwort.status} auf "${String(koerper.method)}" — ` +
        `Beschaffung sauber abgebrochen.`,
    );
  }
  const roh = (await antwort.text()).trim();
  if (roh === "") return { json: null, sitzung: neueSitzung };

  const typ = antwort.headers.get("content-type") ?? "";
  const json = typ.includes("text/event-stream")
    ? ausEreignisstrom(roh, typeof koerper.id === "number" ? koerper.id : -1)
    : (JSON.parse(roh) as Record<string, unknown>);
  return { json, sitzung: neueSitzung };
}

function ergebnisOderFehler(json: Record<string, unknown> | null, wo: string): Record<string, unknown> {
  if (json === null) throw new Error(`${wo}: die Quelle antwortet ohne verwertbare Nachricht.`);
  if ("error" in json) {
    const fehler = json.error as { code?: unknown; message?: unknown };
    throw new Error(`${wo}: die Quelle meldet einen Fehler (${String(fehler.code)}): ${String(fehler.message)}`);
  }
  const ergebnis = json.result;
  if (ergebnis === null || typeof ergebnis !== "object") {
    throw new Error(`${wo}: die Antwort enthaelt kein Ergebnis.`);
  }
  return ergebnis as Record<string, unknown>;
}

/** Meldet sich an und gibt die Sitzung samt InputSchema des Werkzeugs zurueck. */
async function anmelden(): Promise<{ sitzung: string | null; inputSchema: unknown }> {
  const start = await mcpAufruf(
    {
      jsonrpc: "2.0",
      id: nummer(),
      method: "initialize",
      params: {
        protocolVersion: PROTOKOLL_VERSION,
        capabilities: {},
        clientInfo: { name: "gemeinsam-recht-redaktion", version: "0.1" },
      },
    },
    null,
  );
  ergebnisOderFehler(start.json, "initialize");

  await mcpAufruf({ jsonrpc: "2.0", method: "notifications/initialized" }, start.sitzung);

  const liste = await mcpAufruf({ jsonrpc: "2.0", id: nummer(), method: "tools/list" }, start.sitzung);
  const ergebnis = ergebnisOderFehler(liste.json, "tools/list");
  const werkzeuge = Array.isArray(ergebnis.tools) ? (ergebnis.tools as Array<Record<string, unknown>>) : [];
  const gefunden = werkzeuge.find((w) => w.name === WERKZEUG);
  if (!gefunden) {
    throw new Error(
      `Die Quelle kennt kein Werkzeug "${WERKZEUG}". Verfuegbar: ${werkzeuge.map((w) => String(w.name)).join(", ") || "(keines)"}. ` +
        `Nichts beschafft.`,
    );
  }
  return { sitzung: liste.sitzung, inputSchema: gefunden.inputSchema };
}

/* ---------- Ein Dokument ---------- */

interface Beschafft {
  befund: DokumentBefund;
  text: string;
  dokumentJson: string;
  rohJson: string;
}

async function holeDokument(
  treffer: RohTreffer,
  argName: string,
  sitzung: string | null,
): Promise<Beschafft> {
  const antwort = await mcpAufruf(
    {
      jsonrpc: "2.0",
      id: nummer(),
      method: "tools/call",
      params: { name: WERKZEUG, arguments: { [argName]: treffer.quelle_id } },
    },
    sitzung,
  );
  const wo = `Dokument ${treffer.quelle_id}`;
  const ergebnis = ergebnisOderFehler(antwort.json, wo);
  if (ergebnis.isError === true) {
    throw new Error(`${wo}: die Quelle meldet das Werkzeug als fehlerhaft ausgefuehrt.`);
  }

  const teile = Array.isArray(ergebnis.content) ? (ergebnis.content as Array<Record<string, unknown>>) : [];
  const texte = teile.filter((t) => t.type === "text" && typeof t.text === "string").map((t) => String(t.text));

  let dokument: unknown = ergebnis.structuredContent ?? null;
  if (dokument === null && texte.length === 1) {
    try {
      dokument = JSON.parse(texte[0] ?? "");
    } catch {
      dokument = null;
    }
  }

  const text = volltextAus(dokument, texte);
  if (text === null) {
    throw new Error(
      `${wo}: aus der Antwort laesst sich kein Volltext bestimmen. ` +
        `Es wird keiner erfunden — der Bezeichner gilt als nicht beschafft.`,
    );
  }

  const dokumentJson = alsDatei(dokument ?? { hinweis: "Die Quelle lieferte kein strukturiertes Dokument.", text });
  const rohJson = alsDatei(antwort.json);

  return {
    text,
    dokumentJson,
    rohJson,
    befund: {
      quelle_id: treffer.quelle_id,
      aktenzeichen: treffer.aktenzeichen,
      raw_datum: treffer.datum,
      document_url: feldAus(dokument, "url") ?? feldAus(dokument, "document_url") ?? treffer.link ?? null,
      original_url: feldAus(dokument, "original_url"),
      text_sha256: sha256(text),
      text_bytes: bytes(text),
      document_json_sha256: sha256(dokumentJson),
      document_json_bytes: bytes(dokumentJson),
      raw_mcp_sha256: sha256(rohJson),
      raw_mcp_bytes: bytes(rohJson),
    },
  };
}

/* ---------- Ablage ausserhalb des Repositoriums ---------- */

function pruefeZiel(ziel: string, wurzel: string): string {
  const abs = resolve(process.cwd(), ziel);
  if (liegtImRepo(abs, wurzel)) {
    throw new Error(
      `Das Zielverzeichnis ${abs} liegt INNERHALB des Repositoriums (${wurzel}). ` +
        `Volltexte gehoeren nie ins Repository — bitte ein Verzeichnis ausserhalb waehlen.`,
    );
  }
  return abs;
}

function schreibe(pfad: string, inhalt: string): void {
  mkdirSync(dirname(pfad), { recursive: true });
  writeFileSync(pfad, inhalt);
}

function pfade(ziel: string, id: string): { text: string; dokument: string; roh: string } {
  return {
    text: join(ziel, "volltext", `${id}.txt`),
    dokument: join(ziel, "dokument", `${id}.json`),
    roh: join(ziel, "roh", `${id}.json`),
  };
}

/** Ein bereits vollstaendig abgelegtes Dokument wird nicht erneut geholt. */
function bereitsDa(ziel: string, treffer: RohTreffer): Beschafft | null {
  const p = pfade(ziel, treffer.quelle_id);
  if (!existsSync(p.text) || !existsSync(p.dokument) || !existsSync(p.roh)) return null;
  const text = readFileSync(p.text, "utf8");
  const dokumentJson = readFileSync(p.dokument, "utf8");
  const rohJson = readFileSync(p.roh, "utf8");
  let dokument: unknown = null;
  try {
    dokument = JSON.parse(dokumentJson);
  } catch {
    dokument = null;
  }
  return {
    text,
    dokumentJson,
    rohJson,
    befund: {
      quelle_id: treffer.quelle_id,
      aktenzeichen: treffer.aktenzeichen,
      raw_datum: treffer.datum,
      document_url: feldAus(dokument, "url") ?? feldAus(dokument, "document_url") ?? treffer.link ?? null,
      original_url: feldAus(dokument, "original_url"),
      text_sha256: sha256(text),
      text_bytes: bytes(text),
      document_json_sha256: sha256(dokumentJson),
      document_json_bytes: bytes(dokumentJson),
      raw_mcp_sha256: sha256(rohJson),
      raw_mcp_bytes: bytes(rohJson),
    },
  };
}

/* ---------- Hauptlauf ---------- */

async function haupt(): Promise<void> {
  const wurzel = repoWurzel();
  const laufId = argument("lauf");
  const zielRoh = argument("ziel");
  const trocken = schalter("trocken");
  const argNameVorgabe = argument("arg-name");

  if (!laufId || !zielRoh) {
    throw new Error("Aufruf: npm run volltexte-holen -- --lauf ML-003 --ziel <verzeichnis ausserhalb des Repos>");
  }
  if (!/^ML-\d{3}$/.test(laufId)) throw new Error(`--lauf muss die Form ML-003 haben, erhalten: "${laufId}"`);

  const ziel = pruefeZiel(zielRoh, wurzel);
  const laufPfad = join(wurzel, "messkorpus", "laeufe", laufId, "lauf.json");
  if (!existsSync(laufPfad)) throw new Error(`${laufId} hat keine lauf.json unter ${laufPfad}.`);

  const lauf = JSON.parse(readFileSync(laufPfad, "utf8")) as {
    id: string;
    messdefinition: { id: string; version: string; sha256: string };
  };
  const treffer = trefferAusLauf(lauf);

  console.log(`Volltexte zu ${laufId} (${lauf.messdefinition.id} v${lauf.messdefinition.version})`);
  console.log(`Definitions-Hash: ${lauf.messdefinition.sha256}`);
  console.log(`Bezeichner aus dem Rohlauf: ${treffer.length} — keine Suche, keine Auswahl.`);
  console.log(`Ablage ausserhalb des Repositoriums: ${ziel}`);
  console.log(`Quelle: ${MCP_ENDPUNKT} (${WERKZEUG}), gedrosselt (1 Dokument/Sekunde).`);
  console.log("Die Laufdatei wird NICHT veraendert; kein Volltext gelangt ins Repository.\n");

  if (trocken) {
    console.log("Trockenlauf: kein Netzaufruf, nichts geschrieben.");
    console.log(`  Volltexte  -> ${join(ziel, "volltext", "<quelle_id>.txt")}`);
    console.log(`  Dokumente  -> ${join(ziel, "dokument", "<quelle_id>.json")}`);
    console.log(`  Rohantwort -> ${join(ziel, "roh", "<quelle_id>.json")}`);
    console.log(`  Manifest   -> ${join(ziel, `${laufId}-volltext-bundle-manifest.json`)}`);
    console.log(`  Bericht    -> ${join(ziel, `${laufId}-vollstaendigkeit.txt`)}`);
    console.log(`\nErster Bezeichner:  ${treffer[0]?.quelle_id ?? "(keiner)"}`);
    console.log(`Letzter Bezeichner: ${treffer[treffer.length - 1]?.quelle_id ?? "(keiner)"}`);
    return;
  }

  const { sitzung, inputSchema } = await anmelden();
  const argName = argNameVorgabe ?? argumentName(inputSchema);
  if (!argName) {
    throw new Error(
      `Das InputSchema von "${WERKZEUG}" laesst nicht eindeutig erkennen, wie der Bezeichner heisst: ` +
        `${JSON.stringify(inputSchema)}. Bitte mit --arg-name <name> ausdruecklich nennen. Nichts beschafft.`,
    );
  }
  console.log(`Bezeichnerargument des Quellwerkzeugs: "${argName}"\n`);

  const befunde: DokumentBefund[] = [];
  const fehler: Array<{ quelle_id: string; grund: string }> = [];

  for (const [nummer, eintrag] of treffer.entries()) {
    const vorhanden = bereitsDa(ziel, eintrag);
    if (vorhanden) {
      befunde.push(vorhanden.befund);
      console.log(`  [${nummer + 1}/${treffer.length}] ${eintrag.quelle_id}: bereits abgelegt, uebersprungen.`);
      continue;
    }
    try {
      const ergebnis = await holeDokument(eintrag, argName, sitzung);
      const p = pfade(ziel, eintrag.quelle_id);
      schreibe(p.text, ergebnis.text);
      schreibe(p.dokument, ergebnis.dokumentJson);
      schreibe(p.roh, ergebnis.rohJson);
      befunde.push(ergebnis.befund);
      console.log(
        `  [${nummer + 1}/${treffer.length}] ${eintrag.quelle_id}: ${ergebnis.befund.text_bytes} Bytes Volltext.`,
      );
    } catch (problem: unknown) {
      const grund = problem instanceof Error ? problem.message : String(problem);
      fehler.push({ quelle_id: eintrag.quelle_id, grund });
      console.error(`  [${nummer + 1}/${treffer.length}] ${eintrag.quelle_id}: FEHLER — ${grund}`);
    }
    await pause(PAUSE_MS);
  }

  const bilanz = vollstaendigkeit(
    treffer.map((t) => t.quelle_id),
    befunde.map((b) => b.quelle_id),
  );

  const bericht = [
    `Vollstaendigkeit ${laufId}`,
    `Rohlauf:      ${laufPfad}`,
    `Messdefinition: ${lauf.messdefinition.id}@${lauf.messdefinition.version} ${lauf.messdefinition.sha256}`,
    `Erwartet:     ${bilanz.erwartet}`,
    `Beschafft:    ${bilanz.beschafft}`,
    `Fehlend:      ${bilanz.fehlend.length}${bilanz.fehlend.length ? ` (${bilanz.fehlend.join(", ")})` : ""}`,
    `Unerwartet:   ${bilanz.unerwartet.length}${bilanz.unerwartet.length ? ` (${bilanz.unerwartet.join(", ")})` : ""}`,
    `Vollstaendig: ${bilanz.vollstaendig ? "ja" : "NEIN"}`,
    ...fehler.map((f) => `FEHLER ${f.quelle_id}: ${f.grund}`),
    "",
  ].join("\n");
  schreibe(join(ziel, `${laufId}-vollstaendigkeit.txt`), bericht);
  console.log(`\n${bericht}`);

  if (!bilanz.vollstaendig) {
    schreibe(join(ziel, `${laufId}-fehlende.json`), alsDatei({ fehlend: bilanz.fehlend, fehler }));
    throw new Error(
      `${laufId}: ${bilanz.beschafft} von ${bilanz.erwartet} Dokumenten beschafft — kein Manifest geschrieben. ` +
        `Ein unvollstaendiges Bundle darf nicht wie ein vollstaendiges aussehen. Fehlliste: ` +
        `${join(ziel, `${laufId}-fehlende.json`)}`,
    );
  }

  const stand = heuteISO();
  const manifest = baueManifest(
    {
      laufId,
      rawCheckpoint: argument("raw-checkpoint") ?? "",
      messdefinition: lauf.messdefinition,
      bundleDatei: `${laufId}-volltexte-${stand.replaceAll("-", "")}.tar.gz`,
      bundleSha256: null,
      quelle: { provider: PROVIDER, mcp_endpoint: MCP_ENDPUNKT, tool: WERKZEUG },
      stand,
    },
    befunde,
  );
  const manifestPfad = join(ziel, `${laufId}-volltext-bundle-manifest.json`);
  schreibe(manifestPfad, alsDatei(manifest));

  console.log(`Manifest geschrieben: ${manifestPfad}`);
  console.log(
    `Naechster Schritt: Bundle packen, dessen SHA-256 in bundle.sha256 eintragen, ` +
      `raw_checkpoint ergaenzen und nur das Manifest ins Repository verankern.`,
  );
  const abgelegt = readdirSync(join(ziel, "volltext")).length;
  console.log(`Abgelegte Volltexte: ${abgelegt} — im Repository liegt davon nichts.`);
}

haupt().catch((fehler: unknown) => {
  console.error(fehler instanceof Error ? fehler.message : String(fehler));
  process.exitCode = 1;
});

// abruf.ts — hoeflicher Netzabruf von entscheidsuche.ch (AUFTRAG-R0 §2).
//
// AUSNAHME laut Auftrag: Nur dieses Beschaffungswerkzeug darf das Netz
// benutzen; alle Prototypen bleiben offline, und kein Test fuehrt den
// Abruf aus. Gewaehlte Schnittstelle (als Auslegung dokumentiert im
// Abschlussbericht): der oeffentliche Elasticsearch-Endpunkt
// POST https://entscheidsuche.ch/_search.php. Abgefragt werden
// ausschliesslich Metadaten-Felder (_source-Filter) — keine Volltexte.
//
// Hoeflichkeit: kleine Seiten, eine Sekunde Pause zwischen den Seiten,
// klarer User-Agent mit Kontakt, harte Obergrenze mit sichtbarer Meldung.

export const SUCH_ENDPUNKT = "https://entscheidsuche.ch/_search.php";
export const USER_AGENT =
  "gemeinsam-recht-redaktion/0.1 (privates Redaktionswerkzeug, AUFTRAG-R0; Kontakt: swisscomfort@pm.me)";
export const SEITEN_GROESSE = 100;
export const PAUSE_MS = 1000;
export const MAX_TREFFER = 1000;

/** Metadaten-Felder — mehr wird nie angefragt (keine Volltext-Archivierung). */
export const METADATEN_FELDER = ["date", "hierarchy", "abstract", "title", "reference"] as const;

/**
 * Baut die Elasticsearch-Abfrage: Datumsfenster [von, bis], Volltext-Anfrage
 * des Rechtsgebiets, deterministische Sortierung (Datum absteigend, dann ID),
 * und ausschliesslich Metadaten im Ergebnis.
 */
export function baueAbfrage(
  suchanfrage: string,
  von: string,
  bis: string,
  from: number,
  size: number,
): object {
  return {
    from,
    size,
    _source: [...METADATEN_FELDER],
    query: {
      bool: {
        filter: [{ range: { date: { gte: von, lte: bis } } }],
        must: [{ query_string: { query: suchanfrage } }],
      },
    },
    sort: [{ date: "desc" }, { _id: "asc" }],
  };
}

function pause(ms: number): Promise<void> {
  return new Promise((aufloesen) => setTimeout(aufloesen, ms));
}

export interface AbrufErgebnis {
  treffer: unknown[];
  gesamt: number;
  gekappt: boolean;
}

/**
 * Holt alle Treffer einer Suchanfrage seitenweise (gedrosselt). Bei mehr als
 * MAX_TREFFER wird gekappt und dies sichtbar zurueckgemeldet — nie still.
 * Fehler brechen mit einer deutschen Meldung ab (Behandlung im CLI).
 */
export async function holeTreffer(
  suchanfrage: string,
  von: string,
  bis: string,
  melde: (text: string) => void,
): Promise<AbrufErgebnis> {
  const alle: unknown[] = [];
  let gesamt = 0;

  for (let from = 0; from < MAX_TREFFER; from += SEITEN_GROESSE) {
    if (from > 0) await pause(PAUSE_MS);
    const antwort = await fetch(SUCH_ENDPUNKT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify(baueAbfrage(suchanfrage, von, bis, from, SEITEN_GROESSE)),
    });
    if (!antwort.ok) {
      throw new Error(
        `entscheidsuche.ch antwortet mit HTTP ${antwort.status} — Abruf sauber abgebrochen, bitte spaeter erneut versuchen.`,
      );
    }
    const daten: unknown = await antwort.json();
    const hits = (daten as { hits?: { hits?: unknown; total?: { value?: unknown } } }).hits;
    const seite = Array.isArray(hits?.hits) ? hits.hits : [];
    gesamt = typeof hits?.total?.value === "number" ? hits.total.value : gesamt;
    alle.push(...seite);
    melde(`  Seite ab Treffer ${from}: ${seite.length} erhalten (gesamt gemeldet: ${gesamt}).`);
    if (seite.length < SEITEN_GROESSE) break;
  }

  const gekappt = gesamt > MAX_TREFFER;
  if (gekappt) {
    melde(
      `  HINWEIS: ${gesamt} Treffer gemeldet, Obergrenze ${MAX_TREFFER} — Liste ist gekappt. Zeitraum verkleinern oder Suchanfrage in filter.json verfeinern.`,
    );
  }
  return { treffer: alle, gesamt, gekappt };
}

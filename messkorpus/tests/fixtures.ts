// Gemeinsame Fixtures der Messkorpus-Tests. Nur Testdaten — niemals als
// reale Messdefinition oder realer Lauf ablegen (Plan §2, Invariante 2).

import { definitionsHash, type Messdefinition } from "../tools/definition.ts";
import { metadatenFingerprint, type Abruf, type Messlauf, type Treffer } from "../tools/lauf.ts";
import type { KodierteStory } from "../../wissen/tools/kodierung-quoten.ts";

export const DEFINITION: Messdefinition = {
  id: "MD-999",
  version: "1.0.0",
  status: "eingefroren",
  stand: "2026-08-08",
  messfrage: "Testfrage fuer die Fixture, lang genug fuer das Schema.",
  norm: { norm_fundstelle: "Art. 1 OR (SR 220)", pruefstand: "fachlich_bestaetigt" },
  quelle: { name: "entscheidsuche.ch", endpunkt: "https://entscheidsuche.ch/_search.php", abrufart: "metadaten" },
  abfrage: { suchanfrage: "Testanfrage", gerichtsfilter: ["CH_BGer"] },
  zeitraum: { von: "2020-01-01", bis: "2020-12-31" },
  einschluss: [
    { code: "norm_streitig", beschreibung: "Die Norm ist Gegenstand des Verfahrens.", bezug: "verfahrensgegenstand" },
  ],
  ausschluss: [
    { code: "andere_norm", beschreibung: "Das Verfahren betrifft eine andere Bestimmung.", bezug: "verfahrensgegenstand" },
  ],
  rechtskraft_regel: {
    art: "bundesgericht_art61_bgg",
    rechtsquelle: "Art. 61 BGG (SR 173.110)",
    begruendung: "Entscheide des Bundesgerichts erwachsen am Tag der Ausfaellung in Rechtskraft.",
    pruefstand: "fachlich_bestaetigt",
  },
  abschluss_regel: {
    art: "endentscheid_zur_messfrage",
    begruendung: "Zaehlfaehig ist nur, wo die gemessene Rechtsfrage endgueltig entschieden ist.",
    pruefstand: "fachlich_bestaetigt",
  },
  zaehleinheit: {
    art: "streitigkeit",
    beschreibung: "Eine zugrunde liegende Streitigkeit ist eine Zaehleinheit, unabhaengig von der Zahl der Entscheide.",
  },
  selektionsneutralitaet: "Kein Kriterium kennt den Ausgang; gefiltert wird allein nach dem Streitgegenstand.",
};

/** Treffer mit stimmigem Fingerprint — die Testdaten sollen nicht am Formalen scheitern. */
export function treffer(teil: Partial<Treffer> & { quelle_id: string }): Treffer {
  const metadaten = {
    quelle_id: teil.quelle_id,
    aktenzeichen: teil.aktenzeichen,
    datum: teil.datum,
    gericht: teil.gericht,
    link: teil.link,
  };
  return {
    status: "ungeklaert",
    ...teil,
    metadaten_fingerprint: teil.metadaten_fingerprint ?? metadatenFingerprint(metadaten),
  };
}

/** Ein Abrufprotokoll, das den ganzen Zeitraum der Fixture-Definition abdeckt. */
export function abruf(nachFilter: number, teil: Partial<Abruf> = {}): Abruf {
  const empfangen = teil.empfangen ?? nachFilter;
  return {
    von: DEFINITION.zeitraum.von,
    bis: DEFINITION.zeitraum.bis,
    gemeldet_total: teil.gemeldet_total ?? empfangen,
    gemeldet_relation: "eq",
    empfangen,
    ohne_id: 0,
    vor_gerichtsfilter: empfangen,
    nach_gerichtsfilter: nachFilter,
    ...teil,
  };
}

export function lauf(trefferListe: Treffer[], teil: Partial<Messlauf> = {}): Messlauf {
  return {
    id: "ML-999",
    messdefinition: { id: DEFINITION.id, version: DEFINITION.version, sha256: definitionsHash(DEFINITION) },
    durchgefuehrt_am: "2026-08-08",
    datenstand: "2026-08-08",
    abrufe: [abruf(trefferListe.length)],
    duplikate: 0,
    roh_treffer: trefferListe.length,
    gekappt: false,
    treffer: trefferListe,
    ...teil,
  };
}

export function fall(id: string, teil: Partial<KodierteStory> = {}): KodierteStory {
  return {
    id,
    kennzeichnung: "NACHERZAEHLT_OEFFENTLICH",
    regel_id: "R-CH-0001",
    rechtskraft_status: "rechtskraeftig",
    kodierung_status: "doppelt_bestaetigt",
    ausgang: "durchgesetzt",
    scheiterpunkt: [],
    ...teil,
  };
}

/**
 * Vollstaendiger, freigebbarer Korpus: `anzahl` Zaehleinheiten mit je einem
 * Treffer, davon `positiv` mit Normausgang "durchgesetzt".
 */
export function korpus(
  anzahl: number,
  positiv: number,
): { lauf: Messlauf; faelle: Map<string, KodierteStory> } {
  const liste: Treffer[] = [];
  const faelle = new Map<string, KodierteStory>();
  for (let i = 0; i < anzahl; i += 1) {
    const storyId = `FS-${100 + i}`;
    liste.push(
      treffer({
        quelle_id: `q${i}`,
        status: "eingeschlossen",
        story_id: storyId,
        zaehleinheit: `streit-${i}`,
        abschluss_status: "abgeschlossen",
        messausgang: {
          messdefinition_id: DEFINITION.id,
          messdefinition_version: DEFINITION.version,
          wert: i < positiv ? "durchgesetzt" : "nicht_durchgesetzt",
          beleg: "Dispositiv Ziffer 1 des Entscheids.",
        },
      }),
    );
    faelle.set(storyId, fall(storyId));
  }
  return { lauf: lauf(liste), faelle };
}

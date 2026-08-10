// ML-002: der materialisierte Blindvergleich A/B2.
//
// ML-002 ist der praeregistrierte Validierungslauf gegen die eingefrorene
// MD-001@3.0.0. Seine Klassifikation stammt NICHT aus einem einzelnen
// Kodierlauf, sondern aus dem Konsens zweier unabhaengiger Kodierer
// (A: GPT-5.6 Sol, B2: Claude Opus 5). Uebernommen wurde nur, worin beide
// uebereinstimmen; bei Statuskonflikt bleibt der Treffer ungeklaert.
//
// Dieser Test haelt genau diesen Zustand fest — Fall fuer Fall, nicht als
// Summe. Eine spaetere stille Aufloesung eines der beiden Kodierkonflikte
// oder ein nachtraeglich eingetragener Messausgang faellt hier auf.
//
// Was der Test ausdruecklich NICHT tut: er beurteilt keinen Entscheid. Die
// Werte sind der Konsens, nicht das Urteil dieses Repositoriums.

import { describe, expect, it } from "vitest";
import { findeFassung, sammleFassungen, type Messdefinition } from "../tools/definition.ts";
import { bilanz, pruefeLauf, type Messlauf } from "../tools/lauf.ts";
import { leseDefinitionen, leseJson, messkorpusPfad } from "../tools/umgebung.ts";

const lauf = leseJson(messkorpusPfad("laeufe", "ML-002", "lauf.json")) as Messlauf;
const nachAktenzeichen = new Map(lauf.treffer.map((t) => [t.aktenzeichen ?? t.quelle_id, t]));

/** Die drei doppelt bestaetigten Einschluesse. */
const EINGESCHLOSSEN = ["4A_281/2025", "4A_288/2025", "4A_624/2025"] as const;
/** Der doppelt bestaetigte Ausschluss. */
const AUSGESCHLOSSEN = ["4A_493/2025"] as const;
/** Zwei Kodierkonflikte (4A_162/2026, 4A_561/2025) und ein doppelt bestaetigtes Ungeklaert (4A_442/2025). */
const UNGEKLAERT = ["4A_162/2026", "4A_442/2025", "4A_561/2025"] as const;

describe("ML-002 — Konsens A/B2", () => {
  it("die Rohpopulation bleibt bei 7 und ist vollstaendig zugeordnet", () => {
    expect(lauf.roh_treffer).toBe(7);
    expect(lauf.treffer).toHaveLength(7);
    expect(lauf.duplikate).toBe(0);
    expect(lauf.gekappt).toBe(false);
    const gesehen = [...EINGESCHLOSSEN, ...AUSGESCHLOSSEN, ...UNGEKLAERT];
    expect([...nachAktenzeichen.keys()].sort()).toEqual([...gesehen].sort());
  });

  it("die Bilanz ist 3 eingeschlossen, 1 ausgeschlossen, 3 ungeklaert", () => {
    const b = bilanz(lauf);
    expect(b.eingeschlossen).toBe(3);
    expect(b.ausgeschlossen).toBe(1);
    expect(b.ungeklaert).toBe(3);
  });

  it.each(EINGESCHLOSSEN)("%s ist eingeschlossen, materiell entschieden, nicht durchgesetzt", (az) => {
    const t = nachAktenzeichen.get(az);
    expect(t?.status).toBe("eingeschlossen");
    expect(t?.zaehleinheit).toBe(az);
    expect(t?.abschluss_status).toBe("abgeschlossen");
    expect(t?.erledigungsweg?.modus).toBe("materiell_entschieden");
    // Der Schluessel muss dastehen und null sein — fehlt er, waere das
    // "noch nicht kodiert" statt "kein Prozessgrund".
    expect(t?.erledigungsweg).toHaveProperty("prozessgrund");
    expect(t?.erledigungsweg?.prozessgrund).toBeNull();
    expect(t?.erledigungsweg?.stand_datum).toBe(t?.datum);
    expect(t?.messausgang?.messdefinition_id).toBe("MD-001");
    expect(t?.messausgang?.messdefinition_version).toBe("3.0.0");
    expect(t?.messausgang?.wert).toBe("nicht_durchgesetzt");
    expect(t?.ausschlussgrund).toBeUndefined();
  });

  it("die Zaehleinheiten sind genau die drei eingeschlossenen Streitigkeiten", () => {
    const einheiten = lauf.treffer
      .filter((t) => t.zaehleinheit !== undefined)
      .map((t) => t.zaehleinheit);
    expect(einheiten.sort()).toEqual([...EINGESCHLOSSEN].sort());
  });

  it.each(AUSGESCHLOSSEN)("%s ist ausgeschlossen wegen andere_rechtsfrage", (az) => {
    const t = nachAktenzeichen.get(az);
    expect(t?.status).toBe("ausgeschlossen");
    expect(t?.ausschlussgrund).toBe("andere_rechtsfrage");
    expect(t?.zaehleinheit).toBeUndefined();
    expect(t?.messausgang).toBeUndefined();
    expect(t?.erledigungsweg).toBeUndefined();
  });

  it.each(UNGEKLAERT)("%s bleibt ungeklaert und traegt keinen einzigen zaehlbaren Wert", (az) => {
    const t = nachAktenzeichen.get(az);
    expect(t?.status).toBe("ungeklaert");
    expect(t?.ausschlussgrund).toBeUndefined();
    expect(t?.zaehleinheit).toBeUndefined();
    expect(t?.abschluss_status).toBeUndefined();
    expect(t?.erledigungsweg).toBeUndefined();
    expect(t?.messausgang).toBeUndefined();
    // Der Konflikt bzw. das uebereinstimmende Ungeklaert ist begruendet
    // abgelegt, nicht stillschweigend offen gelassen.
    expect(t?.notiz ?? "").not.toBe("");
  });

  it("ML-002 ist gegen die eingefrorene MD-001@3.0.0 strukturell gueltig", () => {
    const register = sammleFassungen(
      leseDefinitionen().map((d) => ({ datei: d.datei, inhalt: d.inhalt as Messdefinition })),
    );
    const auflösung = findeFassung(register, lauf.messdefinition);
    expect(auflösung.art).toBe("gefunden");
    const definition = (auflösung as { definition: Messdefinition }).definition;
    expect(definition.version).toBe("3.0.0");
    expect(definition.status).toBe("eingefroren");
    expect(pruefeLauf(lauf, definition).fehler).toEqual([]);
  });

  it("aus ML-002 entsteht keine Quote — die Rohpopulation ist zu klein und drei Treffer sind offen", () => {
    // Selbst wenn alle drei ungeklaerten Treffer noch eingeschlossen wuerden,
    // blieben hoechstens 7 Zaehleinheiten und damit weniger als die
    // eingefrorene Mindestfallzahl 10.
    expect(lauf.roh_treffer).toBeLessThan(10);
    expect(bilanz(lauf).ungeklaert).toBeGreaterThan(0);
  });
});

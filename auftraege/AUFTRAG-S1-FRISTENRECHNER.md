# AUFTRAG-S1 — Fristenrechner + Fixtures (Plan §4 Schritt 1)

```yaml
auftrag: S1
plan_referenz: "DER_PLAN_v1.0_FROZEN.md §3, §4 Schritt 1"
fallobjekt_schema: "schemas/case-object.schema.json"
sprache: TypeScript (strict)
node: ">=20"
laufzeit_abhaengigkeiten: []          # keine
dev_abhaengigkeiten: [typescript, vitest, ajv, ajv-formats]
verzeichnis: core/
llm_nutzung: verboten
netzwerk: verboten
zeitquelle: injiziert (kein Date.now in Fachlogik)
```

## 1. Zielstruktur (verbindlich)

```text
core/
  package.json                 # private, scripts: build, test
  tsconfig.json                # strict
  src/
    types.ts                   # Typen exakt aus dem Fallobjekt-Schema abgeleitet
    quellen.ts                 # Quellenregister (unten definiert)
    regeln.ts                  # Regel-Flags (unten definiert), je mit quelle_id
    feiertage_lu.ts            # Feiertagsliste Kanton LU als Daten, mit quelle_id
    fristen.ts                 # berechneFristen(fall, heute): deterministisch
    trace.ts                   # DTM-Trace gemäss LEGAL_AI_OPERATING_RULES §4
    index.ts                   # bewerteFall(fall, heute) -> Ergebnis
  tests/
    schema.test.ts             # jedes Fixture validiert gegen das JSON-Schema (ajv)
    fristen.test.ts            # Grenzwert-Unittests der Fristarithmetik
    fixtures.test.ts           # lädt alle FX-*, vergleicht mit expected.json
    determinismus.test.ts      # zweifacher Lauf => byte-identisches Ergebnis
    fixtures/FX-001-…/         # je: case.json, expected.json, notes.md
```

## 2. Ausgabeformat von `bewerteFall` (verbindlich)

```typescript
type Ergebnis =
  | { status: "OK";
      fristen: { empfangsdatum_effektiv: string; anfechtungsfrist_bis: string;
                 frist_abgelaufen: boolean };
      flags: FlagId[];                 // siehe §4
      quellen: QuelleId[];             // alle herangezogenen Quellen
      regelversion: string; quellenstand: string;
      trace: DtmTrace }
  | { status: "LUECKE";
      fehlend: string[];               // Feldpfade oder Widerspruchsbeschreibung
      hinweis: string;                 // was der Nutzer nachliefern muss
      trace: DtmTrace };
```

Regel: Bei fehlenden oder widersprüchlichen entscheidenden Angaben wird **kein** Fristergebnis ausgegeben (Plan §2 Invariante 3) — Status `LUECKE`.

## 3. Rechenregeln als versionierte Parameter

Jeder Parameter wird in `quellen.ts` mit `{ id, artikel, fundstelle, zeitstand,
pruefstand: "technisch_validiert" | "fachlich_zu_verifizieren" }` geführt.
Die fachliche Verifikation erfolgt bei der Abnahme durch einen Menschen (Plan-DoD);
bis dahin gilt für Rechtsparameter `pruefstand: "fachlich_zu_verifizieren"`.

| Parameter | Wert (v0.1) | Quelle |
|---|---|---|
| P1 Anfechtungsfrist | 30 Tage | Art. 273 Abs. 1 OR |
| P2 Fristbeginn | Empfangstag zählt nicht mit; Frist läuft ab Folgetag | Fristenrecht OR |
| P3 Fristende auf Sa/So/Feiertag (LU) | verschiebt auf nächsten Werktag | Fristenrecht/ZPO |
| P4 Zustellfiktion Einschreiben, nicht abgeholt | Zustellung gilt am letzten Tag der 7-tägigen Abholfrist als erfolgt | Zustellrecht |
| P5 Amtliches Formular fehlt oder Kündigung unsigniert | Kündigung nichtig | Art. 266l / 266o OR |
| P6 Familienwohnung ohne separate Zustellung an beide | Kündigung nichtig | Art. 266n / 266o OR |
| P7 Verfahren aus Mietverhältnis in letzten 3 Jahren | Anfechtungsgrund möglich (Sperrfrist) | Art. 271a OR |
| P8 Rechte kurz zuvor geltend gemacht | Indiz Rachekündigung | Art. 271a OR |

Effektives Empfangsdatum: `zustellart=einschreiben` und nicht abgeholt ⇒ P4 mit
`abholfrist_ende`; sonst `zugestellt_am`.

## 4. Flag-Katalog (abschliessend für S1)

`nichtig_formular_fehlt` (P5) · `nichtig_unterschrift_fehlt` (P5) ·
`nichtig_familienwohnung_zustellung` (P6) · `sperrfrist_271a_moeglich` (P7) ·
`rachekuendigung_indiz` (P8) · `frist_abgelaufen` · `befristetes_verhaeltnis_sonderfall` ·
`ausserhalb_m1_scope`.

Keine weiteren Flags erfinden. Fehlt fachlich etwas: als offene Frage melden.

## 5. Die zwanzig Fixtures (abschliessend definiert)

Kategorien: **H**=Happy/Regelfall, **G**=Frist-Grenzfall, **L**=Lücke/Widerspruch, **N**=Nichtigkeit/Flags.

| ID | Kat | Konstellation | Erwartung (Kern) |
|---|---|---|---|
| FX-001 | H | LU, A-Post, zugestellt Mi 2026-09-02, Formular ok | OK; Frist bis 2026-10-02; keine Flags |
| FX-002 | N | wie 001, `amtliches_formular=false` | OK; Flag `nichtig_formular_fehlt`; Frist trotzdem berechnet |
| FX-003 | N | Familienwohnung, `separate_zustellung_beide=false` | OK; Flag `nichtig_familienwohnung_zustellung` |
| FX-004 | N | `verfahren_letzte_3_jahre=true` | OK; Flag `sperrfrist_271a_moeglich` |
| FX-005 | N | `rechte_geltend_gemacht=true` | OK; Flag `rachekuendigung_indiz` |
| FX-006 | G | Empfang so, dass Fristende auf Samstag fällt | OK; `anfechtungsfrist_bis` = folgender Montag |
| FX-007 | G | Fristende fällt auf Sonntag | OK; = folgender Montag |
| FX-008 | G | Fristende fällt auf LU-Feiertag (aus `feiertage_lu.ts`) | OK; = nächster Werktag |
| FX-009 | G | Einschreiben, nie abgeholt, `abholfrist_ende=2026-09-10` | OK; Empfang effektiv 2026-09-10; Frist ab Folgetag |
| FX-010 | G | Einschreiben, abgeholt am Tag 3 der Abholfrist (`zugestellt_am`=Abholtag) | OK; Empfang = Abholtag |
| FX-011 | G | Empfang am Monatsletzten (31.) | OK; korrekte 30-Tage-Arithmetik über Monatsgrenze |
| FX-012 | L | `zugestellt_am` fehlt | LUECKE; fehlend enthält `kuendigung.zugestellt_am` |
| FX-013 | L | Einschreiben, nicht abgeholt, `abholfrist_ende` fehlt | LUECKE |
| FX-014 | L | `familienwohnung=true`, `separate_zustellung_beide=null` | LUECKE (Schema-Pflicht) |
| FX-015 | L | `kuendigungstermin_gemaess_schreiben` vor `vertrag.beginn` | LUECKE (Widerspruch benannt) |
| FX-016 | L | `zugestellt_am` liegt nach `heute` | LUECKE (Widerspruch) |
| FX-017 | L | `kanton="ZH"` | LUECKE; Flag-los; Hinweis + `ausserhalb_m1_scope` im Trace |
| FX-018 | N | `unterschrieben=false` | OK; Flag `nichtig_unterschrift_fehlt` |
| FX-019 | N | `befristet=true` | OK; Flag `befristetes_verhaeltnis_sonderfall`; Hinweis auf Sonderrechtslage, keine Anfechtungsfrist-Aussage |
| FX-020 | G | Empfang 45 Tage vor `heute` | OK; `frist_abgelaufen=true`; Flag `frist_abgelaufen` |

Jedes `expected.json` enthält das vollständige erwartete `Ergebnis` (ohne `trace.zeitpunkt`,
der aus dem injizierten `heute` deterministisch gesetzt wird). Jedes `case.json` trägt
`meta.fixture=true`. `notes.md` nennt Zweck und geprüfte Parameter (P-Nummern).
Referenz-`heute` für alle Fixtures: `2026-10-15`, sofern die Konstellation nichts anderes verlangt.

## 6. Abnahme (alle Kommandos müssen grün sein)

```bash
cd core
npm ci
npm test              # schema + fristen + fixtures (20/20) + determinismus
```

Zusätzlich in der Abschlussmeldung: Tabelle FX-001…FX-020 mit ✓, verwendete
Regelversion (`0.1.0`) und Quellenstand, Liste aller Parameter mit
`pruefstand=fachlich_zu_verifizieren` als explizite offene Punkte für die
menschliche fachliche Prüfung, `git status --short`.

## 7. Nicht Bestandteil von S1

Ampel-Texte, Brief, Fragebaum/UI, LLM-Anbindung, MCP, Web-Flow, Chronologie-Export,
weitere Kantone, weitere Flags, Refactorings ausserhalb `core/`.

## 8. Startkommando für den Menschen

```bash
cd /pfad/zu/gemeinsam-recht-case-system
claude "Lies CLAUDE.md und führe auftraege/AUFTRAG-S1-FRISTENRECHNER.md vollständig aus."
```

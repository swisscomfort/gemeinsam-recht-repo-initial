# Abschluss AUFTRAG-S2 — Fragebaum, Einschätzung, Brief, Chronologie (Plan §4 Schritt 2)

Datum: 2026-08-05 · Regelversion 0.1.0 · Quellenstand 2026-08-05
Basis: core aus S1, Engine unverändert (nur erweitert). Kein LLM, kein Netzwerkzugriff aus Code/Tests, keine neuen Laufzeit-Abhängigkeiten in core; webflow nur devDependencies vite/typescript/vitest.

## Was gebaut wurde

- **`core/src/einschaetzung.ts`** — deterministisches Ampel-Mapping exakt nach Auftragstabelle (LUECKE → keine Ampel + fehlende Punkte · frist_abgelaufen → ROT · nichtig_*/sperrfrist_271a_moeglich/rachekuendigung_indiz → GRUEN · sonst GELB). Unverbindliche Textbausteine, Artikel ausschliesslich aus dem Quellenregister, fixe Optionslisten gemäss Auftrag. Alle Textbausteine `pruefstand: fachlich_zu_verifizieren`.
- **`core/src/brief.ts`** — Mustertexte M1 (Anfechtungsbegehren Schlichtungsbehörde LU) und M2 (Mitteilung Nichtigkeit an Vermieterschaft) als Templates mit den Pflicht-Platzhaltern; Behördenadresse wird nie erfunden (`VOM_NUTZER_ZU_ERGAENZEN`); ungefüllte Platzhalter bleiben sichtbar und werden gemeldet. Ausgabe Markdown + druckfähiges, eigenständiges HTML (Browser-Druck als PDF-Weg, dokumentierte Auslegung zu Plan-L2 „PDF" gemäss Auftrag). Sachlicher Ton, Beilagenliste, Ort/Datum, keine Drohungen.
- **`core/src/chronologie.ts`** — Fallakte mit Einträgen `{zeitpunkt, typ, beschreibung, dokument_hash?}` (Typen: erfassung, kuendigung_erhalten, brief_erstellt, dokument_hinzugefuegt, export), Datei-Hashing mit der vorhandenen SHA-256, Export JSON + Markdown inkl. regelversion, quellenstand, fallobjekt_hash. Immutabel, Zeit wird injiziert.
- **`core/src/trace.ts`** — nur erweitert: `sha256HexBytes` (Byte-Einstieg für Datei-Hashing); `sha256Hex` unverändert, Identität durch Test belegt.
- **`webflow/`** — lokale Vite-App (vanilla TS, Deutsch, einfache Sprache): geführter Fragebaum strikt entlang `schemas/case-object.schema.json` (LU vorausgewählt; bedingte Fragen Einschreiben→Abholfrist und Familienwohnung→separate Zustellung; Pflichtfelder erzwungen; jede Frage mit Ein-Satz-Hilfe). Ergebnisseite mit Ampel, Begründungen, Artikel-Liste, konkretem Fristdatum, Brief-Vorschau M1/M2 mit Platzhalter-Feldern und Chronologie-Download. Alle Daten bleiben im Browser (kein Server, keine Übertragung, kein Tracking, kein Speicher).

## Angenommene Auslegungen (bitte bei der fachlichen Prüfung bestätigen)

1. **Ampel-Vorrang:** Die Auftragstabelle wird zeilenweise geprüft; träfen ROT und GRUEN gleichzeitig zu (Frist abgelaufen **und** Nichtigkeits-Flag), gewinnt ROT. Kein Fixture deckt diesen Fall ab.
2. **GRUEN „und/oder":** Option M2 nur bei einem `nichtig_*`-Flag; Option M1 in GRUEN immer (auch bei Sperrfrist/Rache-Indiz ohne Nichtigkeit).
3. **Sonderfall befristet (GELB):** keine Fristaussage in Textbaustein und Optionen; im fixen Optionstext wird `{{frist_datum}}` durch `((Fristdatum fachlich zu klaeren))` ersetzt; `frist_datum` der Einschätzung ist `null`. Kombination befristet + Frist abgelaufen (→ ROT) ist fachlich offen.
4. **Platzhalter-Verteilung:** Die Pflicht-Platzhalter-Liste wird als Gesamtmenge über beide Vorlagen gelesen; M1 enthält alle acht, M2 alle ausser `adresse_schlichtungsbehoerde` (dort nicht sinnvoll). Zusätzlich `{{ort}}`/`{{datum}}` für Ort/Datum der Unterzeichnung.
5. **Einschreiben nicht abgeholt (Webflow):** `zugestellt_am` wird wie in FX-009 auf das Ende der Abholfrist gesetzt (Zustellfiktion rechnet der Kern, P4).
6. **Zeit im Webflow:** `heute`/Zeitstempel werden in der UI-Schicht bestimmt und in den Kern injiziert; die Fachlogik bleibt ohne Systemzeit.
7. **Keine @types/node:** nicht im Auftrag freigegeben; `vite.config.ts` nutzt deshalb die Standard-`URL`-API statt `node:url`.

## Offene fachliche Punkte (Mensch, vor M1-Gesamtabnahme)

- Alle neuen Textbausteine, Optionstexte und die Mustertexte M1/M2: `pruefstand: fachlich_zu_verifizieren` (S2-Prüfung nach Operating Rules §3 ist ausdrücklich nicht Bestandteil dieses Auftrags).
- Aus S1 weiterhin offen: P1–P8, FEIERTAGE_LU, Q_BEFRISTET.
- Ein Dokument `non-interpretative-proofing` (Plan §2 Invariante 4) liegt nicht im Repo; die verbotenen Formulierungen konnten nicht wörtlich abgeglichen werden. Es wurden durchgehend unverbindliche Formulierungen („deutet darauf hin", „kann") ohne Garantie-/Konformitätszusagen verwendet — Abgleich bleibt offen.
- Zuständige Schlichtungsbehörde/Adresse (LU): bewusst `VOM_NUTZER_ZU_ERGAENZEN`, nichts erfunden.
- ≥3 echte Pilotfälle mit Einwilligung sowie die dokumentierte fachliche Prüfung von Fragebaum und Mustertexten (Plan §4 Schritt 2) sind Mensch-Aufgaben und stehen aus.

## Testübersicht (Abnahme-Kommandos)

- `cd core && npm test` → **136 Tests grün** (94 aus S1 + 42 neu: Ampel-Mapping gegen alle 20 Fixtures mit erwarteter Zuordnung GRUEN FX-002/003/004/005/018 · GELB FX-001/006–011/019 · ROT FX-020 · keine Ampel FX-012–017; Snapshot-Tests M1 (FX-001) und M2 (FX-002) für Markdown und HTML; Chronologie-Hash-Tests inkl. FIPS-Testvektor; Determinismus-Doppelläufe).
- `cd webflow && npm ci && npm run build` → **grün** (tsc + vite build).
- Zusätzlich `cd webflow && npm test` → 9 Tests grün (Schema-Pflichtfelder abgedeckt, Ein-Satz-Hilfen, bedingte Fragen, Antworten→Fallobjekt→Kern-Integration).
- Hinweis: `npm ci` meldet, dass das esbuild-postinstall-Skript durch die lokale allow-scripts-Richtlinie nicht ausgeführt wurde; der Build funktioniert dennoch (Plattform-Binary kommt als optionale Abhängigkeit).

## DTM-Trace dieser Lieferung

```json
{
  "gegenstand": "auftrag_s2_fragebaum_einschaetzung_brief_chronologie",
  "zeitpunkt": "2026-08-05T00:00:00Z",
  "rolle": "redaktion",
  "basis": { "fallobjekt_hash": "-", "regelversion": "0.1.0", "quellenstand": "2026-08-05" },
  "alternativen": ["Auslegungsfragen 1-4 anders entscheiden (siehe oben)"],
  "begruendung": "Umsetzung strikt nach AUFTRAG-S2 auf Basis der S1-Engine; alle Rechtstexte unverbindlich und fachlich zu verifizieren."
}
```

## Git-Stand

Neue/geänderte Dateien (kein Commit/Push ohne Freigabe, CLAUDE.md):
`core/src/einschaetzung.ts` · `core/src/brief.ts` · `core/src/chronologie.ts` · `core/src/trace.ts` (erweitert) · `core/src/index.ts` (Exporte) · `core/dist/*` (Build) · `core/tests/einschaetzung.test.ts` · `core/tests/brief.test.ts` · `core/tests/chronologie.test.ts` · `core/tests/__snapshots__/brief.test.ts.snap` · `webflow/` (komplett) · `berichte/AUFTRAG-S2-ABSCHLUSS.md` · `STATUS.md` (eine Checkbox).

Technische Abnahme erteilt durch Projektinhaber am: ____________

# AUFTRAG-S2 — Fragebaum, Einschätzung, Brief, Chronologie (Plan §4 Schritt 2)

```yaml
auftrag: S2
plan_referenz: "DER_PLAN_v1.0_FROZEN.md §3, §4 Schritt 2"
basis: "core/ aus S1 (Regelversion 0.1.0) – Engine nicht veraendern, nur erweitern"
sprache_ui: Deutsch, einfache Sprache
llm_nutzung: verboten (alles deterministisch aus Regeln/Templates)
netz: verboten (ausser npm install)
neue_laufzeit_deps_core: keine · webflow: nur devDependencies (vite, typescript, vitest)
```

## 1. Lieferumfang

**A. `core/src/einschaetzung.ts`** — deterministisches Ampel-Mapping (abschliessend):
| Bedingung | Ampel |
|---|---|
| status=LUECKE | keine Ampel; Liste der fehlenden Punkte |
| OK und `frist_abgelaufen` | ROT |
| OK und ein `nichtig_*`-Flag oder `sperrfrist_271a_moeglich` oder `rachekuendigung_indiz` | GRUEN |
| OK sonst (inkl. `befristetes_verhaeltnis_sonderfall` → Zusatzhinweis, keine Fristaussage im Text) | GELB |

Je Ampel: Textbaustein (unverbindliche Formulierungen: „deutet darauf hin", „kann", nie Garantien; verbotene Formulierungen gemäss non-interpretative-proofing), zitierte Artikel NUR aus dem Quellenregister, fixe Optionsliste:
GRUEN → [Nichtigkeit gegenüber Vermieter geltend machen (Brief M2)] und/oder [Anfechtung einreichen (Brief M1)] · GELB → [Anfechtung bei der Schlichtungsbehörde bis {{frist_datum}} (Brief M1)] · ROT → [Frist verpasst – weitere Möglichkeiten mit Beratungsstelle klären; keine neuen Rechtsbehauptungen].
Alle Textbausteine: `pruefstand: fachlich_zu_verifizieren`.

**B. `core/src/brief.ts`** — zwei Mustertexte als Templates mit Pflicht-Platzhaltern
(`{{name_mieter}} {{adresse_mieter}} {{name_vermieter}} {{adresse_vermieter}} {{wohnungsadresse}} {{kuendigung_datum}} {{frist_datum}} {{adresse_schlichtungsbehoerde}}` – Behördenadresse als VOM_NUTZER_ZU_ERGAENZEN, nichts erfinden):
M1 „Anfechtungsbegehren an die Schlichtungsbehörde (Kanton LU)" · M2 „Mitteilung Nichtigkeit an die Vermieterschaft". Sachlicher Ton, Beilagenliste, Datum/Ort, keine Drohungen. Ausgabe: Markdown + druckfähiges HTML (Browser-Druck als PDF-Weg; dokumentierte Auslegung zu Plan-L2 „PDF").

**C. `core/src/chronologie.ts`** — Fallakte: Einträge `{zeitpunkt, typ, beschreibung, dokument_hash?}` (Typen: erfassung, kuendigung_erhalten, brief_erstellt, dokument_hinzugefuegt, export), Datei-Hashing mit vorhandener SHA-256, Export als JSON + Markdown inkl. regelversion, quellenstand, fallobjekt_hash.

**D. `webflow/`** — lokale Vite-App (vanilla TS, deutsch): Fragen strikt entlang `schemas/case-object.schema.json` (LU vorausgewählt; bedingte Fragen: Einschreiben→Abholfrist, Familienwohnung→separate Zustellung; Pflichtfelder erzwungen; jede Frage mit Ein-Satz-Hilfe). Ergebnisseite: Ampel, Begründungstexte, Artikel-Liste, konkretes Fristdatum, Brief-Vorschau M1/M2 mit Platzhalter-Feldern, Chronologie-Download. Alle Daten bleiben im Browser (kein Server, keine Übertragung, kein Tracking).

**E. Tests** — Ampel-Mapping gegen alle 20 Fixtures (erwartet: FX-002/003/004/005/018 GRUEN · FX-001/006–011/019 GELB · FX-020 ROT · FX-012–017 keine Ampel), Snapshot-Tests M1 (FX-001) und M2 (FX-002), Chronologie-Hash-Test. `npm test` (core) und `npm run build` (webflow) müssen grün sein.

**F. Bericht** — `berichte/AUFTRAG-S2-ABSCHLUSS.md` (deutsch): Was gebaut, Auslegungen, offene fachliche Punkte, Testübersicht, Git-Stand.

## 2. Nicht Bestandteil
LLM/OCR/Dokument-Upload · echte PDF-Bibliothek · Hosting/Deploy · MCP/Chat-Kanäle · weitere Kantone/Rechtsgebiete · Zahlungen · echte Pilotfälle und fachliche Prüfung (Mensch).

## 3. Abnahme
`cd core && npm test` grün · `cd webflow && npm ci && npm run build` grün · Bericht vorhanden · kein Commit/Push ohne Freigabe (CLAUDE.md).

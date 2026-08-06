# AUFTRAG-W0 — Abschlussbericht (Wissens-Register & Destillat-Pipeline, inkl. Ergänzungen E1–E3)

**Datum:** 2026-08-06 · **Plan:** DER_PLAN_v1.1_FROZEN.md (Hash gegen FREEZE.txt geprüft, identisch) · **LLM-Nutzung in der Fachlogik:** keine · **Neue Laufzeit-Abhängigkeiten:** keine

## Was gebaut wurde

**A. Schema** — `wissen/schema/erkenntnis.schema.json` (draft-07): Pflichtfelder id (R-<KANTON|CH>-####), regel, wenn, dann, quellen (nie leer), zeitstand, regelversion, pruefstand (3er-Enum), herkunft (5er-Enum); optional fall_anker (exakt 64 Hex, nur Hash), entscheid_quelle, review. `additionalProperties: false`.

**B. Migration** — `wissen/tools/migrate.ts` erzeugt deterministisch die ersten 11 Register-Einträge (`wissen/register/R-CH-0001…0010.json`, `R-LU-0001.json`) aus P1–P8, Q_BEFRISTET, Q_SCOPE und FEIERTAGE_LU; Rechtswerte wörtlich aus core übernommen (herkunft: auftrag, pruefstand unverändert; Q_SCOPE bleibt technisch_validiert). Danach liest core Quellen und Regel-Metadaten aus dem Register: migrate.ts regeneriert `core/src/register.gen.ts` aus den Register-Dateien (eine Quelle der Wahrheit, kein Laufzeit-Dateizugriff — core bleibt browser-tauglich). `quellen.ts` (QUELLEN, QUELLENSTAND), `regeln.ts` (REGELVERSION) und `fristen.ts` (P1=30, P4=7 über die dann-Konvention `parameter:<name>=<wert>`) beziehen ihre Werte jetzt von dort — ohne jede Verhaltensänderung (core 136 Tests unverändert grün). Bestehende Register-Dateien überschreibt migrate.ts nie.

**C. Eingangskorb** — `wissen/eingang/` (README) + `wissen/schema/kandidat.schema.json` mit zwei Typen: `status: kandidat` (wie Erkenntnis, ohne id, Pflichtfeld begruendung) und **E1:** `status: fehlermeldung` (Pflichtfelder regel_id + begruendung, optional regelversion) — beide ohne jegliche Falldaten: unbekannte Felder ungültig, Datumsangaben in Freitexten strukturell abgewiesen (ISO- und dd.mm.yyyy-Muster), Herkunftsbezug nur fall_anker/entscheid_quelle. `wissen/tools/uebernehmen.ts` prüft Schema, vergibt die nächste freie id je Region, trägt den Review-Vermerk (wer/wann frei) ein — entscheidet nichts und weist Fehlermeldungen ab (sie gehen nie ins Register).

**D. Quoten-Fundament** — `wissen/schema/quote.schema.json`, leeres `wissen/quoten/quoten.json`, `wissen/tools/quoten-sicht.ts` mit MINDESTFALLZAHL=10; unterhalb der Mindestfallzahl zeigt die Sicht nur "noch zu wenige Faelle" (auch die Zählwerte erscheinen nicht). Keine echten Daten.

**E. Öffentliche Sicht (nur lokal gebaut)** — `wissen/tools/build-dist.ts` erzeugt `wissen/dist/`: index.json (version, zeitstand, anzahl, signatur: null), alle.json, verifiziert.json (aktuell ehrlich leer — nichts ist fachlich verifiziert) und **E2:** versionen.json (regel_id → aktuelle regelversion). Deterministisch (zeitstand = jüngster Eintrags-Zeitstand, keine Systemzeit). Kein Deploy, kein Upload.

**E3. Fehler-Rückkanal im Feed-Prototyp (additiv)** — neues Modul `prototypen/feed/src/rechenweg.ts`: Am Einschätzungs-Ergebnis und auf der Mein-Fall-Karte gibt es den Ausklapper **"Rechenweg anzeigen"** (laienlesbare Wiedergabe des vorhandenen DTM-Trace-Inhalts: Schritt, Regel-ID, Quelle, Zeitstand — je herangezogener Quelle ein Schritt, reine Wiedergabe) und den Knopf **"Stimmt etwas nicht? Regel melden"**, der lokal eine fehlermeldung-Kandidatendatei nach E1-Schema erzeugt (localStorage; Export als JSON über die Werkbank). Die Mein-Fall-Karte zeigt den Hinweis *"Eine Regel deines Falls wurde aktualisiert — prüfe deine Frist neu."*, wenn die lokal verwendete Regelversion von versionen.json abweicht. `fall.ts` wurde additiv erweitert (regelversion, regelIds, rechenweg; Altbestand ohne diese Felder bleibt ladbar).

**F. Tests** — neue Suite `wissen/tests/` (44 Tests): Schema-Validierung aller Register- und Eingangs-Dateien · Register↔core-Konsistenz (kein Rechtswert doppelt/abweichend; register.gen.ts byte-identisch mit dem Register-Stand; P1=30/P4=7) · fall_anker-Format · Eingangskorb weist Falldaten-Felder und Fall-Daten in Freitexten ab · E1-Fehlermeldung gültig/ungültig · dist-Build deterministisch und abgelegter Stand aktuell (E2) · Integrationstest: die im Feed erzeugte Meldung erfüllt kandidat.schema.json. Feed: +13 Tests (`tests/rechenweg.test.ts`) für E3, bestehende Tests unverändert.

## Auslegungen (fragen statt raten — hier dokumentiert)

1. **Dev-Abhängigkeiten:** Der Auftrag nennt keine. wissen/ verwendet ausschliesslich bereits im Repo eingesetzte (typescript, vitest, ajv); die Werkzeuge laufen mit Nodes eigenem TypeScript-Support (`node tools/<name>.ts`), statt @types/node gibt es minimale eigene Ambient-Typen (`wissen/types/node-umgebung.d.ts`).
2. **"core liest aus dem Register"** ist als generiertes, versioniertes Modul `core/src/register.gen.ts` umgesetzt (kein fs-Zugriff zur Laufzeit; Feed/Webflow importieren core im Browser). Der Konsistenztest erzwingt Gleichstand mit den Register-Dateien.
3. **Pruefstand-Enum in core** um `fachlich_verifiziert` erweitert (reine Typ-Erweiterung; kein Wert geändert).
4. **Review-Vermerk** als optionales Feld `review {wer, wann}` im Erkenntnis-Schema (Teil C verlangt die Eintragung; das Pflichtfeld-Set des Auftrags bleibt unverändert).
5. **Falldaten-Verbot** ist strukturell durchgesetzt (geschlossene Feldliste + Datums-Muster-Guard in Freitexten). Namen/Adressen sind automatisch nicht sicher erkennbar — das menschliche Review-Gate bleibt dafür die Kontrolle (Grenze bewusst benannt).
6. **dann-Konvention** `flag:<id>` / `parameter:<name>=<wert>` / `folge:<kurztext>` (im Schema dokumentiert), damit Flags und Rechtsparameter maschinenlesbar bleiben.
7. **wissen/dist wird versioniert** (gezielte .gitignore-Ausnahme), weil der Feed-Prototyp versionen.json als Client konsumiert; ein Test schlägt fehl, sobald der abgelegte Stand vom Register abweicht. Das ist keine Veröffentlichung — der Entscheid darüber bleibt offen.
8. **E3-Scope:** AUFTRAG-W0 §2 schliesst prototypen/ aus; die Ergänzung E3 wurde vom Projektinhaber ausdrücklich beauftragt und additiv umgesetzt (kein bestehender Test geändert).
9. **Melde-Knopf** sitzt im Ausklapper, weil die Meldung eine Regel-ID aus dem angezeigten Rechenweg referenziert; gemeldet wird immer gegen die Regel, nie mit Falldaten (UI-Hinweis + Guard).

## Testübersicht (alle grün)

| Suite | Tests |
|---|---|
| core (`cd core && npm test`) | 136 (unverändert) |
| wissen (`cd wissen && npm test`) | 44 (neu) |
| feed (`cd prototypen/feed && npm test`) | 77 (64 bestehend + 13 neu) |
| webflow (`cd webflow && npm test`) | 9 (unverändert) |

Zusätzlich: `wissen npm run typecheck` und Feed-`npm run build` (tsc + vite) fehlerfrei.

## Git-Stand

Arbeitskopie mit neuen/geänderten Dateien (siehe `git status --short` in der Session); **kein Commit, kein Push** — Freigabe liegt beim Menschen (CLAUDE.md).

## Offene menschliche Punkte

- **Fachliche Verifikation** aller Register-Einträge: sämtliche Rechtsparameter tragen weiterhin `pruefstand: fachlich_zu_verifizieren` (einzig R-CH-0010/Q_SCOPE ist als Projektentscheidung technisch_validiert). verifiziert.json bleibt bis dahin leer.
- **Entscheid über Veröffentlichung / Repo-Split** des Wissens-Layers (Teil G des Auftrags; dist/ ist nur lokal gebaut).
- **Review eingehender Meldungen/Kandidaten**: Übernahme Eingang → Register ausschliesslich durch Menschen; die Datums-Heuristik ersetzt kein Review.
- **Freigabe für Commit/Push** der vorliegenden Arbeitskopie.

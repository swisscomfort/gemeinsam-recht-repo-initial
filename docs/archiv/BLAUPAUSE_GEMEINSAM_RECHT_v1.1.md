# GEMEINSAM RECHT — Blaupause v1.1

**Status:** Kanonisches Projektdokument. Ersetzt v1.0 vollständig und absorbiert die Produkt-Fassungen (BLAUPAUSE_RECHTSAPP_CH v1/v2). Bei Konflikten gilt v1.1. Es existiert keine zweite Zielarchitektur.
**Datum:** 2026-08-05
**Zielrepository:** `gemeinsam-recht-case-system` (ADR-0001)
**Änderungsgrund:** Externes Prüfergebnis, Auftrag GR-M0-001 — sieben Korrekturen, keine neue Produktarchitektur.

---

## 0. Kernthese

Eine Schweizer Rechts-App für Privatpersonen ersetzt keinen Anwalt. Sie zerlegt wiederholbare Rechts-Prozesspakete (Ersteinschätzung, Musterbrief, Frist, Beweissicherung, Schlichtungsvorbereitung) in kontrollierte, geführte Abläufe — und macht laufende Fälle später als Geschichten erlebbar, deren Ausgang die Community sichtbar mitverändert.

**Produktformel:**

```
Struktur zuerst, Modell zuletzt.
Regeln erzeugen Skalierung.
Beweise erzeugen Wert.
Stories erzeugen Rückkehr.
Updates erzeugen Vertrauen.
Gute Enden erzeugen Wachstum.
```

Das Sprachmodell ist austauschbarer Motor. Der Besitz liegt in vier Dingen: Wissens-Layer, Fall-Engine, Beweis-Layer, Story-Engine.

---

## 1. Nicht verhandelbare Invarianten

1. **Falldaten lokal und privat. Wissen zentral und öffentlich.** Öffentlich verankert werden ausschliesslich Hashes ohne Payload (Details L3), niemals Falldaten.
2. **Keine erfundenen Fälle als öffentliche Inhalte, Erfolgsnachweise, Nutzerberichte oder Validierungsdaten.** Synthetische Test-Fixtures sind zulässig, wenn sie eindeutig als solche gekennzeichnet sind und niemals als reale Fälle ausgegeben werden (Regeln: `tests/fixtures/README.md`).
3. **Keine Rechtsbehauptung ohne Quelle und Zeitstand.** Ausgabeform ist immer: deterministische, versionierte Regeln; Quellen- und Gültigkeitsnachweis; Kennzeichnung fehlender Angaben; unverbindliche Einschätzung statt verbindlichem Entscheid.
4. **Haftung durch Systemgrenzen, nicht durch Disclaimer.** Verantwortlichkeitsmatrix und verbotene Formulierungen aus `non-interpretative-proofing` sind bindend.
5. **Fristen, Beträge und Eskalationsschwellen werden deterministisch im Code berechnet.** Das LLM erklärt, formuliert und übersetzt — es rechnet nicht und entscheidet nicht.
6. **Der Feed belohnt gelöste Missionen, nie Lautstärke oder Leid.** Kein Empörungs-Ranking, keine Geld-Ranglisten, keine Drama-Optimierung.
7. **Keine Erfolgsprovision auf Eskalation.** Anwalts-Handoff nur gegen fixe Pauschale; jeder Geldfluss mit sichtbarem Split (Startannahme 85 Fall / 10 Betrieb / 5 Prüf-Pool).
8. **Privatpersonen als Gegenpartei werden nie geclustert und nie im Live-Format gezeigt.** Gegenparteien (nur juristische Personen) werden für Matching ausschliesslich gehasht gespeichert.
9. **Agenten sind interne Produktionsinfrastruktur.** Sie werden nie Teil des öffentlichen Produkts.
10. **Grundnutzung kostet den Nutzer nichts** ausser seiner eigenen KI-Anbindung. Für Test- und Validierungsphasen läuft die Inferenz über den eigenen Projekt-Schlüssel; die Invariante beschreibt das Distributions-Zielbild.
11. **Kein personenbezogenes Netzwerk-Lernen.** Kollektives Lernen läuft über Regeln, Zählsignale (ab Mindestfallzahl), freiwillige Beiträge und Opt-in-Stories — nie über gespeicherte Fälle.
12. **Erst Vertrauen, dann Wachstum.**

---

## 2. Architektur in sechs Schichten

### L0 — Gerät & Identität (local-first)

- Fallobjekt und volle Fallakte liegen verschlüsselt auf dem Gerät (Keystore/Secure Enclave, Passkey-Login).
- DID optional als spätere Identitätsebene — nur mit Recovery-Pfad; Geräteverlust darf nie Fallverlust bedeuten.
- An die KI geht nur das minimierte Fallobjekt (relevante Felder, optional pseudonymisiert), nie das Dossier.

### L1 — Wissens-Layer (der eigentliche Besitz)

- Versionierte, deterministische Regeln + Fragebäume + Musterbriefe + Fristenlogik, pro Rechtsgebiet und Kanton.
- Methodik = `anspruchsradar-schweiz`: Jurisdiktion, zuständige Stelle, Quellenbezug, Zeitstand, Prüfstand — technische Validierung und fachliche Verifikation strikt getrennt.
- Publikationsformat = OSM-CH-Standard (`/.well-known`-Discovery, Freshness, Signatur).
- Gespeist durch die Open-Data-Factory: Änderungsmonitoring Fedlex, Gerichtsentscheide, kantonale Erlasse. Jede erkannte Änderung = Regel-Kandidat **und** Feed-Karten-Entwurf.
- Beiträge von aussen nur über Review-Gate; jede Regel trägt Autor, Prüfer, Version.

### L2 — Fall-Engine (geführter Flow)

```
Kachel (Rechtsgebiet) → Fragebaum (Kanton Pflicht, Daten, Beträge, Ja/Nein)
→ Dokument-Upload (Extraktion füllt vor, Nutzer bestätigt)
→ deterministische Anreicherung (Fristenrechner, Regel-Flags)
→ Fallobjekt (JSON, `schemas/case-object.schema.json`)
→ Prompt/Tool-Aufrufe + Wissens-Layer-Abruf
→ Ausgabeschema: Ampel-Einschätzung | Rechtsgrundlagen mit Quellen |
   Optionen | Fristenwarnung | fertiger Brief (PDF)
```

- Jede Ausgabe trägt einen **maschinenlesbaren DTM-Trace**: Gegenstand, Zeitpunkt, Rolle, Basis (Fallobjekt + Quellen + Regelversion), verworfene Alternativen, Begründung.
- Fehlen entscheidende Angaben, wird **kein Ergebnis** ausgegeben, sondern die Lücke benannt.
- Fall-Status sofort sichtbar: `offen | Frist läuft | Brief raus | Antwort ausstehend | Schlichtung | gelöst | teilweise gelöst | an Fachstelle übergeben | abgebrochen`.

### L3 — Beweis-Layer

- Jedes Beweisstück wird als InkSeal `.proof` gesichert: Manifest, SHA-256, optional RFC-3161-Zeitstempel/Signatur. Zeitanker nach PTAS; IPFS höchstens als zusätzlicher Anker-Transport für Hashes.
- **Refactor des Prototyps (verbindlich):**
  1. `ipfs_cid` → `storage_ref`; Payload local-first bzw. verschlüsselt auf CH-Storage unter Nutzerschlüssel. Kein Payload auf öffentlichen Netzen.
  2. Dateischlüssel nie roh serverseitig; bei Teilnehmer-Sharing pro Teilnehmer asymmetrisch gewrappt.
  3. Lösch-Endpoints für Payload und Metadaten (nDSG). Der öffentliche Hash-Anker enthält keine Payload und wird ohne öffentliches Mapping, Klardaten oder sprechende Metadaten gespeichert. Ob ein konkreter Anker als anonym oder weiterhin als Personendatum einzustufen ist, wird anhand seiner Verknüpfbarkeit, Metadaten und Zugriffsmöglichkeiten geprüft (EDÖB: Hashing = Pseudonymisierung).
  4. `.proof`-Export je Beweisstück und je Fallakte.
  5. `target_entity` nur gehasht; `summary` unterliegt den Schutzstufen (L4).

### L4 — Story- & Community-Layer (spätere Phase, Reihenfolge Abschnitt 7)

- Dramaturgie: Situation → Problem → Mission → Reaktionen → Update → gutes Ende / nächster Schritt. Aussen ein Format, innen Schutzstufen:

| Stufe | Rechtsfassung | Behandlung |
|---|---|---|
| S1 | Bagatelle | frecher Ton erlaubt, leichte Moderation |
| S2 | Standardfall Miete/Arbeit/Konsum | geprüfte Hinweise, Belege, Zeitversatz-Option |
| S3 | betreuter Fall | Jurist-Pate, geführte Kommentare |
| S4 | geschützt (Re-Identifikationsrisiko) | starke Anonymisierung, Kommentare eingeschränkt |
| S5 | nie öffentlich (Strafrecht, Gewalt, akute Gefährdung) | keine Story — direkt an Fachstelle |

- Täglicher Trigger „Heute ist etwas passiert", Folgen-Funktion, saisonale Pflicht-Pushes.
- Interventionsformen: geprüfte Wissens-Hinweise (zwei sichtbare Klassen: Community-Meinung vs. verifizierte Regel) · Abstimmungen · Stufe 2: zweckgebundene Mikro-Kostenübernahmen mit Limits.
- Schutzregeln: keine Namen, keine re-identifizierenden Details, Community wirkt nur auf der Plattform, Betrugsverdacht in vertraulichen Meldekanal, Abkühlphase vor scharfen Eskalationen.
- Reputation belohnt Hinweise, die klären — nie Geldhöhe. Juristen bauen Fach-Reputation auf → Handoff-Pipeline.
- **Destillat-Regel (korrigiert):** Jede abgeschlossene Story erzeugt automatisch einen **Kandidaten** für eine neue oder geänderte Regel, einen **möglichen** Erfolgsquoten-Datenpunkt und einen **Entwurf** für eine Feed-Karte. Eine Regel wird erst nach Quellenprüfung und Review-Gate in L1 übernommen. Erfolgsquoten werden erst ab definierter Mindestfallzahl veröffentlicht.

### L5 — Vertrieb & KI-Anbindung

- **Kern = ein MCP-Server** über der kanal-agnostischen Fachbibliothek (Regeln, Fragebäume, Fristenrechner, Briefgenerator, Proof-Werkzeuge).
- Kanäle desselben Backends, in dieser Reihenfolge:
  1. **ChatGPT-Kanal:** MCP-basierte App- beziehungsweise Plugin-Integration über die jeweils aktuelle offizielle OpenAI-Veröffentlichungs- und Distributionsschiene; konkrete Distributionsform wird zum Implementierungszeitpunkt verifiziert.
  2. **Claude-Kanal:** Connector auf demselben MCP-Server.
  3. **Eigenes Frontend:** erst nach nachgewiesener Nutzung (Premium-/Datenschutz-Schiene, CH-Hosting).
- BYOK/Abo-Proxy höchstens als Bonus für Power-User, nie als Fundament.

---

## 3. Governance: LEGAL_AI_OPERATING_RULES (ab Tag 1)

Verbindlich in `docs/LEGAL_AI_OPERATING_RULES.md`. Kernpunkte: Die KI entwirft, sie publiziert nie selbst; Review-Gate vor jeder Veröffentlichung; Prüftiefe risikobasiert nach Schutzstufe; jede Rechtsaussage mit Quelle + Zeitstand + Regelversion; Unsicherheit wird markiert; Rechtsfragen ohne Regelbasis werden als Prüfbedarf formuliert, nie als Faktum; keine erfundenen Partner, Zahlen, Urteile.

---

## 4. Monetarisierung (Reihenfolge, nie gleichzeitig)

| Stufe | Modell | Regel |
|---|---|---|
| 1 | Gratis-Grundnutzung über Kanal 1/2 | Nutzer bringt sein KI-Abo; unsere Kosten = Backend-Fixkosten |
| 2 | Anwalts-Handoff | fixe Vermittlungspauschale; Split sichtbar vor jeder Zahlung |
| 3 | Premium | Brief-Serien, Fristen-Reminder, `.proof`-Exporte, Fall-Chronik |
| 4 | Mikro-Kostenübernahmen | 85/10/5-Split, Limits, Prüf-Pool ohne Erfolgsprovision |
| 5 | B2B | Risikominimierung für Verwaltungen/Kanzleien; Sponsoring nur mit harter Kennzeichnung |

---

## 5. Startvertikale & Kaltstart

**Startfall:** Anfechtung oder Prüfung einer Wohnungskündigung im Kanton Luzern (ADR-0002).

**Sozialhilfe:** Datenquelle und spätere Anschlussvertikale, nicht Bestandteil von M1.

- Genau ein Flow, ein Kanton, ein Behördenweg, eine fachliche Verantwortlichkeit — erst nach M1-Abnahme wird erweitert (weitere Kantone vor weiteren Rechtsgebieten).
- Vertikale 2 (nach Freigabe): Konsumrecht via `agbspec`-Score-Engine.
- Kaltstart-Regeln: acht starke, echte, kuratierte Fallgeschichten schlagen fünfundzwanzig mittelmässige; Impact-Zähler ab Tag 1; Seeds nur echt und mit Einwilligung.
- Sprachen: Start DE; FR/IT als eigener Meilenstein.

---

## 6. Konsolidierungs-Map (je Repo genau eine Aktion)

| Quell-Repo | Baustein | Aktion |
|---|---|---|
| `gemeinsam-recht-case-system` (main) | Zielrepo; Cases/Evidence/Participants; Client-Crypto-Ansatz | **keep** (Refactor gem. L3) |
| `impact-story-network` | Story-Engine, Schutzstufen, Geld-/Würde-Regeln, Trigger, MVP-Methode | **freeze** (Referenzstand) |
| `anspruchsradar-schweiz` | Wissens-Layer-Methodik, Antwortformel, Katalogformat | **reference** |
| `sozialamt` | Gemeindedaten LU, Mietzinslogik, Musteranträge | **merge** |
| `Existenzminimum` | Pitch- und Flow-Muster | **close** |
| `agbspec` (+ `score-engine`) | Konsumrecht-Modul, Regel-Engine-Paket | **reference** |
| `inkseal-core`, `ptas-proof-anchor`, `dbs`, `decision-trace-minimum` | Beweis- & Trace-Standards | **reference** (FROZEN respektieren) |
| `non-interpretative-proofing` | Haftungsarchitektur, Textbausteine | **merge** |
| `HERMES_OPERATING_RULES` (ISN) | Governance-Vorlage | **reference** |
| `swiss-open-data-factory`, `Schweiz`/OSM-CH | Änderungsmonitoring, Publikationsstandard | **reference** |
| `Time-based-decison-shield` | Abkühl-Reibung | **freeze** (Backlog) |
| `MietPass`, `mietpass-2/v2`, `wohnsicher-ch`, `sozialwohnung`, `scheiss_nachbar` | Domänenmaterial Miete/Nachbarn | **freeze** |
| `compliance-driven-business` | B2B-These | **reference** |

---

## 7. Meilensteine (Reihenfolge unverändert; Eintrittskriterien ergänzt)

| MS | Inhalt | Definition of Done / Eintrittskriterium |
|---|---|---|
| **M0** Konsolidierung | Blaupause v1.1, LEGAL_AI_OPERATING_RULES, ADR-0001/0002, Case-Object-Schema, Fixture-Regeln, STATUS.md im Zielrepo | alle Artefakte gemerged; Quell-Repos gemäss Map markiert; **keine Implementierung von M2–M4 während M0** |
| **M1** Wissens-Kern: Flow „Mietkündigung Kanton LU" | Fragebaum + Regeln + Fristenrechner + Musterbrief + Quellenregister | mind. 20 versionierte Test-Fixtures, davon mind. 5 Frist-Grenzfälle und mind. 5 Fälle mit fehlenden oder widersprüchlichen Angaben · mind. 3 echte Pilotfälle mit Einwilligung · 100 % deterministische Reproduzierbarkeit · jede Rechtsaussage mit Quelle, Zeitstand und Regelversion · keine Ausgabe bei fehlenden entscheidenden Angaben · fachliche Prüfung von Fragebaum und Mustertexten dokumentiert · maschinenlesbarer DTM-Trace für jede Ausgabe |
| **M1b** Nutzer-Validierung (parallel, Web-Flow) | Test mit mind. 10 projektfremden Personen; Landingpage + Warteliste | 8/10 schliessen ohne persönliche Erklärung ab · 7/10 verstehen ihren nächsten Schritt · 5/10 würden den Brief verwenden · Go/No-Go dokumentiert |
| **M2** Beweis-Layer | Prototyp-Refactor: `storage_ref`, Hash-Anker, `.proof`-Export, Lösch-Endpoints, Key-Wrapping | Beweisstück → `.proof` → mit Referenz-Validator verifizierbar |
| **M3** Vertrieb | MCP-Server produktiv; erster Chat-Kanal eingereicht | Eintritt: M1 + M1b bestanden · ein projektfremder Nutzer löst einen Fall über sein eigenes Abo |
| **M4** Story-Layer S1 | Live-Fälle, Folgen-Funktion, Feed, Reputations-Basis | Eintritt: M3 vier Wochen stabil · Moderations- und Review-Kapazität besetzt · Re-Identifikations-Check implementiert |
| danach | eigenes Frontend, Mikro-Finanzierung, weitere Kantone/Gebiete/Sprachen | je eigener, versionierter Beschluss |

---

## 8. Offene Entscheidungen

1. Marke „Gemeinsam Recht" bestätigen oder neu (Domain-/Markencheck CH).
2. Trägerschaft & Rechtsform (spätestens vor Monetarisierungsstufe 2).
3. Identität: Passkey-Konto zuerst; DID mit Recovery als späterer Beschluss.
4. Zeitanker: RFC-3161-TSA, OpenTimestamps oder beide (Beschluss in M2).
5. Fachliche Prüfinstanz für das Quellenregister (wer zeichnet „letzte fachliche Prüfung"?).
6. Zahlweg für Stufe 3/4 (App-Store-Regeln vs. Web-Checkout).

---

*Ende Blaupause v1.1 — Änderungen nur versioniert (v1.x). Diese Fassung erfüllt die Prüfliste aus GR-M0-001: sechs Schichten konsistent, Fixtures ausdrücklich erlaubt und gekennzeichnet, keine automatische Regelübernahme aus Einzelfällen, keine absolute Hash-Aussage, genau ein M1-Flow, je Quell-Repo genau eine Aktion, keine zweite Zielarchitektur.*

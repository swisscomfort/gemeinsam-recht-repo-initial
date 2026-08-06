# AUFTRAG-R0 — Abschlussbericht

**Auftrag:** Redaktion: echte Schweizer Entscheide als Zeitungsstoff (privat)
**Plan-Referenz:** DER_PLAN_v1.1_FROZEN.md §4 Stiller Parallelbau (CR-001), §6 L1; Invarianten 2, 3, 9, 12
**Datum:** 2026-08-07 · **Bearbeitung:** Claude Code (Fable 5)

---

## 1. Was gebaut wurde

### Teil 1 — Feed-Lader: neue Kategorie `NACHERZAEHLT_OEFFENTLICH`
- `prototypen/feed/src/story.ts`: Der Lader akzeptiert zusätzlich
  `kennzeichnung: NACHERZAEHLT_OEFFENTLICH` mit den Pflichtfeldern `quelle`
  (Aktenzeichen), `gericht`, `entscheid_datum` (Vergangenheit),
  `verfahren_abgeschlossen: true`. Verweigert wird — mit allen Gründen, nie
  stillschweigend: fehlende/leere Quelle · Datum in der Zukunft ·
  `verfahren_abgeschlossen` fehlt oder ist nicht exakt `true` · Schutzstufe
  höher als S2 · unbekannte Schlüssel (bestehende Strenge gilt weiter) ·
  fehlende Pflichtzeile in `story.md` (inkl. Abgleich der exakten Quelle).
- Die Quellfelder sind NUR für diese Kategorie erlaubt; bei FIKTIV bleiben
  sie unbekannte Schlüssel (Verweigerung).
- `ausgabe.ts`/`serien.ts`: Jede Karte dieser Kategorie trägt sichtbar
  „Nach einem echten, öffentlich publizierten Entscheid · <quelle>"
  (`badgeFuer`); FIKTIV-Karten behalten „FIKTIVES LEHRSTÜCK".
- `quelle.ts`/`main.ts`: Die Vergangenheits-Prüfung braucht ein Heute-Datum;
  es wird von der UI-Schicht injiziert (`ladeAlle(simDatum)`) — keine
  Systemzeit in der Fachlogik. **Ohne injiziertes Datum wird die Kategorie
  verweigert**, nie stillschweigend akzeptiert.
- Banner-Texte des Prototyps angepasst, damit sie wahr bleiben („alle
  Geschichten FIKTIV" → „FIKTIV oder gekennzeichnet nacherzählt").

### Teil 2 — Beschaffungswerkzeug `redaktion/`
- CLI `npm run kandidaten` (Node/TypeScript, kompiliert mit `tsc`, keine
  Laufzeit-Abhängigkeiten): holt Entscheide ab 2025-01-01 bis heute
  (übersteuerbar mit `--von` / `--bis`), gefiltert nach der konfigurierbaren
  Rechtsgebiets-Liste `redaktion/filter.json` (aktiv: Mietrecht; vorbereitet:
  Arbeit, Konsum, Nachbarschaft, Strassenverkehr).
- Ausgabe: `redaktion/kandidaten/JJJJ-MM.md`, je Zeile
  `Entscheiddatum · Gericht · Aktenzeichen · Betreff-Einzeiler · Link`.
- Es werden NUR Metadaten und Links gespeichert (`_source`-Filter auf
  `date, hierarchy, abstract, title, reference`) — keine Volltexte.
- Höflicher Abruf: 100 Treffer je Seite, 1 Sekunde Pause zwischen Seiten,
  klarer User-Agent mit Kontakt, harte Obergrenze 1000 Treffer mit
  sichtbarer Meldung (nie stilles Kappen), sauberer Abbruch mit deutscher
  Meldung bei HTTP-/Netzfehlern. Kein Abruf ausserhalb dieses Werkzeugs.
- Funktionsnachweis am 2026-08-07 (Zeitraum 2026-08-01 bis 2026-08-07,
  Mietrecht): 2 Kandidaten → `redaktion/kandidaten/2026-08.md`.

### Teil 3 — Redaktionskonvention
- `redaktion/vorlage-nacherzaehlt.md`: fertiges `meta.yaml`-Gerüst und
  `story.md`-Kopf mit Pflichtzeile; Nummernkreise dokumentiert
  (001–099 FIKTIV · **100–199 NACHERZAEHLT** · 9xx PLATZHALTER).
- Noch keine nacherzählte Story angelegt — das Nacherzählen ist menschliche
  Redaktionsarbeit ausserhalb dieses Auftrags (`llm_nutzung: verboten`).

## 2. Gewählte Quelle/Schnittstelle (Auslegung)

**Gewählt: entscheidsuche.ch, öffentlicher Suchendpunkt
`POST https://entscheidsuche.ch/_search.php` (Elasticsearch-Abfragesprache).**

Begründung der Auslegung („stabilste offizielle Schnittstelle"):
- Der Auftrag nennt bger.ch und entscheidsuche.ch als zulässige offizielle
  Quellen. bger.ch bietet keine dokumentierte Programmier-Schnittstelle;
  ein Abgriff der Weboberfläche wäre fragil.
- entscheidsuche.ch bietet einen öffentlichen, strukturierten Suchendpunkt
  mit Metadaten-Feldern (`date`, `hierarchy`, `title`, `reference`,
  `abstract`), deterministischer Sortierung, Datumsfilter und `_source`-
  Filter (nur Metadaten — erfüllt „keine Volltexte" direkt) und deckt
  Bundesgericht UND kantonale Gerichte ab (mehr Stoff fürs Mietrecht,
  das häufig kantonal endet).
- Verifiziert am 2026-08-07 durch Testabfragen (Antwortform wie in
  `redaktion/tests/fixtures/beispiel-antwort.json` festgehalten);
  kanonischer Link je Entscheid: `https://entscheidsuche.ch/view/<id>`.

Weitere dokumentierte Auslegungen:
1. **Rechtsgebiets-Filter als Volltext-Suchanfragen** (`filter.json`,
   Lucene-Syntax): Die Quelle führt keine verlässliche Rechtsgebiets-
   Klassifikation; die Suchbegriffe je Gebiet sind redaktionell
   verfeinerbar. Treffer sind Kandidaten, keine Einordnung — die Auswahl
   bleibt Redaktionsarbeit.
2. **„Datum in der Zukunft" (Lader):** geprüft gegen ein injiziertes
   Heute-Datum der UI-Schicht (simuliertes Datum beim Laden); ohne
   injiziertes Datum wird verweigert. `entscheid_datum` gleich dem
   Prüfdatum gilt nicht als Zukunft.
3. **Sichtbare Texte mit Umlauten:** Der Auftrag schreibt umlautfrei
   („oeffentlich", „nacherzaehlt"); sichtbare UI-/Story-Texte verwenden wie
   im Bestand die korrekte Schreibweise („öffentlich", „nacherzählt"). Die
   Pflichtzeilen-Prüfung verlangt die drei festen Bestandteile
   „NACH ECHTEM ENTSCHEID", „Quelle: <exakte quelle>", „Namen ersetzt"
   auf einer Zeile und hängt nicht an der Umlaut-Schreibweise.
4. **Dev-Abhängigkeit `@types/node`** (nur Typdefinitionen, keine
   Laufzeit-Abhängigkeit): nötig, damit TypeScript den Node-Rand des CLI
   (Dateisystem, Prozessargumente) kompiliert. `typescript` und `vitest`
   wie in den bestehenden Paketen.
5. **Test-Fixtures:** Die `FX-NACHERZAEHLT-*`-Fixtures tragen ein
   ERFUNDENES Aktenzeichen („BGer 4A_999/2025", im Fixture-README als
   erfunden ausgewiesen) und `fixture: true` — sie erscheinen nie im Feed
   (Invariante 2). Die gespeicherte Beispiel-Antwort der Schnittstelle
   enthält dagegen echte, öffentliche Metadaten dreier Entscheide — dort
   wird nichts erfunden.

## 3. Testübersicht

| Suite | Kommando | Ergebnis |
|---|---|---|
| Feed-Prototyp (inkl. neuer Kategorie) | `cd prototypen/feed && npm test` | **95/95 grün** (14 neue in `tests/nacherzaehlt.test.ts`) |
| Redaktionswerkzeug (Format) | `cd redaktion && npm test` | **10/10 grün** (inkl. `tsc --noEmit`) |
| core (unverändert) | `cd core && npm test` | 136/136 grün |
| webflow (unverändert) | `cd webflow && npm test` | 9/9 grün |
| wissen (unverändert) | `cd wissen && npm test` | 44/44 grün |

Neue Lader-Tests decken jeden Verweigerungsgrund einzeln über
Negativ-Fixtures ab (fehlende Quelle, leere Quelle, Zukunftsdatum, fehlendes
Prüfdatum, `verfahren_abgeschlossen` fehlt/false, S3, unbekannter Schlüssel,
Quellfelder bei FIKTIV, fehlende/abweichende Pflichtzeile, Datumsform) plus
Annahme- und Badge-Tests. Die Werkzeug-Tests prüfen das Listenformat
deterministisch aus der gespeicherten Beispiel-Antwort — der Netz-Abruf
selbst läuft in keinem Test.

## 4. Bedienungsanleitung für den Chefredaktor (2 Befehle)

```bash
# 1. Kandidatenliste holen (Mietrecht, ab 2025-01-01 bis heute):
cd redaktion && npm run kandidaten
#    -> Listen unter redaktion/kandidaten/JJJJ-MM.md
#    (optional: --von JJJJ-MM-TT --bis JJJJ-MM-TT; Gebiete in filter.json)

# 2. Story anlegen: Vorlage kopieren und von Hand nacherzählen:
cp redaktion/vorlage-nacherzaehlt.md /tmp/notiz.md   # Gerüst ansehen
#    -> prototypen/stories/FS-1xx-<kurzname>/{meta.yaml,story.md}
#    Der Feed prüft beim Laden alles Weitere selbst (verweigert Abweichungen).
```

## 5. Git-Stand

Geänderte Dateien (feed): `src/story.ts`, `src/quelle.ts`, `src/ausgabe.ts`,
`src/serien.ts`, `src/main.ts`, `package.json`, `tests/ausgabe.test.ts`,
`tests/serien.test.ts` (nur neues Pflichtfeld in Test-Hilfsobjekten),
`tests/fixtures/README.md`. Neu: `tests/nacherzaehlt.test.ts`, 8
`FX-NACHERZAEHLT-*`-Fixtures, das Verzeichnis `redaktion/` (Werkzeug, Filter,
Vorlage, Tests, Kandidatenliste 2026-08), dieser Bericht, STATUS-Zeile.
Details: `git status --short` am Ende der Session. **Kein Commit/Push ohne
Freigabe.**

## 6. Nicht Bestandteil (eingehalten)

Kein automatisches Nacherzählen/Zusammenfassen (kein LLM im Auftrag),
kein Volltext-Archiv, keine Veröffentlichung, keine Live-/laufenden
Verfahren (Lader erzwingt `verfahren_abgeschlossen: true`), keine
Änderungen an `core/` oder `webflow/`.

## 7. DTM-Trace

```json
{
  "gegenstand": "AUFTRAG-R0: Feed-Kategorie NACHERZAEHLT_OEFFENTLICH + Beschaffungswerkzeug redaktion/ + Redaktionskonvention",
  "zeitpunkt": "2026-08-07",
  "rolle": "redaktion",
  "basis": {
    "fallobjekt_hash": "entfaellt (kein Fallbezug)",
    "regelversion": "keine Aenderung an Rechtsregeln (core unveraendert)",
    "quellenstand": "entscheidsuche.ch, Schnittstelle verifiziert 2026-08-07"
  },
  "alternativen": [
    "bger.ch direkt abgreifen — verworfen: keine dokumentierte Schnittstelle, fragil",
    "Volltexte zwischenspeichern — verworfen: Auftrag verbietet Volltext-Archivierung"
  ],
  "begruendung": "Auftrag R0 vollstaendig im definierten Umfang umgesetzt; alle Pruefungen deterministisch, Verweigerung als Standardreaktion, Netz nur im Beschaffungswerkzeug."
}
```

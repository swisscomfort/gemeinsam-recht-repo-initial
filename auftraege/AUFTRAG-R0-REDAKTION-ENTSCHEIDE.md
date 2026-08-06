# AUFTRAG-R0 — Redaktion: echte Schweizer Entscheide als Zeitungsstoff (privat)

```yaml
auftrag: R0
plan_referenz: "DER_PLAN_v1.1_FROZEN.md §4 Stiller Parallelbau (CR-001), §6 L1; Invarianten 2, 3, 9, 12"
charakter: "internes Redaktionswerkzeug + neue Story-Kategorie; nichts wird veroeffentlicht"
netz: "AUSNAHMSWEISE erlaubt, ausschliesslich fuer das Beschaffungswerkzeug (offizielle Quellen: bger.ch, entscheidsuche.ch); alle Prototypen selbst bleiben offline"
llm_nutzung: verboten (Nacherzaehlen ist Redaktionsarbeit ausserhalb dieses Auftrags)
neue_laufzeit_deps: keine
```

## 0. Ziel in einem Satz
Der Feed bekommt echten Stoff: oeffentlich publizierte Schweizer
Gerichtsentscheide (ab 2025-01-01) werden als Kandidatenliste beschafft und
koennen — nacherzaehlt und klar gekennzeichnet — als Karten erscheinen.

## 1. Neue Story-Kategorie NACHERZAEHLT_OEFFENTLICH (Feed-Lader)
- Zusaetzlich zu FIKTIV akzeptiert der Lader `kennzeichnung: NACHERZAEHLT_OEFFENTLICH`
  mit Pflichtfeldern: `quelle` (Aktenzeichen, z. B. "BGer 4A_123/2025"),
  `gericht`, `entscheid_datum` (Vergangenheit), `verfahren_abgeschlossen: true`.
- Verweigert wird: fehlende/leere Quelle · Datum in der Zukunft ·
  `verfahren_abgeschlossen` fehlt oder false · Schutzstufe hoeher als S2 ·
  unbekannte Schluessel (bestehende Strenge gilt weiter).
- Jede Karte dieser Kategorie zeigt sichtbar:
  "Nach einem echten, oeffentlich publizierten Entscheid · <quelle>".
- Story-Text-Pflichtzeile analog FIKTIV:
  "> NACH ECHTEM ENTSCHEID — nacherzaehlt; Quelle: <quelle>. Namen ersetzt."

## 2. Beschaffungswerkzeug `redaktion/`
- CLI `npm run kandidaten` (Node/TypeScript, im redaktion/-Ordner):
  holt von der offiziellen Quelle (bger.ch und/oder entscheidsuche.ch — du
  waehlst die stabilste offizielle Schnittstelle und dokumentierst sie als
  Auslegung) Entscheide ab 2025-01-01 bis heute, gefiltert nach einer
  konfigurierbaren Rechtsgebiets-Liste (`redaktion/filter.json`, Start:
  Mietrecht; vorbereitet: Arbeit, Konsum, Nachbarschaft, Strassenverkehr).
- Ausgabe: `redaktion/kandidaten/JJJJ-MM.md` als Liste, je Zeile:
  Entscheiddatum · Gericht · Aktenzeichen · Betreff-Einzeiler · Link.
- Es werden NUR Metadaten und Links gespeichert, keine Volltexte archiviert.
- Hoeflicher Abruf: gedrosselt, klarer User-Agent, sauberer Abbruch bei
  Fehlern mit deutscher Meldung. Kein Abruf ausserhalb dieses Werkzeugs.

## 3. Redaktionskonvention
- Nacherzaehlte Stories liegen unter `prototypen/stories/FS-1xx-<kurzname>/`
  (Nummernkreis 100–199 = NACHERZAEHLT; 001–099 = FIKTIV; 9xx = PLATZHALTER).
- Vorlage `redaktion/vorlage-nacherzaehlt.md` mit fertigem Kopf (meta.yaml-
  Geruest + Pflichtzeile), damit Redaktion nur noch Text einfuellt.

## 4. Tests
- Lader: alle neuen Verweigerungsgruende einzeln (Negativ-Fixtures) ·
  bestehende Suites (feed, core) bleiben unveraendert gruen.
- Werkzeug: Listenformat deterministisch aus einer gespeicherten Beispiel-
  Antwort (Fixture) — der Netz-Abruf selbst wird nicht im Test ausgefuehrt.

## 5. Bericht
`berichte/AUFTRAG-R0-ABSCHLUSS.md`: Was gebaut, gewaehlte Quelle/Schnittstelle
als Auslegung, Testuebersicht, Git-Stand, kurze Bedienungsanleitung
(2 Befehle) fuer den Chefredaktor.

## 6. Nicht Bestandteil
Automatisches Nacherzaehlen oder Zusammenfassen von Urteilen · Volltext-
Archiv · Veroeffentlichung jeder Art · Live-/laufende Verfahren ·
Aenderungen an core/ oder webflow/.

## 7. Abnahme-Kommandos
cd prototypen/feed && npm test        # gruen inkl. neuer Kategorie
cd redaktion && npm test              # gruen (Format-Tests)
Kein Commit/Push ohne Freigabe (CLAUDE.md).

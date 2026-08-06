# AUFTRAG-F1 — Abschlussbericht: Leser-wird-Nutzer-Journey (privat, offline)

**Datum:** 2026-08-06 · **Auftrag:** `auftraege/AUFTRAG-F1-LESER-JOURNEY.md` · **Plan:** v1.1 §4 „Stiller Parallelbau" (CR-001 inkl. F1), §1 Fernziel; Invarianten 1, 2, 3, 6, 11, 12

## 1. Was gebaut wurde

Alles in `prototypen/feed/` (F0-Basis erweitert) plus 4 Platzhalter-Serien in
`prototypen/stories/`. `core/` und `webflow/` wurden **nicht verändert** — nur
genutzt. Keine neuen Laufzeit-Abhängigkeiten; Dev weiterhin nur vite,
typescript, vitest.

- **Leser-Modus als Standard (`src/main.ts`):** Beim Öffnen erscheint die
  Ausgabe des Tages (Kopf mit Datum, 3–5 Karten, feste Abschlusskarte „Fertig
  für heute"). Simulierte Zeit über „Nächster Morgen" und Datumswahl.
  Folgen-Mechanik: Stern je Serie; gefolgte Serien mit neuem Update erscheinen
  zuerst, mit Hinweis „Update zu deiner Serie". Hinweisbanner in allen
  Ansichten, im Leser-Modus kompakt. Werkbank (Zähler, verweigerte
  Geschichten, JSON-Export — vollständig aus F0 erhalten) hinter dezentem
  Link „Werkbank".
- **Journey-Komposition (`src/serien.ts`):** Serien verteilen ihre Etappen
  über aufeinanderfolgende Ausgaben. Welche Etappe eine Serie zeigt, ist reine
  Arithmetik über das injizierte Datum (Tagesnummer + ID-Versatz, zyklisch;
  `zuTagen`/`addTage` aus dem Kern). Kein Zufall, keine Systemzeit in der
  Fachlogik → gleiche Stories + gleiche Tagesfolge ⇒ identische Ausgabenfolge.
- **Übergang „Es betrifft mich" (`src/main.ts`):** Dauerhafter, unaufgeregter
  Einstieg „Ich habe Post bekommen" im Kopf; Karten mit `rechtsgebiet
  mietrecht_*` tragen den Knopf „Betrifft mich das?". Beide führen in den
  bestehenden S2-Fragebaum. Rückweg „Zurück zur Ausgabe" ohne Datenverlust
  (Datum und Lesestand bleiben unberührt; Ausgabe wird deterministisch
  identisch neu aufgebaut, getestet). Klar markierter Knopf „Beispieldaten
  einsetzen (FX-001)" füllt die Fixture-Werte ein.
- **Private Fallkarte „Mein Fall" (`src/fall.ts`):** Nach abgeschlossenem
  Fragebaum erscheint oben in der Ausgabe die Karte „Mein Fall" mit Status aus
  dem Kern-Ergebnis (Ampel, „Frist läuft bis {Datum}", „Brief bereit"), Badge
  „PRIVAT — nur auf diesem Gerät". Ausgegrauter Hinweis „Später: als anonyme
  Geschichte teilen (Phase S)" — nur Vision, nichts gebaut. Gespeichert wird
  ausschliesslich ein minimaler Status-Auszug im Browser (kein Fallobjekt,
  keine Antworten); „Fall entfernen" löscht rückstandsfrei (localStorage-Key
  wird entfernt).
- **Emotions-Lauf über die ganze Journey (`src/lauf.ts`):** Stationen mit
  fester Arten-Liste (`karte`, `uebergang`, `fragebaum_schritt`, `ergebnis`,
  `mein_fall`), Emotion aus der unveränderten festen F0-Liste + optionale
  Notiz + Abbruchstelle. Soll-Emotionskurve im Log-Kopf:
  `Schreck/Angst -> Orientierung -> Handlungsfaehigkeit -> Erleichterung`.
  Der 100er-Zähler (`journeysGesamt`) zählt nur vollständige
  Journey-Durchläufe (alle fünf Stationsarten + abgeschlossen); der
  F0-Zähler `durchlaeufeGesamt` bleibt daneben bestehen. Der Schema-Wächter
  (abschliessende Erlaubnisliste + Verbotsmuster `zeit|dauer|klick|…`) gilt
  unverändert: Zeit-, Verweildauer- und Engagement-Felder sind strukturell
  nicht erfassbar.
- **Platzhalter-Serien (F1 §5):** `FS-901-platzhalter-velo-im-treppenhaus`
  (nachbarschaft_alltag, 3 Etappen), `FS-902-platzhalter-kellerabteil`
  (mietrecht_alltag, 2), `FS-903-platzhalter-zahlendreher` (mietrecht_alltag,
  3), `FS-904-platzhalter-verschwundenes-paket` (konsum_alltag, 2). Alle
  `kennzeichnung: FIKTIV`, Schutzstufe S1/S2, titelseitig „PLATZHALTER — wird
  durch Redaktionsinhalt ersetzt" (im meta-Titel, damit auf jeder Karte
  sichtbar, und im story.md-Kopf). Keine Gesetzesartikel, keine
  Rechtsbehauptungen — Alltagssituationen mit Spannungsbogen und gutem Ende
  (per Test abgesichert).

## 2. Auslegungen (dokumentationspflichtig laut Auftrag)

1. **Wiederverwendung des S2-Fragebaums: gemeinsames Modul.**
   `webflow/src/fragen.ts` wird direkt importiert (Fragenkatalog,
   Sichtbarkeitslogik, `baueFallobjekt`); bewertet wird mit
   `bewerteFall`/`erstelleEinschaetzung` aus `core` (Vite-/tsconfig-Alias
   `@core`, wie im webflow). Kein iframe, kein gebautes Asset, keine Kopie —
   und keine Änderung an webflow-Dateien. Brief-Editor und Chronologie
   bleiben bewusst im webflow (F1 §6: keine Änderungen an
   webflow-Fachlogik, Umfang minimal); die Journey zeigt die Einschätzung
   kompakt und merkt sich den Status als Fallkarte.
2. **Simulierte Zeit.** Startdatum aus URL-Parameter `?datum=` oder — wie im
   webflow — aus der UI-Schicht; die Fachlogik (serien, core) erhält jedes
   Datum injiziert. Als „heute" für die Fristenbewertung wird das simulierte
   Ausgabedatum injiziert (die Journey lebt vollständig in der simulierten
   Zeit).
3. **Etappen-Verteilung zyklisch.** Damit „seit Wochen Leser" über beliebig
   viele Morgen simulierbar bleibt, laufen Serien nach der letzten Etappe
   wieder von vorn (reine Wiederholung vorhandener, gekennzeichneter
   Etappen — es wird nichts erfunden, Invariante 12). Der ID-Versatz staffelt
   die Serien, damit nicht alle gleichzeitig bei Etappe 1 stehen.
4. **„Mein Fall" ab Abschluss sichtbar.** Die Karte erscheint in jeder nach
   dem Abschluss aufgebauten Ausgabe oben — also auch schon bei der Rückkehr
   am selben simulierten Tag, nicht erst am Folgemorgen. Ein LUECKE-Ergebnis
   erzeugt ebenfalls eine Fallkarte (Status „Keine Einschätzung möglich").
5. **Beispieldaten-Knopf nur im Lauf-Modus** (präzisiert durch Whitepaper
   Interaktionen v1 §6/B1). Es werden die FX-001-Werte wörtlich eingefüllt;
   liegt das simulierte Datum vor dem FX-001-Zustelldatum 2026-09-02, meldet
   der Kern korrekt eine Lücke (Widerspruch) — der Hinweis dazu steht direkt
   am Knopf.
6. **Lauf-Log-Format erweitert, altes Format wird verworfen.** Einträge sind
   jetzt Stationen (`stelle` + `art` statt `karteId`); `erfasseKarte` bleibt
   als kompatibler F0-Aufruf erhalten (Art `karte`). Ein lokal gespeichertes
   Log im alten F0-Format fällt beim Laden durch die Erlaubnisliste und wird
   verworfen (frischer Zähler) — bewusster Schnitt, da der 100er-Zähler
   ohnehin nur vollständige Journeys zählt, die es in F0 noch nicht gab.
7. **Emotionspflicht pragmatisch:** Vor „Nächster Morgen"/Datumswechsel muss
   im aktiven Lauf jede Karte der Ausgabe bewertet sein; beim Sprung ins
   Werkzeug werden bereits gewählte Karten-Emotionen übernommen (die Reise
   darf mitten in der Ausgabe abzweigen). Übergangs-, Schritt- und
   Ergebnis-Emotionen sind einzeln Pflicht; „Durchlauf hier abbrechen" ist
   jederzeit möglich und erfasst nur die Abbruchstelle (Ort, nie Zeit).

## 3. Testübersicht

- `prototypen/feed`: **64 Tests grün** (vitest, 8 Dateien). Davon unverändert
  grün: alle F0-Tests (story/quelle/ausgabe/lauf). Neu:
  - `serien.test.ts` (14): Journey-Determinismus (gleiche Stories + gleiche
    Tagesfolge ⇒ identische Ausgabenfolge), Fortsetzung über
    aufeinanderfolgende Morgen, jede Ausgabe endet mit „Fertig für heute",
    harte 5er-Kappung / kein Auffüllen unter 3, Folgen-Mechanik (Update
    zuerst + Hinweis; Erstbegegnung ohne Hinweis), Übergang/Rückweg
    verlustfrei, `betrifftMich` nur für `mietrecht_*`, Lesestand-Laden strikt.
  - `fall.test.ts` (8): Status nur aus der Kern-Einschätzung (Ampel, Frist,
    Brief bereit), LUECKE-Abbildung, verlustfreies Laden, Verwerfen fremder
    Strukturen, kein Fall ohne Abschluss (`ladeFall(null) → null`),
    PRIVAT-Badge/Phase-S-Hinweis fixiert.
  - `journey-lauf.test.ts` (8): Stationsarten/Emotionen nur aus festen
    Listen, vollständige Journey erkannt, 100er-Zähler zählt nur vollständige
    Journeys, Soll-Kurve im Log-Kopf, Export-Schema weiterhin frei von Zeit-/
    Engagement-Feldern, altes F0-Format wird verworfen.
  - `platzhalter.test.ts` (6): ≤4 Serien FS-9xx, gültig/FIKTIV, 2–3 Etappen,
    Schutzstufe ≤S2, PLATZHALTER titelseitig, keine Artikelnennungen und
    keine Gesetzesabkürzungen, mind. eine Serie `mietrecht_*`, Annahme im Feed.
- `cd prototypen/feed && npm run build` (tsc --noEmit + vite build): grün.
- `cd core && npm test`: **136 Tests grün** (unberührt).
- Bundle-Prüfung: Platzhalter-Serien enthalten · „Fertig für heute" enthalten ·
  keine Test-Fixture-Inhalte im Bundle.

## 4. Offene menschliche Punkte

- **Sichtprüfung im Browser** durch den Projektinhaber:
  `cd prototypen/feed && npm run dev` → Leser-Modus mit Tagesausgabe;
  „Werkbank" → „Journey-Durchlauf starten" → Karten bewerten → „Betrifft mich
  das?" (FS-902/FS-903) oder „Ich habe Post bekommen" → Fragebaum
  (Beispieldaten-Knopf sichtbar) → Einschätzung → „Zurück zur Ausgabe" →
  Karte „Mein Fall" → „Nächster Morgen".
- Die **≥100 vollständigen Journey-Durchläufe** (Plan §4) sind Arbeit des
  Projektteams; der Zähler (`journeysGesamt`) ist eingebaut.
- Platzhalter-Serien sind **durch Redaktionsinhalt zu ersetzen** (R0);
  Kennzeichnung weist darauf hin.
- Rechtstexte/Fragebaum weiterhin **fachlich zu verifizieren** (S2-Punkt,
  unverändert offen); dieser Auftrag hat keine neuen Rechtsaussagen erzeugt.
- Kein Commit/Push ohne ausdrückliche Freigabe (CLAUDE.md).

## 5. DTM-Trace

```json
{
  "gegenstand": "AUFTRAG-F1: Leser-wird-Nutzer-Journey im privaten Offline-Feed-Prototyp (prototypen/feed/, prototypen/stories/FS-9xx)",
  "zeitpunkt": "2026-08-06",
  "rolle": "redaktion",
  "basis": {
    "fallobjekt_hash": "entfaellt (keine realen Falldaten; Fallkarte speichert nur einen Status-Auszug lokal)",
    "regelversion": "keine Rechtsregeln geaendert (core unveraendert, Regelversion 0.1.0)",
    "quellenstand": "Plan v1.1 (SHA-256 4e42ba6d…a906, FREEZE.txt) · CR-001 inkl. F1 · Whitepaper Interaktionen v1 (2026-08-06)"
  },
  "alternativen": [
    "iframe-Einbettung des gebauten webflow statt gemeinsamem Modul (abgelehnt: doppelter Build, Rueckweg/Zustand schwerer verlustfrei zu halten)",
    "gespeicherter Serien-Fortschritt statt Datums-Arithmetik (abgelehnt: verdeckter Zustand gefaehrdet den geforderten Journey-Determinismus)"
  ],
  "begruendung": "Umsetzung exakt im Auftragsumfang F1; core/webflow nur genutzt, F1-Zweckbindung weiterhin technisch erzwungen (Stationen ohne Zeitfelder), Platzhalter ohne Rechtsaussagen."
}
```

## 6. Git-Stand

Siehe `git status --short` in der Abschlussmeldung der Session; kein Commit,
kein Push ohne ausdrückliche Freigabe (CLAUDE.md).

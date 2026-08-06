# AUFTRAG-F1 — Leser-wird-Nutzer-Journey (privat, offline)

```yaml
auftrag: F1
plan_referenz: "DER_PLAN_v1.1_FROZEN.md §4 Stiller Parallelbau (CR-001 inkl. F1), §1 Fernziel; Invarianten 1, 2, 3, 6, 11, 12"
basis: "prototypen/feed/ (F0) und webflow/ (S2) — core/ wird nur genutzt, nie veraendert"
charakter: "privater Offline-Prototyp; nichts wird veroeffentlicht; kein Server, kein Tracking, keine externen Ressourcen"
llm_nutzung: verboten
neue_laufzeit_deps: keine (Dev weiterhin nur vite/typescript/vitest)
```

## 0. Ziel in einem Satz
Der Prototyp simuliert die vollstaendige Reise einer Person, die die Morgenausgabe
seit Wochen liest und eines Tages selbst eine Wohnungskuendigung erhaelt — vom
Lesen ueber den Uebergang ins Werkzeug bis zur privaten Fallkarte im eigenen Feed.

## 1. Leser-Modus (neuer Standard beim Oeffnen)
- Beim Oeffnen erscheint die Ausgabe des Tages wie ein fertiges Produkt:
  Kopf mit Datum, 3–5 Karten, feste Abschlusskarte "Fertig fuer heute".
- Simulierte Zeit: Steuerung "Naechster Morgen" (und Datumswahl) — Serien
  verteilen ihre Etappen ueber aufeinanderfolgende Ausgaben (Fortsetzungsgefuehl).
- Folgen-Mechanik: Stern an einer Serie; gefolgte Serien mit neuem Update
  erscheinen in der naechsten Ausgabe zuerst, mit Hinweis "Update zu deiner Serie".
- Die Werkbank aus F0 (Zaehler, verweigerte Geschichten, JSON-Export) bleibt
  vollstaendig erhalten, wandert aber hinter einen dezenten Link "Werkbank".
- Der Hinweisbanner (privater Prototyp · FIKTIV · alles lokal) bleibt in beiden
  Ansichten sichtbar, darf im Leser-Modus kompakt sein.

## 2. Der Uebergangsmoment "Es betrifft mich"
- Im Kopf des Leser-Modus steht dauerhaft und unaufgeregt der Einstieg
  "Ich habe Post bekommen".
- Zusaetzlich traegt jede Karte mit rechtsgebiet mietrecht_* einen ruhigen
  Knopf "Betrifft mich das?".
- Beide fuehren in den bestehenden S2-Fragebaum (webflow). Technische
  Wiederverwendung (Einbettung, gemeinsames Modul oder gebautes Asset) waehlst
  du selbst und dokumentierst die Auslegung im Bericht; Pflicht: Rueckweg
  "Zurueck zur Ausgabe" ohne Datenverlust der Ausgabe-Ansicht.
- Fuer schnelle Durchlaeufe darf im Fragebaum ein klar markierter Knopf
  "Beispieldaten einsetzen (FX-001)" die Fixture-Werte einfuellen.

## 3. Nach dem Werkzeug: die private Fallkarte
- Nach abgeschlossenem Fragebaum erscheint in der naechsten Ausgabe oben eine
  Karte "Mein Fall" mit Status aus dem Ergebnis (z. B. Ampel, "Frist laeuft bis
  {Datum}", "Brief bereit"), deutlich markiert: "PRIVAT — nur auf diesem Geraet".
- Keine automatische Story-Werdung. Ein ausgegrauter Hinweis "Spaeter: als
  anonyme Geschichte teilen (Phase S)" zeigt die Vision, ohne etwas zu bauen.
- Falldaten bleiben ausschliesslich im Browser (Invariante 1); ein Schliessen-
  Knopf "Fall entfernen" loescht die Karte samt lokaler Daten rueckstandsfrei.

## 4. Emotions-Lauf ueber die ganze Reise (F1-Zweckbindung)
- Der interne Durchlauf-Modus erfasst neu die komplette Journey: je Karte,
  je Fragebaum-Schritt und an den Uebergangsmomenten je eine Emotion aus der
  bestehenden festen Liste + optionale Notiz + Abbruchstelle.
- Ziel-Emotionskurve fuer den Ernstfall-Abschnitt (als Soll im Log-Kopf):
  Schreck/Angst -> Orientierung -> Handlungsfaehigkeit -> Erleichterung.
- Unveraendert verboten und durch den bestehenden Schema-Test gesichert:
  Zeitstempel, Verweildauern, Klickraten, jede Engagement-Metrik.
- Der 100er-Zaehler zaehlt kuenftig vollstaendige Journey-Durchlaeufe.

## 5. Platzhalter-Serien (damit "seit Wochen Leser" simulierbar ist)
- Du darfst bis zu 4 zusaetzliche Serien mit je 2–3 Etappen anlegen unter
  prototypen/stories/FS-9xx-platzhalter-*/, jede mit
  kennzeichnung: FIKTIV und titelseitig "PLATZHALTER — wird durch
  Redaktionsinhalt ersetzt".
- Harte Regel: Platzhalter nennen KEINE Gesetzesartikel und keine konkreten
  Rechtsbehauptungen (Invariante 3 / Operating Rules) — Alltagssituationen,
  Spannungsbogen, gutes Ende reichen. Schutzstufe maximal S2.

## 6. Nicht Bestandteil
Oeffentlichkeit jeder Art · LLM/OCR · echte Faelle oder echte Personen ·
Aenderungen an core/ oder webflow/-Fachlogik · Push-Benachrichtigungen ·
Konten/Anmeldung · Styling-Feinschliff ueber Lesbarkeit hinaus.

## 7. Tests (Abnahme: alles gruen)
- Bestehende F0-Tests bleiben gruen; core/ 136 Tests unveraendert gruen.
- Neu: Journey-Determinismus (gleiche Stories + gleiche Tagesfolge => identische
  Ausgabenfolge) · Uebergang und Rueckweg verlustfrei · "Mein Fall" erscheint
  nur nach abgeschlossenem Fragebaum und ist rueckstandsfrei loeschbar ·
  Log-Schema weiterhin frei von Zeit-/Engagement-Feldern · jede Ausgabe endet
  mit "Fertig fuer heute" · Platzhalter-Serien enthalten keine Artikelnennungen.

## 8. Bericht
berichte/AUFTRAG-F1-ABSCHLUSS.md (deutsch, kurz): Was gebaut, Auslegungen,
Testuebersicht, Git-Stand, offene menschliche Punkte.

## 9. Abnahme-Kommandos
cd prototypen/feed && npm test && npm run build   # gruen
cd core && npm test                               # unveraendert gruen
Kein Commit/Push ohne Freigabe (CLAUDE.md).

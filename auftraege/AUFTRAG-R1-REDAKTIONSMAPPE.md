# AUFTRAG-R1 v2 — Sieb, Redaktionsmappe & Nacherzaehl-Entwuerfe (autonom, privat)

```yaml
auftrag: R1
version: 2 (ersetzt v1; falls v1-Arbeit existiert, wird sie weiterverwendet statt doppelt gebaut)
plan_referenz: "DER_PLAN_v1.1_FROZEN.md §4 Stiller Parallelbau (CR-001); NACHSCHLAGEWERK-NORM v0.6 §§2,4,7,8; LEGAL_AI_OPERATING_RULES (KI entwirft, publiziert nie)"
basis: "R0 (redaktion/, Kandidatenlisten unter redaktion/kandidaten/, Kategorie NACHERZAEHLT_OEFFENTLICH)"
charakter: "privates Redaktions-Vorprodukt; Entwuerfe liegen AUSSERHALB des Feeds; Uebernahme nur nach menschlicher Freigabe"
netz: "erlaubt ausschliesslich fuer Stufe 2 (Mappe): entscheidsuche.ch, max. 40 Abrufe, 1/Sekunde, klarer User-Agent, KEINE Volltext-Speicherung. Stufe 1 (Sieb) arbeitet strikt OHNE Netz."
redaktionelle_bewertung: "ausdruecklich beauftragt — die Session liest, bewertet und verfasst Entwuerfe selbst; ersetzt fuer diesen Auftrag die R0-Ausnahme 'kein automatisches Nacherzaehlen'"
neue_laufzeit_deps: keine
```

## 0. Ziel in einem Satz
Aus 1000+ Kandidatenzeilen wird ueber einen dreistufigen Trichter — Sieb
(deterministisch) → Mappe (gelesen & begruendet) → Entwuerfe (normkonform) —
Redaktionsstoff, den der Mensch nur noch freigibt.

## 1. Stufe 1: Metadaten-Sieb `npm run sieben` (deterministisch, 0 Netz)
- Eingabe: alle `redaktion/kandidaten/*.md`. Ausgabe:
  `redaktion/gesiebt/JJJJ-MM-TT.md` (sortiert nach Score, je Zeile Original-
  Kandidatenzeile + kompakte Score-Kuerzel, z. B. `[+kuendigung +BGer −uR]`)
  sowie `redaktion/gesiebt/spaeter-fr-it.md` fuer nicht-deutsche Treffer.
- Scoring-Regeln (Konfiguration versioniert in `redaktion/sieb.json`, Werte
  als Startbelegung — redaktionell nachjustierbar):
  **Negativ (stark abwerten oder ausschliessen), Treffer im Betreff/Titel:**
  unentgeltliche Rechtspflege · Nichteintreten · Fristwiederherstellung ·
  Frist(en)lauf/Wiederherstellung · Kostenvorschuss · Kostenentscheid ·
  Ausstand · Revision · Rechtsverzoegerung · Rechtsverweigerung ·
  Sistierung · Gegenstandslos(igkeit).
  **Positiv (aufwerten; Woerter = Lebenslagen der Norm §2):**
  Kuendigung · Anfechtung · Erstreckung · Mietzins · Mietzinserhoehung ·
  Anfangsmietzins · Nebenkosten · Kaution · Mietzinsdepot · Maengel ·
  Schimmel · Untermiete · Ausweisung · Rueckgabe/Uebergabe ·
  Familienwohnung · Rachekuendigung · 271a.
  **Gerichts-Gewicht (Feld hierarchy):** Bundesgericht hoch · Kantons-/
  Obergerichte mittel · uebrige tief · Kanton LU zusaetzlicher kleiner Bonus.
  **Sprache:** Deutsch bevorzugt; FR/IT nicht verworfen, sondern in die
  Spaeter-Liste (Erkennung: bestes verfuegbares Metadaten-Feld, sonst
  Heuristik ueber Titel — Auslegung im Bericht dokumentieren).
  **Instanzen-Dublette:** erkennbar gleiche Sache ueber mehrere Instanzen
  → nur die hoechste/letzte Instanz behalten (Best-Effort-Heuristik ueber
  Parteien-/Sachbezug im Betreff; Auslegung dokumentieren).
- Tests (redaktion-Suite erweitern): Scoring deterministisch gegen eine
  eingefrorene Beispiel-Kandidatenliste · Negativ-/Positivwoerter greifen ·
  Sortierung stabil (Zweitkriterium Datum absteigend, Drittkriterium
  Aktenzeichen) · FR/IT landet in der Spaeter-Liste.

## 2. Stufe 2: Redaktionsmappe (liest die TOP der gesiebten Liste)
- Hoechstens 40 Entscheide der gesiebten Liste werden bei entscheidsuche.ch
  aufgerufen und gelesen (Drosselung 1/s; Abbruch mit deutscher Meldung bei
  Netzfehlern).
- Bewertung je Entscheid gegen die Norm-Checkliste:
  a) Hauptfigur Privatperson (§8; Firma-gegen-Firma raus)?
  b) Verfahren erkennbar abgeschlossen/rechtskraeftig?
  c) Rubrik-Potenzial WEGWEISER/WARNWEISER/SACKGASSE/TEILWEISE + die eine
     Lehre („Der Unterschied") in einem Satz.
  d) Wuerde-Grenze (§7): Not, Krankheit, Querulanz => raus.
  e) Laien-Verstaendlichkeit des Kernkonflikts.
- Ausgabe `redaktion/mappe/JJJJ-MM-TT.md`: TOP 10 (Original-Zeile +
  3-Satz-Begruendung + Rubrik-Vorschlag + Lehre-Satz) und VERWORFEN
  (Zeile + Ein-Wort-Grund: firma/laufend/wuerde/prozessual/unklar).
  Keine Volltexte, keine langen Zitate.

## 3. Stufe 3: Drei Nacherzaehl-Entwuerfe (Top 3 der Mappe)
- Ablage `redaktion/entwuerfe/FS-1xx-<slug>/meta.yaml + story.md`
  (fortlaufend ab FS-101; ausserhalb prototypen/stories — der Feed laedt
  Entwuerfe nicht).
- meta.yaml exakt im NACHERZAEHLT-Schema des Feed-Parsers (kennzeichnung:
  NACHERZAEHLT_OEFFENTLICH, quelle, gericht, entscheid_datum,
  verfahren_abgeschlossen: true, schutzstufe max. S2, etappen, prinzipien,
  emotions_ziel, autor: redaktion_entwurf, erstellt).
- story.md exakt nach Norm §4: Pflichtzeile mit Quelle, sechs Bloecke,
  Schlussblock „Der Unterschied" (bei SACKGASSE: „Der Irrtum" + „So
  erkennst du es vorher"), Rubrik-Zeile; „Ausgang verbessert." nur wo wahr.
- Eiserne Regeln: Fakten/Zahlen NUR aus dem gelesenen Entscheid · nichts
  erfinden · Namen ersetzt · Unsicherheiten als
  `[REDAKTION: pruefen — <Frage>]` markiert · keine Verallgemeinerung ueber
  den entschiedenen Punkt hinaus.
- Formatgarantie: jeder Entwurf programmatisch gegen den bestehenden
  Feed-Parser geprueft (pruefeStory, injiziertes Heute-Datum); Abnahme nur
  bei drei gueltigen Entwuerfen.

## 4. Uebernahme-Weg (bleibt menschlich)
Der Bericht listet je Entwurf den fertigen Einzeiler
`git mv redaktion/entwuerfe/FS-1xx-... prototypen/stories/`; ausgefuehrt
erst nach schriftlicher Freigabe („FS-1xx freigegeben"). Nichts wandert
automatisch in den Feed.

## 5. Nicht Bestandteil
Uebernahme in den Feed · Veroeffentlichung · Aenderungen an core/feed/wissen
ausser der redaktion-Testsuite · Volltext-Archiv · mehr als 40 Netz-Abrufe ·
andere Quellen als entscheidsuche.ch.

## 6. Tests & Abnahme
Bestehende Suiten unveraendert gruen (core 136, feed 95, wissen 44, webflow 9) ·
redaktion-Suite gruen inkl. neuer Sieb-Tests · Parser-Pruefung aller drei
Entwuerfe gruen · gesiebt/ und mappe/ vorhanden.
Bericht: `berichte/AUFTRAG-R1-ABSCHLUSS.md` (Auslegungen: Sprach-/Dubletten-
Heuristik, Feldnamen; die drei Uebernahme-Einzeiler).
Kein Commit/Push ohne Freigabe (CLAUDE.md).

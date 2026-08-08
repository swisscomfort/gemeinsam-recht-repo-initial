# CR-02 — Scheiterpunkt-Codeliste: zwei Achsen statt drei überlappender Codes

**Status:** VORSCHLAG — nicht angenommen, `wissen/scheiterpunkte.json` unverändert.
**Entscheidung (nur Projektinhaber, schriftlich):** ________________________
**Referenz:** MANIFEST v2.1 §4 (Kodierliste), §5 (Zählregeln/Doppelkodierung, CR-01)

## Betroffene Paragrafen

MANIFEST v2.1 §4: „Einzige Quelle ist `wissen/scheiterpunkte.json`. […] Zwei
Fassungen derselben Liste sind ein Bruch. Änderungen an der Liste erhöhen die
Version. Bestehende Kodierungen werden nicht stillschweigend migriert."

## Bisherige Regelung

`wissen/scheiterpunkte.json` Version 1.0.0, 15 flache Werte ohne weitere
Definition im Repo (kein Beschreibungsfeld, kein Schema dafür geprüft —
die Bezeichner sind die gesamte Spezifikation). Darunter drei, die Gegenstand
dieser CR sind: `beweis_fehlte`, `substantiierung_fehlte`,
`gegenpartei_nicht_substantiiert`.

## Vorgeschlagene Regelung

1. Die drei genannten Codes entfallen. An ihre Stelle tritt **ein** neuer
   Code, `vortrag_mangelhaft`, mit zwei Pflicht-Unterfeldern:
   - `stufe`: `behauptung` \| `beweis`
   - `partei`: `eigene` \| `gegenpartei`
   Die vier Kombinationen decken vollständig ab, was die drei alten Codes
   nur teilweise benannten — einschliesslich der vierten, bisher unbenannten
   Kombination (Stufe=Beweis × Partei=Gegenpartei, siehe Begründung).
2. Die übrigen zwölf Codes (`frist_verpasst`, `anhoerung_unterblieb`,
   `kosten_zu_hoch`, `aufgegeben`, `verjaehrung`, `zustaendigkeit_verfehlt`,
   `regel_nicht_angewendet`, `folgenabwaegung_trug_entscheid`,
   `antrag_unbeziffert`, `termin_versaeumt`, `falscher_verfahrensweg`,
   `nicht_bestimmbar`) bleiben unverändert und tragen `stufe`/`partei`
   **nicht** — diese Unterfelder existieren ausschliesslich bei
   `vortrag_mangelhaft`. Sie als freie Felder über die ganze Liste zu legen
   würde Werte erzwingen, wo keine Bedeutung existiert (`termin_versaeumt` ×
   Stufe=Beweis ist bedeutungslos), und den Überlappungsdefekt als
   Leerfeld-Defekt zurückbringen.
3. **Neue Werteanzahl: 13 statt bisher 15** (zwölf unverändert + ein neuer
   Code). Die Versionsnummer 2.0.0 allein würde diese Zählungsänderung
   verdecken, deshalb hier ausdrücklich benannt.
4. `wissen/scheiterpunkte.json` geht auf Version 2.0.0.
5. Migration: Die 19 bereits kodierten Entwürfe (FS-101–119) werden mit der
   neuen Liste **neu kodiert** — beide Läufe, nicht nur der zweite. Eine
   automatische Übersetzung der alten Werte ist nicht möglich: bei
   `beweis_fehlte` etwa ist ohne Rückgriff auf den jeweiligen Story-Text nicht
   sicher feststellbar, ob `eigene`- oder `gegenpartei`-Beweislast gemeint war.

## Begründung (Einreicher: Nutzer, nach Musteranalyse von Claude)

Kodierlauf 2 (Stapel 2026-08-08, Claude Fable 5 gegen Claude Opus 5,
unabhängig) ergab 8 strittige Fälle von 19. Konfusionspaar-Analyse: 11 der 16
Differenz-Plätze (5 der 8 Fälle) entfallen ausschliesslich auf Kombinationen
der drei genannten Codes untereinander, nie gegen die übrigen zwölf. Die drei
Codes kombinieren erkennbar zwei unabhängige Unterscheidungen — wessen
Vortrag unzureichend war (eigene Partei / Gegenpartei) und auf welcher Stufe
(Behauptung / Beweis) — in einem einzigen flachen Enum-Wert. Da
`wissen/scheiterpunkte.json` keine Definitionen über die Bezeichner hinaus
enthält, liegt die Überlappung im Datenmodell selbst, nicht in einer
missverständlichen, aber reparierbaren Benennung. Zwei unabhängige Kodierer
können unter dieser Struktur nicht konsistent zwischen den drei Codes wählen.

Der Befund gilt nur für diese drei Codes: die zwei übrigen Konfusionspaare im
Lauf (`falscher_verfahrensweg`↔`antrag_unbeziffert`,
`folgenabwaegung_trug_entscheid`↔`termin_versaeumt`) liegen bei je einem
Fall (n=1) und werden hier nicht angefasst.

Die vierte, in der alten Liste nie benannte Kombination (Stufe=Beweis ×
Partei=Gegenpartei) ist keine neue Entscheidung, sondern eine Folge der
sauber gezogenen Achsen: Ihr Fehlen war ein Konstruktionsfehler der alten
Liste, keine bewusste Auslassung. Das ist Teil des Arguments für die
Umstellung — sie schliesst eine Lücke, die in der flachen Codeliste vorher
unsichtbar war.

## Auswirkung auf Invarianten (Angabe Einreicher)

Keine Lockerung. MANIFEST §5 verlangt eine belastbare Übereinstimmung der
Kodierläufe als Zählvoraussetzung; diese CR beseitigt eine strukturell zu
erwartende Uneinigkeitsquelle, statt sie durch Wiederholung zu überspielen.
Kein Eingriff in §3-Pflichtfelder oder andere Paragrafen.

---

## Prüfnotizen der KI (Claude, 2026-08-08 — Hinweise, keine Entscheidung)

1. **Darstellung im bestehenden Zeilenformat ungeklärt:** `kodierung_quellen`
   kodiert `wert` heute als einfache, kommagetrennte Codeliste
   (`"lauf|datum|wert1,wert2|textstelle"`, siehe `redaktion/src/kodierung.ts`
   und `prototypen/feed/src/story.ts`). `vortrag_mangelhaft` mit zwei
   Pflicht-Unterfeldern passt in diese flache Stringliste nicht ohne
   Erweiterung — z. B. als zusammengesetzter Wert
   `vortrag_mangelhaft:beweis:gegenpartei` im `wert`-Array, oder als eigenes
   Trennzeichen-Segment. Das ist eine Implementierungsfrage für die Umsetzung
   nach Annahme, keine, die die Entscheidung selbst berührt — hier nur
   festgehalten, damit sie nicht erst beim Programmieren auffällt.
2. **Migrationsaufwand real, nicht kosmetisch:** Kein Datenscript kann Lauf 1
   der 19 Entwürfe automatisch übersetzen — es ist ein vollständiger Neulauf
   von CR-01 auf neuer Grundlage, nicht nur eine Versionsnummer.
3. **Grundlage dieser Notiz:** ausschliesslich die Fälle und Textstellen aus
   Stapel 2026-08-08 (Kodierlauf 2). Ersetzt keine juristische Prüfung der
   Kategorien.
4. **Verfahren bei Annahme (analog CR-001 Ziff. 6):** Der Projektinhaber
   entscheidet und trägt die Entscheidungszeile oben ein — die KI füllt sie
   nie, auch nicht bei ausdrücklicher Zustimmung im Gespräch: ein
   KI-Vorschlag, den die KI selbst annimmt, hebt die Trennung auf, die das
   Governance-Modell trägt. `FREEZE.txt` wird nicht berührt (CR-02 ändert das
   Manifest nicht, nur eine im Manifest referenzierte, separat versionierte
   Liste). `wissen/scheiterpunkte.json` bleibt bis zur schriftlichen
   Entscheidung Version 1.0.0.

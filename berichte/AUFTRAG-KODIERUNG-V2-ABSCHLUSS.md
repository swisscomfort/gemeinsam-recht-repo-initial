# Kodierte Felder (Konzept v2 §5.3) — Abschlussbericht

**Auftrag:** Nachtrag der kodierten Felder (ausgang, rechtskraft_status,
scheiterpunkt, kodierliste_version, kodierung_geprueft) bei allen
Geschichten in `prototypen/stories/` und `redaktion/entwuerfe/`, additiv und
ohne bestehende Tests zu brechen.
**Datum:** 2026-08-08 · **Bearbeitung:** Claude Code (Fable 5)

Hinweis zur Referenz im Auftrag: „Konzept v2 §5.3" ist an keiner Stelle
dieses Repos dokumentiert (weder im Plan noch in `docs/`) — umgesetzt wurde
ausschliesslich die Spezifikation aus dem direkten Auftragstext.

---

## 1. wissen/scheiterpunkte.json (neu)

```json
{
  "version": "1.0.0",
  "gueltig_ab": "2026-08-08",
  "werte": [ /* 15 Werte gemaess Auftrag */ ]
}
```

**Registrierung analog zu den Regeln:** `wissen/dist/versionen.json` wird von
`wissen/tools/build-dist.ts` ausschliesslich aus `wissen/register/*.json`
erzeugt (regel_id → regelversion). `baueDist()` erhielt dafuer einen
**optionalen** zweiten Parameter `kodierlisten` (Default `{}` — bestehende
Aufrufe unveraendert), über den die CLI jetzt zusätzlich
`"KL-SCHEITERPUNKTE": "1.0.0"` einspeist. Der abgelegte Artefakt
`wissen/dist/versionen.json` wurde entsprechend nachgeführt; ein neuer Test
(`wissen/tests/dist.test.ts`) sichert die Registrierung ab, der bestehende
„kein veralteter Build"-Test wurde auf den erweiterten Aufruf umgestellt
(bleibt gruen, prueft aber jetzt gegen den tatsaechlichen CLI-Aufruf).
**Offener Punkt:** Es gibt im Repo keine weitere, generische
„versionen.json" — diese Lesart der Registrierung ist eine Auslegung, kein
Fund. Falls ein anderer Mechanismus gemeint war: bitte benennen.

## 2. Parser (`prototypen/feed/src/story.ts`)

Fünf neue erlaubte Schlüssel (`ausgang`, `rechtskraft_status`,
`scheiterpunkt`, `kodierliste_version`, `kodierung_geprueft`), importiert
als einzige Quelle direkt aus `wissen/scheiterpunkte.json` (keine
Zweitpflege der Werteliste). Pflicht nur für `NACHERZAEHLT_OEFFENTLICH`
(`ausgang`, `rechtskraft_status`, `scheiterpunkt`, `kodierliste_version`);
FIKTIV/PLATZHALTER bleiben unberührt, dürfen die Felder aber optional
ebenfalls tragen — sind sie vorhanden, werden sie trotzdem auf bekannte
Werte geprüft. `scheiterpunkt` verlangt mindestens einen Eintrag (durch die
bestehende Listen-Leer-Prüfung strukturell erzwungen) und nur bekannte Codes
aus `scheiterpunkte.json`; unbekannte Werte sind Verweigerungsgrund.
`kodierung_geprueft` ist optional, muss aber falls vorhanden exakt `"true"`
oder `"false"` sein.

**Cross-Package-Import:** `story.ts` (Vite/Browser-Bundle) importiert
`wissen/scheiterpunkte.json` statisch (`resolveJsonModule`, Import-Attribut
`with { type: "json" }` wegen `NodeNext` beim Typecheck durch `redaktion`).
Der Vite-Dev-Server hat die Repo-Wurzel bereits freigegeben
(`vite.config.ts`, unveraendert), das trägt auch `wissen/`.

## 3. Vorschlagsliste zur menschlichen Prüfung

Für **alle neun** `NACHERZAEHLT_OEFFENTLICH`-Geschichten wurden Werte aus
dem jeweiligen Text vorgeschlagen, `kodierliste_version: "1.0.0"`,
**`kodierung_geprueft: false` bei jeder einzelnen — keine Story wurde auf
`true` gesetzt.** Bei FS-106 und FS-108 ist `rechtskraft_status: unbekannt`
weisungsgemäss zwingend gesetzt.

| Story | ausgang | rechtskraft_status | scheiterpunkt | Textstelle (Begründung) |
|---|---|---|---|---|
| FS-101 | durchgesetzt | unbekannt | gegenpartei_nicht_substantiiert | „ein bloss allgemeiner Wunsch ohne belegten, aktuellen Bedarf genügt als Kündigungsgrund aber nicht" — Vermieter konnte den dringenden Eigenbedarf nicht substantiieren |
| FS-102 | nicht_durchgesetzt | **rechtskraeftig** | antrag_unbeziffert | „Weil seine Klage keine Zahl nannte, war sie in dieser Form von Anfang an chancenlos"; Quelle explizit: „gemäss Publikation blieb der Entscheid unangefochten" (einzige Story mit positiver Rechtskraft-Aussage in der Quelle) |
| FS-103 | nicht_durchgesetzt | unbekannt | frist_verpasst | „Rolfs Beschwerde trägt den Poststempel vom 16. September — einen Tag zu spät" |
| FS-104 | nicht_durchgesetzt | unbekannt | termin_versaeumt, beweis_fehlte | „Die Verhandlung fand ohne Dario statt, das Verfahren wurde abgeschrieben"; „Die behauptete Krankheit blieb unbelegt" |
| FS-105 | nicht_durchgesetzt | unbekannt | termin_versaeumt | „Milan erschien nicht; … Die Behörde schrieb das Verfahren als gegenstandslos ab" |
| FS-106 | **teilweise** | unbekannt (weisungsgemäss) | beweis_fehlte | Kernpunkte gewonnen (Mangel, Vermieterhaftung, Widerklage abgewiesen), aber „bei der Höhe teilweise: 8 statt 15 %" — Grenzfall zwischen `durchgesetzt`/`teilweise`, hier wegen der expliziten Teilweise-Formulierung zur Höhe so vorgeschlagen; Beweisgrund: „dafür trug sie die Beweislast, und der Beweis gelang ihr nicht" |
| FS-107 | teilweise | unbekannt | substantiierung_fehlte | „Wer die Vermutung kippen will, muss selber konkret und mit Zahlen aufzeigen … der Hinweis … genügt nicht" |
| FS-108 | nicht_durchgesetzt | unbekannt (weisungsgemäss) | substantiierung_fehlte, falscher_verfahrensweg | „Karin konnte keinen Mangel im Rechtssinn dartun … Genau diese Angaben fehlten"; „für die Nebenkosten hätte es eine eigene, bezifferte Leistungsklage gebraucht, und die fehlte" |
| FS-109 | nicht_durchgesetzt | unbekannt | antrag_unbeziffert | „Selim klagt deshalb unbeziffert: Der Mietzins sei «auf ein noch zu bezifferndes Mass …»" |

**FS-106/FS-108 bleiben Entwurf** (`redaktion/entwuerfe/`, erstinstanzlich,
parkiert) — die Kodierung wurde trotzdem ergänzt, damit die
Formatgarantie-Tests weiterhin grün bleiben; sie unterliegt derselben
menschlichen Freigabe wie der Rest des Entwurfs.

### Nicht kodiert: FS-001 und FS-901–904 (FIKTIV)

Bewusst **keine** kodierten Felder ergänzt. Begründung: `ausgang` und
`rechtskraft_status` beschreiben den Ausgang eines *realen* Verfahrens;
FS-901–904 tragen explizit den Vermerk „enthält bewusst keine
Rechtsangaben" (kein Gerichtsverfahren im Text), FS-001 ist ein erfundenes
Lehrstück. Die Kodierliste-Werte auf erfundene Fälle anzuwenden hätte
Fiktion mit Realdaten-Vokabular versehen — das widerspricht dem Grundsatz
„keine erfundenen Urteile als reale Fakten" (Operating Rules Nr. 5/6). Da
die Quotenlogik (Abschnitt 4) `kennzeichnung=FIKTIV` ohnehin immer
ausschliesst, hat das Auslassen keine Auswirkung auf spätere Zählungen.
Falls dennoch gewünscht: bitte als eigenen Auftrag benennen.

**Auch offen:** Die im Auftrag verwendete Kennzeichnung „PLATZHALTER"
existiert im Datenmodell nicht als eigener `kennzeichnung`-Wert — Platzhalter
tragen `kennzeichnung: FIKTIV` mit `autor: platzhalter_redaktion`. Die
Ausschlusslogik (Abschnitt 4) prüft dennoch wörtlich auf `"PLATZHALTER"`
(zukunftsoffen), zusätzlich zu `"FIKTIV"`.

## 4. Quotenlogik (`wissen/tools/kodierung-quoten.ts`, neu)

Reine, deterministische Zähl-Funktionen über injizierte Story-Meta-Objekte
(kein Netz, keine Systemzeit, kein Dateizugriff auf echte Storys):

- `ausgangQuote(stories, ausgang)` — schliesst `kennzeichnung` FIKTIV/PLATZHALTER
  und `rechtskraft_status` ≠ `rechtskraeftig` aus.
- `scheiterpunktQuote(stories, code)` — wie oben, zusätzlich ausgeschlossen:
  `kodierung_geprueft` ≠ `true`.
- Beide geben `{ zaehler, nenner, ausschluesse: [{ grund, anzahl }] }` zurück
  — jeder Ausschlussgrund einzeln beziffert, nichts still weggelassen.

7 Tests in `wissen/tests/kodierung-quoten.test.ts`, darunter die drei
verlangten: FIKTIV zählt nie, nicht-rechtskräftig zählt nie, ungeprüft
zählt nicht in der Scheiterpunkt-Auswertung.

**Nicht umgesetzt (bewusst ausserhalb des Auftrags):** eine CLI, die die
Quotenlogik live über die echten Story-Verzeichnisse laufen lässt (analog
zu `quoten-sicht.ts`). Da aktuell **jede** reale Story
`kodierung_geprueft: false` trägt, wäre die Scheiterpunkt-Auswertung ohnehin
leer (`nenner: 0`) — ehrlich leer, wie `wissen/dist/verifiziert.json` in W0.
Kann bei Bedarf als eigener, kleiner Folgeauftrag ergänzt werden.

## 5. Testübersicht (2026-08-08)

| Suite | Kommando | Ergebnis |
|---|---|---|
| core | `cd core && npm test` | 136/136 grün, unverändert |
| wissen | `cd wissen && npm test` | **52/52 grün** (44 + 1 neu in dist.test.ts + 7 neu in kodierung-quoten.test.ts) |
| webflow | `cd webflow && npm test` | 9/9 grün, unverändert |
| feed | `cd prototypen/feed && npm test` | **96/96 grün** (Fixtur `FX-NACHERZAEHLT-SONST-GUELTIG` um die fünf neuen Felder ergänzt, sonst unverändert in der Anzahl) |
| redaktion | `cd redaktion && npm test` | 30/30 grün (`tsc --noEmit` inklusive), unverändert |

`prototypen/feed`-Typecheck (`npx tsc --noEmit`, Teil von `npm run build`)
separat grün geprüft.

## 6. Geänderte/neue Dateien

- Neu: `wissen/scheiterpunkte.json`, `wissen/tools/kodierung-quoten.ts`,
  `wissen/tests/kodierung-quoten.test.ts`, dieser Bericht.
- Geändert: `wissen/tools/build-dist.ts`, `wissen/tests/dist.test.ts`,
  `wissen/dist/versionen.json` (additiv, ein neuer Schlüssel).
- Geändert: `prototypen/feed/src/story.ts` (additiv), ein Fixture
  (`FX-NACHERZAEHLT-SONST-GUELTIG/meta.yaml`), ein neuer Test-Block in
  `prototypen/feed/tests/quelle.test.ts` (aus dem vorherigen Auftrag,
  unverändert).
- Geändert: neun `meta.yaml` in `prototypen/stories/` bzw.
  `redaktion/entwuerfe/` (FS-101…109) um die fünf kodierten Felder ergänzt.

## 8. Ergänzung vom 2026-08-08 — Umstellung auf Doppelkodierung (MANIFEST v2.1 §3/§5)

**Governance-Hinweis zuerst:** Zu Beginn dieser Ergänzung fanden sich
`MANIFEST-v2.0.md`, `MANIFEST-v2.1.md` (neu, unversioniert) sowie eine
Ergänzung in `FREEZE.txt` vor, die MANIFEST v2.1 als Nachfolger von
Plan v1.1 ausweist. Beide Hashes wurden gegen die Dateien verifiziert und
stimmen exakt. **Die „Freigabe"-Zeile ist in beiden FREEZE.txt-Einträgen
noch leer (kein Datum, keine Unterschrift).** Ich habe diese Änderung nicht
selbst vorgenommen — CLAUDE.md untersagt mir das Bearbeiten von
`FREEZE.txt` ausdrücklich. Da der Auftrag hier direkt vom Projektinhaber
kommt und MANIFEST v2.1 §3/§5 explizit benennt, habe ich den Auftrag
ausgeführt; die offene Freigabezeile melde ich zur Kenntnisnahme, nicht als
Blockade.

**Umsetzung (additiv, fünf Punkte):**

1. **Feldwechsel:** `kodierung_geprueft` (boolean) ersetzt durch
   `kodierung_status` (vorschlag/doppelt_bestaetigt/mensch_bestaetigt/strittig,
   Default `vorschlag`) und `kodierung_quellen` (Liste von Kodierläufen).
   Format je Eintrag `"lauf|datum|wert1,wert2|textstelle"` — einzeilig, weil
   der Parser bewusst kein YAML-Parser ist (keine verschachtelten Objekte).
   Alle neun Geschichten (FS-101–109) umgeschrieben: `kodierung_status:
   vorschlag`, bisheriger Scheiterpunkt-Vorschlag als erster Eintrag in
   `kodierung_quellen` mit `lauf: cli-1`.
2. **Quotenlogik** (`wissen/tools/kodierung-quoten.ts`): zählt nur noch
   `doppelt_bestaetigt`/`mensch_bestaetigt`; `vorschlag`/`strittig`
   ausgeschlossen (neuer Ausschlussgrund `kodierung_nicht_bestaetigt`).
   `scheiterpunktQuote()` gibt zusätzlich `uebereinstimmungsquote` aus
   (Verhältnis `doppelt_bestaetigt` zu `doppelt_bestaetigt + strittig`;
   `mensch_bestaetigt` zählt bewusst nicht mit — das ist eine nachträgliche
   menschliche Entscheidung über einen strittigen Fall, keine
   Lauf-Übereinstimmung). 12 Tests (vorher 7).
3. **Export** (`redaktion/src/kodierung-export.ts`, `npm run
   kodierung-export`): sammelt alle `NACHERZAEHLT_OEFFENTLICH`-Geschichten
   mit `kodierung_status: vorschlag`, schreibt **eine** Datei je Stapel
   (`redaktion/kodierung/zweitlauf-JJJJ-MM-TT.json`) mit Story-ID, vollem
   `story.md`-Text und der Werteliste aus `wissen/scheiterpunkte.json` — der
   Lauf-1-Vorschlag wird nie gelesen (Export liest nur `story.md` + wenige
   `meta.yaml`-Skalare, nie `scheiterpunkt`/`kodierung_quellen`). Real
   ausgeführt: `redaktion/kodierung/zweitlauf-2026-08-08.json`, 9
   Geschichten.
4. **Import** (`redaktion/src/kodierung-import.ts`, `npm run
   kodierung-import -- --datei <pfad>`): liest eine Zweitlauf-Antwortdatei
   (`[{id, lauf, datum, wert, textstelle}, …]`), vergleicht je Story die
   Wertemenge mit `kodierung_quellen[0]` (Lauf 1). Gleich →
   `doppelt_bestaetigt`; ungleich → `strittig`, beide Läufe bleiben in
   `kodierung_quellen`. Gibt die strittigen Fälle aus. **Nicht real
   ausgeführt** — ein zweiter, unabhängiger Kodierlauf (§5: „verschiedene
   Modelle, nicht derselbe Lauf zweimal") würde reale Projektdaten
   verändern; ich habe keinen solchen Lauf erzeugt oder simuliert. Getestet
   ausschliesslich mit synthetischen Werten (16 Tests in
   `redaktion/tests/kodierung.test.ts`, inkl. Rundreise-Test für die
   Zeilenersetzung und ein Konsistenztest gegen das kanonische Zeilenformat
   in `prototypen/feed/src/story.ts`).
5. **Testergebnis 2026-08-08:** core 136 · feed **103** (+7) · wissen **57**
   (+5) · redaktion **46** (+16, davon 14 vorher). Alle fünf Suiten grün.

**Architekturhinweis:** `redaktion/src/kodierung.ts` dupliziert bewusst das
`lauf|datum|wert|textstelle`-Zeilenformat und das Listen-Subset aus
`prototypen/feed/src/story.ts`, statt es zu importieren —
`tsconfig.build.json` (rootDir `src`) verbietet Importe aus dem CLI-Build
heraus, die ausserhalb von `redaktion/src` liegen. Die Gleichheit beider
Implementierungen sichert ein Konsistenztest ab (Punkt 4 oben).

**Nicht Teil dieser Ergänzung:** §3 nennt weitere Pflichtfelder
(`aktenzeichen`, `instanz`, `kanton`, `rubrik`, `regel_id`, `regel_version`,
`norm_fundstelle`), die im heutigen Auftrag nicht erwähnt waren — nicht
umgesetzt, zur Kenntnis. §5 nennt zudem eine Mindestfallzahl-Darstellungsregel
("Unterhalb der Mindestfallzahl wird keine Quote dargestellt") — ebenfalls
nicht Teil der fünf beauftragten Punkte, nicht umgesetzt.

## 7. DTM-Trace

```json
{
  "gegenstand": "Nachtrag kodierte Felder (Konzept v2 §5.3): scheiterpunkte.json, Parser-Erweiterung, Vorschlagswerte fuer neun NACHERZAEHLT-Geschichten, Quotenlogik mit Ausschlussgruenden",
  "zeitpunkt": "2026-08-08",
  "rolle": "redaktion",
  "basis": {
    "fallobjekt_hash": "entfaellt (kein Fallbezug)",
    "regelversion": "keine Aenderung an core-Rechtsregeln; neue Kodierliste KL-SCHEITERPUNKTE v1.0.0",
    "quellenstand": "keine neuen Netzabrufe — reine Textauswertung der bereits gelesenen Entscheide"
  },
  "alternativen": [
    "FIKTIV-Geschichten ebenfalls kodieren (woertliche Lesart von 'alle bestehenden Geschichten') — zurueckgestellt: Realdaten-Vokabular auf erfundene Faelle anzuwenden widerspricht Operating Rules Nr. 5/6; Quotenlogik schliesst FIKTIV ohnehin aus",
    "Kodierliste-Version separat in einer neuen Datei registrieren statt im bestehenden versionen.json-Mechanismus — verworfen zugunsten der woertlicheren Lesart 'analog zu den Regeln'"
  ],
  "begruendung": "Alle Vorschlagswerte sind aus dem jeweils vollstaendig gelesenen Text abgeleitet und mit Textstelle belegt; keine Story ist als kodierung_geprueft markiert; Rechtskraft bleibt durchgehend unbekannt ausser bei der einen Story mit expliziter Quellenaussage (FS-102) — zur menschlichen Pruefung vorgelegt, nicht entschieden."
}
```

## 9. Ergänzung vom 2026-08-08 — §3-Pflichtfelder, Parser scharf, Mindestfallzahl (§5)

### 9.1 Schritt 1 — Bericht vor jeder Änderung

Geprüft: alle neun `NACHERZAEHLT_OEFFENTLICH`-Geschichten (FS-101–109) auf
die sieben §3-Felder `aktenzeichen`, `instanz`, `kanton`, `rubrik`,
`regel_id`, `regel_version`, `norm_fundstelle`. Keines der sieben Felder
existierte vor dieser Ergänzung in irgendeiner `meta.yaml` — Ausgangslage
also 9 × 7 = 63 fehlende Zellen:

| Story | fehlende Felder |
|---|---|
| FS-101 | aktenzeichen, instanz, kanton, rubrik, regel_id, regel_version, norm_fundstelle |
| FS-102 | aktenzeichen, instanz, kanton, rubrik, regel_id, regel_version, norm_fundstelle |
| FS-103 | aktenzeichen, instanz, kanton, rubrik, regel_id, regel_version, norm_fundstelle |
| FS-104 | aktenzeichen, instanz, kanton, rubrik, regel_id, regel_version, norm_fundstelle |
| FS-105 | aktenzeichen, instanz, kanton, rubrik, regel_id, regel_version, norm_fundstelle |
| FS-106 | aktenzeichen, instanz, kanton, rubrik, regel_id, regel_version, norm_fundstelle |
| FS-107 | aktenzeichen, instanz, kanton, rubrik, regel_id, regel_version, norm_fundstelle |
| FS-108 | aktenzeichen, instanz, kanton, rubrik, regel_id, regel_version, norm_fundstelle |
| FS-109 | aktenzeichen, instanz, kanton, rubrik, regel_id, regel_version, norm_fundstelle |

Keine Änderung an dieser Stelle (Schritt 1 wie beauftragt).

### 9.2 Schritt 2 — Ableitbare Werte eingetragen, Rest offen

Quellen ausschliesslich: der Story-Fliesstext (`story.md`, insbesondere die
Zeile „Quelle & Stand" mit Aktenzeichen, Instanz-Bezeichnung und
`entscheidsuche.ch`-Link) sowie das Aktenzeichen/`quelle`-Feld selbst.
**Nicht** verwendet als Quelle: das `prinzipien`-Feld in `meta.yaml` (z. B.
enthält FS-105 `ordnungsbusse_206_zpo`, was auf Art. 206 ZPO hindeutet) —
der Auftrag nennt ausdrücklich nur Storytext und Aktenzeichen als
Ableitungsquelle; dieser Näherungstreffer wird hier vermerkt, aber nicht
verwendet.

**aktenzeichen** (aus der Quelle-Zeile, alle neun eindeutig): FS-101
ZKBER.2025.43 · FS-102 MJ250072-L · FS-103 NG250015 · FS-104 LU250008 ·
FS-105 RU250068 · FS-106 MJ250016 · FS-107 400 2024 279 · FS-108 MJ250002 ·
FS-109 NG250008.

**instanz** (aus dem Fliesstext: welche Instanz hat den zitierten Entscheid
gefällt — „erste_instanz"/„zweite_instanz", eigene Konvention analog zu den
bereits verwendeten `missions_status`-Werten `urteil_erstinstanz`/
`berufung_abgewiesen`, im Manifest nicht enumeriert): FS-101 zweite_instanz
(Obergericht bestätigt auf Berufung) · FS-102 erste_instanz (Mietgericht,
laut Publikation unangefochten) · FS-103 zweite_instanz (Obergericht,
Beschwerde) · FS-104 zweite_instanz (Obergericht schützt auf Beschwerde) ·
FS-105 zweite_instanz (Obergericht bestätigt auf Beschwerde) · FS-106
erste_instanz (Mietgericht, ausdrücklich als „erstinstanzliches Urteil"
vermerkt) · FS-107 zweite_instanz (Kantonsgericht weist „Berufung" ab) ·
FS-108 erste_instanz (Mietgericht, ausdrücklich „erstinstanzliches Urteil")
· FS-109 zweite_instanz (Obergericht bestätigt).

**kanton** (aus dem `entscheidsuche.ch`-Link-Präfix im Fliesstext, exakt wie
bereits in AUFTRAG-R1 Auslegung 1 verwendet): FS-101 SO · alle übrigen acht
ZH ausser FS-107 BL.

**rubrik** (aus der vorhandenen „*Rubrik: …*"-Zeile, gemappt auf das
Manifest-Enum Wegweiser\|Warnweiser\|Sackgasse): FS-101 Wegweiser · FS-102
Sackgasse · FS-103 Warnweiser · FS-104 Warnweiser · FS-105 Warnweiser ·
FS-106 Wegweiser · FS-108 Sackgasse · FS-109 Sackgasse.
**FS-107 bleibt offen:** seine Rubrik-Zeile lautet „TEILWEISE", ein
vierter Wert, den das Manifest-Enum (nur drei Werte) nicht kennt — kein
Zuordnungsfehler auf meiner Seite, sondern ein Bruch zwischen der
R1-Redaktionsvorlage (vier Rubriken: Wegweiser/Warnweiser/Sackgasse/
Teilweise) und MANIFEST v2.1 §3 (drei Werte). Nicht geraten, welcher der
drei Werte gemeint sein könnte — menschliche Entscheidung nötig (neuer
Wert im Manifest zulassen, oder FS-107 redaktionell umkategorisieren).

**regel_id/regel_version/norm_fundstelle** (nur bei eindeutigem inhaltlichen
Treffer gegen einen bestehenden Eintrag in `wissen/register/`, sonst
offen — die zehn CH- und die eine LU-Regel decken bislang praktisch nur
Kündigungsfristen/Zustellung/Formalien ab, nicht Mängelrecht,
Mietzinserhöhung, Hinterlegung oder Bezifferungspflicht):
- **FS-101:** `R-CH-0007` (Sperrfrist Art. 271a OR) — Story handelt exakt
  von der Sperrfrist nach gewonnenem Verfahren; `regel_version: 0.1.0`;
  `norm_fundstelle: "Art. 271a OR (SR 220)"`.
- **FS-104:** `R-CH-0004` (Zustellfiktion, 7-tägige Abholfrist) — Story:
  „nach Ablauf der siebentägigen Abholfrist gilt sie trotzdem als
  zugestellt" ist eine Paraphrase der Regel; `regel_version: 0.1.0`;
  `norm_fundstelle: "Zustellrecht (Zustellfiktion Einschreiben, 7-taegige
  Abholfrist)"`.
- **FS-102, 103, 105, 106, 107, 108, 109:** kein Registereintrag zum
  jeweiligen Kernprinzip (beziffertes Rechtsbegehren, Gerichtsferien-
  Fristenstillstand, Ordnungsbusse Art. 206 ZPO, Mängelrecht Art. 259a/
  259d OR, VMWG Art. 14, Hinterlegung Art. 259g OR) vorhanden — alle drei
  Felder bleiben offen, nichts geraten.

**Ergebnis:** Nur FS-101 und FS-104 erhalten alle sieben Felder; die
übrigen sieben Geschichten bleiben bei mindestens drei offenen Feldern
(FS-107: vier, wegen der Rubrik-Enum-Lücke).

### 9.3 Schritt 3 — Parser scharf geschaltet

`prototypen/feed/src/story.ts`: die sieben Felder sind jetzt Pflicht für
`NACHERZAEHLT_OEFFENTLICH` (`rubrik` gegen das Dreier-Enum geprüft,
`regel_id` gegen das Register-ID-Muster `R-XX-NNNN`, die übrigen als
nichtleere Skalare). **FIKTIV/Platzhalter dürfen diese Felder nicht einmal
optional tragen** (anders als bei den Feldern aus §8/Abschnitt 2 oben) —
MANIFEST v2.1 §3 spricht von „ausgenommen", nicht nur „nicht verpflichtet".

**Unmittelbare, beabsichtigte Folge:** FS-102, 103, 105, 106, 107, 108, 109
lösen jetzt beim Laden einen Ladefehler aus (`ergebnis.ok === false`,
Pflichtschlüssel fehlt) — sieben von neun bisher angenommenen Geschichten.
Nur FS-101 und FS-104 laden weiterhin. Das ist exakt die verlangte
Wirkung („das ist beabsichtigt, nicht zu umgehen") und wurde nicht
abgeschwächt. Betroffene, angepasste Tests:
- `prototypen/feed/tests/quelle.test.ts`: die Annahme-Prüfung für
  FS-104/105/107/109 aus dem letzten Auftrag ist auf FS-104 (angenommen)
  und FS-105/107/109 (verweigert, mit Grund) umgestellt.
- `redaktion/tests/entwuerfe.test.ts`: prüft jetzt, dass FS-106/108 wegen
  der fehlenden §3-Felder verweigert werden (vorher: Formatgarantie auf
  Annahme) — beide sind ohnehin weiterhin Entwürfe, keine
  Funktionsänderung im Feed.
- Fixture `FX-NACHERZAEHLT-SONST-GUELTIG`: um synthetische, aber
  vollständige §3-Werte ergänzt (Fixtures dürfen frei erfunden werden,
  Invariante 2), damit die „sonst gültig"-Tests weiterhin eine tatsächlich
  vollständige Geschichte prüfen.

### 9.4 Schritt 4 — Mindestfallzahl (§5)

`MINDESTFALLZAHL` existierte bereits in `wissen/tools/quoten-sicht.ts`
(Wert 10, AUFTRAG-W0). Diese eine Definition wird jetzt auch von
`wissen/tools/kodierung-quoten.ts` importiert statt neu definiert
(„als Konstante an einer Stelle", nicht verstreut). Neue
Darstellungsfunktion `mitMindestfallzahl(quote)`: ab `nenner >=
MINDESTFALLZAHL` wird Zähler/Nenner gezeigt, darunter nur die Fallzahl mit
Hinweistext, dass sie für eine Quote nicht ausreicht (§5, abweichend vom
älteren `quotenSicht`-Verhalten in W0, das die Fallzahl ganz ausblendete —
§5 verlangt ausdrücklich, dass die Fallzahl sichtbar bleibt). Eigene Tests
in `wissen/tests/kodierung-quoten.test.ts`.

### 9.5 Testergebnis 2026-08-08 (nach allen vier Schritten)

core 136 · feed **104** (+1: `quelle.test.ts` erhielt einen zweiten Test für
die beabsichtigten Verweigerungen; Annahmeverhalten für sieben Geschichten
geändert) · wissen **62** (+5: Mindestfallzahl-Darstellung) · webflow 9 ·
redaktion 46 (Annahmeverhalten FS-106/108 geändert, Testzahl gleich, da die
Formatgarantie-Schleife durch eine Verweigerungs-Prüfung ersetzt wurde).
Alle fünf Suiten grün (357 Tests gesamt).

### 9.6 Nicht Teil dieser Ergänzung

Keine Rückfrage-Runde vor Schritt 3 (der Auftrag listet alle vier Schritte
als einen zusammenhängenden Ablauf); kein Cross-Check von `regel_id` gegen
den tatsächlichen Registerbestand zur Laufzeit (nur Formatprüfung
`R-XX-NNNN` — ein echter Abgleich würde `wissen/register/` in den
Feed-Prototyp laden, das ist heute nicht beauftragt); keine Entscheidung
über FS-107s Rubrik-Lücke.

## 10. Ergänzung vom 2026-08-08 — zwei Befunde, ein Zielkonflikt (Bericht/Rückfrage)

### 10.1 Norm-Fundstellen aus dem Storytext (Bericht, keine Änderung)

Alle sieben `story.md`-Volltexte (FS-102, 103, 105, 106, 107, 108, 109)
durchsucht auf „Art.", „§", „Abs.", ausgeschriebene Gesetzesnamen und
„SR "-Nummern: **In keiner der sieben Stories nennt der Storytext selbst
einen Artikel oder ein Gesetz.** FS-107 spricht nur generisch von „das
Gesetz"/„die gesetzliche Vermutung" (Zeilen 24, 28, 48, 60), ohne Artikel
oder Gesetzestitel zu nennen. Bestätigt: `norm_fundstelle` war beim
vorherigen Lauf zu Recht nicht ableitbar — keine Ableitungslücke, sondern
ein Fakt der Story-Texte selbst.

### 10.2 „TEILWEISE" in FS-107 (Bericht, keine Änderung)

Kommt im Story-Text genau einmal vor: `*Rubrik: TEILWEISE — kleine Senkung
statt grosser Korrektur.*` (Zeile 69) — **als Rubrik-Zeile**, nicht als
Ergebnis-Aussage in Prosa. Laut Nutzer: Altbestand aus der Zeit vor dem
Dreier-Enum (Wegweiser/Warnweiser/Sackgasse). **Redaktionsaufgabe (nicht
von mir korrigiert):** FS-107s Rubrik-Zeile auf eines der drei zulässigen
Worte ummappen oder bewusst als vierte Kategorie im Manifest zur Diskussion
stellen.

### 10.3 prinzipien-Bezeichner mit Artikel-Hinweis (Bericht, keine Änderung)

Ausdrücklich **Redaktionshinweis, keine Fundstelle** — abgeleitet aus dem
`prinzipien`-Feld in `meta.yaml`, nicht aus einer im Storytext zitierten
Norm:

| Story-ID | Bezeichner | vermuteter Artikel |
|---|---|---|
| FS-105 | `ordnungsbusse_206_zpo` | Art. 206 ZPO |
| FS-106 | `maengelbehebung_259a` | Art. 259a OR |
| FS-106 | `herabsetzung_259d` | Art. 259d OR |
| FS-107 | `umfassende_ueberholung_vmwg14` | Art. 14 VMWG |
| FS-108 | `hinterlegung_259g` | Art. 259g OR |

FS-102, FS-103, FS-109: kein Bezeichner in `prinzipien` enthält eine Zahl,
die auf einen Artikel hindeutet.

### 10.4 norm_fundstelle in R-CH-0007/R-CH-0004 — Zielkonflikt, per Rückfrage geklärt

Vor jeder Änderung geprüft: `wissen/schema/erkenntnis.schema.json` setzt
`additionalProperties: false` durch (Schema-Beschreibung wörtlich:
„Unbekannte Felder sind ungültig") und kennt kein Feld `norm_fundstelle`
auf oberster Ebene eines Register-Eintrags — nur `quellen[].artikel`/
`quellen[].fundstelle`. Ein bare `norm_fundstelle`-Schlüssel hätte
`wissen/tests/schema.test.ts`, `konsistenz.test.ts` und den `baueDist()`-
Build sofort zum Scheitern gebracht.

Dem Nutzer zwei Wege vorgelegt (Schema additiv um ein optionales Feld
erweitern vs. kein Eingriff, vorhandene `quellen[0]`-Felder gelten als
Referenz). **Entscheid: kein Schema-Eingriff.** Keine Änderung an
`R-CH-0007.json`/`R-CH-0004.json` oder am Schema. Die bereits vorhandenen
`quellen[0].artikel`/`quellen[0].fundstelle` beider Einträge sind die
Referenz — identisch mit dem, was bereits in `FS-101`/`FS-104`s
`norm_fundstelle` steht („Art. 271a OR (SR 220)" bzw. „Zustellrecht
(Zustellfiktion Einschreiben, 7-taegige Abholfrist)").

### 10.5 Testergebnis

Keine Code- oder Datenänderung in dieser Ergänzung — alle drei Punkte sind
Bericht bzw. durch Rückfrage geklärt ohne Dateiänderung. Suiten unverändert
grün (357 Tests, Stand §9.5).

## 11. Offener Redaktionsstand (Bericht, keine Änderung) — Stand 2026-08-08

FS-107s Rubrik-Zeile bleibt als Redaktionsaufgabe liegen (§10.2), keine
Freigabe für diesen Lauf nötig.

| Story | lädt | fehlende Pflichtfelder | prinzipien-Hinweis auf Artikel |
|---|---|---|---|
| FS-101 | ✅ lädt | — | ja — `sperrfrist_271a` → Art. 271a OR (**bereits verwendet**, regel_id R-CH-0007) |
| FS-102 | ❌ lädt nicht | regel_id, regel_version, norm_fundstelle | nein |
| FS-103 | ❌ lädt nicht | regel_id, regel_version, norm_fundstelle | nein |
| FS-104 | ✅ lädt | — | nein |
| FS-105 | ❌ lädt nicht | regel_id, regel_version, norm_fundstelle | ja — `ordnungsbusse_206_zpo` → Art. 206 ZPO (offen, nicht verwendet) |
| FS-106 | ❌ lädt nicht (Entwurf) | regel_id, regel_version, norm_fundstelle | ja — `maengelbehebung_259a`, `herabsetzung_259d` → Art. 259a/259d OR (offen, nicht verwendet) |
| FS-107 | ❌ lädt nicht | rubrik (Altbestand „TEILWEISE", Redaktionsaufgabe §10.2), regel_id, regel_version, norm_fundstelle | ja — `umfassende_ueberholung_vmwg14` → Art. 14 VMWG (offen, nicht verwendet) |
| FS-108 | ❌ lädt nicht (Entwurf) | regel_id, regel_version, norm_fundstelle | ja — `hinterlegung_259g` → Art. 259g OR (offen, nicht verwendet) |
| FS-109 | ❌ lädt nicht | regel_id, regel_version, norm_fundstelle | nein |

**Summe:** 2 von 9 laden (FS-101, FS-104); 7 offen, davon 5 real im Feed
verweigert (FS-102/103/105/107/109) und 2 weiterhin Entwurf (FS-106/108,
würden bei Übernahme ebenfalls verweigert); 4 der 7 offenen Stories haben
einen ungenutzten `prinzipien`-Hinweis, der eine künftige `wissen/register`-
Ergänzung erleichtern könnte (FS-105, 106, 107, 108) — ausdrücklich
Redaktionshinweis, keine Fundstelle (§10.3).

Ende dieses Laufs — keine weiteren Änderungen.

## 12. Ergänzung vom 2026-08-08 — Originaltext-Bestand und Register-Umfang (Bericht, keine Änderung)

### 12.1 Liegt der Originaltext des Entscheids im Repo? (FS-102–109)

Geprüft per Volltextsuche über das gesamte Repo (Aktenzeichen aller acht
Stories) sowie Durchsicht von `redaktion/kandidaten/`, `wissen/eingang/`
und dem Repo auf Cache-/Rohtext-Verzeichnisse.

| Story | Originaltext im Repo? | Was stattdessen vorliegt (Pfad) |
|---|---|---|
| FS-102 | nein | `redaktion/kandidaten/2025-10.md` (Metadatenzeile), `prototypen/stories/FS-102-klage-ohne-zahl/story.md` (bereits nacherzählt, Namen ersetzt) |
| FS-103 | nein | `redaktion/kandidaten/2025-10.md`, `prototypen/stories/FS-103-ein-tag-zu-spaet/story.md` |
| FS-105 | nein | `redaktion/kandidaten/2025-10.md`, `prototypen/stories/FS-105-der-termin-sei-verschoben/story.md` |
| FS-106 | nein | `redaktion/kandidaten/2026-04.md`, `redaktion/entwuerfe/FS-106-offene-waende/story.md` |
| FS-107 | nein | `redaktion/kandidaten/2025-06.md`, `prototypen/stories/FS-107-die-erhoehung-nach-der-sanierung/story.md` |
| FS-108 | nein | `redaktion/kandidaten/2026-01.md`, `redaktion/entwuerfe/FS-108-sieben-jahre-hinterlegt/story.md` |
| FS-109 | nein | `redaktion/kandidaten/2026-03.md`, `prototypen/stories/FS-109-beziffern-in-zweiter-instanz/story.md` |

Alle Fundstellen sind entweder reine Metadatenzeilen
(Datum · Gericht · Aktenzeichen · Betreff-Fragment · Link, kein Fliesstext
des Entscheids) oder die bereits nacherzählte Story (Namen ersetzt, keine
Wiedergabe des Originalwortlauts). `redaktion/kodierung/zweitlauf-2026-08-08.json`
enthält ebenfalls nur den Story-Text, nicht den Originaltext. Kein
Cache-, Rohtext- oder Volltext-Verzeichnis existiert im Repo — deckungsgleich
mit der wiederholt dokumentierten Regel „im Repo wurde zu keinem Zeitpunkt
Volltext gespeichert" (`berichte/AUFTRAG-R1-ABSCHLUSS.md` §1, §8.2) und mit
`wissen/eingang/README.md` („Keine Falldaten").

### 12.2 Norm laut Originaltext (FS-102–109)

Entfällt für alle acht Stories — da kein Originaltext im Repo liegt (12.1),
gibt es keine Quelle, aus der eine Norm zitiert werden könnte. Nichts
angelegt.

### 12.3 Umfang von wissen/register/

**11 Erkenntnis-Einträge** (10 × `R-CH-`, 1 × `R-LU-0001`), alle
`regelversion: "0.1.0"`, `pruefstand: "fachlich_zu_verifizieren"`. Abgedeckte
Rechtsgebiete — ausschliesslich Mietrecht Kündigung, in vier Gruppen:

| Gruppe | Einträge | Inhalt |
|---|---|---|
| Fristenrecht (allgemein/Zustellung) | R-CH-0002, R-CH-0003, R-CH-0004, R-LU-0001 | Fristbeginn, Fristende an Wochenende/Feiertag, Zustellfiktion Einschreiben (7 Tage), kantonale Feiertage LU für R-CH-0003 |
| Kündigungsanfechtung | R-CH-0001 | 30-Tage-Anfechtungsfrist bei der Schlichtungsbehörde |
| Kündigungsformalien | R-CH-0005, R-CH-0006 | Formular-/Unterschriftspflicht, separate Zustellung an Ehe-/Partnerschaftswohnung |
| Sperrfrist Art. 271a OR | R-CH-0007, R-CH-0008 | Sperrfrist nach Verfahren aus dem Mietverhältnis, Indiz-Vermutung bei zeitlicher Nähe |
| Sonderfall/Scope (kein materielles Mietrecht) | R-CH-0009, R-CH-0010 | Befristetes Mietverhältnis (offen, fachlich zu klären), M1-Scope-Beschränkung auf Kanton Luzern |

**Nicht abgedeckt:** Mängelrecht (Art. 259a/259d/259g OR), Mietzinserhöhung/
VMWG, Bezifferungspflicht des Rechtsbegehrens, Ordnungsbusse Art. 206 ZPO,
Gerichtsferien/Rechtsmittelfristen — bestätigt erneut, warum `regel_id` für
FS-102/103/105/106/107/108/109 nicht ableitbar war (§9.2).

### 12.4 Befund — gerissene Kette Urteil → Norm (keine Umsetzung)

Für FS-102, 103, 105, 106, 107, 108, 109 ist die tragende Norm ohne
Rückgriff auf den Originalentscheid nicht feststellbar: kein Originaltext
im Repo (§12.1), keine Nennung im Storytext (§10.1), kein passender
`wissen/register`-Eintrag (§12.3) — nur bei vier der sieben ein ungenutzter
`prinzipien`-Hinweis, der selbst Redaktionshinweis bleibt, keine Fundstelle
(§10.3). Die Kette Urteil → Norm ist bei diesen sieben Stories gerissen.
Rekonstruktion ist ausschliesslich über einen erneuten Abruf bei
entscheidsuche.ch anhand des jeweiligen Aktenzeichens möglich — nicht aus
dem, was heute im Repo liegt. Keine Umsetzung in diesem Lauf.

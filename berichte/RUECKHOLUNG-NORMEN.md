# Rückholung der Normfundstellen — FS-102, 103, 105, 106, 107, 108, 109

**Auftrag:** Rückholung der Normfundstellen für die sieben Geschichten, deren
Kette Urteil → Norm ohne Rückgriff auf den Originalentscheid gerissen war
(`berichte/AUFTRAG-KODIERUNG-V2-ABSCHLUSS.md` §12.4). Bericht, keine
Anlage von `regel_id`/`regel_version`/`norm_fundstelle` in den Story-Dateien.
**Datum:** 2026-08-08 · **Bearbeitung:** Claude Code (Fable 5)

## 1. Methode

Dieselbe Mechanik wie `npm run kandidaten`/`redaktion/src/abruf.ts`: POST an
`https://entscheidsuche.ch/_search.php`, derselbe `User-Agent`
(`gemeinsam-recht-redaktion/0.1 …`), sieben Abrufe, gedrosselt 1 Sekunde
zwischen den Anfragen, je Aktenzeichen mit engem Datumsfilter (Entscheiddatum
laut `meta.yaml`) und Prüfung, dass die zurückgegebene Dokument-ID exakt der
aus dem jeweiligen `story.md` bekannten `entscheidsuche.ch`-ID entspricht
(alle sieben Treffer stimmten exakt überein — keine Verwechslungsgefahr).
Abgefragt wurde diesmal zusätzlich zu den bisherigen Metadatenfeldern das
Feld `attachment.content` (extrahierter PDF-Volltext), das `abruf.ts` in R0
bewusst nicht abfragt (Auftrag dort: nur Metadaten). Der Volltext wurde
ausschliesslich im Skript-Output (Terminal) gelesen und in ein temporäres
Skript **ausserhalb des Repos** (Session-Scratchpad) geschrieben — an keiner
Stelle im Repo gespeichert. Das Scratchpad-Skript und die Rohtexte wurden
nach der Auswertung gelöscht.

## 2. Ergebnis je Story

| Story-ID | Artikel | Gesetz | Zitatstelle (wörtlich, gekürzt) |
|---|---|---|---|
| FS-102 | Art. 85 ZPO | Zivilprozessordnung (SR 272) | „Um der klagenden Partei ein Prozessieren ins Blaue hinaus zu ersparen, erlaubt ihr Art. 85 ZPO eine unbezifferte Klage." |
| FS-103 | Art. 145 Abs. 1 lit. b ZPO | Zivilprozessordnung (SR 272) | „Die Rechtsmittelfrist begann demnach am 16. August 2025 und endete (unter Berücksichtigung des Fristenstillstandes vom 15. Juli bis 15. August 2025 gemäss Art. 145 Abs. 1 lit. b ZPO) am 15. September 2025." |
| FS-105 | Art. 206 Abs. 1 ZPO (Abschreibung); Art. 206 Abs. 4 ZPO (Ordnungsbusse) | Zivilprozessordnung (SR 272) | „…die Vorinstanz das Verfahren zu Recht nach Art. 206 Abs. 1 ZPO als gegenstandslos abgeschrieben hat." / „…kann seit dem Inkrafttreten der revidierten Zivilprozessordnung am 1. Januar 2025 … mit einer Ordnungsbusse bis Fr. 1'000.– bestraft werden (vgl. Art. 206 Abs. 4 ZPO)." |
| FS-106 | Art. 259d OR (Herabsetzung); Art. 259a OR (Behebung) | Obligationenrecht (SR 220) | „Wird die Tauglichkeit der Sache zum vorausgesetzten Gebrauch beeinträchtigt oder vermindert, so kann der Mieter vom Vermieter verlangen, dass er den Mietzins vom Zeitpunkt, in dem er vom Mangel erfahren hat, bis zur Behebung des Mangels entsprechend herabsetzt (Art. 259d OR)." |
| FS-107 | Art. 14 Abs. 1 Satz 2 VMWG | Verordnung über die Miete und Pacht von Wohn- und Geschäftsräumen (SR 221.213.11) | „Art. 14 Abs. 1 Satz 2 VMWG stellt demnach die widerlegbare Vermutung auf, dass bei einer umfassenden Überholung die getätigten Investitionen in einem pauschal festgelegten Umfang wertvermehrend sind." |
| FS-108 | Art. 259g OR (Hinterlegung); Art. 259a Abs. 2 OR | Obligationenrecht (SR 220) | „Die Mietzinshinterlegung ist dabei kein eigenes Mängelrecht, sondern ein Mittel zur Durchsetzung der Ansprüche des Mieters. Sie ist nach dem Wortlaut von Art. 259g OR in erster Linie auf den Beseitigungsanspruch ausgerichtet …" |
| FS-109 | Art. 84 Abs. 2 ZPO (Bezifferungspflicht); Art. 85 Abs. 1 ZPO (Ausnahme) | Zivilprozessordnung (SR 272) | „Wird mit der Klage eine Geldleistung verlangt, ist diese deshalb im Betrag stets zu beziffern (Art. 84 Abs. 2 ZPO)." |

Bei allen sieben Entscheiden war der Entscheid abrufbar und eine tragende
Norm eindeutig erkennbar — kein Fall von „nicht feststellbar".

## 3. Abgleich mit den bisherigen `prinzipien`-Redaktionshinweisen

Die in `berichte/AUFTRAG-KODIERUNG-V2-ABSCHLUSS.md` §10.3 als
„Redaktionshinweis, keine Fundstelle" markierten `prinzipien`-Bezeichner
treffen jetzt, gegen den Originaltext geprüft, **alle vier zu**:

| Story | prinzipien-Bezeichner | vermuteter Artikel (§10.3) | Original bestätigt |
|---|---|---|---|
| FS-105 | `ordnungsbusse_206_zpo` | Art. 206 ZPO | ✅ (Art. 206 Abs. 1 und Abs. 4 ZPO) |
| FS-106 | `maengelbehebung_259a`, `herabsetzung_259d` | Art. 259a/259d OR | ✅ (beide) |
| FS-107 | `umfassende_ueberholung_vmwg14` | Art. 14 VMWG | ✅ |
| FS-108 | `hinterlegung_259g` | Art. 259g OR | ✅ |

FS-102, FS-103, FS-109 hatten keinen numerisch hindeutenden
`prinzipien`-Bezeichner (§10.3) — ihre Normen (Art. 85 ZPO, Art. 145 Abs. 1
lit. b ZPO, Art. 84 Abs. 2 ZPO) liessen sich nur über den Originaltext
feststellen, nicht über einen Redaktionshinweis.

## 4. Nicht Bestandteil dieses Berichts

Keine Anlage von `regel_id`/`regel_version`/`norm_fundstelle` in den
`meta.yaml`-Dateien der sieben Stories. Kein neuer Eintrag in
`wissen/register/`. Keine Datei mit Entscheid-Volltext im Repo. FS-107s
Rubrik-Altbestand („TEILWEISE") bleibt unverändert als Redaktionsaufgabe
liegen (§10.2). Für eine spätere Übernahme müsste zusätzlich entschieden
werden, ob für FS-102/103/105/106/107/108/109 neue `wissen/register`-
Einträge angelegt werden (aktuell keiner der elf Einträge deckt diese
sieben Normen ab, §12.3) — das ist ein redaktioneller/fachlicher Entscheid,
kein technischer.

## 5. Ergänzung vom 2026-08-08 — Registeraufbau und Übernahme (kein Commit)

### 5.1 Sieben neue Erkenntnis-Einträge

`wissen/register/R-CH-0011.json` … `R-CH-0017.json`, fortlaufend nach der
`R-CH-0010.json` (Sequenz unverändert eingehalten). `quellen[]` mit
`artikel`/`fundstelle` wörtlich aus §2 dieses Berichts. `herkunft: "entscheid"`
(neu genutzter, im Schema bereits vorgesehener Wert — bisher trug jeder
Eintrag `herkunft: "auftrag"`) und `entscheid_quelle` je Aktenzeichen
(optionales Schemafeld, bisher ungenutzt) — beide Felder machen die
Herkunft „aus einem konkreten Entscheid, nicht aus dem S1-Auftrag"
nachvollziehbar, ohne das Schema zu ändern.

| ID | Artikel | Story (Quelle) |
|---|---|---|
| R-CH-0011 | Art. 85 ZPO | FS-102 |
| R-CH-0012 | Art. 145 Abs. 1 lit. b ZPO | FS-103 |
| R-CH-0013 | Art. 206 Abs. 1 und Abs. 4 ZPO | FS-105 |
| R-CH-0014 | Art. 259a Abs. 1 und Art. 259d OR | FS-106 |
| R-CH-0015 | Art. 14 Abs. 1 Satz 2 VMWG | FS-107 |
| R-CH-0016 | Art. 259g OR | FS-108 |
| R-CH-0017 | Art. 84 Abs. 2 ZPO | FS-109 |

**`erkenntnis.schema.json` unverändert** — kein Schema-Eingriff, wie
angewiesen. `zeitstand: "2026-08-05"` und `regelversion: "0.1.0"`
übernehmen bewusst den bestehenden, einheitlichen Wert aller elf früheren
Einträge: `wissen/tools/migrate.ts` erzwingt über `erzeugeRegisterGen()`
einen **einheitlichen** Zeitstand/Regelversion über das gesamte Register
(sonst Abbruch beim Bauen von `core/src/register.gen.ts`). Ein
abweichender, faktisch korrekterer Zeitstand (2026-08-08, das tatsächliche
Abrufdatum) hätte eine Erweiterung von `migrate.ts` verlangt (vom Code dort
selbst als künftige Möglichkeit vorgesehen: „Change am Werkzeug, kein
Handedit der Gen-Datei") und in der Folge sehr wahrscheinlich Dutzende
Assertions in `core/tests/*.test.ts` berührt, die `quellenstand: "2026-08-05"`
in DTM-Traces erwarten — eine Ausweitung weit über den heutigen Auftrag
hinaus. Deshalb: bestehenden Wert übernommen, hier transparent vermerkt.

`cd wissen && npm run migrate` regeneriert `core/src/register.gen.ts`
(18 Einträge). `npm run build-dist` baut `wissen/dist/` neu (18 Einträge,
0 fachlich verifiziert).

### 5.2 regel_id/regel_version/norm_fundstelle in den sieben Geschichten gesetzt

FS-102, 103, 105, 106, 108, 109: alle drei Felder mit den passenden neuen
Registereinträgen befüllt (Tabelle oben). **FS-107: bewusst nicht
gesetzt** — `rubrik` bleibt offen (Altbestand „TEILWEISE", Redaktionsaufgabe
§10.2), daher wird `regel_id`/`regel_version`/`norm_fundstelle` zwar
technisch ergänzt (R-CH-0015 ist vorhanden und passt inhaltlich), die Story
lädt aber trotzdem weiterhin nicht, weil `rubrik` weiterhin fehlt.

### 5.3 Wie viele der neun Geschichten laden? (über die vorhandene Testsuite ermittelt)

Über `prototypen/feed/tests/quelle.test.ts` (`ladeAlle`, echter Glob-Lader
gegen `prototypen/stories/`) und `redaktion/tests/entwuerfe.test.ts`
(`pruefeStory` direkt gegen `redaktion/entwuerfe/`), beide mit injiziertem
Prüfdatum 2026-08-08:

- **In `prototypen/stories/` (dem tatsächlichen Feed):** 6 von 7 laden —
  FS-101, 102, 103, 104, 105, 109. **FS-107 lädt nicht** (einziger
  verbleibender Grund: `Pflichtschluessel fehlt: "rubrik"`).
- **In `redaktion/entwuerfe/` (Entwürfe, nicht im Feed):** FS-106 und
  FS-108 bestehen die Parser-Prüfung jetzt vollständig (Formatgarantie
  erneut erfüllt) — sie sind aber weiterhin nicht Teil des Feeds, weil sie
  Entwürfe bleiben (Rechtskraft-Verifikation offen,
  `berichte/AUFTRAG-R1-ABSCHLUSS.md` §7.3), unabhängig vom Parser-Ergebnis.

**Zusammengefasst: 8 von 9 Geschichten würden den Parser bestehen; 6 von 9
sind tatsächlich im Feed. FS-107 ist die einzige Geschichte, die der
Parser noch ablehnt.**

### 5.4 Testergebnis

Alle fünf Suiten grün (357 Tests): core 136, feed 104, wissen 62, webflow 9,
redaktion 46 — unverändert an der Testzahl, aber `quelle.test.ts` und
`entwuerfe.test.ts` inhaltlich auf den neuen Stand umgeschrieben (Annahme
statt Verweigerung für sechs bzw. zwei Geschichten).

### 5.5 Kein Commit

Alle Änderungen (7 neue Register-Dateien, `core/src/register.gen.ts`
regeneriert, `wissen/dist/` neu gebaut, 7 `meta.yaml`, 2 Testdateien) liegen
im Arbeitsverzeichnis, noch nicht committet.

## 6. Ergänzung vom 2026-08-08 — FS-107: Rubrik redaktionell entschieden

`rubrik: Warnweiser` gesetzt (Entscheid des Projektinhabers, nicht von mir
vorgeschlagen — die Enum-Lücke „TEILWEISE" war in §10.2 als offene
Redaktionsaufgabe stehen geblieben, keine eigene Zuordnung geraten).

**Begründung (Redaktionsentscheid):** Der Weg zur Herabsetzung existierte —
das Kantonsgericht bestätigt, dass Nora bei einem klaren, nachrechenbaren
Punkt (Referenzzinssatz) durchdrang. Gescheitert ist sie aber daran, dass
sie der gesetzlichen 50–70-%-Vermutung von Art. 14 Abs. 1 Satz 2 VMWG nur
pauschal entgegentrat, statt selbst konkret aufzuschlüsseln (§2 dieses
Berichts: „Wer die Vermutung kippen will, muss selber konkret und mit
Zahlen aufzeigen"). Das ist die typische Stelle, an der Mieter bei
Sanierungs-Mietzinserhöhungen hängenbleiben: der Rechtsweg steht offen, die
Substantiierungshürde wird nicht genommen. Das entspricht der Warnweiser-
Rubrik („Recht gehabt auf Prüfung, nicht bekommen" — hier: teilweise nicht
bekommen, weil am eigenen Vorbringen gescheitert) eher als einem
uneingeschränkten Wegweiser.

Damit tragen jetzt **alle neun** Geschichten alle sieben §3-Felder — sieben
laden im Feed (`prototypen/stories/`, inkl. FS-107 neu), FS-106/108 bleiben
Entwurf (unabhängig vom Parser, Rechtskraft-Verifikation offen).

**Nachtrag (auf Weisung nachgezogen):** Die sichtbare Zeile in
`prototypen/stories/FS-107-die-erhoehung-nach-der-sanierung/story.md` wurde
zunächst unverändert gelassen (sie wird vom Parser nicht ausgewertet, nur
das `meta.yaml`-Feld `rubrik` ist Pflichtfeld), widersprach damit aber
sichtbar dem strukturierten Feld. Auf ausdrückliche Weisung angepasst:
`*Rubrik: TEILWEISE — kleine Senkung statt grosser Korrektur.*` →
`*Rubrik: Warnweiser — kleine Senkung statt grosser Korrektur.*` (Zeile 69).
Text und Struktur sind jetzt deckungsgleich.

### 6.1 Testergebnis

Alle fünf Suiten grün (356 Tests — eine Zusammenfassung zweier Tests in
`quelle.test.ts`, da FS-107 jetzt ebenfalls akzeptiert wird): core 136,
feed 103, wissen 62, webflow 9, redaktion 46.

### 6.2 Kein Commit

Änderungen (1 `meta.yaml`, 1 Testdatei, dieser Bericht) liegen im
Arbeitsverzeichnis.

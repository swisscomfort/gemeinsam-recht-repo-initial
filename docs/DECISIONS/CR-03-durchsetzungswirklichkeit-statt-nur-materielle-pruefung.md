# CR-03 — Durchsetzungswirklichkeit statt nur materielle Prüfung

**Status:** ANGENOMMEN — Projektinhaberentscheid vom 9. August 2026. Umsetzung erfolgt separat; MD-001 v2.0.0 und ML-001 bleiben unverändert.
**Entscheidung (nur Projektinhaber, schriftlich):** ANGENOMMEN am 9. August 2026.
**Referenz:** MANIFEST v2.1 §1 (Zweck), §5 (Zählregeln), §9 (Publikationsgrenzen), §15 (Änderungsverfahren); MD-001 v2.0.0; ML-001 (Kalibrierungslauf, PR #8)

## Eigentümerauflagen zur Umsetzung

Die Annahme gilt mit folgenden vorab festgelegten Umsetzungsregeln. Diese Regeln
dürfen bei der späteren Klassifikation nicht anhand beobachteter Ergebnisse
optimiert werden.

### E1 — `erledigungsweg` wird zweiachsig modelliert

Kein flaches Enum, das Entscheidform und Ursache vermischt.

Pflichtfeld `erledigungsweg`:

- `modus`:
  - `materiell_entschieden`
  - `prozessual_erledigt`
  - `rueckweisung_offen`
- `prozessgrund`: nur bei `prozessual_erledigt` belegt, sonst `null`:
  - `rechtsmittelbegruendung_unzureichend`
  - `aktivlegitimation_fehlte`
  - `klagebewilligung_fehlte_oder_ungueltig`
  - `anfechtungsfrist_verwirkt`
  - `instanzverwirkung`
  - `nichteintreten_sonstiger_grund`
  - `sonstiger_prozessgrund`
- `beleg`: konkrete Textstelle oder präziser Fundstellenhinweis aus der
  Primärquelle.

`erledigungsweg` ist strikt vom `messausgang` getrennt. Der gleiche
prozessuale Weg kann zu unterschiedlichen endgültigen Rechtswirkungen führen.

### E2 — Recherchegrenze für den endgültigen Zustand

1. Zuerst ist der Bundesgerichtsentscheid selbst auszuwerten.
2. Ist daraus der endgültige rechtliche Zustand der konkreten Kündigung nicht
   bestimmbar, dürfen und müssen nur **explizit verknüpfte Entscheidungen
   derselben Verfahrenskette** nachgelesen werden.
3. Zulässig sind primär amtliche Entscheidquellen des Bundesgerichts und der
   kantonalen Gerichte. Ein exakter Entscheidsuche-Spiegel desselben Entscheids
   ist zulässig, wenn der amtliche Volltext technisch nicht zugänglich ist;
   die Provenienz ist festzuhalten.
4. Die Recherche endet, sobald die Rechtswirkung auf genau diese Kündigung
   bestimmbar ist.
5. Keine offene Suche nach Parteinamen, ähnlichen Fällen oder vermutetem
   Ausgang; keine Medienberichte, Kommentare oder Sekundärquellen zur
   Bestimmung des Messausgangs.
6. Bleibt der Endzustand innerhalb dieser dokumentierten Verfahrenskette nicht
   sicher bestimmbar, bleibt der Treffer `ungeklaert`. Es wird nicht geraten.

Diese beiden Auflagen sind Teil des Eigentümerentscheids zu CR-03.

## Betroffene Paragrafen

MD-001 v2.0.0, Feld `messfrage` und Einschlusscode `kuendigungsschutz_streitig`.
Das Manifest selbst ist nicht betroffen: MD-001 ist eine separat versionierte
Messdefinition, keine Manifest-Regel. `FREEZE.txt` wird durch diese CR nicht
berührt.

## Bisherige Regelung

MD-001 v2.0.0 legt zweierlei fest, das sich in einem Teil des Korpus nicht
zugleich erfüllen lässt.

**A — Messfrage (Auszug, wörtlich):**

> „In wie vielen der vom Bundesgericht endgueltig entschiedenen Streitigkeiten,
> in denen sich eine Mietpartei gegen eine Kuendigung auf den Kuendigungsschutz
> nach Art. 271/271a OR berief, wurde dieser Kuendigungsschutz durchgesetzt […]?"

Die Population ist damit über **zwei** Merkmale bestimmt: endgültig entschiedene
Streitigkeit, und Berufung der Mietpartei auf Art. 271/271a OR.

**B — Einschlusscode `kuendigungsschutz_streitig` (wörtlich):**

> „Der Entscheid beurteilt materiell, ob eine Kuendigung des Mietverhaeltnisses
> dem Kuendigungsschutz nach Art. 271/271a OR standhaelt."

Dieser Code fügt ein **drittes** Merkmal hinzu, das die Messfrage nicht nennt:
eine eigene materielle Beurteilung durch das Bundesgericht.

Solange beide Merkmale zusammenfallen, fällt der Unterschied nicht auf. ML-001
hat 16 Streitigkeiten sichtbar gemacht, in denen sie auseinanderfallen.

## Der Befund aus ML-001

In allen 16 Fällen gehörte die Anfechtung einer konkreten Kündigung unter
Berufung auf Art. 271/271a OR zum Verfahrensgegenstand. In allen 16 Fällen
endete die Streitigkeit über eine prozessuale Schranke, ohne dass das
Bundesgericht Art. 271/271a OR selbst beurteilt hätte.

| Rohpos. | Entscheid | Erledigungsgrund |
| ---: | --- | --- |
| 049 | 4A_173/2015 | Nichteintreten (Art. 108 Abs. 1 BGG) |
| 088 | 4A_283/2020 | Nichteintreten |
| 113 | 4A_356/2020 | Nichteintreten |
| 119 | 4A_372/2017 | Nichteintreten |
| 138 | 4A_429/2015 | Nichteintreten auf den Anfechtungspunkt mangels Begründung |
| 160 | 4A_476/2023 | Nichteintreten — trifft die Vermieterseite |
| 203 | 4A_613/2016 | Nichteintreten mangels Begründung |
| 087 | 4A_282/2021 | Abweisung mangels Aktivlegitimation |
| 177 | 4A_539/2019 | Abweisung mangels Aktivlegitimation, fehlende Teilnahme an der Schlichtung |
| 206 | 4A_622/2016 | Anfechtung des Mieters persönlich unzulässig; Art. 271-Rügen ausdrücklich unbehandelt |
| 163 | 4A_482/2015 | Klage mangels gültiger Klagebewilligung unzulässig |
| 092 | 4A_293/2016 | Verwirkung der 30-Tage-Frist (Art. 273 Abs. 1 OR) |
| 112 | 4A_351/2015 | Verwirkung der Anfechtungsfrist |
| 120 | 4A_374/2023 | Verwirkung der Anfechtungsfrist |
| 150 | 4A_459/2020 | Instanzverwirkung (péremption d'instance) |
| 117 | 4A_368/2019 | ungenügende Berufungsbegründung im kantonalen Verfahren |

Nach A gehören sie in die Population, nach B nicht. Beide Lesarten sind
vertretbar; sie führen zu verschiedenen Nennern. MD-001 v2.0.0 entscheidet
zwischen ihnen nicht.

**Diese CR wird nicht mit der beobachteten Erfolgsverteilung dieser 16 Fälle
begründet.** Ob ihre Aufnahme eine Quote höher oder tiefer ausfallen liesse,
ist für die Regelwahl ohne Bedeutung und wird hier deshalb weder ausgewertet
noch angeführt. Die Begründung stützt sich ausschliesslich auf den Zweck der
Messung und auf die innere Widersprüchlichkeit von A und B.

## Vorgeschlagene Regelung

Für eine Beobachtungsstelle für Rechtswirklichkeit ist entscheidend, **welche
endgültige Rechtswirkung die angegriffene Kündigung erfährt** — nicht, auf
welchem Weg das Gericht dorthin gelangt.

### Einschluss

Eine Streitigkeit gehört zur Population, wenn kumulativ:

1. eine Mietpartei eine **konkrete Kündigung** unter Berufung auf
   Art. 271/271a OR angegriffen hat;
2. die Streitigkeit im definierten Gerichts-, Quellen- und Zeitraumkorpus
   liegt;
3. der **endgültige rechtliche Zustand der angegriffenen Kündigung**
   bestimmbar ist.

Eine eigene materielle Prüfung von Art. 271/271a OR durch das Bundesgericht ist
**nicht** Voraussetzung.

Damit werden nicht mehr automatisch aus dem Nenner entfernt:

- Nichteintreten
- Verwirkung der Anfechtungsfrist
- fehlende Aktivlegitimation
- fehlende oder ungültige Klagebewilligung
- ungenügende Rechtsmittelbegründung

— sofern Merkmal 3 erfüllt ist.

Merkmal 3 ist die Grenze, nicht eine Formalie: Wo der endgültige Zustand der
Kündigung offen bleibt (Rückweisung mit noch nötiger materieller Entscheidung,
parallel hängiges Anfechtungsverfahren, aus dem Entscheid nicht bestimmbarer
Streitgegenstand), gehört die Streitigkeit nicht in den Zähler und je nach
Ausgestaltung auch nicht in den Nenner. Bei 4A_613/2016 etwa lässt der Entscheid
nicht erkennen, ob die Mietpartei Art. 271/271a OR überhaupt angerufen hat; ein
solcher Fall bleibt auch unter der neuen Regel nicht automatisch eingeschlossen.

### Messausgang nach Endwirkung

| Wert | Bedeutung |
| --- | --- |
| `durchgesetzt` | Die angegriffene Kündigung ist im endgültigen Ergebnis aufgrund des geltend gemachten Kündigungsschutzes aufgehoben bzw. unwirksam. |
| `nicht_durchgesetzt` | Die Kündigung bleibt im endgültigen Ergebnis wirksam bzw. die Anfechtung ist endgültig erfolglos. |
| `nicht_anwendbar` | Der Schutz nach Art. 271/271a OR wird als auf die konkrete Konstellation nicht anwendbar beurteilt. |
| `offen` | Zur konkreten Kündigung ist noch eine weitere materielle Entscheidung erforderlich. |

**Der Weg zum Ergebnis ist nicht der Messausgang.** Ob die Kündigung durch
materiellen Entscheid, Nichteintreten, Verwirkung, fehlende Aktivlegitimation
oder ungenügende Begründung ihren endgültigen Zustand erhielt, ist ein
**getrennt zu dokumentierendes Merkmal** — es gehört in ein eigenes Feld
(Arbeitsname `erledigungsweg`), nicht in den Messausgang.

Diese Trennung ist der eigentliche Gehalt des Vorschlags. Sie erlaubt zwei
verschiedene, jeweils ehrliche Aussagen aus demselben Korpus:

- wie oft der Kündigungsschutz im Ergebnis trug;
- wie oft er gar nicht erst materiell geprüft wurde.

Die zweite Zahl ist für eine Beobachtungsstelle nicht weniger interessant als
die erste. Unter MD-001 v2.0.0 verschwindet sie, weil die betroffenen Fälle den
Korpus verlassen, bevor sie gezählt werden können.

## Selektionsneutralität

MD-001 v2.0.0 begründet seine Selektionsneutralität damit, dass sich alle
Kriterien auf Streitgegenstand, formale Eigenschaft oder Datenlage stützen und
keines den Verfahrensausgang kennt. Die vorgeschlagene Regel muss denselben
Test bestehen.

**Die Einschlussregel kennt nicht, wer gewinnt.** Merkmale 1 und 2 betreffen
Streitgegenstand und Korpusgrenzen. Merkmal 3 fragt nach der *Bestimmbarkeit*
des Endzustands, nicht nach seinem Inhalt: Eine Kündigung, die endgültig
aufgehoben ist, und eine, die endgültig wirksam bleibt, sind gleichermassen
bestimmbar und werden gleichermassen eingeschlossen.

Die notwendige Symmetrie zeigt sich an derselben prozessualen Schranke in
beiden Richtungen:

- **Nichteintreten auf eine Vermieterbeschwerde** kann dazu führen, dass eine
  kantonale Aufhebung der Kündigung endgültig bestehen bleibt. ML-001 enthält
  einen solchen Fall (4A_476/2023).
- **Nichteintreten auf eine Mieterbeschwerde** kann dazu führen, dass eine
  kantonal bestätigte Kündigung endgültig bestehen bleibt.

Beide sind Nichteintreten, beide erfüllen Merkmal 3, beide werden
eingeschlossen. Der Einschluss hängt allein daran, ob die endgültige
Rechtswirkung bestimmbar ist.

Der Vollständigkeit halber die Gegenprobe zur bisherigen Fassung: Der unter
MD-001 v2.0.0 naheliegende Ausweg — die 16 Fälle über einen Ausschlusscode aus
dem Nenner zu nehmen — **wäre nicht selektionsneutral**. Vier der fünf
Erledigungsgründe (Verwirkung, Aktivlegitimation, Klagebewilligung,
Rechtsmittelbegründung) können ihrer Natur nach nur die anfechtende Partei
treffen, und die anfechtende Partei ist in dieser Streitart fast immer die
Mietpartei. Ein solcher Ausschluss entfernte systematisch Fälle einer Seite aus
dem Nenner. Genau deshalb wurden die 16 in ML-001 als `ungeklaert` stehen
gelassen statt ausgeschlossen.

## Auswirkung auf bestehende Daten

- **MD-001 v2.0.0 wird nicht überschrieben und nicht geändert.** Der Lauf
  ML-001 bleibt gültig, reproduzierbar und als Kalibrierungslauf zitierbar.
- **ML-001 wird nicht umkodiert.** Die 16 `ungeklaert` bleiben `ungeklaert`,
  4A_347/2017 bleibt `rueckweisung_offen`.
- Aus ML-001 wird **keine Quote** publiziert — weder unter v2.0.0 noch
  rückwirkend unter einer neuen Fassung (siehe „Validierungskorpus").
- Bei Annahme entsteht eine **neue Fassung** MD-001 v3.0.0 (Hauptversion, weil
  Einschlusskriterium und Messausgangsdefinition sich ändern) und ein **neuer
  Lauf** mit eigener Lauf-ID. Nicht Teil dieser CR.

## Technischer Versionierungsbefund

Auftragsgemäss geprüft, **nicht umgebaut**. Die Prüfung erfolgte an einer
isolierten Kopie des `messkorpus/`-Verzeichnisses; das Repository selbst wurde
dabei nicht verändert.

### Ergebnis: Mehrfachversionen werden derzeit nicht sauber unterstützt

**1. Die Definitionssuche arbeitet nur über `id`, nicht über `id` + `version`.**

- `messkorpus/tools/pruefen.ts` sammelt alle Definitionen in
  `new Map<string, Messdefinition>()` und setzt sie mit
  `definitionen.set(definition.id, definition)`. Bei zwei Dateien mit derselben
  `id` **gewinnt die zuletzt gelesene**.
- `messkorpus/tools/messquote.ts` (CLI) sucht mit
  `.find((d) => d.id === lauf.messdefinition.id)`. Hier **gewinnt die zuerst
  gelesene**.
- `messkorpus/tools/umgebung.ts` (`leseDefinitionen`) liefert die Dateien nach
  Dateinamen sortiert.

Beide Werkzeuge lösen dieselbe `id` also nach entgegengesetzter Regel auf.
Verifiziert an einer Kopie mit zwei Fassungen derselben `id`
(`MD-001-kuendigungsschutz-bger.json` = v2.0.0 und
`MD-001-kuendigungsschutz-neu.json` = v2.1.0):

```
Dateireihenfolge: MD-001-kuendigungsschutz-bger.json , MD-001-kuendigungsschutz-neu.json
messquote .find(id) waehlt : 2.0.0
pruefen  Map.set(id) waehlt : 2.1.0
```

Welche Fassung „gilt", entscheidet damit die alphabetische Sortierung des
Dateinamens — und zwar je Werkzeug verschieden.

**2. Folge: zwei Läufe gegen zwei Fassungen derselben `id` können nicht
gleichzeitig gültig sein.**

`pruefeLauf` in `messkorpus/tools/lauf.ts` vergleicht `lauf.messdefinition.version`
und `lauf.messdefinition.sha256` mit der **einen** aufgelösten Definition. In
der Testkopie mit ML-001 (gegen v2.0.0) und einem ML-002 (gegen v2.1.0) ergab
`npm run pruefen`:

```
ML-001 (MD-001 v2.0.0, Datenstand 2026-08-08) FEHLER
  - Lauf ML-001 wurde gegen Version 2.0.0 erhoben, die Definition steht auf 2.1.0.
  - Lauf ML-001: Definitions-Hash weicht ab (Lauf a9b2143bd287…, Datei bff8b9f5c1db…).
  - […] je Treffer mit Messausgang: Normausgang zu MD-001@2.0.0, Lauf gehoert zu MD-001@2.1.0
ML-002 (MD-001 v2.1.0, Datenstand 2026-08-08) ok
```

ML-001 wird als fehlerhaft gemeldet, obwohl an ML-001 nichts geändert wurde.

**3. Bewertung.** Das System scheitert **laut, nicht still** — das ist die gute
Nachricht und offenbar so gewollt (die Fehlertexte in `lauf.ts` sind eigens für
diesen Fall geschrieben und sagen ausdrücklich: „Alte Laeufe bleiben gueltig —
sie gehoeren zu ihrer damaligen Fassung, nicht zur neuen"). Nur greift die
Auflösung diese Absicht nicht auf: Sie kann die alte Fassung gar nicht mehr
finden, sobald die neue danebenliegt. Der Fehler wird am falschen Ort gemeldet —
beim unveränderten Lauf statt bei der mehrdeutigen Auflösung.

**4. Neue Lauf-ID.** Läufe liegen unter `messkorpus/laeufe/<ID>/lauf.json`;
`leseLaeufe` liest jedes Unterverzeichnis. Eine neue Lauf-ID ist damit
erforderlich und technisch unproblematisch — Läufe kollidieren nicht
miteinander, nur Definitionen kollidieren.

**5. Reproduzierbarkeit von ML-001.** Solange keine zweite Datei mit `id`
`MD-001` existiert, bleibt ML-001 vollständig reproduzierbar: Definition,
kanonischer Hash und Lauf stimmen überein, und der Rohdaten-Checkpoint
`7bfc44a` liegt unverändert in der Historie von `main`.

### Kleinster sauberer technischer Weg (Vorschlag, noch nicht umzusetzen)

In der Reihenfolge des Aufwands, jeweils vollständig genug für sich:

1. **Auflösung auf `id` + `version` umstellen.** In `pruefen.ts` den
   Map-Schlüssel auf `` `${id}@${version}` `` ändern, in `messquote.ts` das
   `.find()` um `&& d.version === lauf.messdefinition.version` ergänzen. Zwei
   kleine Änderungen, danach können beliebig viele Fassungen nebeneinander
   liegen und jeder Lauf findet seine eigene.
2. **Doppelte `id@version` als Fehler melden.** Zwei Dateien mit identischer
   `id` *und* identischer `version` sind ein echter Widerspruch und sollen
   nicht nach Dateinamen aufgelöst, sondern abgelehnt werden — analog zur
   Manifest-Regel „Zwei Fassungen derselben Liste sind ein Bruch" (§4).
3. **Test, der genau das absichert:** ein Lauf gegen eine ältere Fassung bleibt
   `ok`, während eine neuere Fassung derselben `id` im Verzeichnis liegt. Ohne
   diesen Test fällt ein Rückfall nicht auf.
4. **Optional, nicht nötig:** Dateinamenkonvention mit Version
   (`MD-001-…-v2.0.0.json`). Ordnet das Verzeichnis für Menschen, löst das
   Problem aber nicht — solange die Auflösung über `id` läuft, hilft der
   Dateiname nicht.

Punkt 1 bis 3 sind Voraussetzung dafür, dass eine neue Fassung überhaupt
eingeführt werden kann, ohne ML-001 zu beschädigen. Sie gehören in die
Umsetzung nach Annahme, nicht in diese CR.

## Validierungskorpus

ML-001 wurde bei der Entwicklung dieser Regel bereits vollständig gesehen. Eine
Quote, die durch rückwirkendes Umschalten derselben 249 Fälle entsteht, wäre
deshalb kein Nachweis, sondern eine Anpassung an bekannte Daten — unabhängig
davon, wie sorgfältig die Regel begründet ist.

**Vorgeschlagener nächster Test: ein zeitlich getrennter, noch nicht
klassifizierter Validierungskorpus.**

Bevorzugt: Bundesgericht 2026 YTD bis zu einem vorab festgelegten Datenstand.

Vor dem Abruf werden schriftlich eingefroren:

- die Suchanfrage im Wortlaut;
- der Gerichtsfilter;
- der Zeitraum und der Datenstand;
- die Einschluss- und Ausschlussregeln der neuen Fassung;
- die Zuordnung der Messausgangswerte.

Erst danach wird erhoben, erst danach klassifiziert. Der eingefrorene Text und
sein Hash gehen wie bei MD-001 in `FREEZE.txt`.

ML-001 darf anschliessend **zusätzlich** als ausdrücklich retrospektive
Vergleichsauswertung unter der neuen Fassung ausgewertet werden. Als
vorregistrierter Erstnachweis darf er nicht ausgegeben werden. Wird beides
publiziert, ist die Reihenfolge kenntlich zu machen: prospektiver Korpus zuerst,
retrospektive Vergleichsauswertung als solche bezeichnet.

## Prüfnotizen der KI (Claude, 2026-08-09 — Hinweise, keine Entscheidung)

1. **Der Vorschlag verschiebt Arbeit, er spart keine.** Merkmal 3 —
   Bestimmbarkeit des Endzustands — ist bei prozessualer Erledigung oft
   schwerer festzustellen als eine materielle Beurteilung, weil dafür der
   kantonale Verfahrensstand mitgelesen werden muss. Der Bundesgerichtsentscheid
   allein genügt nicht immer. Wie weit dafür recherchiert werden darf und muss,
   ist in dieser CR nicht geregelt und sollte vor einer Erhebung festgelegt
   werden.
2. **Das Feld `erledigungsweg` ist noch nicht spezifiziert.** Diese CR nennt es
   als Trennung, definiert aber keine Werteliste. Wird sie später als Enum
   angelegt, gilt dieselbe Sorgfalt wie bei CR-02: erst die Achsen bestimmen,
   dann die Werte, sonst entstehen wieder überlappende Codes.
3. **Abgrenzung zu `nur_prozessuale_nebenfrage` bleibt nötig.** ML-001 hat acht
   Entscheide, die ebenfalls ohne materielle Beurteilung enden, aber allein eine
   formale Frage **neben der weiterlaufenden Hauptsache** betreffen
   (4A_213/2020, 4A_33/2020, 4A_35/2018, 4A_371/2024, 4A_383/2015, 4A_588/2019,
   4A_689/2016, 4D_18/2020). Bei ihnen ist Merkmal 3 gerade nicht erfüllt: die
   Kündigung hat noch keinen endgültigen Zustand. Diese Gruppe darf unter der
   neuen Regel nicht mit den 16 zusammenfallen.
4. **Der Rechtskraft- und Abschlussbegriff bleibt unberührt.** Die Regeln
   `bundesgericht_art61_bgg` und `endentscheid_zur_messfrage` aus MD-001 v2.0.0
   sind fachlich bestätigt und werden von dieser CR nicht angetastet; die neue
   Einschlussregel setzt auf ihnen auf.
5. **Grundlage dieser Notiz:** ausschliesslich die 249 Entscheide aus ML-001 und
   der Code unter `messkorpus/tools/`. Ersetzt keine juristische Prüfung der
   vorgeschlagenen Kategorien.
6. **Verfahren bei Annahme (analog CR-001 Ziff. 6, CR-02).** Der Projektinhaber
   entscheidet und trägt die Entscheidungszeile oben ein — die KI füllt sie nie,
   auch nicht bei ausdrücklicher Zustimmung im Gespräch. Bis zur schriftlichen
   Entscheidung bleibt MD-001 auf Version 2.0.0, `eingefroren`, und ML-001
   unverändert.

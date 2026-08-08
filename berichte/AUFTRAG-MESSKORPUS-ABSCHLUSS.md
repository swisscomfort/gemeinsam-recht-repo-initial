# Abschlussbericht — Messkorpus vom Redaktionskorpus getrennt

**Datum:** 2026-08-08 · **Ausgangslage:** `main` bei `44c8028` (nach PR #6)

## 1. Auftrag und Befund

Auftrag war der nächste kanonische Meilenstein: erste methodisch belastbare,
reproduzierbare Norm-Quote aus einem selektionsneutralen Messkorpus.

Der Befund vorweg, weil er die Reihenfolge bestimmt: **der Engpass ist nicht
der Code.** Alle fünf bestehenden Suiten waren zu Beginn grün, die Zähllogik
in `wissen/tools/kodierung-quoten.ts` ist vollständig. Was fehlte, war die
Definition des Nenners — und Daten, die den Nenner füllen dürfen.

## 2. Warum der Redaktionstrichter kein Nenner sein darf

`redaktion/sieb.json` vergibt Punkte nach Storywert. Seine Negativliste
enthält unter anderem `nichteintreten`, `kostenentscheid`,
`fristwiederherstellung` und `rechtsverzoegerung`.

Für eine Zeitung ist das richtig. Für eine Durchsetzungsquote ist es fatal und
zwar **gerichtet**: Nichteintretensentscheide sind überwiegend gescheiterte
Durchsetzungen. Wer sie systematisch aussortiert, hebt die eigene Quote. Das
ist keine zufällige Streuung, die sich mit mehr Fällen auswäscht, sondern ein
Bias, der mit der Fallzahl mitwächst.

Doppelkodierung hilft dagegen nicht: sie prüft, ob zwei Läufe denselben
Scheiterpunkt sehen, nicht, ob der Fall überhaupt hätte gezählt werden dürfen.

## 3. Was gebaut wurde

Neues Modul `messkorpus/` (offline, eigene Suite, 100 Tests).

| Garantie | Umsetzung |
| --- | --- |
| Quelle, Abfrage, Zeitraum, Messfrage vor dem Lauf festgelegt | `schema/messdefinition.schema.json` |
| Kein Kriterium kennt den Verfahrensausgang | `tools/definition.ts`, Vokabular `AUSGANG_WOERTER` (26 Begriffe, Wortgrenzen, Umlautnormalisierung) |
| Kein Kriterium übernimmt Storywert | dieselbe Prüfung, `REDAKTIONS_WOERTER` |
| `bezug` kennt den Wert `verfahrensausgang` gar nicht | Schema-Enum |
| Jeder Treffer genau ein Status | `tools/lauf.ts` |
| Ausschlussgrund muss vorher deklariert sein | `pruefeLauf` gegen die Definition |
| Kein stiller Verlust | `roh_treffer` = Länge der Liste; gekappter Abruf = ungültig |
| Reproduzierbarkeit | `population()` / `gleichePopulation()` |
| Alte Quoten bleiben rekonstruierbar | SHA-256 über die kanonische Form der Definition, im Lauf gespeichert |
| Quote erst bei vollständigem Nenner | `tools/messquote.ts`, `sperren()` |

Die wichtigste Sperre ist die unauffälligste: **ein eingeschlossener Treffer
ohne dokumentierten Fall blockiert die Quote.** Ohne sie schrumpft der Nenner
still auf die Fälle zusammen, die jemand aufgeschrieben hat — die
Selektionsverzerrung wäre durch die Hintertür zurück.

Die Zähllogik selbst wurde **nicht** neu geschrieben. `ausgangQuote`,
`scheiterpunktQuote` und die Mindestfallzahl kommen unverändert aus
`wissen/tools/kodierung-quoten.ts`; der Messkorpus liefert die Population.

### Erhebung

`redaktion/src/messlauf-erheben.ts` (`npm run messlauf-erheben`). Sie liegt
bewusst im Redaktionspaket: Netzzugriff ist laut `CLAUDE.md` nur dort und nur
bei der benannten Quelle erlaubt. `messkorpus/` ist vollständig offline —
`tests/trennung.test.ts` prüft, dass dort weder `fetch` noch eine http-Adresse
noch ein Uhrzugriff vorkommt und dass kein Werkzeug den Redaktionstrichter
liest.

Das Werkzeug **urteilt nicht**: es legt jeden Treffer als `ungeklaert` ab. Die
Zuordnung nach den vorher festgelegten Kriterien ist menschliche Arbeit.

Statt bei der Obergrenze der Quelle zu kappen, teilt die Erhebung den Zeitraum
rekursiv, bis jedes Fenster vollständig passt (Jahre → Hälften → …). Nur ein
einzelner Tag mit zu vielen Treffern bricht ab — sichtbar, nie still.

`kanonisch()`/`definitionsHash()` sind in `redaktion/src/messlauf.ts`
absichtlich dupliziert (die `rootDir`-Grenze des CLI-Pakets verbietet Importe
aus `messkorpus/`), genau wie schon bei `kodierung.ts`. Ein Konsistenztest in
`messkorpus/tests/trennung.test.ts` hält beide Fassungen deckungsgleich.

## 4. Inventar des Bestands (maschinell)

`cd messkorpus && npm run inventar`:

```
Faelle gesamt: 24 · davon real (NACHERZAEHLT_OEFFENTLICH): 19
Zaehlfaehig (ohne jedes Hindernis): 0

  19x kein_messkorpus
  14x rechtskraft_unbekannt
   9x regel_id_offen
   8x kodierung_nicht_bestaetigt
   4x nicht_rechtskraeftig
```

FS-102 ist der einzige Fall, dem **nur** noch die Zugehörigkeit zu einer
Messpopulation fehlt. Er ist rechtskräftig, doppelt bestätigt und registriert.

Damit ist numerisch belegt, was vermutet war: **Rechtskraft ist der Engpass,
nicht die Kodierung.** Selbst wenn CR-02 morgen alle acht strittigen Fälle
auflöste, käme kein einziger Fall zusätzlich in eine Quote.

## 5. Was nicht erledigt werden konnte, und warum

### 5.1 Keine Erhebung durchgeführt (Umgebung)

Der Netzzugang zu `entscheidsuche.ch` ist in dieser Ausführungsumgebung durch
die Egress-Policy gesperrt (HTTP 403 am Proxy, `Host not in allowlist`). Das
ist **kein Repository-Fehler**: das Werkzeug ist gebaut und seine reine Logik
ist mit Fixtures getestet (14 Tests in `redaktion/tests/messlauf.test.ts`),
aber ausgeführt wurde es nicht. Auf einem Rechner mit Zugang läuft
`npm run messlauf-erheben` unverändert; in einer Web-Session muss
`entscheidsuche.ch` in der Egress-Liste der Umgebung stehen.

**Es wurden keine erfundenen Trefferdaten erzeugt.** `messkorpus/laeufe/` ist
leer.

### 5.2 Rechtskraft nicht nachverifiziert

Aus denselben Gründen — und zusätzlich methodisch: ob ein kantonaler Entscheid
weitergezogen wurde, steht in den Metadaten der Quelle nicht. Bei FS-102 stand
es ausnahmsweise in der Publikation („blieb unangefochten"). Für die übrigen
14 Fälle ist die Rechtskraft aus den zugelassenen Quellen nicht feststellbar.

Der Ausweg steckt in MD-001: Beschränkung der Erhebung auf letztinstanzliche
Entscheide, dann folgt die Rechtskraft aus der Instanz statt aus einer
Recherche je Fall. Das ist ein **Rechtsparameter** und deshalb als
`pruefstand: "fachlich_zu_verifizieren"` angelegt, nicht als gesetzt behauptet.

### 5.3 Neun `OFFEN:*`-Regelverweise nicht geschlossen

Sie zu schliessen heisst, den Originalentscheid zu lesen und die Norm zu
bestimmen (so lief die Rückholung für FS-102–109). Ohne Quellenzugang nicht
möglich, ohne Quelle geraten wäre eine Erfindung.

### 5.4 Keine Quote

Gesperrt, und zwar korrekt: `npm run pruefen` nennt die Gründe. Es gibt keinen
Lauf, MD-001 ist Entwurf, beide Prüfstände sind offen.

### 5.5 Doppelkodierung neuer Fälle

MANIFEST §5 verlangt zwei unabhängige Läufe von **verschiedenen Modellen**.
Ein einzelner Agent kann das nicht allein erbringen; für neue Fälle braucht es
denselben Aufbau wie bei Kodierlauf 2 (`kodierung-export`/`-import` mit einem
anderen Modell oder einem Menschen).

## 6. Nachtrag — Taktgeber-Prüfung von PR #7

Die Prüfung hat die Rechtskraftfrage entschieden und vier Messfehler
aufgedeckt, die vor jeder Datenerhebung zu beheben waren. Alle neun Punkte
sind umgesetzt.

### 6.1 Rechtskraft entschieden, aber eng gefasst

Entscheide des Bundesgerichts erwachsen am Tag ihrer Ausfällung in Rechtskraft
(**Art. 61 BGG**); die Revision nach Art. 121 ff. BGG ändert daran nichts —
sie ist gerade der ausserordentliche Weg, auf einen bereits rechtskräftigen
Entscheid zurückzukommen.

Die Regel heisst deshalb `bundesgericht_art61_bgg` mit `rechtsquelle:
"Art. 61 BGG (SR 173.110)"`, **nicht** generisch „letztinstanzlich". Der Wert
`letztinstanzlich` existiert im Schema nicht mehr. Ein kantonaler
letztinstanzlicher Entscheid ist etwas anderes: gegen ihn steht die Beschwerde
ans Bundesgericht offen. `rechtskraftAusInstanz()` gibt für `ZH_OG`, `LU_KG`
und `ZH_MG` `false` zurück — durch Test gesichert.

`rechtskraft_regel.pruefstand` steht damit auf `fachlich_bestaetigt`.

### 6.2 Rechtskraft ≠ Fallabschluss

Ein rechtskräftiger Bundesgerichtsentscheid kann die Sache zurückweisen; dann
ist die gemessene Rechtsfrage offen. Neu trägt jeder Treffer einen eigenen
`abschluss_status` (`abgeschlossen` · `rueckweisung_offen` ·
`zwischenentscheid` · `ungeklaert`), und die Definition eine
`abschluss_regel`. Alles ausser `abgeschlossen` sperrt die Quote. Ein späterer
Endentscheid derselben Streitigkeit schliesst eine frühere Rückweisung ab.

### 6.3 MD-001 misst nur noch eine Normwirkung

Die Messfrage vermischte „Kündigung aufgehoben" und „Mietverhältnis
erstreckt". MD-001 misst jetzt ausschliesslich die Durchsetzung des
Kündigungsschutzes nach Art. 271/271a OR; eine Erstreckung nach Art. 272 OR
zählt ausdrücklich **nicht** als Erfolg und hat einen eigenen Ausschlussgrund
(`nur_erstreckung`). Eine spätere Messung der Erstreckung gehört in eine
eigene Definition — keine wurde jetzt nebenbei gebaut.

### 6.4 Der schwerwiegendste Befund: die Quote mass gar nicht normbezogen

`messquote.ts` rief `ausgangQuote(faelle, ausgang)` auf und zählte damit das
allgemeine Story-Feld `ausgang`. Eine Mietpartei kann teilweise obsiegen,
während Art. 271/271a gerade **nicht** durchgesetzt wurde — die Quote hätte
etwas anderes gemessen, als sie behauptet.

Neu trägt jeder eingeschlossene Treffer einen `messausgang`, gebunden an
`messdefinition_id` + `version`, mit Wert (`durchgesetzt` · `teilweise` ·
`nicht_durchgesetzt` · `nicht_anwendbar`) und Beleg. Ein Normausgang einer
anderen Definition wird abgelehnt; ein fehlender sperrt die Quote.

Statt einer zweiten Quotenarchitektur wurde `wissen/tools/kodierung-quoten.ts`
sauber parametrisiert: neu `quoteNachPraedikat(stories, positiv)`, und
`ausgangQuote` ist der Sonderfall davon. Die Ausschlussregeln bleiben
unverändert an einer Stelle.

### 6.5 Zähleinheit

Ein Suchtreffer ist kein Fall. Mehrere Entscheide derselben Streitigkeit
(Rückweisung, Folgeentscheid, Revision) bilden **eine** Zähleinheit und zählen
einmal; alle Treffer bleiben im Rohkorpus. Derselbe Fall an zwei Einheiten,
widersprechende Normausgänge innerhalb einer Einheit oder eine fehlende
Zuordnung sperren die Quote.

### 6.6 Roh-Treffer-Audit repariert

`roh_treffer == treffer.length` war tautologisch: beide Zahlen entstehen am
selben Ende. Der Nachweis steht jetzt in `abrufe[]` — je Fenster
`gemeldet_total`, `gemeldet_relation`, `empfangen`, `ohne_id`,
`vor_gerichtsfilter`, `nach_gerichtsfilter`, dazu `duplikate` auf Laufebene.
Geprüft wird:

- `gemeldet_relation` muss `eq` sein; `gte` oder unbekannt heisst
  fail-closed (die Erhebung teilt das Fenster weiter, sonst Abbruch).
- `empfangen` muss `gemeldet_total` entsprechen.
- `ohne_id > 0` macht den Lauf nachweislich unvollständig — kein Treffer
  verschwindet mehr still in einem `.filter(t !== null)`.
- Summe `nach_gerichtsfilter` minus `duplikate` muss die gespeicherte
  Population ergeben.
- Die Fenster müssen den Zeitraum der Definition lückenlos und
  überschneidungsfrei abdecken.

### 6.7 Metadaten-Fingerprint

Jeder Treffer trägt `metadaten_fingerprint`: SHA-256 über die kanonische Form
der gespeicherten Quellmetadaten. Ändert die Quelle später etwas, fällt der
Vergleich auf.

### 6.8 Sprachselektion behoben

Der Ausschlussgrund `kein_deutschsprachiger_text` ist ersatzlos gestrichen.
Die Abfrage erfasst Deutsch, Französisch und Italienisch (`congé abusif`,
`annulation du congé`, `disdetta abusiva`, `bail à loyer`, `locatario` …).
`SPRACH_WOERTER` lehnt jedes Kriterium ab, das nach Sprache sortiert. Zwei
Tests prüfen, dass keine reale Definition sprachselektiv ist und dass die
Abfrage FR- und IT-Begriffe enthält.

### 6.9 Hash-Konsistenz jetzt wirklich getestet

`messkorpus/tests/konsistenz.test.ts` existiert — unter genau dem Namen, den
die Kommentare nennen. Er hasht dieselben Werte durch beide Implementierungen
(`kanonisch`, `definitionsHash`, `metadatenFingerprint`) und beweist
Gleichheit, auch für jede reale Messdefinition.

## 7. Testergebnis

| Suite | Tests |
| --- | --- |
| core | 136 |
| prototypen/feed | 120 |
| webflow | 9 |
| wissen | 67 (64 + 3) |
| redaktion | 77 (56 + 21) |
| messkorpus | 167 |
| **gesamt** | **576** |

## 8. Genau diese Entscheidungen fehlen

1. ~~Rechtskraft-Regel bestätigen~~ — **erledigt**, Art. 61 BGG, eng auf das
   Bundesgericht gefasst.
2. **Norm und Kriterien von MD-001 bestätigen** (`norm.pruefstand` →
   `fachlich_bestaetigt`).
3. **Abschlussregel bestätigen** (`abschluss_regel.pruefstand`) — ist der
   Umgang mit Rückweisungen so richtig?
4. **MD-001 einfrieren** (`status` → `eingefroren`).
5. **CR-02 entscheiden** — danach beide Kodierläufe für die betroffenen Fälle
   vollständig neu, ohne automatische Übersetzung.
6. **`entscheidsuche.ch` in der Egress-Liste freigeben**, wenn die Erhebung in
   einer Web-Session laufen soll (auf dem eigenen Rechner nicht nötig).

Solange 2–4 offen sind, ist der Meilenstein blockiert — technisch, nicht nur
konventionell: die Sperre steht in `darfQuoteMaterialisieren()` und ist durch
Tests gesichert.

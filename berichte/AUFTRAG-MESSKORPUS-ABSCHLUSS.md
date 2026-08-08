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

## 6. Testergebnis

| Suite | Tests |
| --- | --- |
| core | 136 |
| prototypen/feed | 120 |
| webflow | 9 |
| wissen | 64 |
| redaktion | 70 (56 + 14 neu) |
| messkorpus | 100 (neu) |
| **gesamt** | **499** |

## 7. Genau diese Entscheidungen fehlen

1. **Rechtskraft-Regel bestätigen** — genügt „letztinstanzlich" als
   Rechtskraftnachweis im Sinne des Manifests?
   (`MD-001.rechtskraft_regel.pruefstand` → `fachlich_bestaetigt`)
2. **MD-001 einfrieren** — Norm, Messfrage und Kriterien fachlich bestätigen
   und `status` → `eingefroren`.
3. **CR-02 entscheiden** — Entscheidungszeile ausfüllen; danach beide
   Kodierläufe für die betroffenen Fälle vollständig neu, ohne automatische
   Übersetzung.
4. **`entscheidsuche.ch` in der Egress-Liste freigeben**, wenn die Erhebung in
   einer Web-Session laufen soll (auf dem eigenen Rechner nicht nötig).

Solange 1 und 2 offen sind, ist der Meilenstein blockiert — technisch, nicht
nur konventionell: die Sperre steht in `darfQuoteMaterialisieren()` und ist
durch Tests gesichert.

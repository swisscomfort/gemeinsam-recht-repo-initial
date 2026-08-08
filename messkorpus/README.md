# Messkorpus

**Der Messkorpus ist der Nenner. Der Redaktionstrichter ist es nie.**

## Warum es dieses Modul gibt

Die Doppelkodierung (MANIFEST §5) schützt gegen **Kodierfehler**: zwei
unabhängige Läufe müssen denselben Scheiterpunkt sehen. Sie schützt nicht
gegen **Selektionsverzerrung** — gegen die Frage, welche Fälle überhaupt in
die Zählung kommen.

Der bisherige Weg zu einer Geschichte ist ein Trichter:

```
1000 Treffer  →  Sieb (redaktion/sieb.json)  →  Mappe  →  TOP 9  →  Geschichten
```

`sieb.json` vergibt Punkte nach Storywert. Es wertet unter anderem
`nichteintreten`, `kostenentscheid`, `fristwiederherstellung` und
`rechtsverzoegerung` **ab**. Für eine Zeitung ist das richtig: daraus werden
schlechte Geschichten. Als Nenner einer Durchsetzungsquote wäre es fatal —
Nichteintretensentscheide sind überwiegend *gescheiterte* Durchsetzungen. Wer
sie herausfiltert, misst nicht die Rechtswirklichkeit, sondern hebt die eigene
Quote.

Deshalb gibt es zwei getrennte Populationen:

```
                    GERICHTSENTSCHEIDE
                           │
             ┌─────────────┴─────────────┐
      MESSKORPUS                    REDAKTIONSKORPUS
 vollständig nach vorher          Auswahl nach Storywert
 festgelegten Kriterien           und Verständlichkeit
             │                           │
       Statistik/Quote                  Feed
```

Die Redaktion darf Fälle **aus** dem Messkorpus auswählen. Der Messkorpus darf
nie aus der Redaktion entstehen.

## Was hier technisch garantiert wird

| Garantie | Wo |
| --- | --- |
| Quelle, Abfrage, Zeitraum, Messfrage stehen vor dem Lauf fest | `schema/messdefinition.schema.json` |
| Kein Kriterium kennt den Verfahrensausgang | `tools/definition.ts` (Vokabularprüfung, `AUSGANG_WOERTER`) |
| Kein Kriterium übernimmt ein Merkmal des Redaktionstrichters | dieselbe Prüfung (`REDAKTIONS_WOERTER`) |
| Jeder Treffer trägt genau einen Status | `tools/lauf.ts` |
| Ausschlussgründe sind vorher deklariert | `tools/lauf.ts` gegen die Definition |
| Kein stiller Verlust: `roh_treffer` = Länge der Liste | `tools/lauf.ts` |
| Ein gekappter Abruf ist kein gültiger Messkorpus | `tools/lauf.ts` |
| Änderung der Definition macht alte Läufe erkennbar | SHA-256 über die kanonische Form |
| Gleiche Definition + gleicher Datenstand = gleiche Population | `population()`, `gleichePopulation()` |
| Quote erst bei vollständigem Nenner | `tools/messquote.ts` (`sperren`) |

Die **wichtigste und am leichtesten zu übersehende** Sperre ist die letzte:
ein eingeschlossener Treffer ohne dokumentierten Fall blockiert die Quote.
Sonst schrumpft der Nenner still auf die Fälle zusammen, die jemand
aufgeschrieben hat — und die Selektionsverzerrung wäre durch die Hintertür
zurück.

## Ablauf

```bash
# 1. Messdefinition schreiben (messkorpus/definitionen/MD-xxx-*.json), Status "entwurf"
# 2. Prüfen, bevor irgendetwas erhoben wird
cd messkorpus && npm run pruefen

# 3. Menschliche Freigabe: status auf "eingefroren", beide pruefstand-Felder
#    auf "fachlich_bestaetigt" — das ist eine Entscheidung, kein Werkzeugschritt.

# 4. Erheben (Netz; läuft im Redaktionswerkzeug, siehe unten)
cd ../redaktion && npm run messlauf-erheben -- --definition MD-001-....json --lauf ML-001

# 5. Jeden Treffer zuordnen: eingeschlossen | ausgeschlossen + Grund | ungeklärt
# 6. Erneut prüfen — die Bilanz zeigt jeden Ausschluss mit Grund
cd ../messkorpus && npm run pruefen
```

Die Erhebung liegt **absichtlich** in `redaktion/src/messlauf-erheben.ts`:
Netzzugriff ist laut `CLAUDE.md` nur den Redaktionswerkzeugen und nur bei der
im Auftrag benannten Quelle erlaubt. `messkorpus/` selbst ist vollständig
offline — `tests/trennung.test.ts` prüft, dass hier weder `fetch` noch eine
http-Adresse noch ein Uhrzugriff vorkommt.

Statt zu kappen teilt die Erhebung den Zeitraum rekursiv, bis jedes Fenster
vollständig in die Obergrenze der Quelle passt. Ein einzelner Tag mit zu
vielen Treffern bricht ab, statt still zu verlieren.

## Stand

`MD-001` (Kündigungsschutz Art. 271/271a OR, Bundesgericht) liegt als
**Entwurf** vor. Zwei Punkte sind menschlich zu entscheiden, bevor daraus je
eine Quote werden kann — beide sind im `pruefstand`-Feld markiert und beide
sperren die Materialisierung technisch:

1. **Norm und Kriterien** fachlich bestätigen.
2. **Rechtskraft-Regel**: Die Beschränkung auf Bundesgerichtsentscheide soll
   die Rechtskraft aus der Instanz ableiten, statt sie für jeden Fall
   nachzurecherchieren. Ob das als Nachweis im Sinne des Manifests genügt, ist
   eine fachliche Entscheidung, keine technische.

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
| Kein Kriterium sortiert nach Sprache | dieselbe Prüfung (`SPRACH_WOERTER`) |
| Rechtskraft nur eng abgeleitet, nie generisch „letztinstanzlich" | `rechtskraft_regel.art = bundesgericht_art61_bgg` |
| Rechtskraft ≠ Fallabschluss | `abschluss_regel`, `abschluss_status` je Treffer |
| Gezählt werden Streitigkeiten, nicht Suchtreffer | `zaehleinheiten()` |
| Der Zähler ist der **Normausgang**, nicht der Story-Ausgang | `messausgang` + `quoteNachPraedikat` |
| Jeder Treffer trägt genau einen Status | `tools/lauf.ts` |
| Ausschlussgründe sind vorher deklariert | `tools/lauf.ts` gegen die Definition |
| Kein stiller Verlust — belegt durch das Abrufprotokoll | `abrufe[]`, nicht `roh_treffer` |
| Untergrenze statt exakter Trefferzahl = keine Population | `gemeldet_relation !== "eq"` |
| Ein gekappter Abruf ist kein gültiger Messkorpus | `tools/lauf.ts` |
| Nachträglich geänderte Quellmetadaten fallen auf | `metadaten_fingerprint` |
| Änderung der Definition macht alte Läufe erkennbar | SHA-256 über die kanonische Form |
| Gleiche Definition + gleicher Datenstand = gleiche Population | `population()`, `gleichePopulation()` |
| Quote erst bei vollständigem Nenner | `tools/messquote.ts` (`sperren`) |

Drei Punkte, die leicht übersehen werden und deshalb hart gesperrt sind:

1. **Ein eingeschlossener Treffer ohne dokumentierten Fall blockiert die
   Quote.** Sonst schrumpft der Nenner still auf die Fälle zusammen, die
   jemand aufgeschrieben hat — die Verzerrung wäre durch die Hintertür zurück.
2. **Rechtskräftig ist nicht abgeschlossen.** Ein Bundesgerichtsentscheid ist
   ab Ausfällung rechtskräftig (Art. 61 BGG) und kann die Sache trotzdem
   zurückweisen; dann ist die gemessene Rechtsfrage offen.
3. **Der allgemeine Verfahrensausgang ist nicht der Normausgang.** Eine
   Mietpartei kann teilweise obsiegen, während die gemessene Norm gerade
   nicht durchgesetzt wurde. Die Quote zählt ausschliesslich `messausgang`.

`roh_treffer = treffer.length` allein beweist übrigens gar nichts — beide
Zahlen entstehen am selben Ende der Verarbeitung. Der Nachweis steht in
`abrufe[]`: je Fenster die von der Quelle gemeldete Zahl **samt Relation**,
die empfangenen Treffer, die ohne Quelle-ID und die Zahl nach Gerichtsfilter.
Daraus wird die gespeicherte Population nachgerechnet, und die Fenster müssen
den Zeitraum lückenlos abdecken.

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

`MD-001` (Kündigungsschutz Art. 271/271a OR, Bundesgericht) liegt in Fassung
**2.0.0** als **Entwurf** vor.

- **Rechtskraft-Regel: entschieden** (`fachlich_bestaetigt`). Entscheide des
  Bundesgerichts erwachsen am Tag ihrer Ausfällung in Rechtskraft (Art. 61
  BGG); die Revision nach Art. 121 ff. BGG ändert daran nichts. Die Regel
  heisst ausdrücklich `bundesgericht_art61_bgg` und **nicht** generisch
  „letztinstanzlich" — ein kantonaler letztinstanzlicher Entscheid kann ans
  Bundesgericht weitergezogen werden, seine Rechtskraft folgt nicht aus der
  Instanz. Ein Test hält das fest.
- **Offen: Norm und Kriterien** fachlich bestätigen (`norm.pruefstand`).
- **Offen: Abschlussregel** fachlich bestätigen (`abschluss_regel.pruefstand`)
  — der Umgang mit Rückweisungen.

Solange eines davon offen ist oder `status` auf `entwurf` steht, sperrt
`darfQuoteMaterialisieren()` jede Quote.

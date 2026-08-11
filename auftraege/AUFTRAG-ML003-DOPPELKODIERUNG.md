# AUFTRAG-ML003-DOPPELKODIERUNG — zwei unabhängige Kodierläufe über 129 Volltexte

```yaml
auftrag: ML-003-DK
grundlage: "MANIFEST v2.1 §5 (Doppelkodierung, verschiedene Modelle); CR-01; CR-03 (Endwirkung, Auflage E1/E2); MD-001@3.1.0"
messlauf: ML-003
messdefinition: "MD-001@3.1.0, c03d1279245b977ea247c70ec789ec9514506f80d92dc8ab3463cc97e4a462d9"
raw_checkpoint: 7d93a0ccca36a168a4f92d060d08c7e852cfe08f
bundle_sha256: c2f55926000a828c821d80c04f5c9fbeda00bdefff34dbcb1b2d8ab9d0b4b954
population: 129 Treffer, alle "ungeklaert"
netz: verboten
volltexte_im_repo: verboten
status: ENTWURF — die Konsensregel ist vor dem ersten kodierten Fall einzufrieren
```

## 0. Ziel in einem Satz

Die 129 lokal beschafften Volltexte werden von zwei strikt unabhängigen
Kodierern nach MD-001@3.1.0 beurteilt; übernommen wird ausschliesslich, worin
beide übereinstimmen.

## 1. Was aus ML-002 übernommen wird — und was nicht

ML-002 hat den Ablauf zum ersten Mal durchlaufen (7 Fälle, Übereinstimmung
5/7). Tragfähig und deshalb übernommen:

- Beide Kodierartefakte bleiben **ausserhalb** des Repositoriums und sind dort
  nur über ihren SHA-256 verankert.
- Der Blindvergleich ist ein **eigenes Artefakt** mit eigenem SHA-256.
- **Konsensregel:** übernommen wird nur die Übereinstimmung. Bei Konflikt
  bleibt der Treffer `ungeklaert` — kein Mehrheitsentscheid, kein drittes
  Urteil, keine nachträgliche Interpretation.
- Ein Audit-Eintrag im Repository (`kodierungsabgleich-A-B*.json`) hält
  Modelle, Artefakt-Hashes, Übereinstimmungsquote, jeden Konflikt mit
  Streitpunkt und die Quotensperre fest.

Vier Dinge trugen bei 7 Fällen und tragen bei 129 **nicht** mehr:

1. **Kein Exportwerkzeug.** Der Stoff wurde ad hoc übergeben. Bei 129 Fällen
   ist weder Vollständigkeit noch Gleichheit der beiden Pakete prüfbar.
2. **Der Vergleich war Handarbeit**, die Quote von Hand gerechnet.
3. **Unabhängigkeit war nur organisatorisch gesichert.** Auf der wissen-Seite
   erzwingt `kodierung-export.ts` sie technisch: der Lauf-1-Wert erscheint
   nicht im Export. Diese Eigenschaft fehlt hier.
4. **Verglichen wurde nur `status`.** Unter v3.1 trägt ein eingeschlossener
   Treffer sechs weitere Felder. Was „Übereinstimmung" heisst, muss **vorher**
   feststehen — sonst wird die Definition nachträglich so gewählt, dass das
   Ergebnis passt.

## 2. Was ein Kodierer je Treffer liefern muss (aus v3.1 abgeleitet)

| Feld | Wann | Werte |
|---|---|---|
| `status` | immer | `eingeschlossen` · `ausgeschlossen` · `ungeklaert` |
| `ausschlussgrund` | bei `ausgeschlossen` | `andere_rechtsfrage` · `nur_erstreckung` · `kein_mietverhaeltnis` · `nur_prozessuale_nebenfrage` · `text_nicht_zugaenglich` |
| `zaehleinheit` | bei `eingeschlossen` | Bezeichner der Streitigkeit |
| `abschluss_status` | bei `eingeschlossen` | `abgeschlossen` · `rueckweisung_offen` |
| `erledigungsweg.modus` | bei `eingeschlossen` | `materiell_entschieden` · `prozessual_erledigt` · `rueckweisung_offen` |
| `erledigungsweg.prozessgrund` | Schlüssel immer da | einer der sieben Gründe, sonst **`null`** |
| `erledigungsweg.beleg` / `.stand_datum` / `.quelle` | bei `eingeschlossen` | Textstelle · Datum ≤ Datenstand · Primärquelle |
| `messausgang.wert` | bei `eingeschlossen` | `durchgesetzt` · `nicht_durchgesetzt` · `nicht_anwendbar` · `offen` |
| `messausgang.beleg` / `.quelle` | bei `eingeschlossen` | Textstelle · Primärquelle |
| `verfahrensrecht_nachweis` | bei `eingeschlossen` **und** `abgeschlossen` | `regime` (`bgg` · `og` · `ungeklaert`) + nichtleerer `beleg` + `quelle` |

Einschluss nur, wenn alle drei Kriterien der Definition **sicher** erfüllt sind
(`konkrete_kuendigung_angegriffen`, `mietpartei_beruft_sich`,
`endzustand_bestimmbar`). Sonst `ungeklaert` — es wird nichts erfunden
(CR-03 E2 Ziff. 6). Recherche nur innerhalb der dokumentierten Verfahrenskette,
keine offene Suche.

**Die historische Besonderheit dieses Laufs:** unter
`bundesgericht_uebergangsrecht_art132_bgg` sagt eine Bundesgerichtssignatur
nicht, welches Verfahrensrecht galt. Nur belegtes `regime: "bgg"` öffnet die
Art.-61-Wirkung; fehlender Nachweis, `og` und `ungeklaert` lassen den Treffer
`ungeklaert`. Aus dem Entscheidjahr allein wird nie geschlossen. `pruefeLauf()`
erzwingt das bereits.

## 3. Der Ablauf — vier Schritte, zwei Werkzeuge

```
   Bundle (129 Volltexte, ausserhalb des Repos)
        │
   [1] kodierstoff-export          → zwei identische Pakete A und B
        │                             (Volltext + Kriterien; kein fremder Lauf)
        ├──────────────┬──────────────
   [2] Kodierer A   Kodierer B      getrennte Sitzungen, verschiedene Modelle
        └──────────────┴──────────────
   [3] kodierabgleich              → prüft jede Antwort einzeln gegen v3.1,
        │                             vergleicht, rechnet die Quote
   [4] Konsens verankern           → nur Übereinstimmung in lauf.json,
                                      Audit-Eintrag ins Repository
```

**[1] Export.** Ein Werkzeug erzeugt aus dem Bundle je Kodierer ein Paket mit
denselben 129 Volltexten, den Kriterien und Wertelisten der eingefrorenen
Definition — und **nichts** vom jeweils anderen Lauf. Beide Pakete tragen
denselben SHA-256; sind sie ungleich, war der Stoff nicht derselbe. Ablage
ausserhalb des Repositoriums.

**[2] Kodierung.** Zwei getrennte Sitzungen, **verschiedene Modelle**
(MANIFEST §5). Kein Kodierer sieht das Ergebnis des anderen — auch nicht
teilweise, auch nicht als Zusammenfassung.

**[3] Abgleich.** Das Werkzeug prüft **zuerst jede Antwort für sich** gegen die
Definition (Vollständigkeit, erlaubte Werte, Kopplungen, Belegpflicht,
`stand_datum ≤ datenstand`). Eine Antwort, die dabei durchfällt, wird
zurückgewiesen — nicht stillschweigend verglichen. Erst danach folgt der
Vergleich.

**[4] Verankerung.** In `lauf.json` gelangt ausschliesslich der Konsens; die
Vollartefakte bleiben aussen und sind über SHA-256 verankert.

## 4. Die Vergleichsachsen — vorab festzulegen

Drei Achsen, jede mit eigener Übereinstimmungsquote:

| Achse | Verglichen wird | Gilt für |
|---|---|---|
| **A — Population** | `status`; bei `ausgeschlossen` zusätzlich `ausschlussgrund` | alle 129 |
| **B — Ergebnis** | `messausgang.wert` | nur beidseitig eingeschlossene |
| **C — Verfahrensrecht** | `verfahrensrecht_nachweis.regime` | nur beidseitig eingeschlossene |

Ausdrücklich **nicht** quotenwirksam:

- `erledigungsweg.modus` und `.prozessgrund` — dokumentiert und ausgewiesen,
  aber nicht Teil der Übereinstimmung: nach CR-03 ist der Weg nicht der
  Messausgang, und zwei Kodierer dürfen denselben Endzustand über verschieden
  benannte Wege erreichen.
- **Belegtexte** — nie auf Wortgleichheit verglichen; zwei Kodierer zitieren
  nie identisch. Geprüft wird nur, dass jeder einen Beleg führt.
- `zaehleinheit` — Abweichung ist ein Befund für die Kettenbildung, kein
  Statuskonflikt.

**Konsens:** ein Treffer wird nur `eingeschlossen`, wenn **alle drei Achsen**
übereinstimmen. Ein `ausgeschlossen` nur bei gleichem Grund. Jede Abweichung
auf irgendeiner Achse ⇒ `ungeklaert`, mit dem Streitpunkt begründet abgelegt.

## 5. Abbruchbedingungen (fail closed)

- Die beiden Exportpakete haben verschiedene SHA-256 ⇒ Abbruch.
- Eine Antwortdatei deckt die 129 Bezeichner nicht exakt ⇒ Abbruch.
- Eine Antwort verletzt die Definition ⇒ zurückgewiesen, nichts verglichen.
- Ein Treffer wäre `eingeschlossen` + `abgeschlossen` ohne belegtes
  `regime: "bgg"` ⇒ bleibt `ungeklaert`.
- `lauf.json` wird nur im Schritt [4] und nur um Klassifikationsfelder
  ergänzt; Rohmetadaten, `metadaten_fingerprint`, `abrufe`, `roh_treffer`,
  `duplikate` und `gekappt` bleiben unverändert.

## 6. Was dieser Ablauf nicht entscheidet

Ob aus ML-003 eine Quote entsteht. Das hängt an der Zahl der doppelt
bestätigten Zähleinheiten und der Mindestfallzahl 10 — und wird erst nach dem
Abgleich sichtbar. Die Erwartung wird hier bewusst nicht formuliert.

## 7. Offen — vor dem ersten kodierten Fall zu entscheiden

1. **Welche zwei Modelle.** MANIFEST §5 verlangt verschiedene; welche, ist eine
   Eigentümerentscheidung. Bei ML-002 waren es GPT-5.6 Sol und Claude Opus 5.
2. **Ob die Achsen A/B/C so gelten.** Sie sind der Vorschlag dieses Entwurfs
   und müssen vor dem Kodieren eingefroren sein, sonst ist die
   Übereinstimmungsquote nachträglich wählbar.
3. **Wer Kodierer A ist** — die Reihenfolge ist für die Unabhängigkeit
   belanglos, für die Nachvollziehbarkeit im Audit-Eintrag aber festzuhalten.

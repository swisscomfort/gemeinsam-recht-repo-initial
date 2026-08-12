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
antwortschema: "gemeinsam-recht.ml003.kodierung.v1 — identisch fuer beide Kodierer"
kodierer_a: "GPT-5.6 Sol"
kodierer_b: "Claude Opus 5 (claude-opus-5)"
status: "STARTBEREIT (Taktgeber 2026-08-11) — Konsensregel entschieden, Zaehleinheit-Regel entschieden, Modelle benannt, Antwortschema und Export stehen"
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

Fünf Dinge trugen bei 7 Fällen und tragen bei 129 **nicht** mehr:

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
5. **Die beiden Antwortartefakte trugen nicht dasselbe Schema.** Befund des
   Taktgebers an den Originaldateien: Lauf A führte den Zustand als `status_a`,
   Lauf B2 als `status_b`. Zwei Formen derselben Aussage müssen vor jedem
   Vergleich aufeinander abgebildet werden. Bei sieben Fällen ist das lästig;
   bei 129 ist jede Abbildung eine Gelegenheit, das Ergebnis zu beeinflussen —
   und niemand sieht ihr später an, ob sie neutral war.
   *(Die Originalartefakte liegen ausserhalb des Repositoriums auf dem Rechner
   des Taktgebers; ihre SHA-256 waren in der Arbeitsumgebung dieses Commits
   nicht nachprüfbar. Der Befund wird hier als Befund des Taktgebers geführt,
   nicht als eigene Feststellung.)*

Die Antwort darauf steht in `redaktion/src/kodierschema.ts`: **ein** Schema
`gemeinsam-recht.ml003.kodierung.v1` für beide Kodierer, mit denselben
Feldnamen. Wer geantwortet hat, steht ausschliesslich im Kopf des Artefakts
(`kodierer.rolle`, `kodierer.modell`) — in keinem Feldnamen und in keinem
Eintrag. Beide Antworten laufen durch dieselbe Prüffunktion mit demselben
Kontext.

## 2. Was ein Kodierer je Treffer liefern muss (aus v3.1 abgeleitet)

Feldnamen und Wertelisten stehen als Schema `gemeinsam-recht.ml003.kodierung.v1`
in `redaktion/src/kodierschema.ts` und gehen wortgleich ins Kodierpaket. Die
Tabelle ist die Lesefassung desselben Schemas.

| Feld | Wann | Werte |
|---|---|---|
| `quelle_id` | immer | Bezeichner aus dem Paket, unverändert |
| `aktenzeichen` | immer | aus dem Paket unverändert; **`null`**, wo das Paket `null` nennt |
| `text_sha256` | immer | aus dem Paket unverändert |
| `status` | immer | `eingeschlossen` · `ausgeschlossen` · `ungeklaert` |
| `ausschlussgrund` | bei `ausgeschlossen` | `andere_rechtsfrage` · `nur_erstreckung` · `kein_mietverhaeltnis` · `nur_prozessuale_nebenfrage` · `text_nicht_zugaenglich` |
| `zaehleinheit` | bei `eingeschlossen` | Bezeichner der Streitigkeit |
| `abschluss_status` | bei `eingeschlossen` | `abgeschlossen` · `rueckweisung_offen` |
| `erledigungsweg.modus` | bei `eingeschlossen` | `materiell_entschieden` · `prozessual_erledigt` · `rueckweisung_offen` |
| `erledigungsweg.prozessgrund` | Schlüssel immer da | einer der sieben Gründe, sonst **`null`** |
| `erledigungsweg.beleg` / `.stand_datum` / `.quelle` | bei `eingeschlossen` | Textstelle · Datum ≤ Datenstand · Primärquelle |
| `messausgang.messdefinition_id` / `.messdefinition_version` | bei `eingeschlossen` | genau `MD-001` / `3.1.0` |
| `messausgang.wert` | bei `eingeschlossen` | `durchgesetzt` · `nicht_durchgesetzt` · `nicht_anwendbar` · `offen` |
| `messausgang.beleg` / `.quelle` | bei `eingeschlossen` | Textstelle · Primärquelle |
| `verfahrensrecht_nachweis` | bei `eingeschlossen` **und** `abgeschlossen` | `regime` (`bgg` · `og` · `ungeklaert`) + nichtleerer `beleg` + `quelle` |
| `begruendung` | immer | Freitext |
| `offene_frage` | bei `ungeklaert` | Freitext — was offen geblieben ist |

Ausserhalb von `eingeschlossen` trägt ein Eintrag **keines** der
Einschlussfelder. Bei `ungeklaert` wird nichts erfunden (CR-03 E2 Ziff. 6),
und ein Feld, das keine Regel liest, täuschte im Abgleich nur Gewicht vor.

**Identität und Bindung sind keine Klassifikation.** `quelle_id`,
`aktenzeichen`, `text_sha256` und die beiden `messausgang.messdefinition_*`
sagen, *welcher* Treffer gegen *welche Fassung* beurteilt wurde. Sie werden
unverändert aus dem Paket übernommen und gegen dieses geprüft; eine Abweichung
ist **kein Feldkonflikt für den A/B-Abgleich, sondern ein Fehler** — die
Antwort gehört dann zu einem anderen Gegenstand. `aktenzeichen` wird nie aus
dem Volltext ergänzt: das wäre bereits eine Auslegung des Entscheids, den zu
beurteilen erst die Aufgabe ist.

**Das Schema ist geschlossen.** Auf jeder Ebene — Artefakt, `kodierer`,
`messdefinition`, Eintrag, `erledigungsweg`, `messausgang`,
`verfahrensrecht_nachweis` — sind nur die deklarierten Schlüssel erlaubt. Ein
zusätzliches Feld (eine eigene Nebenwertung, ein Konfidenzmass, eine
Modellanmerkung) macht das Artefakt **ungültig**. Es würde von keiner Regel
gelesen und von keinem Abgleich verglichen und stünde doch im Material. Was
gesagt werden soll, gehört in `begruendung` oder in einen der Belege.

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
   [1] kodierstoff-export          → EIN Paket für beide
        │                             (Volltext + Kriterien; kein fremder Lauf)
        ├──────────────┬──────────────
   [2] Kodierer A   Kodierer B      getrennte Sitzungen, verschiedene Modelle
        GPT-5.6 Sol   Claude Opus 5  gleiches Schema, gleicher Stoff
        └──────────────┴──────────────
   [3] kodierabgleich              → prüft jede Antwort einzeln gegen v3.1,
        │                             vergleicht, rechnet die Quote
   [4] Konsens verankern           → nur Übereinstimmung in lauf.json,
                                      Audit-Eintrag ins Repository
```

**[1] Export.** `npm run kodierstoff-export` erzeugt aus dem versiegelten
Bundle **ein** Paket: die 129 Volltexte, die Kriterien und Wertelisten der
eingefrorenen Definition, die kanonische Zähleinheit-Regel und das
Antwortschema — und **nichts** aus einem anderen Lauf, kein vorbelegter
Status, kein Modellname. Beide Kodierer bekommen dieselbe Datei; wären es
zwei, müsste man beweisen, dass sie gleich sind. Jeder Volltext wird vorher
gegen den verankerten `text_sha256` geprüft; weicht einer ab, entsteht kein
Paket. Der Export ist deterministisch — zweimal erzeugt ergibt Byte für Byte
dasselbe Paket, sonst taugte sein SHA-256 nicht als gemeinsamer Bezugspunkt
zweier Antworten. Ablage ausserhalb des Repositoriums.

**[2] Kodierung.** Zwei getrennte Sitzungen, **verschiedene Modelle**
(MANIFEST §5): Kodierer A ist `GPT-5.6 Sol`, Kodierer B ist
`Claude Opus 5 (claude-opus-5)`. Kein Kodierer sieht das Ergebnis des anderen
— auch nicht teilweise, auch nicht als Zusammenfassung. Beide antworten im
Schema `gemeinsam-recht.ml003.kodierung.v1` und nennen im Kopf ihre Rolle,
ihr Modell und den SHA-256 des Pakets, gegen das sie kodiert haben.

**[3] Abgleich.** Die Einzelprüfung steht bereits:
`pruefeKodierartefakt()` prüft **jede Antwort für sich** gegen die Definition
(Kopf, Deckung der 129 Bezeichner, erlaubte Werte, Kopplungen, Belegpflicht,
`stand_datum ≤ datenstand`, Zähleinheit-Regel, Verfahrensrechtsnachweis).
Beide Rollen laufen durch dieselbe Funktion mit demselben Kontext. Eine
Antwort, die dabei durchfällt, wird zurückgewiesen — nicht stillschweigend
verglichen. Der Vergleich selbst (`kodierabgleich`) ist noch nicht gebaut;
er folgt der Konsensregel in §4.

**[4] Verankerung.** In `lauf.json` gelangt ausschliesslich der Konsens; die
Vollartefakte bleiben aussen und sind über SHA-256 verankert.

## 4. Die Konsensregel — ENTSCHIEDEN (Taktgeber-Review 2026-08-11)

> Ersetzt den früheren Achsen-Vorschlag dieses Entwurfs. Die wichtigste
> Verschärfung: auch `erledigungsweg.modus`/`.prozessgrund` und
> `erledigungsweg.quelle` sind konsensblockierend — der Entwurf hatte sie
> zunächst von der Übereinstimmung ausgenommen.

**Vollständige Übereinstimmung** — alle Pflichtfelder für den jeweiligen
Status identisch, `zaehleinheit` nach kanonischer Regel gleich — der Wert
wird übernommen.

**Statuskonflikt** (A ≠ B bei `status`): der Treffer bleibt `ungeklaert`.
Kein drittes Urteil, kein Mehrheitsentscheid — deckt sich mit
`kodierungsabgleich-A-B2.json` (4A_162/2026, 4A_561/2025).

**Feldkonflikt bei gleichem `status = eingeschlossen`** — unterschiedliche
`zaehleinheit`, `messausgang.wert`, `erledigungsweg.modus`/`.prozessgrund`
oder `verfahrensrecht_nachweis.regime`: wird wie ein Statuskonflikt
behandelt. Der **ganze Treffer** bleibt `ungeklaert`, **kein Feld wird
isoliert übernommen.** Grund: `pruefeEndwirkung` verlangt innere Konsistenz
zwischen Erledigungsweg, Abschlussstatus und Messausgang — eine Kombination
„Status von A, Messausgang von B" wurde von keinem der beiden Kodierer je so
entschieden und wäre eine neue, dritte Aussage.

**`zaehleinheit`:** die kanonische Ableitungsregel steht seit dem
2026-08-11 fest und geht wortgleich im Kodierpaket an beide (unten §4a).
Wenden beide sie korrekt an, sind die Zeichenketten ohnehin identisch.
Weichen sie trotzdem ab, ist das ein Feldkonflikt wie oben.

**`erledigungsweg.quelle`:** verschiedene Folgeentscheide als Primärquelle
sind ein Feldkonflikt ⇒ `ungeklaert` — auch wenn `messausgang.wert` zufällig
übereinstimmt, weil unterschiedliche Primärquellen unterschiedliche, nicht
automatisch verifizierbare Tatsachenbehauptungen tragen (CR-03 E2 Ziff. 6:
es wird nicht geraten).

**`verfahrensrecht_nachweis.regime`:** Abweichung ist ein Feldkonflikt ⇒
`ungeklaert` — deckt sich mit der Fail-closed-Architektur von
`rechtskraftAusInstanz`, wo bereits `og` oder `ungeklaert` allein nicht
einschliessen.

**Doppelt ungeklärt:** bleibt `ungeklaert`; keine weitere Prüfung, keine
Begründungspflicht über das hinaus, was die Kodierer schon notiert haben.

**Belegtexte** werden weiterhin nicht auf Wortgleichheit verglichen — zwei
Kodierer zitieren nie identisch; geprüft wird die Belegpflicht. Die
Übereinstimmung hängt an den strukturierten Feldern oben.

## 4a. Die kanonische `zaehleinheit`-Regel — ENTSCHIEDEN (Taktgeber 2026-08-11)

> Diese Regel stand im Entwurf noch unter „später festlegbar". Das ist
> **korrigiert**: sie ist **vor Kodierungsbeginn entschieden** und liegt beiden
> Kodierern mit dem Paket vor. Nachträglich festgelegt wäre sie eine Regel,
> die man in Kenntnis der Antworten hätte wählen können.

> Die bei ML-002 beobachteten Bezeichner entsprachen den jeweiligen
> **Aktenzeichen**. Das war eine Beobachtung, **keine normative Regel**, und
> wird auf ML-003 ausdrücklich **nicht** übertragen: 13 der 129 Treffer sind
> BGE-Publikationsauszüge, die in den Rohmetadaten überhaupt kein Aktenzeichen
> tragen. Eine Aktenzeichenregel müsste dort aus dem Volltext lesen — also aus
> dem Entscheid, den zu beurteilen erst die Aufgabe ist.

**Regel.** `zaehleinheit` ist die lexikographisch kleinste `quelle_id` aller
ML-003-Roh-Treffer, die der jeweilige Kodierer derselben Streitigkeit
zuordnet. Gehört zu einer Streitigkeit nur ein Roh-Treffer, ist die
`zaehleinheit` dessen eigene `quelle_id`.

- Nur Roh-Treffer **dieses** Laufs bestimmen den Bezeichner. Ein nach CR-03 E2
  zulässiger Folgeentscheid ausserhalb der Rohpopulation darf den Endzustand
  belegen, ändert den Bezeichner aber nicht.
- Der Bezeichner wird **nie aus dem Ausgang** abgeleitet und **nie
  nachträglich von Hand umbenannt**.
- Lässt sich die Zuordnung nicht sicher treffen, wird keine erfunden: der
  Treffer bleibt `ungeklaert`.

**Was davon maschinell geprüft wird** (`pruefeZaehleinheiten()`): der
Bezeichner ist eine `quelle_id` dieses Laufs, und er ist lexikographisch nicht
grösser als die kleinste `quelle_id` seiner Gruppe. Auf **Gleichheit** wird
bewusst nicht geprüft: die kleinste `quelle_id` einer Streitigkeit kann selbst
ausgeschlossen oder ungeklärt sein und trägt dann gar keine `zaehleinheit` —
ein Gleichheitstest verwürfe genau diesen zulässigen Fall. Die Prüfung ist
damit **notwendig, nicht hinreichend**; ob die Zuordnung zur Streitigkeit
fachlich richtig war, entscheidet sie nicht.

## 5. Abbruchbedingungen (fail closed)

- Eine Antwort nennt einen anderen `kodierstoff_sha256` als das ausgelieferte
  Paket ⇒ Abbruch: es wurde gegen anderen Stoff kodiert.
- Ein Eintrag nennt ein anderes `aktenzeichen` oder einen anderen
  `text_sha256` als das Paket ⇒ Artefakt ungültig.
- `messausgang.messdefinition_id`/`.messdefinition_version` ≠ `MD-001`/`3.1.0`
  ⇒ Artefakt ungültig.
- Ein unbekannter Schlüssel auf irgendeiner Ebene ⇒ Artefakt ungültig.
- Rolle und Modell passen nicht zur festgeschriebenen Besetzung ⇒ Artefakt
  ungültig.
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

## 7. Go/No-Go — GO (Taktgeber-Review 2026-08-11)

Die Doppelkodierung kann beginnen:

- Kein Code-, Schema- oder Freeze-Defekt gefunden; `npm test` (messkorpus
  379/379) und `node tools/pruefen.ts` bestätigen einen sauberen, vollständig
  ungeklärten, gesperrten Ausgangszustand für ML-003.
- `sperren()`/`pruefeLauf` verhindern technisch jede vorzeitige Quote,
  solange auch nur ein Treffer `ungeklaert` bleibt — das deckt den
  kritischsten Fall (unvollständiger Konsens) bereits vollständig ab.
- Der Vergleichsvertrag (§4: welche Felder wie verglichen werden, keine
  Feldmischung) ist entschieden; keine weitere Entwicklung nötig, um zu
  starten.

**Vor-Merge-Pflicht** — kein Vor-Kodierung-Blocker; sie lässt sich parallel
zur Kodierung klären, ohne die Blindheit der Läufe zu verletzen:

1. **Automatisierter A/B-Abgleich** (`kodierabgleich` nach §3 Schritt [3]): **erledigt**.
   Der materialisierte ML-003-Abgleich liegt unter `messkorpus/laeufe/ML-003/kodierungsabgleich-A-B.json`; `lauf.json` bleibt bis Schritt [4] unangetastet.

Die frühere zweite Pflicht — die kanonische `zaehleinheit`-Regel — ist
**erledigt und vorgezogen**: sie steht in §4a, ist vor Kodierungsbeginn
entschieden und geht mit dem Paket an beide Kodierer. Die Entwurfsaussage,
sie sei „parallel festlegbar und nachreichbar", gilt **nicht mehr**. Eine
Regel, die erst nach den Antworten feststünde, könnte in deren Kenntnis
gewählt worden sein.

## 8. Besetzung — festgelegt (Taktgeber 2026-08-11)

| Rolle | Modell |
|---|---|
| Kodierer A | `GPT-5.6 Sol` |
| Kodierer B | `Claude Opus 5 (claude-opus-5)` |

Zwei verschiedene Modelle, wie MANIFEST v2.1 §5 es verlangt. Die Reihenfolge
ist für die Unabhängigkeit belanglos, für den Audit-Eintrag aber festgehalten.
Beide Angaben stehen im Kopf des jeweiligen Antwortartefakts
(`kodierer.rolle`, `kodierer.modell`) — und sonst nirgends: kein Feldname und
kein Eintrag verrät, wer geantwortet hat, und **im Kodierstoff steht keine
Modellidentität**, sonst wüsste jeder Kodierer, wer der andere ist.

Weil die Besetzung vor Kodierbeginn feststand, wird sie **fail closed
geprüft**: Rolle `A` nimmt nur `GPT-5.6 Sol` an, Rolle `B` nur
`Claude Opus 5 (claude-opus-5)`. Eine Antwort unter einer Rolle mit einem
anderen Modell ist ungültig, nicht bloss auffällig. Dass tatsächlich zwei
verschiedene Modelle *gelaufen* sind, erzwingt weiterhin kein Code, sondern
die Durchführung selbst — der Code hält nur fest, dass die Zuordnung nicht
nachträglich umbesetzt wurde.

## 9. Stand der Werkzeuge

| Datei | Was sie tut | Stand |
|---|---|---|
| `redaktion/src/kodierschema.ts` | Antwortschema `gemeinsam-recht.ml003.kodierung.v1`, Wertelisten, Zähleinheit-Regel, Einzelprüfung einer Antwort | steht |
| `redaktion/src/kodierstoff.ts` | baut das Kodierpaket, prüft jeden Volltext gegen den Provenienzanker, leitet den Prüfkontext ab | steht |
| `redaktion/src/kodierstoff-export.ts` | CLI `npm run kodierstoff-export` | steht |
| `kodierabgleich` (§3 Schritt [3]) | A/B-Vergleich nach §4, Quote, Audit-Eintrag | **steht** |
| Verankerung in `lauf.json` (§3 Schritt [4]) | Konsens eintragen | **fehlt** |

Der Export läuft dort, wo das Bundle liegt — ausserhalb des Repositoriums,
ohne Netz:

```
npm run kodierstoff-export -- --lauf ML-003 \
  --bundle ~/gr-volltexte/ML-003 --ziel ~/gr-kodierung/ML-003
```

Der ausgegebene SHA-256 des Pakets gehört in den Kopf **beider** Antworten.
Er entsteht auf der Maschine, die das Bundle hält; im Repository liegt kein
Volltext und damit auch kein Paket.

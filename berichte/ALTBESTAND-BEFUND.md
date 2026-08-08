# BEFUND — Altbestaende gegen MANIFEST v2.1

Erzeugt: 2026-08-08 11:04 · gr-altbestand3.sh
Massstab: MANIFEST v2.1 (ec285049…21ec02)

**Befund, keine Aenderung.**

Ausgeschlossen: `terminalausgabeclaudecli/` (Sitzungsprotokolle sind kein
Altbestand), `node_modules`, Buildverzeichnisse.

Als historisch zulaessig gewertet und nur gezaehlt, nicht aufgelistet:
`FREEZE.txt`, `berichte/`, `MANIFEST-*`, `CR-*`, `docs/archiv/`,
`DER_PLAN_*`. Dort sind alte Fassungen korrekt.

Fundstellen sind auf 180 Zeichen gekuerzt.

---

## A — Widerspruch zum geltenden Manifest

### A1 Feld kodierung_geprueft

gesamt 13 · historisch zulaessig 10 · **zu pruefen 3**

```
      2 ./STATUS.md
      1 ./prototypen/feed/src/story.ts
      1 
```

<details><summary>Fundstellen (gekuerzt auf 180 Zeichen)</summary>

```
./prototypen/feed/src/story.ts:70: * fruehere binaere kodierung_geprueft. kodierung_quellen haelt je Kodierlauf
./STATUS.md:24:- [x] Kodierte Felder (Konzept v2 §5.3) additiv ergänzt: wissen/scheiterpunkte.json (v1.0.0, in dist/versionen.json registriert), Parser-Erweiterung, Vorschlagswerte
./STATUS.md:25:- [x] Umstellung auf Doppelkodierung (MANIFEST v2.1 §3/§5) additiv umgesetzt: kodierung_geprueft ersetzt durch kodierung_status/kodierung_quellen (alle neun Geschich

```
</details>

### A2 Launch-Gate

gesamt 18 · historisch zulaessig 11 · **zu pruefen 7**

```
      4 ./docs/DECISIONS/CR-001-stiller-gesamtbau-statt-fragment-stop.md
      2 ./auftraege/AUFTRAG-F0-FEED-PROTOTYP.md
      1 ./prototypen/feed/src/main.ts
      1 
```

<details><summary>Fundstellen (gekuerzt auf 180 Zeichen)</summary>

```
./docs/DECISIONS/CR-001-stiller-gesamtbau-statt-fragment-stop.md:23:2. **10-Personen-Test wird Launch-Gate statt Projekt-Stop:** Bevor irgendetwas
./docs/DECISIONS/CR-001-stiller-gesamtbau-statt-fragment-stop.md:50:entfällt. Öffentliche Feed-Aktivierung erst, wenn kumulativ: Launch-Gate des
./docs/DECISIONS/CR-001-stiller-gesamtbau-statt-fragment-stop.md:58:Vorkriterium „F läuft 8 Wochen" durch „Launch-Gate bestanden". Private
./docs/DECISIONS/CR-001-stiller-gesamtbau-statt-fragment-stop.md:77:   Review-Kapazität", oder ersetzt das Launch-Gate (Ziff. 2) dieses Kriterium?
./auftraege/AUFTRAG-F0-FEED-PROTOTYP.md:24:Gesamtdurchläufen (Ziel gemäss Plan §4: ≥100 vor Antritt des Launch-Gates) und
./auftraege/AUFTRAG-F0-FEED-PROTOTYP.md:126:Öffentlicher Feed oder Kanal (Phase F bleibt hinter dem Launch-Gate) ·
./prototypen/feed/src/main.ts:887:      `Vollständige Journey-Durchläufe: ${sammlung.journeysGesamt} · interner Richtwert: 100 (kein Launch-Gate mehr — MANIFEST v2.1 §2/F2′: Start 

```
</details>

### A3 Aktive Faelle / Spenden als Startbestandteil

gesamt 8 · historisch zulaessig 8 · **zu pruefen 0**

_Nichts zu pruefen._

### A4 Addendum F2 alte Fassung

gesamt 0 · historisch zulaessig 0 · **zu pruefen 0**

_Nichts zu pruefen._

### A5 Handpruefung als Zaehlvoraussetzung

gesamt 1 · historisch zulaessig 1 · **zu pruefen 0**

_Nichts zu pruefen._

---

## B — Verweise auf ueberholte Fassungen

### B1 Plan v1.1 als geltende Grundlage

gesamt 31 · historisch zulaessig 11 · **zu pruefen 20**

```
      2 ./README.md
      2 ./prototypen/feed/src/main.ts
      2 ./CLAUDE.md
      1 ./wissen/package.json
      1 ./STATUS.md
      1 ./SESSION_KOPF.txt
      1 ./prototypen/feed/package.json
      1 ./docs/DECISIONS/CR-001-stiller-gesamtbau-statt-fragment-stop.md
      1 ./auftraege/AUFTRAG-W0-WISSENS-REGISTER.md
      1 ./auftraege/AUFTRAG-SI0-SICHTER.md
      1 ./auftraege/AUFTRAG-R1-REDAKTIONSMAPPE.md
      1 ./auftraege/AUFTRAG-R0-REDAKTION-ENTSCHEIDE.md
      1 ./auftraege/AUFTRAG-N0-NACHSCHLAGEWERK.md
      1 ./auftraege/AUFTRAG-K0-LESERSTIMMEN.md
      1 ./auftraege/AUFTRAG-F1-LESER-JOURNEY.md
      1 ./auftraege/AUFTRAG-F0-FEED-PROTOTYP.md
      1 ./auftraege/AUFTRAG-A0-ANFRAGEN-FEED.md
      1 
```

<details><summary>Fundstellen (gekuerzt auf 180 Zeichen)</summary>

```
./docs/DECISIONS/CR-001-stiller-gesamtbau-statt-fragment-stop.md:90:   erzeugt Plan v1.1 mit den Änderungen, bildet den neuen SHA-256 und schreibt
./auftraege/AUFTRAG-R0-REDAKTION-ENTSCHEIDE.md:5:plan_referenz: "DER_PLAN_v1.1_FROZEN.md §4 Stiller Parallelbau (CR-001), §6 L1; Invarianten 2, 3, 9, 12"
./auftraege/AUFTRAG-F1-LESER-JOURNEY.md:5:plan_referenz: "DER_PLAN_v1.1_FROZEN.md §4 Stiller Parallelbau (CR-001 inkl. F1), §1 Fernziel; Invarianten 1, 2, 3, 6, 11, 12"
./auftraege/AUFTRAG-W0-WISSENS-REGISTER.md:5:plan_referenz: "DER_PLAN_v1.1_FROZEN.md §6 L1 Wissens-Layer; Invarianten 1, 3, 11; anspruchsradar-Methodik"
./auftraege/AUFTRAG-N0-NACHSCHLAGEWERK.md:5:plan_referenz: "DER_PLAN_v1.1_FROZEN.md §6 L1 (Wissen zentral und oeffentlich), §4 Stiller Parallelbau (CR-001); Invarianten 1, 2, 3, 11
./auftraege/AUFTRAG-A0-ANFRAGEN-FEED.md:5:plan_referenz: "DER_PLAN_v1.1_FROZEN.md §4 Stiller Parallelbau (CR-001 inkl. F1), §5 Phase S (nur als privater Prototyp); Invarianten 1, 2
./auftraege/AUFTRAG-K0-LESERSTIMMEN.md:5:plan_referenz: "DER_PLAN_v1.1_FROZEN.md §4 Stiller Parallelbau (CR-001 inkl. F1); Norm v0.6 §10; Invarianten 2, 6, 11, 12"
./auftraege/AUFTRAG-SI0-SICHTER.md:5:plan_referenz: "DER_PLAN_v1.1_FROZEN.md §4 Stiller Parallelbau (CR-001 inkl. F1); Norm v0.6 §11; Invarianten 2, 6, 11, 12"
./auftraege/AUFTRAG-R1-REDAKTIONSMAPPE.md:6:plan_referenz: "DER_PLAN_v1.1_FROZEN.md §4 Stiller Parallelbau (CR-001); NACHSCHLAGEWERK-NORM v0.6 §§2,4,7,8; LEGAL_AI_OPERATING_RULES (
./auftraege/AUFTRAG-F0-FEED-PROTOTYP.md:9:plan_referenz: "DER_PLAN_v1.1_FROZEN.md §4 (Stiller Parallelbau, CR-001 inkl. F1), §2 Invarianten 1, 2, 6, 11, 12"
./SESSION_KOPF.txt:3:Angehängt ist DER_PLAN_v1.1_FROZEN.md. Er ist eingefroren und allein massgeblich.
./README.md:7:2. `DER_PLAN_v1.1_FROZEN.md` — der komplette, eingefrorene Plan (allein massgeblich)
./README.md:14:**Neuer KI-Chat:** Inhalt von `SESSION_KOPF.txt` einfügen, `DER_PLAN_v1.1_FROZEN.md`
./prototypen/feed/src/main.ts:185:    "Privater Prototyp (Plan v1.1 §4, CR-001/F1) · Geschichten FIKTIV oder nach echten, öffentlich publizierten Entscheiden nacherzählt (gekennzei
./prototypen/feed/src/main.ts:193:    "Privater Prototyp (Plan v1.1 §4, CR-001) · jede Geschichte ist gekennzeichnet: FIKTIV (synthetisch) oder NACHERZÄHLT (nach echtem, öffentlich
./prototypen/feed/package.json:5:  "description": "Privater Offline-Feed-Prototyp 'Morgenausgabe' (Plan v1.1 §4 stiller Parallelbau, CR-001 inkl. F1). Liest ausschliesslich gekennz
./wissen/package.json:5:  "description": "Wissens-Register & Destillat-Pipeline (AUFTRAG-W0, Plan v1.1 §6 L1). Privates Fundament: versionierte, maschinenlesbare Erkenntnisse mit Q
./STATUS.md:6:- **DER_PLAN_v1.1_FROZEN.md** (Wurzel) — allein massgeblich; Hash in FREEZE.txt
./CLAUDE.md:7:2. `MANIFEST-v2.1.md` — bindende Fassung, allein massgeblich. `sha256sum` bilden und mit dem MANIFEST-v2.1-Eintrag in `FREEZE.txt` abgleichen; bei Abweichung: stoppen
./CLAUDE.md:13:- Du änderst `DER_PLAN_v1.1_FROZEN.md`, `FREEZE.txt` und `SESSION_KOPF.txt` niemals. Abweichungswünsche nur als Change-Request-Vorschlag (Plan §7), nie als Edit.

```
</details>

### B2 Hash v1.1

gesamt 7 · historisch zulaessig 7 · **zu pruefen 0**

_Nichts zu pruefen._

### B3 Hash v2.0

gesamt 4 · historisch zulaessig 4 · **zu pruefen 0**

_Nichts zu pruefen._

---

## C — Zwei Wahrheiten

### C1 Scheiterpunkt-Liste ausserhalb wissen/scheiterpunkte.json

Dateien mit drei oder mehr verschiedenen Werten (einzelne Verwendung ist zulaessig):

```
3 Werte: ./redaktion/tests/kodierung.test.ts
14 Werte: ./redaktion/kodierung/zweitlauf-2026-08-08.json
```

### C2 Rubriken-Enum an mehreren Stellen

Dateien mit allen drei Rubriken zusammen:

```
./prototypen/feed/src/story.ts
./redaktion/AUFTRAG-FALLAUFNAHME.md
```

### C3 Mindestfallzahl definiert

gesamt 5 · historisch zulaessig 1 · **zu pruefen 4**

```
      2 ./wissen/tests/kodierung-quoten.test.ts
      1 ./wissen/tools/quoten-sicht.ts
      1 ./auftraege/AUFTRAG-W0-WISSENS-REGISTER.md
      1 
```

<details><summary>Fundstellen (gekuerzt auf 180 Zeichen)</summary>

```
./auftraege/AUFTRAG-W0-WISSENS-REGISTER.md:46:`wenn`-Kontext, `n`, `positiv`, `zeitstand`; Konstante MINDESTFALLZAHL=10.
./wissen/tools/quoten-sicht.ts:10:export const MINDESTFALLZAHL = 10;
./wissen/tests/kodierung-quoten.test.ts:180:  it("unterhalb der Mindestfallzahl: nur die Fallzahl mit Hinweis, kein Zaehler in der Anzeige", () => {
./wissen/tests/kodierung-quoten.test.ts:188:  it("ab der Mindestfallzahl: Zaehler von Nenner wird gezeigt", () => {

```
</details>

---

## D — Offene Marker

### D1 TODO / FIXME

gesamt 0 · historisch zulaessig 0 · **zu pruefen 0**

_Nichts zu pruefen._

### D2 Als veraltet markiert

gesamt 3 · historisch zulaessig 1 · **zu pruefen 2**

```
      1 ./wissen/tests/dist.test.ts
      1 ./prototypen/stories/FS-902-platzhalter-kellerabteil/story.md
      1 
```

<details><summary>Fundstellen (gekuerzt auf 180 Zeichen)</summary>

```
./prototypen/stories/FS-902-platzhalter-kellerabteil/story.md:11:Beim gemeinsamen Kellertermin stellt sich heraus: Beim Verwaltungswechsel wurde ein veralteter Kellerplan übernomme
./wissen/tests/dist.test.ts:54:  it("die abgelegten Dateien entsprechen exakt dem aktuellen Register (kein veralteter Build)", () => {

```
</details>

---

## E — Bestand

```
Registereintraege : 18
Stories           : 12
Entwuerfe         : 2
Letzter Commit    : c729001 2026-08-08 Aufraeumen nach MANIFEST v2.1: Verweise auf Plan v1.1/Launch-Gate umgestellt
```

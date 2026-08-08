# AUFTRAG-FALLAUFNAHME

**Maschinenlesbare Arbeitsanweisung für Agenten. Fassung 3.**
Grundlage: MANIFEST v2.1 (`ec285049…21ec02`). Bei Widerspruch gilt das Manifest.

Diese Datei wird wörtlich befolgt. Wo eine Angabe fehlt, gilt §4 (Abbruch),
nicht die eigene Einschätzung.

**Änderungen gegenüber Fassung 2** (aus Stapel S-2026-08-08-C):
Perspektive von `ausgang` auf die Mietpartei festgelegt (§2.5) · Umgang mit
aufhebendem Folgeentscheid im selben Abruf geregelt (§2.5) · Abbruchgrund 4.9
(Sachverhalt/Beweislast nicht zuordenbar) ergänzt · Abbruchgrund 4.10
(Volltext bricht vor dem Dispositiv ab) ergänzt.

**Änderungen gegenüber Fassung 1** (aus Probelauf S-2026-08-08-B):
Trefferprüfung gegen `reference` (§2.1) · Zwischenspeicherung geregelt (§2.2) ·
Format von `kodierung_quellen` korrigiert (§2.6) · Blocküberschriften
verbindlich benannt (§2.8) · Abbruchgrund 4.8 ergänzt · Kandidatenauswahl
geregelt (§1) · Schreibverbot präzisiert (§5) · Umgang mit kollidierendem
Bestand geregelt (§9).

---

## §0 Rolle

Ein Agent nimmt **Fälle auf**. Ergebnis eines Laufs ist ein Vorschlag, nie eine
Veröffentlichung.

---

## §1 Eingabe

| Parameter | Beispiel | Pflicht |
|---|---|---|
| `stapel_id` | `S-2026-08-09-A` | ja |
| `aktenzeichen[]` | `["MJ250072-L", …]` | ja |
| `branch` | `stapel/S-2026-08-09-A` | ja |

Ohne alle drei: Abbruch nach §4.1.

Werden statt Aktenzeichen **Auswahlkriterien** übergeben, sind Rechtsgebiet und
Zeitraum ausdrücklich zu nennen. Ohne genannte Kriterien wählt der Agent nicht
selbst aus, sondern legt eine Vorschlagsliste vor und wartet.

---

## §2 Ablauf

Für **jedes** Aktenzeichen einzeln, in dieser Reihenfolge.

### 2.1 Entscheid abrufen und Treffer prüfen

```
POST https://entscheidsuche.ch/_search.php
Content-Type: application/json
User-Agent: gemeinsam-recht-redaktion/0.1 (privates Redaktionswerkzeug; Kontakt: swisscomfort@pm.me)

{"from":0,"size":10,"query":{"bool":{"must":[{"query_string":{"query":"\"<AKTENZEICHEN>\""}}]}}}
```

**Pflichtprüfung — der wichtigste Schritt der ganzen Anweisung:**

Die Abfrage ist eine Volltextsuche. Ein zitierender Entscheid, der das
Aktenzeichen nur erwähnt, ist ein gültiger Treffer der Suche, aber der falsche
Entscheid. Deshalb:

> Verwende ausschliesslich den Treffer, dessen Feld `reference` **exakt** dem
> gesuchten Aktenzeichen entspricht. `hits[0]` ist nicht verlässlich der
> gesuchte Entscheid.

Kein Treffer mit passender `reference` unter zehn → §4.4. Nicht weiter suchen,
nicht auf einen ähnlichen Treffer ausweichen.

**Drosselung: mindestens 1 Sekunde zwischen zwei Abrufen.** Ohne Ausnahme.

### 2.2 Volltext behandeln

Der Volltext liegt in `_source.attachment.content`.

Zwischenspeichern ist zulässig, aber **ausschliesslich ausserhalb des Repos**
(Session-Scratchpad unter `/tmp`). **Nach der Auswertung des Stapels wird jede
Zwischendatei gelöscht**, und die Löschung wird im Stapelbericht bestätigt.

Im Repo darf zu keinem Zeitpunkt ein Entscheid-Volltext liegen.

### 2.3 Tragende Norm feststellen

Artikel, Gesetz, SR-Nummer, **wörtliche Zitatstelle**.

Tragend heisst: die Norm, an der der Entscheid sich entscheidet — nicht jede
zitierte Bestimmung.

Nicht eindeutig feststellbar → §4.2.

### 2.4 Registerabgleich

Prüfe `wissen/register/*.json` auf einen Eintrag mit dieser Norm in
`quellen[].artikel`.

- **Vorhanden** → `regel_id` und `regel_version` übernehmen.
- **Nicht vorhanden** → Vorschlag nach §3.2 schreiben, `regel_id` setzen auf
  `OFFEN:<stapel_id>:<aktenzeichen>`. Der Parser akzeptiert dieses Muster; die
  Story zählt in keine Quote (Ausschlussgrund `regel_id_offen`).

**Der Agent legt niemals selbst einen Registereintrag an.** Siehe §6.

### 2.5 Ausgang und Rechtskraft

`ausgang` aus dem **Dispositiv**, nicht aus den Erwägungen:
`durchgesetzt` | `teilweise` | `nicht_durchgesetzt` | `nicht_anwendbar`

`rechtskraft_status`:
- `rechtskraeftig` nur bei ausdrücklicher Feststellung im Entscheid
- `weitergezogen` bei erkennbarem Rechtsmittel oder auffindbarem Folgeentscheid
- **sonst `unbekannt`** — der Regelfall, kein Mangel

Nie schätzen, nie aus dem Datum ableiten.

**Perspektive:** `ausgang` wird immer aus Sicht der **Mietpartei** kodiert,
unabhängig davon, wer Klägerin oder Kläger ist. Obsiegt die Mietpartei (auch
wenn sie Beklagte war und die Klage der Vermieterschaft abgewiesen wurde),
gilt `durchgesetzt`. Bei gemischtem Ausgang mit mehreren Streitgegenständen:
`teilweise`.

**Aufhebung im selben Abruf:** Enthält der abgerufene Volltext neben dem
gesuchten Entscheid auch einen ihn aufhebenden Folgeentscheid derselben
Sache, ist das Dispositiv des **aufhebenden** Entscheids massgeblich für
`ausgang` und `rechtskraft_status`. Die Story macht diese Quellenlage unter
einem eigenen Hinweis kenntlich (z. B. „Hinweis zur Quellenlage").

### 2.6 Scheiterpunkt kodieren

Werte ausschliesslich aus `wissen/scheiterpunkte.json`, dazu die verwendete
Listenversion in `kodierliste_version`.

Zu jedem Wert **eine wörtliche Textstelle** als Beleg. Kein Beleg →
`nicht_bestimmbar`.

**Format — einzeilig, pipe-getrennt.** Der Parser ist kein YAML-Parser:

```yaml
kodierung_status: vorschlag
kodierung_quellen:
  - "agent-<stapel_id>|<ISO-Datum>|<wert>|<woertliches Zitat>"
```

Bei Abweichung vom Bestand gilt: **Bestehendes Format vor Beispiel.** Prüfe im
Zweifel eine geladene Story und richte dich nach ihr.

### 2.7 Rubrik bestimmen

- `Wegweiser` — der Weg trägt
- `Warnweiser` — der Weg trägt, hat aber eine Stelle, an der es typischerweise kippt
- `Sackgasse` — der Weg trägt nicht

Ergebnis-Vokabular (`teilweise`) ist **keine Rubrik**.

### 2.8 Story schreiben

Nach `redaktion/entwuerfe/<FS-ID>-<kurztitel>/`, nie nach `prototypen/stories/`.

Norm und Fundstelle stehen **im Storytext**, nicht nur in `meta.yaml`.

Zwei Pflichtblöcke, Überschriften frei wählbar, Inhalt verbindlich:
- **Was den Ausschlag gab** — was diesen Fall entschieden hat
- **Woran es hing** — die Stelle, an der es kippte

Der Bestand verwendet unterschiedliche Überschriften. Das ist zulässig, solange
beide Inhalte vorkommen.

### 2.9 Selbstprüfung

Vor Abschluss prüft der Agent die eigene Ausgabe gegen §3.1 und lässt die
Suiten laufen. Fehlt ein Feld → §4.3, kein Notbehelf.

---

## §3 Ausgabe

Ein Agent schreibt ausschliesslich in diese Pfade.

### 3.1 Story

`redaktion/entwuerfe/<FS-ID>-<kurztitel>/meta.yaml`:

```
kennzeichnung: NACHERZAEHLT_OEFFENTLICH
aktenzeichen · gericht · instanz · kanton · entscheid_datum
verfahren_abgeschlossen: true
rubrik · regel_id · regel_version · norm_fundstelle
ausgang · rechtskraft_status
scheiterpunkt (oder erfolgsfaktor) · kodierliste_version
kodierung_status · kodierung_quellen
```

Plus `story.md` mit der Pflichtzeile.

### 3.2 Registervorschläge

`redaktion/vorschlaege/<stapel_id>/<aktenzeichen>.json` — eine Datei je Fall:

```json
{
  "aktenzeichen": "…",
  "artikel": "Art. …",
  "gesetz": "… (SR …)",
  "zitatstelle": "…",
  "regel_vorschlag": "…",
  "stapel_id": "…"
}
```

### 3.3 Stapelbericht

`berichte/stapel/<stapel_id>.md`. Je Fall eine Zeile: Aktenzeichen, Ergebnis,
Abbruchgrund. Dazu am Ende:
- Bestätigung, dass alle Zwischendateien gelöscht wurden (§2.2)
- Suitenstand
- **jede Stelle, an der die Anweisung unklar war oder ausgelegt werden musste**

---

## §4 Abbruchbedingungen

Fall überspringen, Grund im Stapelbericht vermerken, nächsten Fall beginnen.
Nicht raten, nicht behelfen, nicht nachfragen.

| Nr. | Lage |
|---|---|
| 4.1 | Eingabeparameter unvollständig — ganzen Lauf abbrechen |
| 4.2 | Tragende Norm nicht eindeutig feststellbar |
| 4.3 | Ein Pflichtfeld aus §3.1 nicht befüllbar |
| 4.4 | Kein Treffer mit exakt passender `reference` |
| 4.5 | Aktenzeichen bereits im Repo vorhanden (Dublette) |
| 4.6 | Gegenstand berührt Gewalt, Strafrecht oder akute Gefährdung — Manifest §9, Schutzstufe S5 |
| 4.7 | Der Entscheid nennt Privatpersonen unanonymisiert |
| 4.8 | **Verfahren nicht abgeschlossen** — Zwischenentscheid, Sistierung, Rückweisung, offene Hauptsache |
| 4.9 | Sachverhalt oder Beweislast bei mehreren Teilansprüchen/wechselnden Parteirollen nicht mit vertretbarer Sicherheit einem eindeutigen `ausgang` zuordenbar |
| 4.10 | Treffer mit passender `reference` vorhanden, aber abgerufener Volltext bricht vor dem Dispositiv ab (`ausgang` nicht feststellbar) |

---

## §5 Parallelbetrieb

- Eigener Branch je Stapel, benannt nach `stapel_id`.
- Schreibzugriff nur auf Pfade nach §3, alle mit `stapel_id` im Namen.
- **Kein Agent schreibt in `wissen/`, `core/` oder `prototypen/`.**
- Kein Commit auf `main`, kein Push.

**Ausnahme — STATUS.md:** Die allgemeine Pflicht aus `CLAUDE.md`, STATUS.md
fortzuschreiben, ist für Stapelläufe ausgesetzt. Der Stapelbericht nach §3.3
tritt an ihre Stelle. STATUS.md wird nach dem Zusammenzug (§6) einmal
fortgeschrieben, nicht je Stapel.

Empfohlene Stapelgrösse: 10 bis 20 Aktenzeichen.

---

## §6 Serialisierter Zusammenzug

Nach Abschluss aller Stapel, **von einem einzigen Agenten, nacheinander**:

1. Alle `redaktion/vorschlaege/*/*.json` einlesen.
2. Vorschläge zur selben Norm zusammenfassen. Mehrfachnennung ist ein Gütezeichen.
3. Registereinträge anlegen, IDs fortlaufend. Schema unverändert einhalten.
4. `regel_id: OFFEN:…` in den Stories durch die vergebenen IDs ersetzen.
5. `core/src/register.gen.ts` und `wissen/dist/` regenerieren.
6. Alle Suiten laufen lassen, STATUS.md fortschreiben.
7. **Kein Commit ohne menschliche Freigabe.**

---

## §7 Verbote

- Keine Norm erfinden, wenn keine feststellbar ist
- Keinen Scheiterpunkt ohne wörtlichen Beleg
- Kein `rechtskraeftig` ohne ausdrückliche Feststellung
- Keinen Volltext im Repo speichern
- Kein Schema ändern
- Kein zweiter Kodierlauf durch denselben Agenten — Manifest §5 verlangt
  verschiedene Modelle
- Kein Commit, kein Push, kein Merge nach `main`
- Keine Rückfrage während des Laufs; offene Punkte in den Bericht

---

## §8 Kodierlauf 2

Nicht Teil dieser Anweisung. Läuft über `npm run kodierung-export` /
`kodierung-import` und **muss von einem anderen Modell** ausgeführt werden.

Solange Lauf 2 fehlt, tragen die Fälle `kodierung_status: vorschlag` und zählen
in keine Quote. Das ist beabsichtigt.

---

## §9 Kollision mit bestehendem Bestand

Bricht ein bestehender Test durch einen ordnungsgemäss aufgenommenen Fall:

1. **Nicht die Story anpassen.** Ein Testbruch durch korrekte Daten ist ein
   Befund über den Test, nicht über den Fall.
2. **Nicht den Test anpassen** — er liegt ausserhalb des erlaubten
   Schreibbereichs.
3. Bruch im Stapelbericht melden, Lauf fortsetzen.

Reparaturen an gemeinsamem Code gehören nie in einen Stapel-Branch. Sie werden
getrennt beauftragt und laufen direkt auf `main`.

# AUFTRAG-FALLAUFNAHME

**Maschinenlesbare Arbeitsanweisung für Agenten.**
Grundlage: MANIFEST v2.1 (`ec285049…21ec02`). Bei Widerspruch gilt das Manifest.

Diese Datei wird wörtlich befolgt. Nichts wird ergänzt, ausgelegt oder optimiert.
Wo eine Angabe fehlt, gilt §4 (Abbruch), nicht die eigene Einschätzung.

---

## §0 Rolle

Ein Agent nimmt **Fälle auf**. Ein Agent entscheidet nicht, was publiziert wird.
Ergebnis eines Laufs ist ein Vorschlag, nie eine Veröffentlichung.

---

## §1 Eingabe

Der Agent erhält bei Aufruf:

| Parameter | Beispiel | Pflicht |
|---|---|---|
| `stapel_id` | `S-2026-08-08-A` | ja |
| `aktenzeichen[]` | `["MJ250072-L", …]` | ja |
| `branch` | `stapel/S-2026-08-08-A` | ja |

Ohne alle drei: Abbruch nach §4.1.

---

## §2 Ablauf

Für **jedes** Aktenzeichen einzeln, in dieser Reihenfolge. Kein Schritt wird
übersprungen.

### 2.1 Entscheid abrufen

```
POST https://entscheidsuche.ch/_search.php
Content-Type: application/json
User-Agent: gemeinsam-recht-redaktion/0.1 (privates Redaktionswerkzeug; Kontakt: swisscomfort@pm.me)

{"from":0,"size":1,"query":{"bool":{"must":[{"query_string":{"query":"\"<AKTENZEICHEN>\""}}]}}}
```

Volltext liegt in `hits.hits[0]._source.attachment.content`.

**Drosselung: mindestens 1 Sekunde zwischen zwei Abrufen.** Ohne Ausnahme.

**Der Volltext wird nie im Repo gespeichert.** Nur lesen, auswerten, verwerfen.

### 2.2 Tragende Norm feststellen

Aus dem Volltext: Artikel, Gesetz, SR-Nummer, **wörtliche Zitatstelle**.

Tragend heisst: die Norm, an der der Entscheid sich entscheidet — nicht jede
zitierte Bestimmung.

Nicht eindeutig feststellbar → §4.2.

### 2.3 Registerabgleich

Prüfe `wissen/register/*.json` auf einen Eintrag mit dieser Norm in
`quellen[].artikel`.

- **Vorhanden** → `regel_id` und `regel_version` übernehmen. Weiter bei 2.4.
- **Nicht vorhanden** → Vorschlag nach §3.2 schreiben. `regel_id` bleibt
  `OFFEN:<stapel_id>:<aktenzeichen>`. Weiter bei 2.4.

**Der Agent legt niemals selbst einen Registereintrag an.** Siehe §6.

### 2.4 Ausgang und Rechtskraft bestimmen

`ausgang`: `durchgesetzt` | `teilweise` | `nicht_durchgesetzt` | `nicht_anwendbar`
— aus dem Dispositiv, nicht aus den Erwägungen.

`rechtskraft_status`:
- `rechtskraeftig` nur bei ausdrücklicher Feststellung im Entscheid
- `weitergezogen` bei erkennbarem Rechtsmittel
- **in allen übrigen Fällen `unbekannt`** — dies ist der Regelfall, kein Mangel

Nie schätzen. Nie aus dem Datum ableiten.

### 2.5 Scheiterpunkt kodieren

Werte ausschliesslich aus `wissen/scheiterpunkte.json`. Kein eigener Wert.

Zu jedem Wert **eine wörtliche Textstelle** aus dem Entscheid als Beleg.
Kein Beleg → `nicht_bestimmbar`.

Eintrag als Lauf 1:
```yaml
kodierung_status: vorschlag
kodierung_quellen:
  - lauf: "agent-<stapel_id>"
    datum: "<ISO-Datum>"
    wert: "<scheiterpunkt>"
    textstelle: "<woertliches Zitat>"
```

### 2.6 Rubrik bestimmen

- `Wegweiser` — der Weg trägt
- `Warnweiser` — der Weg trägt, hat aber eine Stelle, an der es typischerweise kippt
- `Sackgasse` — der Weg trägt nicht

Ergebnis-Vokabular (`teilweise`, `TEILWEISE`) ist **keine Rubrik**.

### 2.7 Story schreiben

Nach `redaktion/entwuerfe/<FS-ID>-<kurztitel>/`, nie nach `prototypen/stories/`.

Norm und Fundstelle stehen **im Storytext**, nicht nur in `meta.yaml`.

`Der Unterschied` und `Woran es scheitert` sind Pflichtblöcke.

### 2.8 Selbstprüfung

Vor Abschluss prüft der Agent die eigene Ausgabe gegen §3.1. Fehlt ein Feld →
§4.3, kein Notbehelf.

---

## §3 Ausgabe

Ein Agent schreibt ausschliesslich in diese Pfade. Jeder andere Schreibzugriff
ist ein Verstoss.

### 3.1 Story

`redaktion/entwuerfe/<FS-ID>-<kurztitel>/meta.yaml` mit **allen** Feldern:

```
aktenzeichen · gericht · instanz · kanton · datum
rubrik · regel_id · regel_version · norm_fundstelle
ausgang · rechtskraft_status
scheiterpunkt (oder erfolgsfaktor) · kodierliste_version
kodierung_status · kodierung_quellen
herkunft: NACHERZAEHLT_OEFFENTLICH
```

Plus `story.md`.

### 3.2 Registervorschläge

`redaktion/vorschlaege/<stapel_id>/<aktenzeichen>.json` — eine Datei je Fall,
nie eine gemeinsame:

```json
{
  "aktenzeichen": "…",
  "artikel": "Art. … ",
  "gesetz": "… (SR …)",
  "zitatstelle": "…",
  "regel_vorschlag": "…",
  "stapel_id": "…"
}
```

### 3.3 Stapelbericht

`berichte/stapel/<stapel_id>.md` — je Fall eine Zeile: Aktenzeichen, Ergebnis,
Abbruchgrund falls zutreffend.

---

## §4 Abbruchbedingungen

Bei jeder dieser Lagen: **Fall überspringen, Grund im Stapelbericht vermerken,
nächsten Fall beginnen.** Nicht raten, nicht behelfen, nicht nachfragen.

| Nr. | Lage |
|---|---|
| 4.1 | Eingabeparameter unvollständig — ganzen Lauf abbrechen |
| 4.2 | Tragende Norm nicht eindeutig feststellbar |
| 4.3 | Ein Pflichtfeld aus §3.1 nicht befüllbar |
| 4.4 | Entscheid nicht abrufbar oder Volltext leer |
| 4.5 | Aktenzeichen bereits im Repo vorhanden (Dublette) |
| 4.6 | Gegenstand berührt Gewalt, Strafrecht oder akute Gefährdung — Manifest §9, Schutzstufe S5 |
| 4.7 | Der Entscheid nennt Privatpersonen unanonymisiert |

---

## §5 Parallelbetrieb

- Jeder Agent arbeitet auf **eigenem Branch**, benannt nach `stapel_id`.
- Jeder Agent schreibt nur in Pfade nach §3, alle mit `stapel_id` im Namen.
- **Kein Agent schreibt in `wissen/`, `core/` oder `prototypen/`.**
- Kein Agent committet auf `main`. Kein Agent pusht.
- Kollisionen sind damit ausgeschlossen: kein zwei Agenten gemeinsamer Schreibpfad.

Empfohlene Stapelgrösse: 10 bis 20 Aktenzeichen. Grössere Stapel verlängern die
Prüfung, ohne den Durchsatz zu erhöhen.

---

## §6 Serialisierter Zusammenzug

Nach Abschluss aller Stapel, **von einem einzigen Agenten, nacheinander**:

1. Alle `redaktion/vorschlaege/*/*.json` einlesen.
2. Vorschläge zur selben Norm zusammenfassen. Mehrfachnennung ist ein Gütezeichen,
   kein Fehler.
3. Registereinträge anlegen, IDs fortlaufend nach bestehender Konvention.
   Schema `erkenntnis.schema.json` unverändert einhalten.
4. `regel_id: OFFEN:…` in den Stories durch die vergebenen IDs ersetzen.
5. `core/src/register.gen.ts` und `wissen/dist/` regenerieren.
6. Alle Suiten laufen lassen.
7. Bericht schreiben. **Kein Commit ohne menschliche Freigabe.**

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
- Keine Rückfrage an den Menschen während des Laufs; offene Punkte in den Bericht

---

## §8 Kodierlauf 2

Nicht Teil dieser Anweisung. Läuft getrennt über
`npm run kodierung-export` / `kodierung-import` und **muss von einem anderen
Modell** ausgeführt werden als Lauf 1.

Solange Lauf 2 fehlt, tragen die Fälle `kodierung_status: vorschlag` und
zählen in keine Quote. Das ist beabsichtigt.

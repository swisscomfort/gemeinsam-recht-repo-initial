# Vorlage: Nacherzählte Story (Kategorie NACHERZAEHLT_OEFFENTLICH)

**Redaktionskonvention (AUFTRAG-R0 §3):**

- Ablage unter `prototypen/stories/FS-1xx-<kurzname>/` (zwei Dateien:
  `meta.yaml` und `story.md`).
- Nummernkreise: **001–099 = FIKTIV** · **100–199 = NACHERZAEHLT** ·
  **9xx = PLATZHALTER**.
- Nur öffentlich publizierte, **abgeschlossene** Verfahren; Schutzstufe
  höchstens S2; Namen und erkennbare Details ersetzen (Privatpersonen als
  Gegenpartei werden nie erkennbar gezeigt, Invariante 8).
- Das Nacherzählen selbst ist menschliche Redaktionsarbeit — kein LLM
  (AUFTRAG-R0, `llm_nutzung: verboten`). Kandidaten liefert
  `npm run kandidaten` (Listen unter `redaktion/kandidaten/`).
- Der Feed-Lader verweigert jede Abweichung (fehlende/leere Quelle,
  Zukunftsdatum, nicht abgeschlossenes Verfahren, Schutzstufe > S2,
  unbekannte Schlüssel, fehlende Pflichtzeile).

---

## 1. `meta.yaml` — Gerüst (Platzhalter in <…> ersetzen)

```yaml
id: FS-1<XX>
titel: <Titel der Story>
kennzeichnung: NACHERZAEHLT_OEFFENTLICH
rechtsgebiet: <z. B. mietrecht_kuendigung>
schutzstufe: <S1 oder S2>
etappen: <2 oder 3>
missions_status: [<ein Eintrag je Etappe>]
prinzipien: [<prinzip_a>, <prinzip_b>]
emotions_ziel: ["<z. B. Empoerung zu Neugier>"]
autor: <kuerzel>
erstellt: <JJJJ-MM-TT>
quelle: "<Aktenzeichen, z. B. BGer 4A_123/2025>"
gericht: <Gericht, z. B. Bundesgericht>
entscheid_datum: <JJJJ-MM-TT, in der Vergangenheit>
verfahren_abgeschlossen: true
```

## 2. `story.md` — Kopf mit Pflichtzeile

```markdown
# <Titel der Story>

> NACH ECHTEM ENTSCHEID — nacherzählt; Quelle: <Aktenzeichen>. Namen ersetzt.

## Etappe 1 — <Titel>
<Text>

## Etappe 2 — <Titel>
<Text>
```

Die Pflichtzeile muss die Quelle **exakt wie in `meta.yaml`** nennen —
sonst verweigert der Lader die Geschichte. Jede Karte dieser Kategorie
zeigt im Feed sichtbar: „Nach einem echten, öffentlich publizierten
Entscheid · <quelle>".

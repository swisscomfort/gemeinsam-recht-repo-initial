**ÜBERHOLT — ersetzt durch MANIFEST v2.1. Historisch, nicht geltend.**

# AUFTRAG-SI0 — Sichter-Modus im Prototyp (privat, offline)

```yaml
auftrag: SI0
plan_referenz: "DER_PLAN_v1.1_FROZEN.md §4 Stiller Parallelbau (CR-001 inkl. F1); Norm v0.6 §11; Invarianten 2, 6, 11, 12"
voraussetzung: "F0/F1 gebaut; ideal nach K0 (Stimmen) und A0 (Anfragen)"
charakter: "privater Offline-Prototyp; ausschliesslich synthetische Uebungsfaelle; nichts wird veroeffentlicht; keine echten Konten oder Rollen"
netz: verboten · llm_nutzung: verboten · neue_laufzeit_deps: keine
```

## 1. Lieferumfang
- **Eingangskorb „Zur Sichtung":** Neue synthetische Stimmen (K0) und
  Anfrage-Etappen (A0) erscheinen zuerst hier statt direkt im Feed.
- **Sichtungs-Oberflaeche:** Checkliste exakt nach Norm §11 (fuenf Punkte,
  je ja/nein plus Pflicht-Grund bei Beanstandung); Entscheidungen nur
  freigeben-vorschlagen · zurueck mit Grund · eskalieren. Kein Editieren.
- **Vier-Augen erzwungen:** Ein Freigabe-Vorschlag braucht zwei unabhaengige
  Sichtungen (im Lauf-Modus zwei simulierte Personen); erst dann erscheint
  der Inhalt — im Prototyp automatisch als „redaktionell freigeschaltet"
  markiert. Patt (1x freigeben, 1x zurueck) gilt als eskaliert.
- **Befangen-Knopf** („befangen — weitergeben", ohne Begruendungszwang) und
  **vertraulicher Meldeknopf** (Meldungen nur in der Werkbank sichtbar).
- **Rollen-Simulation in der Werkbank:** Umschalten Leser · Melder · Sichter ·
  Fach-Pate (Fach-Pate kann zusaetzlich Klasse GEPRUEFTER HINWEIS setzen).
  Status/Punkte existieren nur fluechtig im Lauf — keine Konten, nichts
  Persistentes.
- **Uebungsfaelle:** `prototypen/sichtung/SF-001…SF-006/` (FIKTIV) — je einer
  verletzt genau einen Checklisten-Punkt (a–e), einer ist sauber. Erwartete
  Sichtungs-Ergebnisse liegen als expected.json bei.
- **F1-Lauf-Erweiterung:** Nach jeder Uebungs-Sichtung die Selbstauskunft
  „Konnte ich sicher entscheiden?" (ja | unsicher bei Punkt a–e) — Messung
  der Laientauglichkeit der Checkliste. Log-Schema bleibt strukturell frei
  von Zeit- und Engagement-Feldern (bestehender Waechter gilt).

## 2. Nicht Bestandteil
Echte Konten, Rollenvergabe oder Reputation · Oeffentlichkeit · echte Faelle ·
automatische Freigaben · Benachrichtigungen · Aenderungen an core/, webflow/,
wissen/ oder an bereits abgenommenen Prototyp-Funktionen.

## 3. Tests
Checkliste vollstaendig und Pflicht-Grund erzwungen · Vier-Augen nicht
umgehbar (auch nicht durch dieselbe simulierte Person) · Patt fuehrt zu
eskaliert · Befangen leitet weiter, ohne zu werten · Meldungen erscheinen
nie im Feed · Uebungsfaelle SF-001…006 liefern die erwarteten Ergebnisse ·
Log-Schema zeitfrei · bestehende Suiten unveraendert gruen.

## 4. Bericht & Abnahme
`berichte/AUFTRAG-SI0-ABSCHLUSS.md` (deutsch, kurz).
cd prototypen/feed && npm test && npm run build   # gruen
Kein Commit/Push ohne Freigabe (CLAUDE.md).

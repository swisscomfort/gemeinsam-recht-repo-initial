**ÜBERHOLT — ersetzt durch MANIFEST v2.1. Historisch, nicht geltend.**

# AUFTRAG-K0 — Leserstimmen-Prototyp (privat, offline)

```yaml
auftrag: K0
plan_referenz: "DER_PLAN_v1.1_FROZEN.md §4 Stiller Parallelbau (CR-001 inkl. F1); Norm v0.6 §10; Invarianten 2, 6, 11, 12"
voraussetzung: "F0/F1 gebaut; ergaenzt Feed und (falls vorhanden) Anfragen-Ansicht"
charakter: "privater Offline-Prototyp; ausschliesslich synthetische (FIKTIV) Stimmen; nichts wird veroeffentlicht"
netz: verboten · llm_nutzung: verboten · neue_laufzeit_deps: keine
```

## 1. Lieferumfang
- **Stimmen-Dateien:** `prototypen/stimmen/ST-###/meta.yaml` mit Pflicht-
  feldern `id`, `kennzeichnung: FIKTIV`, `bezug` (Story- oder Anfrage-ID),
  `klasse` (leserstimme | geprüfter_hinweis), `text` (max. 600 Zeichen),
  `reaktionen` ({geholfen, gleiche_erfahrung, guter_punkt} als Zahlen),
  `erstellt`. Strenger Parser wie ueberall (unbekannte Schluessel, fehlendes
  FIKTIV, Bezug auf nicht existierende/verweigerte Inhalte => Verweigerung).
- **Anzeige unter Geschichten und Anfragen:** Klassen-Rahmen gemaess Norm
  §10; Sortierung hilfreichste zuerst, Zweitkriterium aelteste; die drei
  Reaktions-Verben als Knoepfe (Lauf-Modus: je simulierter Person einmal);
  keinerlei Ablehnungs-Knoepfe, Aufruf- oder Ansichtszahlen.
- **Prompts je Rubrik** exakt nach Norm §10 ueber dem Eingabefeld
  (Eingabe nur im Lauf-Modus; erzeugte Stimmen sind fluechtig und lokal).
- **Stimme des Tages:** Werkbank-Funktion „als Stimme des Tages markieren";
  die markierte Stimme erscheint als eigene Karte in der naechsten
  Morgenausgabe (vor „Fertig fuer heute").
- **F1-Lauf-Erweiterung:** neue Ziel-Emotion „nicht allein" erfassbar;
  Log-Schema bleibt strukturell frei von Zeit-/Engagement-Feldern
  (bestehender Waechter deckt Stimmen-Logs mit ab).
- **Sechs synthetische Beispiel-Stimmen** (ST-001…ST-006, FIKTIV) zu FS-001,
  davon eine als geprüfter_hinweis, eine mit wuerdigem Humor.

## 2. Nicht Bestandteil
Oeffentliche Eingaben · Moderations-Backoffice (Phase S) · Antworten-auf-
Antworten/Threads · Benachrichtigungen · Reputation · Aenderungen an core/,
webflow/, wissen/.

## 3. Tests
Parser-Verweigerungen einzeln · Sortierung deterministisch · Verben zaehlen
korrekt und nur einmal je simulierter Person · Stimme-des-Tages-Karte
erscheint genau einmal und vor „Fertig fuer heute" · Log-Schema zeitfrei ·
bestehende Suiten unveraendert gruen.

## 4. Bericht & Abnahme
`berichte/AUFTRAG-K0-ABSCHLUSS.md` (deutsch, kurz).
cd prototypen/feed && npm test && npm run build   # gruen
Kein Commit/Push ohne Freigabe (CLAUDE.md).

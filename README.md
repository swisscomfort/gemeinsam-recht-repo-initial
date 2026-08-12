# Gemeinsam Recht — Arbeitsplatz

Dieses Repository ist der einzige gemeinsame Arbeitsplatz des Projekts (ADR-0003).

**Leseordnung für Menschen und KIs:**
1. `SESSION_KOPF.txt` — Bindungsregeln für jede KI-Session
2. `MANIFEST-v2.1.md` — bindende Fassung (allein massgeblich). `DER_PLAN_v1.1_FROZEN.md` ist historische Vorstufe, nicht mehr geltend.
3. `STATUS.md` — aktueller Stand und nächster Schritt

**Für Außenstehende und Projektübergaben:** `PROJEKTUEBERBLICK-STAND-2026-08-12.md` erklärt ohne Programmierdetails, was Gemeinsam Recht baut, welchen Nutzen zukünftige Rechtstreiter davon haben sollen, wie sich das Projekt entwickelt hat, welchen Stand ML-001 bis ML-003 erreicht haben und welche Reststrecke bis zur ersten belastbaren öffentlichen Normquote und zum späteren Gesamtprodukt verbleibt. Das Dokument ist eine verständliche Zusammenfassung und ersetzt keine bindende Projektregel.

**Freeze:** Der Plan ist unveränderlich (SHA-256 in `FREEZE.txt`). Änderungen nur als
Change-Request gemäss Plan §7 — per Pull Request mit Präfix `CR-`, entschieden
ausschliesslich durch den Projektinhaber. CODEOWNERS erzwingt seine Review.

**Neuer KI-Chat:** Inhalt von `SESSION_KOPF.txt` einfügen, `MANIFEST-v2.1.md`
anhängen, Aufgabe nennen. Bau-Sessions: Claude Code liest `CLAUDE.md` automatisch.

**Historie:** Die Prototyp-Repos `gemeinsam-recht-case-system` (main/march) sind
archiviert; ihr Code ist nicht Teil dieses Projekts (siehe ADR-0003).

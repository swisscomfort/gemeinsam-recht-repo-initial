# Gemeinsam Recht — Arbeitsplatz

Dieses Repository ist der einzige gemeinsame Arbeitsplatz des Projekts (ADR-0003).

**Leseordnung für Menschen und KIs:**
1. `SESSION_KOPF.txt` — Bindungsregeln für jede KI-Session
2. `DER_PLAN_v1.0_FROZEN.md` — der komplette, eingefrorene Plan (allein massgeblich)
3. `STATUS.md` — aktueller Stand und nächster Schritt

**Freeze:** Der Plan ist unveränderlich (SHA-256 in `FREEZE.txt`). Änderungen nur als
Change-Request gemäss Plan §7 — per Pull Request mit Präfix `CR-`, entschieden
ausschliesslich durch den Projektinhaber. CODEOWNERS erzwingt seine Review.

**Neuer KI-Chat:** Inhalt von `SESSION_KOPF.txt` einfügen, `DER_PLAN_v1.0_FROZEN.md`
anhängen, Aufgabe nennen. Bau-Sessions: Claude Code liest `CLAUDE.md` automatisch.

**Historie:** Die Prototyp-Repos `gemeinsam-recht-case-system` (main/march) sind
archiviert; ihr Code ist nicht Teil dieses Projekts (siehe ADR-0003).

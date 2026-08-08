# Gemeinsam Recht — Arbeitsplatz

Dieses Repository ist der einzige gemeinsame Arbeitsplatz des Projekts (ADR-0003).

**Leseordnung für Menschen und KIs:**
1. `SESSION_KOPF.txt` — Bindungsregeln für jede KI-Session
2. `MANIFEST-v2.1.md` — bindende Fassung (allein massgeblich). `DER_PLAN_v1.1_FROZEN.md` ist historische Vorstufe, nicht mehr geltend.
3. `STATUS.md` — aktueller Stand und nächster Schritt

**Freeze:** Der Plan ist unveränderlich (SHA-256 in `FREEZE.txt`). Änderungen nur als
Change-Request gemäss Plan §7 — per Pull Request mit Präfix `CR-`, entschieden
ausschliesslich durch den Projektinhaber. CODEOWNERS erzwingt seine Review.

**Neuer KI-Chat:** Inhalt von `SESSION_KOPF.txt` einfügen, `MANIFEST-v2.1.md`
anhängen, Aufgabe nennen. Bau-Sessions: Claude Code liest `CLAUDE.md` automatisch.

**Historie:** Die Prototyp-Repos `gemeinsam-recht-case-system` (main/march) sind
archiviert; ihr Code ist nicht Teil dieses Projekts (siehe ADR-0003).

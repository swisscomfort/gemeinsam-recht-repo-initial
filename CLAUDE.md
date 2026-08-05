# CLAUDE.md — Arbeitsregeln für Claude Code in diesem Repository

## Leseordnung bei Sessionstart (Pflicht, vor jeder Aufgabe)
1. `SESSION_KOPF.txt` — Bindungsklausel, gilt vollumfänglich auch für dich.
2. `DER_PLAN_v1.1_FROZEN.md` — allein massgeblicher Plan. `sha256sum` bilden und mit `FREEZE.txt` abgleichen; bei Abweichung: stoppen und melden.
3. `docs/LEGAL_AI_OPERATING_RULES.md` — bindend.
4. `STATUS.md` — aktueller Stand.
5. Den beauftragten Auftrag unter `auftraege/` — nur dieser definiert deinen Arbeitsumfang.

## Nicht verhandelbare Regeln
- Du änderst `DER_PLAN_v1.1_FROZEN.md`, `FREEZE.txt` und `SESSION_KOPF.txt` niemals. Abweichungswünsche nur als Change-Request-Vorschlag (Plan §7), nie als Edit.
- Du arbeitest ausschliesslich im Umfang des beauftragten Auftrags. Keine Nebenänderungen, keine Scope-Erweiterung, keine „Verbesserungen" ausserhalb des Auftrags.
- Fristen, Beträge und Rechtsfolgen entstehen nur in deterministischem Code mit Tests. Kein LLM-Aufruf in der Fachbibliothek.
- Jeder Rechtsparameter trägt Quelle, Zeitstand, Regelversion und Prüfstand. Bist du dir bei einem Rechtsparameter unsicher: **fragen, nicht raten** — Parameter als `pruefstand: "fachlich_zu_verifizieren"` anlegen und den Nutzer explizit darauf hinweisen.
- Synthetische Testfälle nur unter `core/tests/fixtures/` mit `meta.fixture=true` und Präfix `FX-`. Niemals als reale Fälle darstellen (Plan §2, Invariante 2).
- Keine neuen Laufzeit-Abhängigkeiten ohne ausdrückliche Freigabe. Dev-Abhängigkeiten nur die im Auftrag genannten.
- Kein Netzwerkzugriff aus Code oder Tests. Keine `Date.now()`-Aufrufe in der Fachlogik — Zeit wird injiziert.
- Git: kleine, thematische Commits mit klaren Botschaften. Kein Push ohne ausdrückliche Freigabe des Nutzers. Vor Abschluss `git status --short` zeigen.
- Nach jeder Arbeitseinheit: Tests ausführen und Ergebnis zeigen (`cd core && npm test`).

## Definition von „fertig" für einen Auftrag
Alle Abnahme-Kommandos des Auftrags laufen grün, die Auftrags-Checkliste ist vollständig, `STATUS.md` ist aktualisiert (nur die dafür vorgesehenen Checkboxen), und du hast eine kurze Zusammenfassung mit `git status --short` geliefert. Freigabe für Commit/Push erteilt der Mensch.

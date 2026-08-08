# STATUS — Gemeinsam Recht

**Stand:** 2026-08-05 · **Phase:** M0 — abgeschlossen, sobald dieses Repo angelegt und geschützt ist

## Kanon
- **DER_PLAN_v1.1_FROZEN.md** (Wurzel) — allein massgeblich; Hash in FREEZE.txt
- SESSION_KOPF.txt · docs/LEGAL_AI_OPERATING_RULES.md · docs/DECISIONS/ (ADR-0002 Startfall, ADR-0003 Zielrepo; ADR-0001 abgelöst) · docs/archiv/

## Checkliste
- [x] Plan v1.0 eingefroren (SHA-256 in FREEZE.txt)
- [x] Neues Zielrepo beschlossen (ADR-0003)
- [ ] Repo angelegt und Erstinhalt gepusht (Mensch/Agent)
- [ ] Branch-Protection für main aktiv (PR-Pflicht, keine Direktpushes)
- [ ] Alt-Repos gemeinsam-recht-case-system (main/march) archiviert
- [x] §4 Schritt 1 gestartet: `claude "Lies CLAUDE.md und führe auftraege/AUFTRAG-S1-FRISTENRECHNER.md vollständig aus."`
- [x] §4 Schritt 2 (S2) technisch umgesetzt: Einschätzung/Brief/Chronologie/Webflow (berichte/AUFTRAG-S2-ABSCHLUSS.md) — fachliche Prüfung und Pilotfälle offen
- [x] CR-001 Parallelbau: Feed-Prototyp F0 (privat, offline) technisch umgesetzt (berichte/AUFTRAG-F0-ABSCHLUSS.md) — interne Durchläufe (Ziel ≥100) offen
- [x] CR-001 Parallelbau: Leser-Journey F1 (privat, offline) technisch umgesetzt (berichte/AUFTRAG-F1-ABSCHLUSS.md) — vollständige Journey-Durchläufe (Ziel ≥100) offen
- [x] §6 L1: Wissens-Register W0 (privat) technisch umgesetzt inkl. Ergänzungen E1–E3 Fehler-Rückkanal (berichte/AUFTRAG-W0-ABSCHLUSS.md) — fachliche Verifikation der Register-Einträge und Entscheid über Veröffentlichung/Repo-Split offen
- [x] CR-001 Parallelbau: Redaktion R0 (privat) technisch umgesetzt — Feed-Kategorie NACHERZAEHLT_OEFFENTLICH + Beschaffungswerkzeug redaktion/ (entscheidsuche.ch, nur Metadaten/Links) + Vorlage (berichte/AUFTRAG-R0-ABSCHLUSS.md) — Nacherzählen selbst ist menschliche Redaktionsarbeit, noch keine FS-1xx-Story angelegt
- [x] CR-001 Parallelbau: Redaktion R1 v2 (privat) umgesetzt — Trichter Sieb (npm run sieben, 1000→983/6/11) → Mappe 2026-08-07 (TOP 9, 27 verworfen) → Entwürfe FS-101–103 mit Parser-Formatgarantie (berichte/AUFTRAG-R1-ABSCHLUSS.md); FS-101–103 am 2026-08-07 freigegeben und in den Feed übernommen
- [x] CR-001 Parallelbau: R1-Folgeauftrag umgesetzt — Entwürfe FS-104–109 (TOP 4–9 der Mappe) nach Norm §4 mit Parser-Formatgarantie (berichte/AUFTRAG-R1-ABSCHLUSS.md §7) — Übernahme in den Feed erst nach schriftlicher Freigabe («FS-1xx freigegeben»); Rechtskraft-Verifikation der Quellen offen (FS-106/108 erstinstanzlich)
- [x] FS-104/105/107/109 am 2026-08-08 freigegeben und per git mv in den Feed übernommen (berichte/AUFTRAG-R1-ABSCHLUSS.md §8); FS-106/108 bleiben Entwurf (erstinstanzlich, parkiert)

## Regel
Keine neuen Plandokumente, keine Review-Runden über Papier.
Nächste Projektleistung ist ausführbarer Code gemäss Plan §4 Schritt 1.

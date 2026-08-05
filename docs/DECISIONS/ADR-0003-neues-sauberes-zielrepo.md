# ADR-0003 — Neues, sauberes Zielrepository (löst ADR-0001 ab)

**Status:** akzeptiert · 2026-08-05 · supersedes ADR-0001

## Kontext
ADR-0001 bestimmte das bestehende `gemeinsam-recht-case-system` als Zielrepo. Der Projektinhaber hat dies gestoppt: Das Repo ist nicht sauber und nicht aktuell. Der technische Audit bestätigt das — der Prototyp-Code verletzt Invariante 1 des eingefrorenen Plans (Beweis-Payloads auf öffentlichem IPFS, unverschlüsselte Dateischlüssel in der Datenbank). Alt-Code, der dem Kanon widerspricht, wäre Fehlkontext für jede künftige KI-Session und begünstigt genau die Neuinterpretation, die der Freeze verhindern soll.

## Entscheidung
Das Projekt erhält ein **neues, leeres, privates Repository** (Arbeitsname: `gemeinsam-recht`; der Projektinhaber kann den Namen beim Anlegen final festlegen). Erst-Commit ist ausschliesslich der kanonische Stand: Plan (FROZEN, hash-verankert), Governance, ADRs, Schema, Fixture-Regeln, CLAUDE.md, Auftrag S1.

Die alten Repos `gemeinsam-recht-case-system` (main und march) werden auf GitHub **archiviert** (read-only). Ihre verwertbaren Erkenntnisse (Datenmodell-Ideen, Client-Crypto-Ansatz, Audit-Befunde) sind bereits in Plan, Schema und Auftrag eingeflossen; Code wird nicht übernommen.

## Konsequenzen
- Es existiert weiterhin genau ein Zielrepo und keine zweite Zielarchitektur; nur der Ort ist neu.
- Der eingefrorene Plan bleibt byte-identisch (Hash unverändert in FREEZE.txt); diese Änderung betrifft ausschliesslich die Repo-Wahl und ist ADR-konform abgelöst, nicht umgeschrieben.
- Der Beweis-Layer (Phase B) wird im neuen Repo neu und plankonform gebaut statt refactored.

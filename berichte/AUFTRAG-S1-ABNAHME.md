# Abnahme AUFTRAG-S1 — Fristenrechner (Plan §4 Schritt 1)

Datum: 2026-08-05 · Regelversion 0.1.0 · Quellenstand 2026-08-05
Commits: 4b1f899, 431be95, 83560d3 (origin/main)

## Technische Abnahme: BESTANDEN
- 20/20 Fixtures (7 Frist-Grenzfälle, 6 Lücken/Widersprüche), 94 Tests grün
- Determinismus: Doppellauf byte-identisch · kein Date.now, kein Netz, keine Laufzeit-Deps
- Jede Aussage mit Quelle/Zeitstand/Regelversion · DTM-Trace maschinenlesbar

## Angenommene Auslegungen (Claude-Chat, 2026-08-05)
1. FX-019: Frist mitberechnet, Flag + Trace-Vorbehalt markieren sie als Nicht-Aussage
2. `heute` je Fixture im expected-Wrapper (Schema verbietet Zusatzfelder korrekt)
3. `verfahren_haengig=true` → `sperrfrist_271a_moeglich` (fachlich zu bestätigen)

## Offen für die fachliche Verifikation (Mensch, vor M1-Gesamtabnahme)
P1–P8 (insb. P4 Zustellfiktion bei privater Kündigung), FEIERTAGE_LU
(Berchtoldstag/Josefstag), Q_BEFRISTET. Prüfinstanz: offene Entscheidung Nr. 5.

## Beweisanker Sitzungsprotokoll (lokal: terminalausgabeclaudecli/)
2026-08-05_8829e872….jsonl
SHA-256: b4a65af2c54cd3bc233324bae7a54ef746afbe419fd55a7371dda89411dc7eff

Technische Abnahme erteilt durch Projektinhaber am: ____________

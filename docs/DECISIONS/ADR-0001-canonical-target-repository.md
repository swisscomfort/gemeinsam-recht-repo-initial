# ADR-0001 — Kanonisches Zielrepository

**Status:** abgelöst durch ADR-0003 · ursprünglich akzeptiert 2026-08-05

## Kontext
Im Portfolio existieren mehrere parallele Rechts- und Rechtsnahe-Repos (u. a. anspruchsradar-schweiz, sozialamt, Existenzminimum, MietPass-Varianten, gemeinsam-recht-case-system march/main). Parallele Weiterentwicklung erzeugt Doppelspurigkeit und widersprüchliche Stände.

## Entscheidung
`gemeinsam-recht-case-system` (main) ist das einzige Zielrepository des Projekts. Alle anderen Repos erhalten in der Konsolidierungs-Map (Blaupause v1.1, Abschnitt 6) genau eine Aktion: keep, merge, reference, freeze oder close.

## Verworfene Alternative
Ein neues, leeres Repo. Verworfen, weil Case-/Evidence-/Participants-Schema und Client-Crypto-Ansatz im bestehenden Repo als Refactor-Basis dienen und die Historie erhalten bleiben soll.

## Konsequenzen
- Es existiert keine zweite Zielarchitektur; Dokumente ausserhalb des Zielrepos sind nicht kanonisch.
- Der Beweis-Layer-Refactor (Blaupause L3) findet in diesem Repo statt.
- Eingefrorene Repos werden nur noch referenziert, nie weiterentwickelt.

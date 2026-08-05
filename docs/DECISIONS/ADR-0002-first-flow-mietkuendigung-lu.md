# ADR-0002 — Erster Flow: Mietkündigung Kanton Luzern

**Status:** akzeptiert · 2026-08-05

## Kontext
Die Blaupause v1.0 nannte als Startvertikale "Mietrecht + Sozialhilfe-Schnittstelle". Das erzeugt bereits im ersten Monat zwei Behördenwege, zwei Quellengebiete und zwei fachliche Verantwortlichkeiten.

## Entscheidung
Startfall ist ausschliesslich: **Anfechtung oder Prüfung einer Wohnungskündigung im Kanton Luzern.**
Sozialhilfe ist Datenquelle und spätere Anschlussvertikale, nicht Bestandteil von M1.

## Begründung
- Bundesrecht mit harter, deterministischer Frist (Anfechtung innert 30 Tagen, Art. 273 OR) und klaren Formvorschriften (amtliches Formular Art. 266l OR; Nichtigkeit Art. 266o OR; separate Zustellung bei Familienwohnung Art. 266n OR; Sperrfristen/Missbrauch Art. 271a OR).
- Kostenlose, laientaugliche Schlichtung als natürlicher Eskalationspfad.
- Kanton Luzern: vorhandene eigene Datenbasis (sozialamt, anspruchsradar) und ein einziger Behördenweg für M1.
- Hohe Alltagsrelevanz und gute Testbarkeit der deterministischen Punkte (Formfehler, Fristen, Zustellung).

## Konsequenzen
- M1-Fragebaum enthält die Pflicht-Sonderfälle: amtliches Formular/Unterschrift, Familienwohnung/separate Zustellung, Sperrfristen/Rachekündigung, Zustellzeitpunkt inkl. Einschreiben/Abholfrist.
- Erweiterung erst nach M1-Abnahme; weitere Kantone vor weiteren Rechtsgebieten.

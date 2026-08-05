# Test-Fixtures — Regeln

**Grundsatz (Invariante 2, Blaupause v1.1):** Keine erfundenen Fälle als öffentliche Inhalte, Erfolgsnachweise, Nutzerberichte oder Validierungsdaten. Synthetische Test-Fixtures sind zulässig, wenn sie eindeutig gekennzeichnet sind und niemals als reale Fälle ausgegeben werden.

## Kennzeichnungspflicht
- Dateiname mit Präfix `FX-` (z. B. `FX-011-frist-grenzfall-abholfrist.json`).
- Im Fallobjekt zwingend `meta.fixture = true` (Schema erzwingt das Feld).
- Fixtures erscheinen nie in Feed, Stories, Statistiken, Demos für Dritte oder Marketing.

## Struktur je Fixture
```
tests/fixtures/FX-###-kurzname/
  case.json        # Fallobjekt gemäss schemas/case-object.schema.json
  expected.json    # erwartete Ergebnisse: Fristen, Flags, Ampel, Pflichthinweise
  notes.md         # Zweck des Falls, geprüfte Regel(n), Quelle(n)
```

## Mindestbestand für M1 (Definition of Done)
- mindestens 20 versionierte Fixtures, davon
  - mindestens 5 Frist-Grenzfälle (u. a. Zustellfiktion/Abholfrist, Fristende an Wochenende/Feiertag, Empfang vs. Versand),
  - mindestens 5 Fälle mit fehlenden oder widersprüchlichen Angaben (erwartetes Ergebnis: keine Einschätzung, benannte Lücke),
  - Nichtigkeits- und Anfechtungsfälle: fehlendes amtliches Formular, fehlende separate Zustellung bei Familienwohnung, Sperrfrist/Rachekündigung.
- 100 % deterministische Reproduzierbarkeit: gleicher Input + gleiche Regelversion ⇒ identischer Output.

## Echte Pilotfälle (getrennt!)
- Ablage unter `tests/pilots/`, niemals unter `fixtures/`.
- Nur mit dokumentierter Einwilligung (`meta.einwilligung_pilot = true`), datensparsam erfasst, jederzeit löschbar.
- Mindestens 3 echte Pilotfälle für die M1-Abnahme.

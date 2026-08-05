# Fixtures FX-001…FX-020 — synthetische Testfälle (AUFTRAG-S1 §5)

**Alle Fälle in diesem Verzeichnis sind synthetisch** (`meta.fixture=true`,
Präfix `FX-`). Sie dürfen niemals als reale Fälle, Erfolgsnachweise,
Nutzerberichte oder Validierungsdaten dargestellt werden (Plan §2,
Invariante 2; `tests/fixtures/README.md` im Repo-Wurzelverzeichnis).

## Struktur je Fixture

```
FX-###-kurzname/
  case.json        # Fallobjekt gemäss schemas/case-object.schema.json
  expected.json    # { heute, ergebnis } — ergebnis = vollständiges erwartetes
                   # Ergebnis von bewerteFall OHNE trace.zeitpunkt (dieser wird
                   # deterministisch aus dem injizierten heute gesetzt und im
                   # Test separat geprüft)
  notes.md         # Zweck, Kategorie, geprüfte Parameter (P-Nummern), heute
```

`heute` steht in `expected.json`, weil das Fallobjekt-Schema
(`additionalProperties: false`) kein Zusatzfeld erlaubt und die Zeit gemäss
Auftrag injiziert wird.

## Kategorien

- **H** Happy/Regelfall: FX-001
- **G** Frist-Grenzfälle (≥5): FX-006, FX-007, FX-008, FX-009, FX-010, FX-011, FX-020
- **L** Lücke/Widerspruch (≥5, erwartete Ausgabe „keine Einschätzung, Lücke benannt"): FX-012, FX-013, FX-014, FX-015, FX-016, FX-017
- **N** Nichtigkeit/Flags: FX-002, FX-003, FX-004, FX-005, FX-018, FX-019

## Schema-Hinweis

FX-012, FX-013 und FX-014 verletzen das JSON-Schema **absichtlich** (fehlendes
Pflichtfeld bzw. Schema-Pflicht bei Familienwohnung) — genau das ist ihre
Lücken-Konstellation. `schema.test.ts` prüft für diese drei, dass die
Validierung an der erwarteten Stelle fehlschlägt; alle übrigen 17 müssen
gültig sein. Die Engine (`bewerteFall`) prüft entscheidende Angaben selbst
und antwortet mit `status: "LUECKE"`.

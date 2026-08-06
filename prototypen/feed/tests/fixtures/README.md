# Test-Fixtures für den Feed-Prototyp (AUFTRAG-F0)

Synthetische Test-Stories für Negativfälle der Story-Validierung.
Analog zur Fixture-Regel in CLAUDE.md gilt (Invariante 2):

- Präfix `FX-` im Verzeichnisnamen und in der `id`
- `fixture: true` in `meta.yaml` (Äquivalent zu `meta.fixture=true`)
- Diese Geschichten sind erfunden, dienen ausschliesslich Tests und werden
  vom Feed-Lader IMMER verweigert (`fixture` ist ein Verweigerungsgrund).
- Sie werden niemals als reale Fälle, Erfolgsnachweise oder
  Validierungsdaten dargestellt.
- Die `FX-NACHERZAEHLT-*`-Fixtures (AUFTRAG-R0) testen die Kategorie
  `NACHERZAEHLT_OEFFENTLICH`; ihr Aktenzeichen "BGer 4A_999/2025" ist
  ERFUNDEN und bezeichnet keinen echten Entscheid — es dient nur den Tests.

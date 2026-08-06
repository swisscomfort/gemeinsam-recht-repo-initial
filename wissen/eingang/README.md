# Eingangskorb (wissen/eingang/)

Hier landen **Kandidaten** und **Fehlermeldungen** nach
`wissen/schema/kandidat.schema.json` — nie direkt Register-Eintraege.

Regeln (AUFTRAG-W0 Teil C, Ergaenzung E1):

- Zwei Typen: `status: kandidat` (Erkenntnis-Vorschlag, Pflichtfeld
  `begruendung`) und `status: fehlermeldung` (Rueckkanal „diese Regel scheint
  falsch", Pflichtfelder `regel_id` und `begruendung`).
- **Keine Falldaten.** Keine Namen, Adressen oder Datumsangaben eines
  konkreten Falls — weder als Felder (Schema weist unbekannte Felder ab)
  noch in Freitexten (Datumsmuster werden strukturell abgewiesen). Als
  Herkunftsbezug sind nur `fall_anker` (SHA-256-Hash, nie Inhalt) oder
  `entscheid_quelle` (Aktenzeichen) erlaubt.
- Die Uebernahme Eingang → Register geschieht **ausschliesslich durch
  Menschen** (Review-Gate, LEGAL_AI_OPERATING_RULES §2.1). Das Werkzeug
  `wissen/tools/uebernehmen.ts` prueft nur das Schema, vergibt die id und
  traegt den Review-Vermerk ein — es entscheidet nichts.
- Fehlermeldungen werden **nie** ins Register uebernommen; sie sind Anlass
  fuer eine menschliche Pruefung der genannten Regel.

Synthetische Beispiel-Eintraege gehoeren nicht hierher, sondern als
Inline-Objekte in die Tests (`wissen/tests/`).

**ÜBERHOLT — ersetzt durch MANIFEST v2.1. Historisch, nicht geltend.**

# AUFTRAG-W0 — Wissens-Register & Destillat-Pipeline (privates Fundament)

```yaml
auftrag: W0
plan_referenz: "DER_PLAN_v1.1_FROZEN.md §6 L1 Wissens-Layer; Invarianten 1, 3, 11; anspruchsradar-Methodik"
basis: "core/ aus S1/S2 — Rechtswerte werden migriert, NIE inhaltlich veraendert"
charakter: "privater Ausbau des in S1 begonnenen Quellenregisters; KEINE Veroeffentlichung (separater Entscheid nach fachlicher Verifikation)"
llm_nutzung: verboten
neue_laufzeit_deps: keine
```

## 0. Ziel in einem Satz
Das Wissen des Projekts (Regeln, Quellen, spaeter Quoten) wird zu einem
eigenstaendigen, versionierten, maschinenlesbaren Register ausgebaut — der
Fall selbst bleibt lokal, nur sein Destillat kann kuratiert einfliessen.

## 1. Lieferumfang

**A. Schema** — `wissen/schema/erkenntnis.schema.json` (JSON Schema draft-07):
Pflichtfelder `id` (Muster R-<KANTON|CH>-####), `regel` (ein Satz), `wenn`
(Strukturbedingungen), `dann` (Flag-/Folgen-Liste), `quellen` (nie leer),
`zeitstand`, `regelversion`, `pruefstand` (enum: technisch_validiert |
fachlich_zu_verifizieren | fachlich_verifiziert), `herkunft` (enum: gesetz |
entscheid | auftrag | fall_destillat | redaktion), optional `fall_anker`
(genau 64 Hex-Zeichen, nur Hash, nie Inhalt), optional `entscheid_quelle`
(Aktenzeichen). Unbekannte Felder sind ungueltig (additionalProperties false).

**B. Migration aus S1** — deterministisches Skript `wissen/tools/migrate.ts`
erzeugt aus den bestehenden Parametern P1–P8 und den Regel-Flags aus core/
die ersten Register-Eintraege unter `wissen/register/*.json` (herkunft:
auftrag, pruefstand unveraendert uebernehmen). Danach liest core/ Quellen und
Regel-Metadaten aus dem Register (eine Quelle der Wahrheit) — ohne jede
Verhaltensaenderung: alle bestehenden Tests (core 136+, feed 28+) bleiben gruen.

**C. Eingangskorb fuer Destillate** — `wissen/eingang/` mit eigenem Schema
`kandidat.schema.json`: wie Erkenntnis, aber `status: kandidat`, Pflichtfeld
`begruendung`, verboten: jegliche Freitext-Falldaten, Namen, Adressen,
Datumsangaben eines konkreten Falls; erlaubt als Herkunftsbezug nur
`fall_anker` (Hash) oder `entscheid_quelle`. Uebernahme Eingang → Register
geschieht ausschliesslich durch Menschen (Review-Gate); ein Werkzeug
`wissen/tools/uebernehmen.ts` prueft Schema + vergibt id + traegt
Review-Vermerk (wer/wann als freie Angabe) ein, entscheidet aber nichts.

**D. Quoten-Fundament** — `wissen/schema/quote.schema.json` + leeres
`wissen/quoten/quoten.json`: je Eintrag `vorgehen` (z. B. brief_m2),
`wenn`-Kontext, `n`, `positiv`, `zeitstand`; Konstante MINDESTFALLZAHL=10.
Ein Werkzeug `wissen/tools/quoten-sicht.ts` erzeugt die Anzeige-Sicht und
blendet alles unter der Mindestfallzahl als "noch zu wenige Faelle" aus.
Keine echten Daten in W0.

**E. Oeffentliche Sicht (nur lokal gebaut)** — `wissen/tools/build-dist.ts`
erzeugt `wissen/dist/` nach dem OSM-CH-Muster: `index.json` (version,
zeitstand, anzahl, signatur: null als Platzhalter) + gebuendelte, nach
pruefstand gefilterte Sichten (`alle.json`, `verifiziert.json`). Kein Deploy,
kein Upload — Veroeffentlichung ist ein separater menschlicher Entscheid.

**F. Tests** — Schema-Validierung aller Register- und Eingangs-Dateien ·
Register↔core-Konsistenz (kein Rechtswert doppelt/abweichend) · kein Eintrag
ohne quellen/zeitstand/pruefstand · fall_anker-Format · Eingangskorb weist
Eintraege mit Falldaten-Feldern ab · dist-Build deterministisch.

**G. Bericht** — `berichte/AUFTRAG-W0-ABSCHLUSS.md` (deutsch, kurz):
Was gebaut, Auslegungen, Testuebersicht, Git-Stand, offene menschliche Punkte
(fachliche Verifikation; Entscheid ueber Veroeffentlichung/Repo-Split).

## 2. Nicht Bestandteil
Hosting/Deploy/Oeffentlich-Schaltung · echte Quoten oder echte Destillate ·
inhaltliche Aenderung irgendeines Rechtswerts · Signatur-Implementierung ·
UI · Aenderungen an webflow/ oder prototypen/.

## 3. Abnahme-Kommandos
cd core && npm test                    # unveraendert gruen
cd wissen && npm test                  # neue Suite gruen (oder im core-Workspace)
Kein Commit/Push ohne Freigabe (CLAUDE.md).

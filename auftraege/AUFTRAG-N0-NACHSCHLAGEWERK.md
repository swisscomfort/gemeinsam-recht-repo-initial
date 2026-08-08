**ÜBERHOLT — ersetzt durch MANIFEST v2.1. Historisch, nicht geltend.**

# AUFTRAG-N0 — Nachschlagewerk: Situationsseiten (privat, offline)

```yaml
auftrag: N0
plan_referenz: "DER_PLAN_v1.1_FROZEN.md §6 L1 (Wissen zentral und oeffentlich), §4 Stiller Parallelbau (CR-001); Invarianten 1, 2, 3, 11, 12"
voraussetzung: "W0 (wissen/register) gebaut; R0 (Kategorie NACHERZAEHLT) gebaut"
charakter: "privater statischer Prototyp der oeffentlichen Wissens-Ansicht; KEINE Veroeffentlichung (separater Entscheid nach fachlicher Verifikation)"
netz: verboten
llm_nutzung: verboten
neue_laufzeit_deps: keine (Dev nur vite/typescript/vitest)
```

## 0. Ziel in einem Satz
Aus Regelbuch (wissen/register) und Geschichten (prototypen/stories) entsteht
ein durchsuchbares Nachschlagewerk nach Lebenslagen — damit niemand das Rad
eines Prozesses neu erfinden muss.

## 1. Situationsseiten (Kern)
- Grundeinheit ist die Situationsseite mit stabiler Adresse (Slug), z. B.
  `miete/kuendigung/ohne-amtliches-formular`. Aufbau je Seite exakt nach
  NACHSCHLAGEWERK-NORM §3 (sieben Bloecke inkl. WORAN ES SCHEITERT und
  Quoten-Paar-Formulierung), inklusive Pruefstand-Badge und Pflicht-Fusszeile.
- Seiten werden deterministisch generiert: gleiche Eingaben => byte-identische
  Ausgabe. Quelle der Zuordnung: `wenn`-Felder und `rechtsgebiet` der
  Register-Eintraege plus `prinzipien`/`rechtsgebiet` der Story-Metadaten;
  die Slug-Taxonomie liegt versioniert in `nachschlag/taxonomie.json`
  (hergeleitet aus Norm §2; Herleitung im Bericht dokumentieren).

## 2. Navigation & Suche
- Kategorienbaum (aus der Taxonomie) + lokale Volltextsuche ueber Titel,
  Kurzantworten und Story-Titel — rein clientseitig, eigener kleiner Index,
  keine externen Dienste.
- Querverlinkung: Feed-Karte -> zugehoerige Situationsseite; Situationsseite
  -> letzte Ausgaben, in denen sie vorkam.

## 3. Ordnung & Grenzen
- Ort: `nachschlag/` als eigene Vite-App (vanilla TS), Lesen von wissen/ und
  prototypen/stories/ zur Build-Zeit; kein Server, kein Tracking.
- Es erscheinen ausschliesslich Inhalte mit gueltiger Kennzeichnung; alles
  andere wird beim Build mit Grund abgewiesen und gelistet (wie im Feed).
- Nutzer-/Falldaten tauchen nirgends auf; "Mein Fall" aus F1 bleibt dem Feed
  vorbehalten und wird im Nachschlagewerk nicht angezeigt.

## 4. Tests
- Build-Determinismus · jede Seite hat Quelle, Zeitstand, Pruefstand-Badge ·
  Seiten ohne Registerbezug existieren nicht · Kennzeichnungs-Verweigerung ·
  Link-Konsistenz Feed<->Nachschlagewerk · bestehende Suiten (core, feed,
  wissen) bleiben unveraendert gruen.

## 5. Bericht
`berichte/AUFTRAG-N0-ABSCHLUSS.md`: Was gebaut, Auslegungen (insb. Taxonomie-
Herleitung), Testuebersicht, Git-Stand, offene menschliche Punkte.

## 6. Nicht Bestandteil
Hosting/Deploy/Oeffentlich-Schaltung · Bearbeiten-Funktion (Community-Edits
kommen spaeter ueber das Review-Gate-Prinzip) · echte Quoten · neue
Rechtsinhalte · Aenderungen an core/, webflow/-Fachlogik oder wissen/register-
Inhalten.

## 7. Abnahme-Kommandos
cd nachschlag && npm test && npm run build   # gruen
cd prototypen/feed && npm test               # unveraendert gruen
Kein Commit/Push ohne Freigabe (CLAUDE.md).

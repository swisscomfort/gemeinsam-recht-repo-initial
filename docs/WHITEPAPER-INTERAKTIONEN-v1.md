**ÜBERHOLT — ersetzt durch MANIFEST v2.1. Historisch, nicht geltend.**

# WHITEPAPER — Interaktionen v1 (Bestandsaufnahme & Durchlauf-Matrix)

**Zweck:** Jede beschlossene Interaktion von Lesenden, Betroffenen,
Fragestellenden und Mitwirkenden einmal vollstaendig kartiert — mit
Variablen, Endzustaenden, Emotionszielen und Quellen (Norm-§ / Auftrag /
Invariante). Dieses Papier erfindet nichts Neues; es macht Bestehendes
prueffbar. Es dient als Pflicht-Matrix fuer die 100 internen Durchlaeufe.
**Kennzeichnungen:** [DEFAULT] = hier gesetzte Auslegung (aenderbar) ·
[LUECKE] = bekannt offen, Arbeit NACH den Laeufen.
**Rangordnung:** DER_PLAN (FROZEN) > NACHSCHLAGEWERK-NORM v0.6 > dieses Papier.

---

## 1. Rollen und Flaechen

Rollen: Leser/in · Betroffene/r (Werkzeug-Nutzung) · Fragesteller/in
(Anfrage an Community) · Unterstuetzer/in · Stimmen-Schreiber/in · Melder/in ·
Sichter/in · Fach-Pate/Patin · Redaktion. Maschine (deterministischer Kern)
und KI-Assistenz sind keine Akteure: sie rechnen bzw. entwerfen, sie
entscheiden und publizieren nie (Operating Rules).

```
   MORGENAUSGABE  ←→  ARCHIV (Situationsseiten)  ←→  ANFRAGEN-FEED
        │  „Betrifft mich?" / „Ich habe Post bekommen"      │
        └────────────→  WERKZEUG (Fragebogen→Ampel→Brief) ←─┘
                              │
                        MEIN FALL (privat, nur Geraet)
   intern: WERKBANK (Laeufe, Zaehler)  ·  SICHTUNG (Eingangskorb)
```

---

## 2. Die Kernreise (der Kreislauf als Ablauf)

1 Ausgabe lesen → 2 Fall trifft → 3 „Betrifft mich?" → 4 Fragebogen →
5 Ampel/Brief/Frist → 6 handeln → 7 [LUECKE] Ausgangs-Frage → 8 Destillat →
9 Archiv waechst → 10 neue Geschichte → 11 Stimmen & Sichtung → zurueck zu 1.

---

## 3. Ablaeufe je Interaktion

Format je Zeile: **ID · Ausloeser → Schritte → Endzustaende · Variablen ·
Emotionsziel · Quelle**

### A — Leser/in (Zeitung & Archiv)

**A1 Ausgabe oeffnen** · App-Start → Ausgabe des Tages (3–5 Karten) →
endet immer mit „Fertig fuer heute". Variablen: Erstbesuch/Wiederkehr ·
gefolgte Serie mit/ohne Update (Update zuerst) · Kartentypen (FIKTIV-Serie,
NACHERZAEHLT, Stimme des Tages, Verfolgter Fall, Mein-Fall) · Stoffmenge
(zu wenig → Hinweis statt Erfinden). Emotionsziel: Neugier→Ruhe. Quelle:
F0/F1, Norm §10.
**A2 Karte lesen** · Variablen: Rubrik (WEGWEISER/WARNWEISER/SACKGASSE/
TEILWEISE) · Kennzeichnungs-Badge · Quelle sichtbar bei NACHERZAEHLT.
Emotionsziel je Rubrik (Sackgasse: „haette ich fast gedacht"). Quelle: Norm §4/§7.
**A3 Serie folgen/entfolgen** · Stern → naechste Ausgabe priorisiert Update.
Variable: 0/1/n gefolgte Serien. Quelle: F1.
**A4 „Fertig fuer heute"** · Pflicht-Endzustand jeder Ausgabe; kein
Nachladen, kein Autoplay. Quelle: F0-Ergaenzung 2.
**A5 Archiv-Suche** · Eingabe → Trefferliste. Variablen: Treffer 0/1/n ·
Suchbegriff Lebenslage vs. Fachwort. [DEFAULT] Bei 0 Treffern erscheint der
Hinweis auf den Anfragen-Feed als Moeglichkeit (reine Verlinkung; die
umgekehrte Komfort-Bruecke ist [LUECKE-4]). Quelle: N0.
**A6 Situationsseite lesen** · Bloecke 1–7 vollstaendig. Variablen:
Pruefstand-Badge (geprueft/ausstehend) · Kanton-Filter · Quoten sichtbar/
„noch zu wenige Faelle". Emotionsziel: Orientierung. Quelle: Norm §3, N0.
**A7 Reaktions-Verb** · genau drei Verben, je simulierter Person einmal;
keine Ablehnung, keine Aufrufzahlen. Wirkung: Sortierung. Quelle: Norm §10, K0.
**A8 Leserstimme schreiben** · Prompt je Rubrik → Text ≤600 → Klasse
LESERSTIMME → Eingangskorb Sichtung → sichtbar/zurueck. Variablen: Rubrik-
Prompt · Klasse · mit/ohne Rechtsbehauptung (Rahmenpflicht). Emotionsziel:
gesehen werden. Quelle: Norm §10, K0, SI0.
**A9 Melden** · vertraulicher Knopf, Kategorien Wuerde/Re-Identifikation/
Betrug → nur Werkbank sichtbar, nie oeffentlich. Quelle: Norm §11, SI0.
**A10 Uebergang ins Werkzeug** · „Betrifft mich?" auf Karte/Seite ODER
„Ich habe Post bekommen" im Kopf → Fragebogen; Rueckweg ohne Verlust der
Ausgabe. Variable: Einstiegspunkt. Emotionsziel: Schreck→Orientierung.
Quelle: F1, N0 Block 7.

### B — Betroffene/r (Werkzeug „Mein Fall")

**B1 Fragebogen starten** · Variablen: Einstieg (Karte/Archiv/Kopf) ·
Beispieldaten-Knopf (nur Lauf-Modus). Quelle: S2, F1.
**B2 Fragen beantworten** · Variablen = Fallobjekt-Schema: Kanton (LU
produktiv; sonst LUECKE „ausserhalb Scope") · Zustellart (einschreiben/
a_post/persoenlich/unbekannt) · Abholfrist-Ende · amtliches Formular ·
unterschrieben · Begruendung angegeben/Text · Familienwohnung + separate
Zustellung · Vertragsbeginn · befristet · Sperrfrist-Fragen · fehlende/
widerspruechliche/zukuenftige Angaben. Quelle: schemas/case-object v0.1.
**B3 Ergebnis** · Endzustaende: GRUEN / GELB / ROT / LUECKE (mit Feldliste).
Variablen: Flag-Katalog (abschliessend, S1) · konkretes Fristdatum ·
Unsicherheiten sichtbar. Emotionsziel: Orientierung→Handlungsfaehigkeit.
Quelle: S1/S2, Invariante 3/5.
**B4 Brief erzeugen** · M1 (Anfechtung/Schlichtung) oder M2 (Nichtigkeit);
Pflicht-Platzhalter; Behoerdenadresse VOM_NUTZER_ZU_ERGAENZEN; Druck als
PDF-Weg. Quelle: S2.
**B5 Chronologie** · Eintragstypen erfassung/kuendigung_erhalten/
brief_erstellt/dokument_hinzugefuegt/export; lokale SHA-256-Hashes;
Export JSON+Markdown inkl. Regelversion/Quellenstand. Quelle: S2, L3.
**B6 „Mein Fall"-Karte** · erscheint nach Abschluss in naechster Ausgabe,
Badge PRIVAT — nur dieses Geraet; Status-Variable (offen…), nie automatisch
Story. Quelle: F1, Invariante 1.
**B7 Fall entfernen** · rueckstandsfreie Loeschung. Quelle: F1.
**B8 [LUECKE-1] Ausgangs-Frage** · „Wie ist es ausgegangen?" (nur
ja/teilweise/nein/keine Antwort) Wochen spaeter → Quoten/Destillat. In W0
angelegt, als Ablauf noch nicht gebaut. NACH DEN LAEUFEN.

### C — Fragesteller/in (Anfragen-Feed)

**C1 Anfrage entwerfen** · Pflichtfelder inkl. situation_kurz ≤280,
schon_versucht, gesucht (hinweis/erfahrung/abstimmung/begleitung, nie leer),
Schutzstufe ≤S3. Quelle: A0.
**C2 Erst-suchen-Bruecke** · vor dem Einreichen bis 3 Archiv-Treffer →
„Beantwortet das dein Anliegen?" · JA → Bereich „Durch Archiv geloest ✓" +
Zaehler, erscheint nie im Feed · NEIN → weiter. Quelle: A0.
**C3 Einreichen** · → Eingangskorb Sichtung → Feed (offen). Quelle: A0, SI0.
**C4 Antworten erhalten** · Typen: Archiv-Link · LESERSTIMME · GEPRUEFTER
HINWEIS · Abstimmungsergebnis. Klassenrahmen immer sichtbar. Quelle: A0, Norm §10.
**C5 „Hat geholfen" bestaetigen** · bei Archiv-Link → durch_archiv_geloest;
sonst → geschlossen(geloest). [DEFAULT] Bleibt die Bestaetigung aus, bleibt
die Anfrage offen und sinkt nur durch Sortierung — kein Auto-Schliessen;
Ruhen nach Inaktivitaet ist [LUECKE-2]. Quelle: A0.
**C6 Verfolgter Fall** · meiste Unterstuetzung → Band + Karte in der
Morgenausgabe; Update-Mechanik wie Serien. Quelle: A0.
**C7 Zurueckziehen/Loeschen** · jederzeit, rueckstandsfrei. Quelle: A0,
Invariante 1 sinngemaess.

### D — Unterstuetzer/in

**D1 „Ich unterstuetze"** · einmal je Person; Sortierung nach Summe,
Zweitkriterium aelteste; keine Betraege (Phase M). Quelle: A0, Invariante 6.
**D2 Abstimmung teilnehmen** · „Was wuerdest du tun?" — sortiert
Aufmerksamkeit, nie Wahrheit. Quelle: A0/Plan.

### E — Sichter/in

**E1 Korb oeffnen** · neue Stimmen/Etappen zuerst hier. Quelle: SI0.
**E2 Checkliste a–e** · je ja/nein, Pflicht-Grund bei Beanstandung. Quelle: Norm §11.
**E3 Entscheid** · freigeben-vorschlagen / zurueck mit Grund / eskalieren;
nie umschreiben. Quelle: Norm §11.
**E4 Vier-Augen** · zwei unabhaengige Sichtungen; [DEFAULT] Patt
(1x freigeben, 1x zurueck) gilt als eskaliert an die Redaktion. Quelle: §11+[DEFAULT].
**E5 Befangen** · ein Klick „befangen — weitergeben", ohne Begruendung;
eigener Fall nie. Quelle: Norm §11.
**E6 Selbstauskunft** · „Konnte ich sicher entscheiden?" (ja/unsicher bei
Punkt a–e) — misst Laientauglichkeit. Quelle: SI0, Norm §6.

### F — Fach-Pate/Patin

**F1 Eskalationen beantworten** · aus E3/E4. Quelle: Norm §11.
**F2 Stempel GEPRUEFTER HINWEIS** · exklusiv diese Rolle. Quelle: Norm §10/§11.
**F3 S3-Betreuung** · Phase S; im Prototyp nur simuliert. Quelle: Plan §5.

### G — Melder/in

**G1 Meldung einreichen** · Kategorien Wuerde/Re-ID/Betrug → Werkbank;
Rueckmeldung an Melder [LUECKE-3: Form der Rueckmeldung]. Quelle: §11, SI0.

### H — Redaktion

**H1 Kandidatenliste ziehen** (R0: npm run kandidaten) → **H2 Auswahl**
(Norm §7/§8: Privatperson-Hauptfigur, Ausgang egal) → **H3 Nacherzaehlung
freigeben** (§4-Bloecke, Quelle Pflicht) → **H4 Stimme des Tages** →
**H5 Freischalten** nach Vier-Augen → **H6 Einsprueche entscheiden** →
**H7 Register-Uebernahme** (Eingangskorb → Review → versionierte Regel) →
**H8 CR-Prozess** (Plan §7). Quellen: R0, W0, Norm, Plan.

### Systemgrenzen (bewusste Nicht-Interaktionen)
Keine Likes/Dislikes · keine Aufruf-/Ansichtszahlen · keine Zeit-/
Verweildauermessung (technisch unmoeglich per Schema-Waechter) · keine
Kontaktaufnahme zur Gegenseite · keine Push-Flut (nur Update gefolgter
Faelle, spaeter) · KI publiziert nie · Nutzerfaelle nie im Archiv.

---

## 4. Variablen-Katalog (Einordnungs-Dimensionen)

Rolle · Flaeche · Einstiegspunkt · Rubrik · Kennzeichnung (FIKTIV/
NACHERZAEHLT/PLATZHALTER) · Klasse (LESERSTIMME/GEPRUEFTER HINWEIS/…) ·
Schutzstufe S1–S5 · Rechtsgebiet · Kanton · Ampel-Ergebnis · LUECKE-Felder ·
Flag (Katalog S1, abschliessend) · Fall-Status · Anfrage-Status · gesucht-Typ ·
Reaktions-Verb · Unterstuetzungszahl · Sichtungs-Ergebnis · Checklisten-
Punkt a–e · Vier-Augen-Konstellation · Befangenheit ja/nein · Trefferlage
Suche 0/1/n · Erstbesuch/Wiederkehr · gefolgte Serien 0/1/n · Stoffmenge
der Ausgabe · Pruefstand · Einwilligung (Pilotfaelle) · Emotionswert je
Kurvenpunkt · Selbstauskunft „morgen wieder oeffnen?" ja/nein.

---

## 5. Zustandsmodelle

**Fall:** offen → frist_laeuft → brief_raus → antwort_ausstehend →
schlichtung → geloest | teilweise_geloest | an_fachstelle_uebergeben |
abgebrochen. (Plan L2)
**Anfrage:** entwurf → zur_sichtung → offen → verfolgt → durch_archiv_
geloest | geschlossen | zurueckgezogen. (A0 + [DEFAULT] C5)
**Stimme:** entwurf → zur_sichtung → sichtbar | zurueck; sichtbar →
stimme_des_tages. (K0/SI0)
**Sichtung:** offen → 1von2 → freigegeben | zurueck | eskaliert
(inkl. Patt→eskaliert [DEFAULT]). (SI0)

---

## 6. Kanten & Sonderfaelle (Pflicht-Haekchen der Laeufe)

Frist bereits abgelaufen (ROT + Beratungsstellen-Hinweis, keine neuen
Rechtsbehauptungen) · Kanton ausserhalb LU (LUECKE ausserhalb_scope) ·
fehlende/widerspruechliche/zukuenftige Angaben (je LUECKE) · Einschreiben
ohne Abholfrist (LUECKE) · Familienwohnung ohne Angabe separate Zustellung
(Schema-Pflicht) · Story ohne FIKTIV / unbekannte Schluessel / Etappen-
Mismatch / S4-S5 (Verweigerung mit Grund) · NACHERZAEHLT ohne Quelle oder
Verfahren nicht abgeschlossen (Verweigerung) · leere/duenne Ausgabe
(Hinweis statt Erfinden) · Doppel-Anfrage (Erst-suchen-Bruecke faengt;
sonst Archiv-Link-Antwort) · Fragesteller reagiert nie ([DEFAULT] bleibt
offen) · Stimmengleichheit (aelteste zuerst) · Sichter-Patt (eskaliert
[DEFAULT]) · Sichter waere Partei (befangen-weitergeben, Pflicht) ·
Meldung waehrend laufender Sichtung (Werkbank-Vorrang) · „Mein Fall"
loeschen mit offener Karte (rueckstandsfrei) · Nutzer bricht Fragebogen ab
(Abbruchstelle wird im Lauf erfasst — nur Ort, nie Zeit) · Beispieldaten-
Knopf nur im Lauf-Modus sichtbar.

---

## 7. Bekannte Luecken (Arbeit NACH den 100 Laeufen)

[LUECKE-1] Ausgangs-Frage/Outcome-Erhebung (B8) — Kernstueck fuer Quoten.
[LUECKE-2] Ruhen/Archivieren inaktiver Anfragen (Kalibrierung: nach wie
vielen Ausgaben?).
[LUECKE-3] Rueckmeldung an Melder (Form: still/Kurzbestaetigung).
[LUECKE-4] Komfort-Bruecke „Suche ohne Treffer → Anfrage vorbefuellt".
[LUECKE-5] Geraetewechsel/Backup fuer „Mein Fall" (local-first-Export).
Ausser Konkurrenz (terminiert im Plan): Mehrsprachigkeit FR/IT ·
Barrierefreiheits-Pruefung · Marke · Traegerschaft.

---

## 8. Nutzung als Test-Matrix (verbindlich fuer die 100 Laeufe)

- Jede A–H-Interaktion: mindestens 3 Durchlaeufe; jeder Sonderfall aus §6:
  mindestens 1; jede Emotionskurve (Leser · Betroffene · Fragesteller ·
  Sichter) vollstaendig erhoben; Selbstauskunft „morgen wieder oeffnen?"
  am Ende jeder Ausgabe.
- Die Werkbank fuehrt je Interaktions-ID einen Zaehler (strukturell,
  zeitfrei); ein Lauf gilt als vollstaendig, wenn er eine Kernreise (§2,
  Schritte 1–6) enthaelt.
- Faellt ein Pfad zweimal durch (Emotionsziel verfehlt oder Selbstauskunft
  „unsicher"), geht der Pfad zurueck in die Redaktion (Norm §6) — nicht
  das Projekt.

*v1 — 2026-08-06. Bestandsaufnahme; Aenderungen versioniert. Naechste
Fassung erst nach Auswertung der Laeufe.*

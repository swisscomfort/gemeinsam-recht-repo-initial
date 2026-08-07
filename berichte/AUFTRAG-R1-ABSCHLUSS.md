# AUFTRAG-R1 v2 — Abschlussbericht

**Auftrag:** Sieb, Redaktionsmappe & Nacherzähl-Entwürfe (autonom, privat)
**Plan-Referenz:** DER_PLAN_v1.1_FROZEN.md §4 Stiller Parallelbau (CR-001); NACHSCHLAGEWERK-NORM v0.6 §§2, 4, 7, 8; LEGAL_AI_OPERATING_RULES (KI entwirft, publiziert nie)
**Datum:** 2026-08-07 · **Bearbeitung:** Claude Code (Fable 5)

---

## 1. Was gebaut wurde (Trichter Sieb → Mappe → Entwürfe)

### Stufe 1 — Metadaten-Sieb `npm run sieben` (deterministisch, 0 Netz)
- Neu: `redaktion/src/sieb.ts` (reine Sieblogik, keine Uhr, kein Netz, keine
  Dateizugriffe), `redaktion/src/sieben.ts` (CLI-Rand), Konfiguration
  versioniert in `redaktion/sieb.json` (Startbelegung, redaktionell
  nachjustierbar), Script-Eintrag in `package.json`.
- Lauf vom 2026-08-07 über alle 16 Monatslisten (1000 Kandidatenzeilen):
  **983** deutsch sortiert → `gesiebt/2026-08-07.md` · **6** FR/IT →
  `gesiebt/spaeter-fr-it.md` · **11** Instanzen-Dubletten ausgeblendet und im
  Dokument sichtbar ausgewiesen (983+6+11 = 1000, nichts still verworfen).
- Zeilenformat: Original-Kandidatenzeile + `[Score + Kürzel]`, z. B.
  `[14 +kuendigung +anfechtung +erstreckung +OG]`; Sortierung Score
  absteigend · Datum absteigend · Aktenzeichen aufsteigend.

### Stufe 2 — Redaktionsmappe (gelesen & begründet)
- `redaktion/mappe/2026-08-07.md`: **TOP 9** (Original-Zeile, 3-Satz-Begründung,
  Rubrik-Vorschlag, Lehre-Satz) und **27 VERWORFEN** (Zeile + Ein-Wort-Grund:
  firma 8 · laufend 10 · wuerde 6 · prozessual 4 · unklar 1 — Details in der
  Mappe). Ein zehnter TOP-Platz wurde bewusst nicht aufgefüllt: kein weiterer
  Kandidat bestand die Norm-Checkliste (dokumentiert in der Mappe).
- Gelesen wurden 35 Entscheide bei entscheidsuche.ch (plus 1 Struktur-Abruf,
  plus 1 Bewertung rein nach Metadaten); Volltexte wurden nur im Terminal
  gelesen, nichts archiviert. Auffällig und für die Redaktion relevant: Die
  Score-Spitzenreiter scheiterten überdurchschnittlich an Kriterien, die
  Metadaten nicht zeigen (Würde-Grenze, Firma-gegen-Firma, laufende
  Verfahren) — das Sieb ersetzt das Lesen nicht, es ordnet nur die
  Lesereihenfolge.

### Stufe 3 — Drei Nacherzähl-Entwürfe (Top 3 der Mappe)
- `redaktion/entwuerfe/FS-101-die-zweite-kuendigung/` — WEGWEISER,
  OGer SO ZKBER.2025.43 (Sperrfrist Art. 271a OR, Eigenbedarf nicht dringend).
- `redaktion/entwuerfe/FS-102-klage-ohne-zahl/` — SACKGASSE,
  MGer ZH MJ250072-L / ZMP 2025 Nr. 22 (Anfangsmietzins nichtig, aber
  unbezifferte Klage → Nichteintreten; laut Publikation unangefochten).
- `redaktion/entwuerfe/FS-103-ein-tag-zu-spaet/` — WARNWEISER,
  OGer ZH NG250015 (Rechtsmittelfrist, Gerichtsferien, Poststempel).
- Alle drei exakt nach Norm §4 (Pflichtzeile mit Quelle, sechs Blöcke,
  Schlussblock «Der Unterschied» bzw. bei SACKGASSE «Der Irrtum» + «So
  erkennst du es vorher», Rubrik-Zeile; «Ausgang verbessert.» nur bei FS-101,
  wo es zutrifft). Fakten und Zahlen ausschliesslich aus den gelesenen
  Entscheiden, Namen ersetzt, Unsicherheiten als `[REDAKTION: pruefen — …]`
  markiert. Die Entwürfe liegen AUSSERHALB von `prototypen/stories/` — der
  Feed lädt sie nicht.
- **Formatgarantie:** `redaktion/tests/entwuerfe.test.ts` prüft jeden Entwurf
  programmatisch gegen den bestehenden, unveränderten Feed-Parser
  (`pruefeStory`, injiziertes Heute-Datum 2026-08-07) — alle drei werden
  angenommen; ohne injiziertes Datum verweigert der Parser (Gegenprobe).

## 2. Dokumentierte Auslegungen

1. **Gerichts-Gewicht ohne `hierarchy`-Feld:** Die Monatslisten tragen das
   Roh-Feld `hierarchy` nicht mehr; seine Signatur steckt aber am Anfang der
   Link-ID (`CH_BGer_004_…`, `NW_OG_001_…`). Gewichtet wird deshalb über die
   Link-Signatur: `CH_BGer`/`CH_BGE` hoch · Gerichtsteil `OG`/`KG`/`TC`/`APG`
   mittel · übrige tief · Kantonskürzel `LU` kleiner Bonus (im Bestand kam
   kein LU-Entscheid vor; der Bonus ist implementiert und getestet).
2. **Sprach-Erkennung:** Ein Sprachfeld existiert in den Monatslisten nicht
   (das Feld `attachment.language` der Quelle wird von `npm run kandidaten`
   nicht mitgeführt). Bestes verfügbares Metadaten-Feld ist das Kantonskürzel
   der Link-Signatur (VD/GE/NE/JU/TI → Später-Liste), ergänzt um eine
   Wort-Heuristik über Betreff und Gerichtsname (`sieb.json`,
   `sprache.fr_it_muster`) für zweisprachige Kantone. Nichts wird verworfen —
   nur zurückgestellt.
3. **Instanzen-Dublette (Best-Effort):** (a) Das Aktenzeichen eines Eintrags
   erscheint im Betreff eines anderen (die zitierende, spätere Instanz wird
   behalten); (b) identischer, hinreichend spezifischer Betreff (enthält
   Ziffern, ≥ 12 Zeichen) → höhere, bei Gleichstand spätere Instanz behalten.
   Generische Betreffe («Ausweisung») gelten nie als Dublette. Entferntes wird
   im Ausgabedokument ausgewiesen.
4. **Negativwörter werten stark ab statt auszuschliessen** (−8 gegenüber +4
   je Positivwort): Die Zeilen bleiben am Listenende sichtbar — transparent
   statt still gelöscht; die Mappe liest ohnehin nur die TOP.
5. **Score-Kürzel-Format:** `[<Score> <+positiv…> <+Gericht> <−negativ…>]` —
   die Zahl zuerst, damit die Sortierung für den Menschen nachvollziehbar ist
   (leichte Erweiterung des Beispiel-Formats im Auftrag, «z. B.»).
6. **«Verfahren erkennbar abgeschlossen»:** ausgelegt als Endentscheid mit
   nach Aktenlage abgelaufener ordentlicher Rechtsmittelfrist bzw.
   publiziertem Verzicht. Ein allfälliger Weiterzug ans Bundesgericht ist aus
   der Quelle nicht ersichtlich → in FS-101/FS-103 als
   `[REDAKTION: pruefen]` markiert; von der Quelle selbst als «nicht
   rechtskräftig»/weitergezogen vermerkte Entscheide wurden verworfen.
7. **Lese-Weg Stufe 2:** Gelesen wurde über denselben Suchendpunkt wie R0
   (`_search.php`, Feld `attachment.content` = extrahierter Text) statt über
   die PDF-Dateien — ein Abruf je Entscheid, gedrosselt 1/s, klarer
   User-Agent, Anzeige nur im Terminal.
8. **Abruf-Budget:** 40 Abrufe verbraucht (1 Struktur-Erkundung + 29 einzeln
   + 10 gebündelt); die letzten 10 wurden auf ausdrückliche Nutzer-Weisung als
   temporäre Arbeitskopien im Session-Scratchpad (ausserhalb des Repos)
   zwischengelagert und sind durch den zwischenzeitlichen Neustart des
   Rechners gelöscht — im Repo wurde zu keinem Zeitpunkt Volltext gespeichert.
   Nach dem Neustart erfolgte auf ausdrückliche Weisung **ein** zusätzlicher
   Nachlese-Abruf (MJ250002, tragender Grund für Mappe-Platz 8) — insgesamt
   also 41 Abrufe, der 41. ausserhalb des ursprünglichen Budgets und einzeln
   vom Auftraggeber gedeckt.
9. **Test-Fixture mit FX-Zeilen:** `tests/fixtures/beispiel-kandidaten.md`
   enthält echte öffentliche Metadatenzeilen plus vier klar markierte,
   konstruierte FX-Zeilen (Signatur `ZZ_`, Aktenzeichen `FX-DUB …`)
   ausschliesslich für die Dubletten-Tests — im Kopf der Datei als erfunden
   ausgewiesen (Invariante 2).

## 3. Testübersicht

| Suite | Kommando | Ergebnis |
|---|---|---|
| redaktion (inkl. 16 Sieb- + 5 Entwurfs-Tests) | `cd redaktion && npm test` | **31/31 grün** (inkl. `tsc --noEmit`) |
| core (unverändert) | `cd core && npm test` | 136/136 grün |
| feed (unverändert) | `cd prototypen/feed && npm test` | 95/95 grün |
| wissen (unverändert) | `cd wissen && npm test` | 44/44 grün |
| webflow (unverändert) | `cd webflow && npm test` | 9/9 grün |

An `core/`, `prototypen/feed/`, `wissen/`, `webflow/` wurde nichts geändert;
die Entwurfs-Prüfung importiert den Feed-Parser nur lesend.

## 4. Übernahme-Weg (bleibt menschlich)

Nach schriftlicher Freigabe («FS-1xx freigegeben») je Entwurf genau ein Befehl —
nichts wandert automatisch in den Feed:

```bash
git mv redaktion/entwuerfe/FS-101-die-zweite-kuendigung prototypen/stories/FS-101-die-zweite-kuendigung
git mv redaktion/entwuerfe/FS-102-klage-ohne-zahl prototypen/stories/FS-102-klage-ohne-zahl
git mv redaktion/entwuerfe/FS-103-ein-tag-zu-spaet prototypen/stories/FS-103-ein-tag-zu-spaet
```

Vor Freigabe menschlich zu erledigen (in den Entwürfen markiert):
Rechtskraft/Weiterzug von ZKBER.2025.43 und NG250015 verifizieren; in FS-103
die Serviceangabe zur Fristauskunft verifizieren oder streichen. Nach einem
`git mv` erscheint die Geschichte beim nächsten Feed-Lauf automatisch mit dem
Badge «Nach einem echten, öffentlich publizierten Entscheid · <Quelle>».

## 5. Nicht Bestandteil (eingehalten)

Keine Übernahme in den Feed, keine Veröffentlichung, keine Änderungen an
core/feed/wissen ausser der redaktion-Testsuite, kein Volltext-Archiv im Repo,
keine anderen Quellen als entscheidsuche.ch.

## 6. DTM-Trace

```json
{
  "gegenstand": "AUFTRAG-R1 v2: Metadaten-Sieb (npm run sieben) + Redaktionsmappe 2026-08-07 (TOP 9, 27 verworfen) + drei Nacherzaehl-Entwuerfe FS-101..103 mit Parser-Formatgarantie",
  "zeitpunkt": "2026-08-07",
  "rolle": "redaktion",
  "basis": {
    "fallobjekt_hash": "entfaellt (kein Fallbezug)",
    "regelversion": "keine Aenderung an Rechtsregeln (core unveraendert); Sieb-Konfiguration sieb.json v1.0",
    "quellenstand": "entscheidsuche.ch, 41 Abrufe am 2026-08-07 (Auslegung 8)"
  },
  "alternativen": [
    "Zehnten Mappe-Platz mit Vorbehalts-Kandidat fuellen — verworfen: Norm §2, keine leeren Versprechen",
    "Entwuerfe direkt nach prototypen/stories/ legen — verworfen: Auftrag §3/§4, Uebernahme nur nach menschlicher Freigabe"
  ],
  "begruendung": "Dreistufiger Trichter vollstaendig umgesetzt; jede Rechtsaussage der Entwuerfe stammt aus dem jeweils gelesenen Entscheid und traegt Quelle/Datum/Link; Unsicherheiten sind als REDAKTION-pruefen markiert statt gefuellt."
}
```

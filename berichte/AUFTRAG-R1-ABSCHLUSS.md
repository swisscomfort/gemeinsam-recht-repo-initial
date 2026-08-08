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

---

## 7. Ergänzung vom 2026-08-07 — Folgeauftrag: Entwürfe FS-104 bis FS-109

Auf Weisung des Auftraggebers (gleiche Regeln wie AUFTRAG-R1, gleiche
Netz-Erlaubnis auf entscheidsuche.ch, gedrosselt) wurden für die sechs
verbleibenden Mappe-Kandidaten (TOP 4–9 der Mappe 2026-08-07) vollständige
Nacherzähl-Entwürfe nach Norm §4 verfasst.

### 7.1 Die sechs Entwürfe

| Entwurf | Rubrik | Quelle | Kern-Lehre |
|---|---|---|---|
| `FS-104-der-verpasste-schlichtungstermin` | WARNWEISER | OGer ZH LU250008 (26.11.2025) | Ein Verschiebungsgesuch ist kein Freipass — der Termin gilt, bis er bewilligt abgenommen ist; Krankheit zählt nur belegt. |
| `FS-105-der-termin-sei-verschoben` | WARNWEISER | OGer ZH RU250068 (08.10.2025) | Termin-Auskünfte der Gegenseite zählen nicht; unentschuldigtes Fernbleiben kostet seit 1.1.2025 zusätzlich Ordnungsbusse (Art. 206 Abs. 4 ZPO). |
| `FS-106-offene-waende` | WEGWEISER | MGer Winterthur MJ250016 (21.04.2026) | Behebung und Herabsetzung zugleich; Mieterverschulden muss die Vermieterschaft beweisen; Ursache waren Baumängel (Gutachten). |
| `FS-107-die-erhoehung-nach-der-sanierung` | TEILWEISE | KGer BL 400 2024 279 (03.06.2025) | Gegen die 50–70-%-Vermutung (Art. 14 Abs. 1 VMWG) hilft nur konkretes Aufschlüsseln; nachrechenbare Punkte (Referenzzinssatz) werden korrigiert. |
| `FS-108-sieben-jahre-hinterlegt` | SACKGASSE | MGer Pfäffikon MJ250002 (21.01.2026) | Hinterlegen heisst nicht gewinnen: ohne substantiierte Mängel geht alles an die Vermieterschaft; Nebenkosten-Rückforderung braucht eine eigene Leistungsklage. |
| `FS-109-beziffern-in-zweiter-instanz` | SACKGASSE | OGer ZH NG250008 (16.03.2026) | Bei Anfechtung einer Erhöhung ist das Maximalziel der bisherige Mietzins — diese Zahl ist bekannt und gehört ins Begehren. |

Alle sechs exakt nach Norm §4 (Pflichtzeile mit Quelle, sechs Blöcke,
Schlussblock «Der Unterschied» / bei WARNWEISER «Was den Unterschied gemacht
hätte» / bei SACKGASSE «Der Irrtum» + «So erkennst du es vorher»,
Rubrik-Zeile). «Ausgang verbessert.» nur bei FS-106, wo es zutrifft. Fakten
und Zahlen ausschliesslich aus den gelesenen Entscheiden, Namen ersetzt.

### 7.2 Netz-Abrufe und Lese-Weg

Sechs Abrufe am 2026-08-07 (einer je Entscheid), derselbe Lese-Weg wie in
Auslegung 7 (`_search.php`, Feld `attachment.content`), gedrosselt 1/s,
klarer User-Agent. Arbeitskopien nur im Session-Scratchpad ausserhalb des
Repos; im Repo wurde kein Volltext gespeichert.

### 7.3 Rechtskraft-Markierungen

In allen sechs Entwürfen ist der Rechtskraft-Stand als
`[REDAKTION: pruefen — …]` markiert: FS-104/105/107/109 sind Endentscheide
mit Beschwerdemöglichkeit ans Bundesgericht (Weiterzug aus der Quelle nicht
ersichtlich); FS-106/108 sind **erstinstanzliche** Urteile mit
Berufungsmöglichkeit ans Obergericht — hier ist die Verifikation vor einer
Freigabe besonders wichtig (bei FS-108 war die Auszahlung der hinterlegten
Mietzinse laut Urteil erst nach unbenütztem Ablauf der Berufungsfrist
vorgesehen).

### 7.4 Formatgarantie und Tests

`redaktion/tests/entwuerfe.test.ts` wurde vom abgeschlossenen Stand
(FS-101–103, inzwischen per Freigabe in den Feed übernommen) auf FS-104–109
umgestellt; jeder Entwurf wird gegen den unveränderten Feed-Parser geprüft
(`pruefeStory`, injiziertes Heute-Datum 2026-08-07), plus Gegenprobe ohne
Datum. Stand 2026-08-07: redaktion **34/34 grün** · core 136 · feed 95 ·
wissen 44 · webflow 9 — an core/feed/wissen/webflow wurde nichts geändert.

### 7.5 Übernahme-Weg (bleibt menschlich)

Nach schriftlicher Freigabe («FS-1xx freigegeben») je Entwurf genau ein
Befehl:

```bash
git mv redaktion/entwuerfe/FS-104-der-verpasste-schlichtungstermin prototypen/stories/FS-104-der-verpasste-schlichtungstermin
git mv redaktion/entwuerfe/FS-105-der-termin-sei-verschoben prototypen/stories/FS-105-der-termin-sei-verschoben
git mv redaktion/entwuerfe/FS-106-offene-waende prototypen/stories/FS-106-offene-waende
git mv redaktion/entwuerfe/FS-107-die-erhoehung-nach-der-sanierung prototypen/stories/FS-107-die-erhoehung-nach-der-sanierung
git mv redaktion/entwuerfe/FS-108-sieben-jahre-hinterlegt prototypen/stories/FS-108-sieben-jahre-hinterlegt
git mv redaktion/entwuerfe/FS-109-beziffern-in-zweiter-instanz prototypen/stories/FS-109-beziffern-in-zweiter-instanz
```

### 7.6 DTM-Trace (Ergänzung)

```json
{
  "gegenstand": "Folgeauftrag zu R1: sechs Nacherzaehl-Entwuerfe FS-104..109 (TOP 4-9 der Mappe 2026-08-07) nach Norm §4 mit Parser-Formatgarantie",
  "zeitpunkt": "2026-08-07",
  "rolle": "redaktion",
  "basis": {
    "fallobjekt_hash": "entfaellt (kein Fallbezug)",
    "regelversion": "keine Aenderung an Rechtsregeln (core unveraendert)",
    "quellenstand": "entscheidsuche.ch, 6 Abrufe am 2026-08-07 (1/s, kein Volltext im Repo)"
  },
  "alternativen": [
    "FS-109 wegen thematischer Naehe zu FS-102 weglassen — verworfen: der Auftrag nennt ausdruecklich alle sechs verbleibenden Kandidaten; die obergerichtliche Bestaetigung samt Kostenfolge ist eine eigenstaendige Lehre",
    "Rechtskraft-Hinweise weglassen, weil die Mappe sie schon traegt — verworfen: Unsicherheiten gehoeren sichtbar in den Entwurf (Auftrag §3, Operating Rules Nr. 4)"
  ],
  "begruendung": "Jede Rechtsaussage stammt aus dem jeweils vollstaendig gelesenen Entscheid und traegt Quelle/Datum/Link; Unsicherheiten (insb. Rechtskraft der beiden erstinstanzlichen Urteile) sind als REDAKTION-pruefen markiert; Uebernahme in den Feed nur per git mv nach schriftlicher Freigabe."
}
```

## 8. Ergänzung vom 2026-08-08 — Freigabe und Übernahme FS-104/105/107/109

Auf schriftliche Freigabe des Auftraggebers («FS-104 freigegeben, FS-105
freigegeben, FS-107 freigegeben, FS-109 freigegeben») wurden diese vier
Entwürfe wie in §7.5 vorgesehen per `git mv` von `redaktion/entwuerfe/` nach
`prototypen/stories/` übernommen. FS-106/108 bleiben ausdrücklich Entwurf
(erstinstanzlich, parkiert bis zur Rechtskraft-Verifikation, §7.3).

- `redaktion/tests/entwuerfe.test.ts` prüft nur noch die verbleibenden
  Entwürfe FS-106/FS-108 (vorher FS-104–109).
- `prototypen/feed/tests/quelle.test.ts` erhielt einen zusätzlichen Test, der
  den echten Glob-Lader `ladeAlle()` mit injiziertem Prüfdatum
  (2026-08-07) gegen `prototypen/stories/` laufen lässt und bestätigt, dass
  FS-104, FS-105, FS-107 und FS-109 dort angenommen werden — an
  `prototypen/feed/src/` wurde nichts geändert.
- Testergebnis 2026-08-08: redaktion **30/30 grün** · feed **96/96 grün**
  (inkl. neuem Übernahme-Test) · core 136 · wissen 44 · webflow 9 —
  unverändert an core/wissen/webflow.

Kein Commit, kein Push ohne gesonderte Freigabe des Auftraggebers.

# AUFTRAG-F0 — Abschlussbericht: Feed-Prototyp „Morgenausgabe"

**Datum:** 2026-08-05 · **Auftrag:** `auftraege/AUFTRAG-F0-FEED-PROTOTYP.md` (freigegeben mit Präzisierung) · **Plan:** v1.1 §4 „Stiller Parallelbau" (CR-001 inkl. F1), Invarianten 1, 2, 6, 11, 12

## 1. Was gebaut wurde

`prototypen/feed/` — lokale Vite-App (vanilla TypeScript, deutsch), privater
Offline-Prototyp. Kein Server, keine Übertragung, kein Tracking, keine externen
Ressourcen, keine Laufzeit-Dependencies; Dev-Dependencies nur vite, typescript,
vitest (wie `webflow/`).

- **`src/story.ts`** — Mini-Parser für das meta.yaml-Subset aus FS-001 plus
  vollständige Prüfung. Verweigerungsgründe (alle werden gesammelt, nicht nur
  der erste): Kennzeichnung fehlt/nicht exakt `FIKTIV` · unbekannte oder falsch
  geschriebene Schlüssel (Präzisierung des Projektinhabers: streng, nie
  stillschweigend) · doppelte Schlüssel · leere Werte · Schutzstufe S4/S5
  (Belastungsschutz, F1) oder unbekannt · `etappen` keine positive ganze Zahl ·
  Listen-/Skalar-Typfehler · fehlende Kennzeichnungszeile in `story.md` ·
  Etappen-Zahl in `story.md` ≠ `meta.yaml` · `fixture`-Markierung (Fixtures
  erscheinen nie im Feed).
- **`src/quelle.ts`** — einzige Story-Quelle: Vite-Glob über
  `prototypen/stories/*/meta.yaml` + `story.md`; Dateiliste entsteht beim
  Build, zur Laufzeit kein Netzzugriff. Fehlt eine der beiden Dateien:
  Verweigerung.
- **`src/ausgabe.ts`** — deterministische `morgenausgabe(stories, datumISO)`:
  Stories nach ID sortiert, Startpunkt per FNV-1a-Hash des injizierten Datums
  rotiert, eine Karte je Etappe, harte Obergrenze 5, Abschluss immer
  „Fertig für heute". Kein `Date.now()`, kein `Math.random()`.
- **`src/lauf.ts`** — synthetischer Lauf-Modus (F1): je Karte Emotion aus
  fester Liste (`verstanden, neugierig, aha_moment, ueberfordert, beunruhigt`)
  + Notiz; Abbruchstelle wird erfasst; Zähler zählt nur abgeschlossene
  Durchläufe (Ziel ≥100 vor Launch-Gate, Plan §4). Export mit Kopffeld
  `zweckbindung: "F1 — synthetische Laeufe, keine echten Nutzer"`. Das
  Log-Schema kennt strukturell keine Zeit-, Dauer- oder Klick-Felder;
  `ladeSammlung` verwirft jede Struktur mit fremden Schlüsseln.
- **`src/main.ts` + `index.html` + `src/stil.css`** — Oberfläche:
  Kopfhinweis (privat/synthetisch/lokal), Datumseingabe (URL-Parameter
  `?datum=` oder Feld — keine Systemzeit in der Fachlogik), Kartenstapel mit
  Badge „FIKTIVES LEHRSTÜCK" auf jeder Karte, Abschlusskarte, Liste
  „Verweigerte Geschichten" mit Gründen, Lauf-Modus mit Export
  (`laeufe-export.json`), Speicherung nur in `localStorage`.

## 2. Auslegungen

1. **Kein YAML-Paket** (Freigabe): eigener Parser exakt für das FS-001-Subset;
   alles andere ist Verweigerungsgrund.
2. **`fixture` als einziger zusätzlich erlaubter Schlüssel:** synthetische
   Test-Stories tragen `fixture: true` (Äquivalent zu `meta.fixture=true`,
   Invariante 2/CLAUDE.md) und werden vom Feed IMMER verweigert — auch wenn
   sonst alles gültig ist (getestet). Fixture-Ort: `prototypen/feed/tests/fixtures/FX-*`
   (Freigabe).
3. **Zusätzliche Strenge über den Auftragstext hinaus:** `missions_status`
   muss genauso viele Einträge haben wie `etappen` (sonst hätte eine Karte
   keinen definierten Missions-Status); unbekannte Schutzstufen-Werte werden
   verweigert. Beides folgt dem Geist der Freigabe-Präzisierung („streng, nie
   stillschweigend").
4. **Mehr-Story-Testfälle** laufen über synthetische In-Memory-Objekte im
   Testcode (FX-IDs) statt über gültige Story-Fixtures — so kann nie eine
   „gültige" Fixture-Geschichte im Stories-Verzeichnis landen.
5. **Zähler** zählt nur abgeschlossene Durchläufe; abgebrochene bleiben mit
   Abbruchstelle im Log (zulässiger F1-Zweck: Abbruchstellen finden).

## 3. Testübersicht

- `prototypen/feed`: **28 Tests grün** (vitest) — Annahme FS-001 (3 Etappen,
  Meta-Felder), 10 Verweigerungsfälle (inkl. Tippfehler-Schlüssel, S4/S5,
  Kennzeichnungszeile, Etappen-Mismatch, Doppel-Schlüssel, Gründe-Sammlung),
  Ausgabe (3 Karten aus FS-001, harte 5er-Kappung, Determinismus, kein
  Auffüllen unter 3, leerer Bestand, Datumsvalidierung), Lauf-Modus inkl.
  F1-Wächter (Erlaubnisliste + Verbotsmuster `zeit|dauer|klick|…` im
  Export-Schema), Quelle (Glob akzeptiert genau FS-001).
- `npm run build` (tsc --noEmit + vite build): grün.
- `cd core && npm test`: **136 Tests grün** (unberührt).
- Bundle-Prüfung: FS-001-Inhalt enthalten · „Fertig für heute" und Badge
  enthalten · keine Fixture-Inhalte im Bundle.

## 4. Offene Punkte

- **Sichtprüfung im Browser durch den Projektinhaber** (Abnahmepunkt):
  `cd prototypen/feed && npm run dev`, Datum wählen → 3 Karten + „Fertig für
  heute"; Verweigerungsliste ist ohne verweigerte Stories im Repo leer
  (Fixtures liegen bewusst ausserhalb des Stories-Verzeichnisses).
- Die ≥100 internen Gesamtdurchläufe (Plan §4) sind Arbeit des Projektteams,
  nicht Teil dieses Auftrags; der Zähler dafür ist eingebaut.
- Keine Rechtsaussagen im Prototyp: Prinzipien-Chips zeigen nur die
  `meta.yaml`-Begriffe ohne Bewertung; Quellenregister-Anbindung ist bewusst
  nicht Bestandteil (Auftrag §3).

## 5. DTM-Trace

```json
{
  "gegenstand": "AUFTRAG-F0: privater Offline-Feed-Prototyp 'Morgenausgabe' (prototypen/feed/)",
  "zeitpunkt": "2026-08-05",
  "rolle": "redaktion",
  "basis": {
    "fallobjekt_hash": "entfaellt (keine Falldaten; ausschliesslich synthetische Stories)",
    "regelversion": "keine Rechtsregeln betroffen (core unveraendert, Regelversion 0.1.0)",
    "quellenstand": "Plan v1.1 (SHA-256 4e42ba6d…a906, FREEZE.txt) · CR-001 inkl. F1-F3 · FS-001 (2026-08-05)"
  },
  "alternativen": [
    "YAML-Paket statt Mini-Parser (abgelehnt: neue Laufzeit-Abhaengigkeit)",
    "gueltige Story-Fixtures statt In-Memory-Testdaten (abgelehnt: Verwechslungsrisiko mit echten Stories)"
  ],
  "begruendung": "Umsetzung exakt im Umfang des freigegebenen Auftrags; Verweigerung als Standardreaktion, F1-Zweckbindung technisch erzwungen (keine Zeit-/Klick-Felder erfassbar)."
}
```

## 6. Git-Stand

Siehe `git status --short` in der Abschlussmeldung der Session; kein Commit,
kein Push ohne ausdrückliche Freigabe (CLAUDE.md).

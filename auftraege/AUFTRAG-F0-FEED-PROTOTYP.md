# AUFTRAG-F0 — Feed-Prototyp „Morgenausgabe" (privat, offline)

**Status: FREIGEGEBEN durch den Projektinhaber am 2026-08-05 — mit Präzisierung: Der Mini-Parser behandelt unbekannte oder falsch geschriebene Schlüssel in `meta.yaml` als Verweigerungsgrund (streng, nie stillschweigend ignorieren). Beide Auslegungen (eigener Mini-Parser statt YAML-Paket · Fixture-Ort `prototypen/feed/tests/fixtures/`) angenommen.**

```yaml
auftrag: F0
plan_referenz: "DER_PLAN_v1.1_FROZEN.md §4 (Stiller Parallelbau, CR-001 inkl. F1), §2 Invarianten 1, 2, 6, 11, 12"
charakter: "privater Offline-Prototyp — wird NICHT veröffentlicht, kein Kanal, kein Hosting"
sprache_ui: Deutsch, einfache Sprache
llm_nutzung: verboten (alles deterministisch)
netz: verboten (ausser npm install; die App selbst macht keinerlei Netzwerkzugriffe)
neue_laufzeit_deps: keine (meta.yaml wird durch einen eigenen, minimalen Parser fuer das
  definierte Schlüssel-Subset gelesen — kein YAML-Paket)
dev_deps: nur vite, typescript, vitest
zeit: injiziert (kein Date.now() in der Fachlogik; Ausgabedatum wird uebergeben)
```

## 1. Zweck und Rahmen

Privater, lokaler Prototyp des Feed-Erlebnisses „Morgenausgabe" gemäss CR-001
(stiller Parallelbau). Er dient ausschliesslich internen synthetischen
Gesamtdurchläufen (Ziel gemäss Plan §4: ≥100 vor Antritt des Launch-Gates) und
wird in `prototypen/feed/` gebaut. Nichts davon wird öffentlich; Agenten und
Prototypen sind interne Produktionsinfrastruktur (Invariante 9).

**Verbindliche Ergänzungen des Projektinhabers (2026-08-05):**

1. **Story-Quelle:** Der Prototyp liest Geschichten ausschliesslich aus
   `prototypen/stories/<ID>/meta.yaml` + `story.md` (Beispiel: FS-001).
   Geschichten ohne `kennzeichnung: FIKTIV` werden **verweigert** — sie
   erscheinen nicht im Feed; die Verweigerung wird mit Grund angezeigt.
2. **Morgenausgabe:** Jede Ausgabe hat **3–5 Karten** und endet sichtbar mit
   **„Fertig für heute"**. Kein Endlos-Scrollen, keine Autoplay-Fortsetzung,
   kein automatisches Nachladen weiterer Inhalte.
3. **Offline/lokal:** Alles bleibt offline/lokal gemäss CR-001.
   Emotions-Zuordnung nur an synthetischen Läufen, Zweckbindung F1
   (zulässig: Verständlichkeit, Angst/Überforderung senken, Belastungsschutz,
   Abbruchstellen finden · unzulässig: jede Optimierung auf Verweildauer,
   Klick-/Wiederkehrraten, Empörung oder sonstiges Engagement).
   Emotionserfassung an echten Nutzern findet nie statt.

## 2. Lieferumfang

**A. Story-Lader und -Validierung — `prototypen/feed/src/story.ts`**

- Liest Story-Verzeichnisse (`meta.yaml` + `story.md`); die Verzeichnisliste
  wird beim Build erzeugt (Vite-Glob-Import), zur Laufzeit kein Netzzugriff.
- Eigener minimaler Parser nur für das in FS-001 belegte Schlüssel-Subset:
  `id, titel, kennzeichnung, rechtsgebiet, schutzstufe, etappen,
  missions_status, prinzipien, emotions_ziel, autor, erstellt`
  (Skalare und einzeilige Listen `[a, b, c]`). Unbekannte oder falsch
  geschriebene Schlüssel sind ein **Verweigerungsgrund** (streng, nie
  stillschweigend ignorieren; Präzisierung des Projektinhabers zur Freigabe).
- **Verweigerungsregeln (hart, getestet):**
  - `kennzeichnung` fehlt oder ≠ `FIKTIV` → Story wird verweigert.
  - `schutzstufe` S4/S5 → Story wird verweigert (Belastungsschutz, F1;
    Operating Rules Nr. 8).
  - `story.md` ohne sichtbare Kennzeichnungszeile im Text → Verweigerung.
  - Anzahl `##`-Etappen im `story.md` ≠ `etappen` in `meta.yaml` → Verweigerung.
- Verweigerte Stories erscheinen nie als Karte; im Prototyp-UI werden sie unter
  „Verweigert (Grund)" gelistet, damit interne Läufe das Verhalten prüfen können.

**B. Ausgaben-Komposition — `prototypen/feed/src/ausgabe.ts`**

- Deterministische Funktion `morgenausgabe(stories, datumISO)` → 3–5 Karten.
- Eine Karte = eine Etappe einer Geschichte (Titel, Etappen-Text,
  `missions_status`-Schritt, Prinzipien-Chips, deutlich sichtbares Badge
  **„FIKTIVES LEHRSTÜCK"** auf jeder Karte).
- Auswahl deterministisch aus injiziertem Datum (z. B. stabiler Hash über
  Datum + Story-IDs) — kein `Math.random()`, kein `Date.now()`.
- Sind weniger als 3 Karten verfügbar, wird keine „gestreckte" Ausgabe erzeugt,
  sondern die Ausgabe mit den vorhandenen Karten und dem sichtbaren Hinweis
  „Heute weniger als drei Karten verfügbar" gerendert — niemals Füllinhalte
  erfinden (Invariante 12). Obergrenze 5 wird hart durchgesetzt.
- Die Ausgabe endet immer mit der Abschlusskarte **„Fertig für heute"**.
  Danach existiert kein weiteres Scroll-Ziel und kein Nachlade-Mechanismus.

**C. Lokale Web-Oberfläche — `prototypen/feed/` (Vite, vanilla TS, deutsch)**

- Startseite: Datumswahl (Vorbelegung durch Nutzereingabe/URL-Parameter, nicht
  durch Systemzeit in der Fachlogik) → Morgenausgabe als Kartenstapel.
- Kein Server, keine Übertragung, kein Tracking, keine externen Ressourcen
  (Fonts/CDN); alles im Bundle. Keine Autoplay-Medien.
- Deutlicher Kopfhinweis auf jeder Seite: „Privater Prototyp · alle Geschichten
  synthetisch und als FIKTIV gekennzeichnet · nichts hiervon ist öffentlich."

**D. Synthetischer Lauf-Modus (F1-konform) — `prototypen/feed/src/lauf.ts`**

- Ein „interner Durchlauf" kann gestartet werden: Karten werden nacheinander
  durchgegangen; je Karte kann die durchführende Person (Projektteam) eine
  Emotions-Zuordnung aus einer festen Liste wählen (z. B. `verstanden`,
  `neugierig`, `ueberfordert`, `beunruhigt`, `abgebrochen`) plus Freitextnotiz.
- Aufgezeichnet werden nur: Lauf-ID (fortlaufend), injiziertes Datum, Karten-ID,
  gewählte Emotion, Notiz, Abbruchstelle. **Nicht** aufgezeichnet werden:
  Verweildauer, Zeitstempel je Klick, Klickraten, Wiederkehr — unzulässige
  Zwecke nach F1 sind technisch gar nicht erfassbar.
- Speicherung nur lokal (localStorage) + Export als JSON-Download
  (`laeufe-export.json`) mit Kopffeld
  `zweckbindung: "F1 — synthetische Laeufe, keine echten Nutzer"`.
  Zähler „Durchläufe gesamt" sichtbar (Fortschritt Richtung ≥100, Plan §4).

**E. Tests — `prototypen/feed/tests/` (vitest)**

- Verweigerung: Story ohne `kennzeichnung: FIKTIV` → abgelehnt mit Grund;
  `FIKTIV` klein-/andersgeschrieben → abgelehnt; S4/S5 → abgelehnt.
- FS-001 wird akzeptiert und in 3 Karten zerlegt (Titel/Etappen korrekt).
- Ausgabe: nie mehr als 5 Karten · endet immer mit „Fertig für heute" ·
  gleiches Datum + gleiche Stories ⇒ identische Ausgabe (Determinismus).
- Lauf-Log: enthält keine Zeit-/Dauerfelder (Schema-Test als F1-Wächter).
- Synthetische Test-Stories für Negativfälle liegen unter
  `prototypen/feed/tests/fixtures/FX-*/` mit `meta.fixture: true` und werden
  nie ausserhalb der Tests geladen (Invariante 2; Analogie zur
  CLAUDE.md-Fixture-Regel).

**F. Bericht — `berichte/AUFTRAG-F0-ABSCHLUSS.md`**

Was gebaut wurde, Auslegungen, offene Punkte, Testübersicht, `git status --short`.
`STATUS.md`: eine neue Checkbox-Zeile „CR-001 Parallelbau: Feed-Prototyp F0
(privat, offline) technisch umgesetzt — interne Durchläufe offen" unter der
Checkliste; sonst keine STATUS-Änderungen.

## 3. Nicht Bestandteil

Öffentlicher Feed oder Kanal (Phase F bleibt hinter dem Launch-Gate) ·
Hosting/Deploy · echte Geschichten oder echte Nutzer · Emotionserfassung an
echten Nutzern (nie) · Kommentare/Reputation/Zahlungen · Story-Editor ·
Push/Benachrichtigungen · Änderungen an `core/`, `webflow/`, Plan, FREEZE,
SESSION_KOPF · neue Rechtsinhalte (der Prototyp erzeugt keine Rechtsaussagen;
Prinzipien-Chips zeigen nur die `meta.yaml`-Begriffe ohne Bewertung).

## 4. Abnahme

- `cd prototypen/feed && npm ci && npm test` grün
- `cd prototypen/feed && npm run build` grün
- `cd core && npm test` weiterhin grün (unberührt)
- Manuelle Sichtprüfung: FS-001-Ausgabe mit 3 Karten + „Fertig für heute";
  FIKTIV-Badge auf jeder Karte; Verweigerungsliste funktioniert
- Bericht vorhanden · STATUS.md-Zeile ergänzt · kein Commit/Push ohne Freigabe

**ÜBERHOLT — ersetzt durch MANIFEST v2.1. Historisch, nicht geltend.**

# AUFTRAG-A0 — Anfragen-Feed der Community (privat, offline)

```yaml
auftrag: A0
plan_referenz: "DER_PLAN_v1.1_FROZEN.md §4 Stiller Parallelbau (CR-001 inkl. F1), §5 Phase S (nur als privater Prototyp); Invarianten 1, 2, 6, 8, 11, 12"
voraussetzung: "F0/F1 gebaut; ideal: N0 (Archiv) — sonst Archiv-Brueckenfallback aus wissen/register"
charakter: "privater Offline-Prototyp mit ausschliesslich synthetischen (FIKTIV) Anfragen; nichts wird veroeffentlicht"
netz: verboten
llm_nutzung: verboten
neue_laufzeit_deps: keine
```

## 0. Ziel in einem Satz
Neben Zeitung und Archiv entsteht die dritte Flaeche: ein Feed, in dem
(synthetische) Privatpersonen offene Faelle als strukturierte Anfrage an die
Community stellen — sortiert durch Unterstuetzung, entlastet durch das Archiv.

## 1. Anfrage-Format (Dateien wie Stories)
`prototypen/anfragen/AN-###-<kurzname>/meta.yaml + anliegen.md`
- meta.yaml Pflichtfelder: `id`, `kennzeichnung: FIKTIV`, `rechtsgebiet`,
  `kanton`, `schutzstufe` (max. S3), `situation_kurz` (max. 280 Zeichen),
  `schon_versucht` (Liste), `gesucht` (enum-Liste: hinweis | erfahrung |
  abstimmung | begleitung), `status` (offen | verfolgt | durch_archiv_geloest |
  geschlossen), `erstellt`.
- Strenger Parser wie im Feed: unbekannte Schluessel, fehlendes FIKTIV,
  Schutzstufe > S3, fehlende Pflichtfelder => Verweigerung mit Grund.
- Missions-Grammatik erzwungen: `gesucht` darf nicht leer sein — keine
  „Wer weiss Rat?"-Anfragen ohne konkretes Hilfeziel.

## 2. Die Erst-suchen-Bruecke (Kern der Entlastung)
- Beim Erstellen einer Anfrage (Formular im Prototyp) wird live im Archiv
  gesucht (N0-Index; Fallback: Kurzantworten aus wissen/register) und bis zu
  3 Treffer angezeigt: „Beantwortet das dein Anliegen?"
- Bestaetigt der Fragesteller einen Treffer, erscheint die Anfrage NICHT im
  Feed, sondern im Bereich **„Durch Archiv geloest ✓"** (mit Link auf die
  Situationsseite) und erhoeht den Zaehler
  „Sofort beantwortet durch das Archiv: N".
- Bestehende Anfragen koennen jederzeit per Archiv-Link-Antwort geloest
  werden; bestaetigt der Fragesteller „hat geholfen", wandert die Anfrage in
  denselben Bereich. Kein Absinken als Strafe — Loesung ist der Erfolg.

## 3. Feed, Unterstuetzung, Sortierung
- Haupt-Feed zeigt offene Anfragen als Karten (Situation, gesucht, Kanton,
  Schutzstufen-konforme Darstellung).
- Ein neutraler Knopf **„Ich unterstuetze diese Anfrage"** (einmal je
  simulierter Person/Session im Lauf-Modus). Keine Likes, keine Emojis,
  keine Aufruf-/Ansichtszahlen — angezeigt wird nur die Unterstuetzungszahl.
- Sortierung: meiste Unterstuetzung zuoberst; die fuehrende Anfrage traegt
  das Band **„Verfolgter Fall"** und erscheint zusaetzlich als Karte in der
  Morgenausgabe (Querverbindung zur Zeitung), inklusive Update-Mechanik wie
  bei Serien.
- **Abstimmung sortiert Aufmerksamkeit, nie Wahrheit:** Rechtsaussagen in
  Antworten sind nur als Archiv-Link oder als klar markierter, ungeprüfter
  Community-Hinweis darstellbar (zwei sichtbare Klassen wie im Plan);
  der Prototyp erzeugt selbst keinerlei Rechtsaussagen.

## 4. Emotions-Lauf (F1-Zweckbindung, unveraendert streng)
- Journey des Fragestellers wird im Lauf-Modus erfassbar: Ziel-Kurve
  Ohnmacht -> Gesehen-werden -> Orientierung -> naechster Schritt.
- Weiterhin strukturell unmoeglich: Zeitstempel, Verweildauern, Klick- und
  Wiederkehrraten (bestehender Schema-Waechter gilt auch fuer Anfrage-Logs).

## 5. Nicht Bestandteil
Oeffentlichkeit jeder Art · echte Faelle oder echte Personen · Geld/
Unterstuetzungsbetraege (Phase M) · Kommentar-Freitext-Threads (nur die
definierten Antwort-Typen; Leserstimmen regelt AUFTRAG-K0) · Kontakt zur
Gegenseite · Benachrichtigungen · Moderations-Backoffice (Phase S) ·
Aenderungen an core/, webflow/, wissen/.

## 6. Tests
- Parser-Verweigerungen einzeln (Negativ-Fixtures) · Erst-suchen-Bruecke
  liefert deterministische Treffer und verhindert Feed-Eintrag bei
  Bestaetigung · Sortierung deterministisch bei gleicher Stimmenlage
  (Zweitkriterium: aelteste zuerst) · „Durch Archiv geloest"-Zaehler korrekt ·
  Log-Schema zeitfrei · bestehende Suiten (core, feed, ggf. nachschlag)
  bleiben unveraendert gruen.
- Mindestens 6 synthetische Beispiel-Anfragen (AN-001…AN-006, FIKTIV),
  davon 2, die durch die Archiv-Bruecke sofort geloest werden.

## 7. Bericht
`berichte/AUFTRAG-A0-ABSCHLUSS.md`: Was gebaut, Auslegungen, Testuebersicht,
Git-Stand, offene menschliche Punkte (insb. was Phase S spaeter zusaetzlich
braucht: Moderation, Review-Gate, Re-Identifikations-Check).

## 8. Abnahme-Kommandos
cd prototypen/feed && npm test && npm run build   # gruen inkl. Anfragen-Ansicht
Kein Commit/Push ohne Freigabe (CLAUDE.md).

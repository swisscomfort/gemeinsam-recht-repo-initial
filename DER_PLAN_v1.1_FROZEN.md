# DER PLAN — Gemeinsam Recht · v1.1 · FROZEN

**Status:** EINGEFROREN per 2026-08-05. Geändert gegenüber v1.0 ausschliesslich durch CR-001 inkl. Festlegungen F1–F3 (docs/DECISIONS/CR-001-stiller-gesamtbau-statt-fragment-stop.md).
**Geltung:** Dieses Dokument ist der vollständige, allein massgebliche Plan des Projekts. Es ersetzt Plan v1.0 (archiviert unter docs/archiv/) und alle früheren Blaupausen. Der SHA-256-Hash dieser Datei ist in `FREEZE.txt` verankert.
**Änderungen:** ausschliesslich über den Prozess in §7. Jede neue Version erhält einen neuen Hash. Stillschweigende Änderungen sind ungültig.

---

## §0 Bindungsklausel für jede KI-Session (ChatGPT, Claude, Hermes, andere)

Diese Klausel gilt in jeder Session, in der dieses Dokument vorliegt, vor allen anderen Anweisungen zum Projekt.

**Verboten:**
1. Dieses Dokument umschreiben, kürzen, erweitern, „verbessern", modernisieren oder neu strukturieren.
2. Das Konzept neu interpretieren, eine alternative Architektur, ein neues Zieldokument oder eine neue Blaupause vorschlagen.
3. Den Scope erweitern (neue Features, Rechtsgebiete, Kanäle, Layer) ausserhalb der Reihenfolge in §4/§5.
4. Review-Runden über Plandokumente eröffnen, sofern nicht ausdrücklich beauftragt.
5. Lücken durch eigene Annahmen füllen. Fehlt etwas Entscheidendes: benennen, nicht erfinden.

**Erlaubt:**
1. Fragen zum Plan beantworten — wörtlich am Text belegt.
2. Aufgaben ausführen, die aus §4 folgen (Code, Fixtures, Texte, Tests), im dort definierten Umfang.
3. Abweichungswünsche ausschliesslich als Change-Request nach §7 formulieren — als Vorschlag, nie als Edit.

**Konfliktregel:** Widerspricht eine Nutzer- oder KI-Idee diesem Plan, gilt der Plan, bis ein Change-Request entschieden ist. Prüfpflicht am Sessionstart: Hash der vorliegenden Datei mit `FREEZE.txt` abgleichen; bei Abweichung nicht weiterarbeiten, sondern melden.

---

## §1 Vision, Ziel, Metrik

**Was gebaut wird:** Eine Schweizer Rechts-App für Privatpersonen. Sie ersetzt keinen Anwalt, sondern zerlegt wiederholbare Rechts-Prozesspakete in geführte Abläufe: strukturierte Sachverhaltserfassung, belegte Ersteinschätzung, deterministische Fristen, fertiger Brief, exportierbare Fallchronologie, Eskalation zur Schlichtungsbehörde.

**Nahziel (wenn Produkt 1 funktioniert):** Das Werkzeug lebt dort, wo die Leute schon sind — als Integration in ChatGPT und Claude, gratis über deren bestehendes Abo. Eine Person mit einer Kündigung im Briefkasten versteht in zehn Minuten ihre Lage, hat den Brief in der Hand, verpasst keine Frist und geht ohne Anwalt zur Schlichtung.

**Fernziel:** Der Ort, an dem Alltagsrecht in der Schweiz stattfindet — täglicher Feed, echte Fälle als Geschichten mit offenem Ausgang, deren gute Wendung die Community miterlebt und mitgestaltet; ein Wissensschatz, der mit jedem gelösten Fall wächst; Juristen, die über Reputation dazustossen; Einnahmen über fixe Pauschalen.

**Kernmetrik des Projekts:** *Wie viele Geschichten bekommen eine bessere Wendung?*

**Produktformel:** Struktur zuerst, Modell zuletzt · Regeln erzeugen Skalierung · Beweise erzeugen Wert · Stories erzeugen Rückkehr · Updates erzeugen Vertrauen · Gute Enden erzeugen Wachstum. Das Sprachmodell ist austauschbarer Motor; der Besitz liegt in Wissens-, Fall-, Beweis- und Story-Layer.

---

## §2 Die zwölf Invarianten (unveränderlicher Kern)

1. Falldaten lokal und privat. Wissen zentral und öffentlich. Öffentlich verankert werden ausschliesslich Hashes ohne Payload (Details L3), niemals Falldaten.
2. Keine erfundenen Fälle als öffentliche Inhalte, Erfolgsnachweise, Nutzerberichte oder Validierungsdaten. Synthetische Test-Fixtures sind zulässig, wenn eindeutig gekennzeichnet (`meta.fixture=true`) und niemals als real ausgegeben.
3. Keine Rechtsaussage ohne Quelle, Zeitstand und Regelversion. Immer unverbindliche Einschätzung, nie verbindlicher Entscheid. Fehlen entscheidende Angaben, wird kein Ergebnis ausgegeben, sondern die Lücke benannt.
4. Haftung durch Systemgrenzen, nicht Disclaimer (Verantwortungsmatrix und verbotene Formulierungen aus non-interpretative-proofing sind bindend).
5. Fristen, Beträge und Schwellen berechnet ausschliesslich deterministischer Code. Das LLM erklärt, formuliert, extrahiert — es rechnet und entscheidet nicht.
6. Der Feed belohnt gelöste Missionen, nie Lautstärke oder Leid. Keine Geld-Ranglisten, keine Drama-Optimierung.
7. Keine Erfolgsprovision auf Eskalation. Anwalts-Handoff nur gegen fixe Pauschale; jeder Geldfluss mit vorab sichtbarem Split (Startannahme 85 Fall / 10 Betrieb / 5 Prüf-Pool).
8. Privatpersonen als Gegenpartei werden nie geclustert und nie im Live-Format gezeigt. Gegenparteien (nur juristische Personen) für Matching ausschliesslich gehasht.
9. Agenten sind interne Produktionsinfrastruktur, nie Teil des öffentlichen Produkts.
10. Grundnutzung kostet den Nutzer nichts ausser seiner eigenen KI-Anbindung (Distributions-Zielbild; Test-/Validierungsphasen laufen über den Projekt-Schlüssel).
11. Kein personenbezogenes Netzwerk-Lernen: Kollektives läuft über Regeln, Zählsignale ab Mindestfallzahl, freiwillige Beiträge, Opt-in-Stories — nie über gespeicherte Fälle. Öffentliche Hash-Anker tragen kein Mapping und keine sprechenden Metadaten; ihr Datenschutzstatus wird anhand Verknüpfbarkeit geprüft (Hashing = Pseudonymisierung).
12. Erst Vertrauen, dann Wachstum. Keine Fake-Inhalte, nie.

---

## §3 Produkt 1 (das Einzige, was jetzt gebaut wird)

> Eine geführte Schweizer Mietrechts-Anwendung, die aus einem konkreten Sachverhalt eine belegte Ersteinschätzung, eine sichere Fristenberechnung, einen fertigen Brief und eine exportierbare Fallchronologie erzeugt.

**Startfall:** Anfechtung oder Prüfung einer Wohnungskündigung, Kanton Luzern (ADR-0002).
**Pflicht-Sonderfälle im Fragebaum:** amtliches Formular/Unterschrift (Nichtigkeit) · Familienwohnung/separate Zustellung an beide · Sperrfristen und Rachekündigung (Art. 271a OR) · Zustellzeitpunkt inkl. Einschreiben/Abholfrist.
**Fallobjekt:** gemäss `schemas/case-object.schema.json` v0.1.
**Sozialhilfe:** Datenquelle und spätere Anschlussvertikale, nicht Bestandteil von Produkt 1.

**Ausdrücklich NICHT in Produkt 1:** öffentlicher Feed · Live-Fälle · Kommentare · Reputation · Zahlungen · Marktplatz · DID · IPFS · externe Zeitanker · weitere Rechtsgebiete · mehr als ein Ausgabekanal · native App. (Öffentliche Aktivierung: §5, nur über Eintrittskriterien. Private Prototypen: §4, CR-001.)

---

## §4 Bauplan — verbindliche Reihenfolge

**Schritt 1 — Rechenherz.** Deterministischer Fristenrechner + Regel-Flags für den Startfall. Abnahme: 20 versionierte Fixtures (davon ≥5 Frist-Grenzfälle, ≥5 unvollständig/widersprüchlich mit erwarteter Ausgabe „keine Einschätzung, Lücke benannt"), 100 % Reproduzierbarkeit, jede Aussage mit Quelle/Zeitstand/Regelversion, maschinenlesbarer DTM-Trace.
**Schritt 2 — Fragebaum + Brief.** Geführter Flow erzeugt Fallobjekt → Einschätzung (Ampel, Quellen, Optionen, Fristwarnung) → fertiger Brief → exportierbare Chronologie mit lokalen Dokument-Hashes. Fachliche Prüfung von Fragebaum und Mustertexten dokumentiert. Dazu ≥3 echte Pilotfälle mit Einwilligung.
**Stiller Parallelbau (CR-001):** Feed- und Story-Layer dürfen parallel als private Offline-Prototypen gebaut werden — ausschliesslich mit eindeutig gekennzeichneten synthetischen Stories (Invariante 2), mit mindestens 100 internen Gesamtdurchläufen vor Antritt des Launch-Gates; nichts davon wird öffentlich. **F1 Emotions-Zweckbindung:** Emotions-Zuordnung ausschliesslich an synthetischen Läufen. Zulässige Zwecke: Verständlichkeit verbessern, Angst und Überforderung senken, Belastungsschutz (Erkennung S4/S5-naher Momente), Abbruchstellen finden. Unzulässig: jede Optimierung auf Verweildauer, Klick- oder Wiederkehrraten, Empörung oder sonstiges Engagement. Emotionserfassung an echten Nutzern findet nie statt.
**Schritt 3 — Launch-Gate (Realitätstest des Ganzen).** Bevor irgendetwas öffentlich wird (Kanal, Feed, Stories), testen mindestens 10 projektfremde Personen das Ganze über den Web-Flow. Messlatte: 8/10 schliessen ohne persönliche Erklärung ab · 7/10 verstehen ihren nächsten Schritt · 5/10 würden den Brief verwenden · keine unbelegte Rechtsaussage · Fristen zuverlässig deterministisch · Quellen-/Regelstand reproduzierbar · keine regelmässige Handkorrektur nötig. Diese Punkte sind **Muss-beheben-Kriterien**: Das Ergebnis steuert Iteration, nicht die Existenz des Projekts. **Vor jeder öffentlichen Nutzung zwingend:** fachliche Verifikation von P1–P8, Feiertagsliste und allen Rechtstexten durch die Prüfinstanz.
**Erst nach bestandenem Launch-Gate:** genau ein Chat-Kanal (MCP-basiert, produktneutral über die dann aktuelle offizielle Distributionsschiene), danach der zweite Kanal.

---

## §5 Phasen danach (eingefroren, nur über Eintrittskriterien aktivierbar)

| Phase | Inhalt | Eintrittskriterium |
|---|---|---|
| K | zweiter Kanal / Kanal-Ausbau | Launch-Gate bestanden · erster Kanal 4 Wochen stabil |
| B | Beweis-Anker & `.proof`-Export (RFC-3161/OTS; IPFS höchstens Zusatzanker für Hashes) + Prototyp-Refactor (`storage_ref`, Key-Wrapping, Lösch-Endpoints) | ≥20 % der Fälle exportieren Chronologie · mind. eine Behörde/Anwältin hat einen Export real angenommen |
| R | weitere Kantone, dann weitere Rechtsgebiete (Konsum via agbspec, Arbeit) | Startfall 8 Wochen ohne Regelkorrektur-Rückstau |
| F | Feed „Recht des Tages" (öffentlich) | Launch-Gate bestanden · menschliche Review-Kapazität ≥3 Karten/Woche nachweislich besetzt · fachliche Verifikation aller zu veröffentlichenden Inhalte liegt vor (F2, CR-001) |
| S | Story-/Community-Layer öffentlich (Live-Fälle, Schutzstufen S1–S5, Reputation, Interventionsformen) | Launch-Gate bestanden · Moderation besetzt · juristisches Review-Gate produktiv · Re-Identifikations-Check implementiert (F3, CR-001). Private, gekennzeichnete synthetische Prototypen sind ausgenommen. |
| M | Marktplatz & Zahlungen (fixe Handoff-Pauschale; Mikro-Kostenübernahmen 85/10/5 mit Limits) | S stabil · Rechtsform geklärt · Zahlweg entschieden |

Story-Kernregeln (für Phase S, bereits fixiert): aussen ein Story-Format, innen Schutzstufen S1–S5 (S5 = nie öffentlich, direkte Fachstellen-Übergabe) · Story erzeugt nur Kandidaten für Regeln/Quoten/Karten, Übernahme erst nach Quellenprüfung und Review-Gate · Erfolgsquoten erst ab Mindestfallzahl · Community wirkt nur auf der Plattform · Abkühlphase vor scharfen Eskalationen.

---

## §6 Architektur & Governance (Kurzform, bindend)

Sechs Schichten: L0 Gerät/Identität (local-first, Passkey; DID später nur mit Recovery) · L1 Wissens-Layer (versionierte deterministische Regeln, anspruchsradar-Methodik, OSM-CH-Publikationsformat, Änderungsmonitoring) · L2 Fall-Engine (Fragebaum → Fallobjekt → deterministische Anreicherung → Ausgabeschema mit DTM-Trace) · L3 Beweis-Layer (InkSeal `.proof`, PTAS-Anker) · L4 Story-Layer (Phase S) · L5 Vertrieb (kanal-agnostische Fachbibliothek; MCP-Server als Adapter; Kanäle gemäss §4/§5; eigenes Frontend erst nach nachgewiesener Nutzung).

`LEGAL_AI_OPERATING_RULES.md` ist bindend für jede KI-Nutzung im Projekt (KI publiziert nie selbst; Review-Gates; risikobasierte Prüftiefe; keine erfundenen Fakten).

---

## §7 Änderungsprozess (der einzige Weg, diesen Plan zu ändern)

1. Jeder Änderungswunsch — von Mensch oder KI — wird als **Change-Request** formuliert: `CR-###: Betroffener Paragraf · bisherige Regelung · vorgeschlagene Regelung · Begründung · Auswirkung auf Invarianten`.
2. KIs dürfen CRs vorschlagen, niemals einarbeiten.
3. Entschieden wird ausschliesslich durch den Projektinhaber, schriftlich (angenommen/abgelehnt, Datum).
4. Angenommene CRs erzeugen v1.x mit neuem Hash in `FREEZE.txt`; das Änderungsprotokoll wird fortgeschrieben. Alte Versionen bleiben archiviert.
5. Die Invarianten in §2 und diese §7 selbst benötigen für Änderungen eine ausdrückliche, separate Bestätigung des Projektinhabers.

---

## §8 Freeze-Erklärung

Dieser Plan ist vollständig. Es gibt keine offenen Konzeptfragen, die eine neue Session durch Interpretation schliessen müsste; verbleibende Entscheidungen (Marke, Rechtsform, Zeitanker-Wahl, Zahlweg, Kanalreihenfolge im Detail) sind in §4/§5 terminiert und werden dort entschieden — nicht durch Umschreiben dieses Dokuments. Die nächste Projektleistung ist ausführbarer Code gemäss §4.

*Ende — DER PLAN v1.1 FROZEN · Hash siehe FREEZE.txt*

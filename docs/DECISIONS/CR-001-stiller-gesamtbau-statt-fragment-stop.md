# CR-001 — Stiller Gesamtbau statt Fragment-Stop

**Status:** ANGENOMMEN inkl. F1–F3 (siehe Entscheidungszeile)
**Entscheidung (nur Projektinhaber, schriftlich):** ANGENOMMEN inkl. F1–F3, 2026-08-05 — schriftlich erklärt durch den Projektinhaber in dieser Session.
**Referenz:** DER_PLAN_v1.0_FROZEN.md §7 (Änderungsprozess)

## Betroffene Paragrafen
Plan §4 (Schritt 3, Parallelverbot), §5 (Eintrittskriterium F)

## Bisherige Regelung
Realitätstest mit ≥10 projektfremden Personen als Gate vor jedem Kanal; No-Go
kann das Projekt stoppen; während Schritt 1–3 wird nichts anderes implementiert;
Feed (Phase F) erst ab ≥300 aktiven Nutzern/Monat im Kernwerkzeug.

## Vorgeschlagene Regelung
1. **Stiller Parallelbau erlaubt:** Feed- und Story-Layer dürfen als private
   Offline-Prototypen mit gekennzeichneten synthetischen Stories gebaut und mit
   ≥100 internen Durchläufen getestet werden (inkl. Emotions-Zuordnung je Klick —
   nur an synthetischen Läufen, nie an echten Nutzern). Nichts davon wird
   öffentlich.
2. **10-Personen-Test wird Launch-Gate statt Projekt-Stop:** Bevor irgendetwas
   öffentlich wird (Kanal, Feed, Stories), testen ≥10 projektfremde Personen das
   GANZE. Das Ergebnis steuert Iteration, nicht Existenz (aus No-Go-Kriterien
   werden Muss-beheben-Kriterien).
3. **Unverändert:** 3 echte, alte Pilotfälle mit Einwilligung (Schritt 2) ·
   fachliche Verifikation P1–P8 und aller Texte durch eine Prüfinstanz VOR jeder
   öffentlichen Nutzung · sämtliche Invarianten, besonders 2, 6, 11, 12.

## Begründung (Einreicher)
Das Produkt ist das Ganze (Morgenzeitungs-These); ein Fragment-Test darf die
Vision nicht beenden; Realitätskontakt bleibt vor jeder Öffentlichkeit zwingend.

## Auswirkung auf Invarianten (Angabe Einreicher)
Keine.

---

## Festlegungen zur Entscheidung (verbindlich)

**F1 Emotions-Zweckbindung:** Emotions-Zuordnung ausschliesslich an
synthetischen Offline-Läufen. Zulässige Zwecke: Verständlichkeit verbessern,
Angst und Überforderung senken, Belastungsschutz (Erkennung S4/S5-naher
Momente), Abbruchstellen finden. Unzulässig: jede Optimierung auf Verweildauer,
Klick- oder Wiederkehrraten, Empörung oder sonstiges Engagement.
Emotionserfassung an echten Nutzern findet nie statt.

**F2 Feed-Aktivierung (§5 F neu):** Das Kriterium „≥300 aktive Nutzer/Monat"
entfällt. Öffentliche Feed-Aktivierung erst, wenn kumulativ: Launch-Gate des
Ganzen bestanden (≥10 projektfremde Personen) · menschliche Review-Kapazität
≥3 Karten/Woche nachweislich besetzt · fachliche Verifikation aller zu
veröffentlichenden Rechtsinhalte liegt vor.

**F3 Phase S:** Die Schutzkriterien (Moderation besetzt · juristisches
Review-Gate produktiv · Re-Identifikations-Check implementiert) gelten
unverändert für jede Veröffentlichung echter Geschichten; ersetzt wird nur das
Vorkriterium „F läuft 8 Wochen" durch „Launch-Gate bestanden". Private
Prototypen mit gekennzeichneten synthetischen Stories sind ausgenommen.

---

## Prüfnotizen der KI (Claude, 2026-08-05 — Hinweise, keine Entscheidung)

1. **Formale Vollständigkeit nach §7:** gegeben (Paragraf, bisher, neu,
   Begründung, Invarianten-Angabe).
2. **Spannungsfeld Invariante 6 („Feed belohnt gelöste Missionen, nie
   Lautstärke oder Leid; keine Drama-Optimierung"):** Die „Emotions-Zuordnung je
   Klick" ist als Mess-Signal an synthetischen Läufen invariantenkonform
   möglich, kann aber als Optimierungsziel in Richtung Drama-Optimierung kippen.
   Empfehlung: Bei Annahme ausdrücklich festhalten, wofür Emotions-Signale
   verwendet werden dürfen (z. B. Verständlichkeit/Belastungs-Schutz) und wofür
   nicht (Engagement-/Drama-Optimierung).
3. **Präzisierungsbedarf §5 F:** Der CR nennt Eintrittskriterium F als
   betroffen, regelt aber nur den privaten Prototyp-Bau. Offen: Gilt für die
   ÖFFENTLICHE Aktivierung des Feeds weiterhin „≥300 aktive Nutzer/Monat +
   Review-Kapazität", oder ersetzt das Launch-Gate (Ziff. 2) dieses Kriterium?
   Vor der Entscheidung klären, sonst entsteht eine Lücke, die spätere Sessions
   durch Interpretation füllen müssten (verboten nach §0 Nr. 5).
4. **Präzisierungsbedarf Phase S:** Der Story-Layer (Phase S) hat eigene
   Eintrittskriterien (F 8 Wochen stabil, Moderation, Review-Gate,
   Re-Identifikations-Check). Der CR erlaubt den stillen Prototyp; ob die
   S-Eintrittskriterien für die Veröffentlichung unverändert bleiben, sollte im
   Entscheid ausdrücklich stehen (analog Ziff. 3).
5. **Invariante 2 bleibt tragfähig,** wenn synthetische Stories dieselbe
   Kennzeichnungspflicht erhalten wie Fixtures (`meta.fixture=true`-Äquivalent
   für Stories, Präfix analog `FX-`), nie in öffentliche Artefakte gelangen und
   nie als Validierungsdaten gegenüber Dritten auftreten.
6. **Verfahren bei Annahme (§7 Ziff. 4):** Der Projektinhaber (nicht die KI)
   erzeugt Plan v1.1 mit den Änderungen, bildet den neuen SHA-256 und schreibt
   FREEZE.txt (Hash + Änderungsprotokoll) fort. Die KI ändert Plan, FREEZE.txt
   und SESSION_KOPF.txt niemals — auch nach Annahme nicht (CLAUDE.md).

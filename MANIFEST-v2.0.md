# GEMEINSAM RECHT — MANIFEST v2.0

**Bindende Fassung · Stand 8. August 2026**
Ersetzt: Plan v1.1 (SHA-256 4e42ba6d…9aa906)
Grundlage: Konzeptfassung v2.0 vom 8. August 2026

Dieses Dokument enthält ausschliesslich bindende Sätze. Begründungen stehen in der
Konzeptfassung. Was hier steht, wird nicht ohne Change Request geändert (§13).

---

## §1 Zweck

**Aus jedem abgeschlossenen Fall wird eine Erkenntnis, und die bleibt.**

Gemeinsam Recht ist eine Beobachtungsstelle für Rechtswirklichkeit mit einer Zeitung
als Gesicht. Die News ist der Beweis, nicht die Behauptung.

**Wir werten nicht, wir zählen.** Dieser Satz hat Vorrang vor jedem anderen Ziel des
Projekts. Wo eine Massnahme die Reichweite, den Erlös oder die politische Wirkung
erhöhen würde, aber die Neutralität der Zählung berührt, entfällt die Massnahme.

---

## §2 Startumfang

**Gegenstand am Start sind ausschliesslich abgeschlossene Fälle.**

Nicht Teil des Starts, ausdrücklich als Nachrüstung geführt:
- aktive Fallbegleitung
- Spenden und Mikro-Kostenübernahme
- Sichter-Betrieb und Fach-Paten
- Dashboard mit Balkendarstellung

Auslöser für jede Nachrüstung ist die **Leserzahl, nicht der Kalender**. Der Schwellenwert
wird bei Bedarf per CR festgelegt, nicht vorab geschätzt.

---

## §3 Datenmodell — Pflichtfelder

Für die Herkunftsklasse `NACHERZAEHLT_OEFFENTLICH` sind bindend:

| Feld | Bemerkung |
|---|---|
| `aktenzeichen` | Ohne Aktenzeichen keine Story. Keine Ausnahme. |
| `gericht`, `instanz`, `kanton`, `datum` | |
| `rubrik` | Wegweiser \| Warnweiser \| Sackgasse |
| `regel_id` + `regel_version` | Verweis ins Wissens-Register |
| `norm_fundstelle` | |
| `ausgang` | durchgesetzt \| teilweise \| nicht_durchgesetzt \| nicht_anwendbar |
| `rechtskraft_status` | rechtskraeftig \| weitergezogen \| unbekannt — **nie leer** |
| `scheiterpunkt` bzw. `erfolgsfaktor` | mindestens ein Eintrag |
| `kodierliste_version` | Verweis auf die verwendete Fassung |
| `kodierung_geprueft` | Default `false` |

`FIKTIV` und Platzhalter sind von §3 ausgenommen und werden nicht mit realem
Ausgangs- und Rechtskraft-Vokabular kodiert.

**Felder entstehen beim Schreiben, nie nachträglich.**

---

## §4 Kodierliste

Einzige Quelle ist `wissen/scheiterpunkte.json`. Die Liste ist versioniert und in
`versionen.json` registriert. Jede Story hält fest, gegen welche Fassung sie kodiert
wurde.

Die Liste wird in diesem Manifest **nicht wiederholt**. Zwei Fassungen derselben Liste
sind ein Bruch.

Änderungen an der Liste erhöhen die Version. Bestehende Kodierungen werden nicht
stillschweigend migriert.

---

## §5 Zählregeln

Von jeder Quote ausgeschlossen:
- `rechtskraft_status` ungleich `rechtskraeftig`
- Herkunft `FIKTIV` oder Platzhalter
- zusätzlich für die Scheiterpunkt-Auswertung: `kodierung_geprueft: false`

**Ein Scheiterpunkt ist eine Deutung, keine Tatsache aus dem Urteil.** Maschinell
vorgeschlagene Kodierungen zählen nie. Gezählt wird ausschliesslich, was ein Mensch
bestätigt hat.

Jede Zählung gibt aus: Zähler, Nenner, Zahl der ausgeschlossenen Fälle je
Ausschlussgrund.

**Unterhalb der Mindestfallzahl wird keine Quote dargestellt**, sondern die Fallzahl
mit dem Hinweis, dass sie nicht ausreicht.

---

## §6 Darstellung von Zahlen

Eine Quote erscheint nie ohne ihren Nenner — im Satz selbst, nicht in einer Fussnote,
nicht in einer Legende. Wer kopiert, soll gezwungen sein, die Einschränkung
mitzukopieren.

Zulässig: „3 von 47 dokumentierten Fällen."
Unzulässig: „6 Prozent."

Keine Kreisdiagramme, keine Durchschnittswerte, keine Ampelfarben.

---

## §7 Leserinteraktion

Drei Verben: *Hat mir geholfen · Gleiche Erfahrung · Guter Punkt.*

- Die Interaktion hängt an der Etappe oder am Scheiterpunkt, nicht an der Story.
- Beschriftung stets als Leseraussage: „40 Leser berichten dasselbe." Niemals „40 Fälle."
- Leserreaktionen fliessen nie in eine Durchsetzungsquote ein. Sie werden getrennt
  geführt und getrennt ausgewiesen.

---

## §8 Regelabgleich

Der Feed urteilt nicht. Zulässige Form:

> Die Regel verlangt X. In deiner Schilderung fehlt X.
> Durchgesetzt wurde das in n von m dokumentierten Fällen.

Unzulässig ist jede Aussage darüber, wer im Recht ist.
Keine Namen. Einseitige Schilderungen bleiben sichtbar als solche markiert.

---

## §9 Publikationsgrenzen

- Publiziert wird nur, was gerichtsbestätigt und rechtskräftig ist.
- Schutzstufe S5 unverändert: Gewalt, Strafrecht, akute Gefährdung — keine Story,
  direkte Übergabe an die Fachstelle.
- Wir behaupten nie, ein Urteil sei falsch. Die Erdbeben-Kategorie (Folgenabwägung
  trägt den Entscheid statt der Rechtslage) ist nur zulässig, wenn das Eingeständnis
  von der anderen Seite kommt: höhere Instanz, EGMR, nachträgliche Reparatur durch
  den Gesetzgeber, oder das Gericht schreibt die Abwägung selbst ins Urteil.
- Eigene Erlebnisse, Erinnerungen und Eindrücke sind kein Material.

---

## §10 Zitierfähigkeit

Jede veröffentlichte Zahl trägt einen **Stand** (Datum und Fallzahl), der abrufbar
bleibt, auch wenn die Zahl weiterläuft. Ablage analog zu `versionen.json`.

Der Nenner ist mitzitierbar: welche Gerichte, welcher Zeitraum, welche
Auswahlkriterien.

Die Fallliste hinter jeder Quote ist einsehbar — Aktenzeichen für Aktenzeichen.

Bei jeder Veröffentlichung wird die Grenze mitgeführt: Die Quoten beruhen auf
dokumentierten Fällen und sind nicht repräsentativ für die Schweiz.

---

## §11 Zustellung

Automatisiert wird das Paket, nicht der Versand. Über den Versand entscheidet ein
Mensch.

Empfängerspezifischer Zuschnitt. Maschinenlesbare Auszeichnung für Suchmaschinen und
Assistenzsysteme. Keine Vervielfachung dünner Seiten.

---

## §12 Verwendungsgrenzen

Der Erfassungsstandard wird offen unter Namensnennung veröffentlicht.

Für vertraglichen Zugang (API, Abonnement) gelten bindend:
- **Nennerpflicht** — wer eine Quote nutzt, führt Stand und Fallzahl mit
- **Namensnennung**
- **Verwendungsgrenze** — keine Nutzung zur Ablehnung von Deckungen oder Ansprüchen
  gegenüber Privaten

Die Verwendungsgrenze gilt auch dann, wenn sie Erlös kostet.

---

## §13 Fortschreibung der Addenda

| | Status |
|---|---|
| **F1** — Emotionsdaten: nur synthetische Läufe, nur zum Beruhigen und Klären, nie zum Binden | **unverändert in Kraft** |
| **F2** — Feed-Aktivierung am Launch-Gate | **ersetzt durch F2′** |
| **F3** — S-Phasen-Schutzkriterien | **unverändert in Kraft** |

**F2′:** Der Feed startet mit abgeschlossenen Fällen und benötigt kein Gate. Was am
Launch-Gate hing, waren aktive Fälle; diese sind nach §2 nicht Teil des Starts. Die
Nachrüstungen nach §2 werden durch Leserzahl ausgelöst.

---

## §14 Ausserhalb dieses Freeze

Nicht gefroren, weil nicht am Schreibtisch entscheidbar:

1. Ob eine echte Story den vollen Durchlauf ohne Bruch übersteht
2. Ob ein realer Empfänger auf ein zugestelltes Paket antwortet
3. Ob genug rechtskräftige Fälle pro Woche zusammenkommen
4. Ob die Klagebewilligungs-Zahl beschaffbar ist

Ebenfalls nicht gefroren: die Erlösprognose. Sie ist eine Modellrechnung mit
offengelegten Annahmen, keine Zusage.

---

## §15 Änderungsverfahren

Ein Paragraph dieses Manifests wird geändert durch:

1. schriftlichen Change Request mit Begründung und betroffener Nummer
2. Erhöhung der Manifest-Version
3. neuen Hash und neuen Eintrag in `FREEZE.txt`
4. Vermerk, welche bestehenden Daten von der Änderung betroffen sind

Der bisherige Eintrag bleibt in `FREEZE.txt` stehen. Ein Freeze wird fortgeschrieben,
nie überschrieben.

---

*Ende Manifest v2.0*

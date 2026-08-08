# STATUS — Gemeinsam Recht

**Stand:** 2026-08-05 · **Phase:** M0 — abgeschlossen, sobald dieses Repo angelegt und geschützt ist

## Kanon
- **MANIFEST-v2.1.md** — allein massgeblich; Hash in FREEZE.txt. DER_PLAN_v1.1_FROZEN.md ist historische Vorstufe, nicht mehr geltend.
- SESSION_KOPF.txt · docs/LEGAL_AI_OPERATING_RULES.md · docs/DECISIONS/ (ADR-0002 Startfall, ADR-0003 Zielrepo; ADR-0001 abgelöst) · docs/archiv/

## Checkliste
- [x] Plan v1.0 eingefroren (SHA-256 in FREEZE.txt)
- [x] Neues Zielrepo beschlossen (ADR-0003)
- [ ] Repo angelegt und Erstinhalt gepusht (Mensch/Agent)
- [ ] Branch-Protection für main aktiv (PR-Pflicht, keine Direktpushes)
- [ ] Alt-Repos gemeinsam-recht-case-system (main/march) archiviert
- [x] §4 Schritt 1 gestartet: `claude "Lies CLAUDE.md und führe auftraege/AUFTRAG-S1-FRISTENRECHNER.md vollständig aus."`
- [x] §4 Schritt 2 (S2) technisch umgesetzt: Einschätzung/Brief/Chronologie/Webflow (berichte/AUFTRAG-S2-ABSCHLUSS.md) — fachliche Prüfung und Pilotfälle offen
- [x] CR-001 Parallelbau: Feed-Prototyp F0 (privat, offline) technisch umgesetzt (berichte/AUFTRAG-F0-ABSCHLUSS.md) — interne Durchläufe (Ziel ≥100) offen
- [x] CR-001 Parallelbau: Leser-Journey F1 (privat, offline) technisch umgesetzt (berichte/AUFTRAG-F1-ABSCHLUSS.md) — vollständige Journey-Durchläufe (Ziel ≥100) offen
- [x] §6 L1: Wissens-Register W0 (privat) technisch umgesetzt inkl. Ergänzungen E1–E3 Fehler-Rückkanal (berichte/AUFTRAG-W0-ABSCHLUSS.md) — fachliche Verifikation der Register-Einträge und Entscheid über Veröffentlichung/Repo-Split offen
- [x] CR-001 Parallelbau: Redaktion R0 (privat) technisch umgesetzt — Feed-Kategorie NACHERZAEHLT_OEFFENTLICH + Beschaffungswerkzeug redaktion/ (entscheidsuche.ch, nur Metadaten/Links) + Vorlage (berichte/AUFTRAG-R0-ABSCHLUSS.md) — Nacherzählen selbst ist menschliche Redaktionsarbeit, noch keine FS-1xx-Story angelegt
- [x] CR-001 Parallelbau: Redaktion R1 v2 (privat) umgesetzt — Trichter Sieb (npm run sieben, 1000→983/6/11) → Mappe 2026-08-07 (TOP 9, 27 verworfen) → Entwürfe FS-101–103 mit Parser-Formatgarantie (berichte/AUFTRAG-R1-ABSCHLUSS.md); FS-101–103 am 2026-08-07 freigegeben und in den Feed übernommen
- [x] CR-001 Parallelbau: R1-Folgeauftrag umgesetzt — Entwürfe FS-104–109 (TOP 4–9 der Mappe) nach Norm §4 mit Parser-Formatgarantie (berichte/AUFTRAG-R1-ABSCHLUSS.md §7) — Übernahme in den Feed erst nach schriftlicher Freigabe («FS-1xx freigegeben»); Rechtskraft-Verifikation der Quellen offen (FS-106/108 erstinstanzlich)
- [x] FS-104/105/107/109 am 2026-08-08 freigegeben und per git mv in den Feed übernommen (berichte/AUFTRAG-R1-ABSCHLUSS.md §8); FS-106/108 bleiben Entwurf (erstinstanzlich, parkiert)
- [x] Kodierte Felder (Konzept v2 §5.3) additiv ergänzt: wissen/scheiterpunkte.json (v1.0.0, in dist/versionen.json registriert), Parser-Erweiterung, Vorschlagswerte für alle neun NACHERZAEHLT-Geschichten (kodierung_geprueft: false, Liste zur Prüfung in berichte/AUFTRAG-KODIERUNG-V2-ABSCHLUSS.md §3), Quotenlogik mit Ausschlussgründen in wissen/ — FIKTIV-Geschichten bewusst nicht kodiert (§3 dort); fachliche Prüfung der Vorschläge offen
- [x] Umstellung auf Doppelkodierung (MANIFEST v2.1 §3/§5) additiv umgesetzt: kodierung_geprueft ersetzt durch kodierung_status/kodierung_quellen (alle neun Geschichten migriert, Lauf-1-Werte erhalten), Quotenlogik zählt nur doppelt_bestaetigt/mensch_bestaetigt + Übereinstimmungsquote, Export-/Import-Werkzeuge redaktion/src/kodierung-{export,import}.ts (`npm run kodierung-export`/`kodierung-import`, Export für Stapel 2026-08-08 real erzeugt, kein Zweitlauf durchgeführt) — Bericht: berichte/AUFTRAG-KODIERUNG-V2-ABSCHLUSS.md §8; MANIFEST-v2.0.md/MANIFEST-v2.1.md und FREEZE.txt-Ergänzung sind vom Nutzer aus einer parallelen Sitzung eingespielt, verbindlich, Freigabezeile bewusst leer bis zur Unterschrift
- [x] MANIFEST v2.1 §3 (Pflichtfelder aktenzeichen/instanz/kanton/rubrik/regel_id/regel_version/norm_fundstelle) und §5 (Mindestfallzahl 10) umgesetzt: Bericht vor Änderung (berichte/AUFTRAG-KODIERUNG-V2-ABSCHLUSS.md §9.1), ableitbare Werte eingetragen (§9.2; FS-101/104 vollständig, FS-107 Rubrik-Enum-Lücke offen, fünf weitere Geschichten mit offenem Registerverweis), Parser scharf geschaltet (§9.3) — sieben von neun bisher geladenen Geschichten lösen jetzt beabsichtigt einen Ladefehler aus, bis regel_id/norm_fundstelle (bzw. bei FS-107 die Rubrik) menschlich ergänzt sind; Mindestfallzahl-Konstante einmalig in wissen/tools/quoten-sicht.ts, von kodierung-quoten.ts importiert (§9.4). Alle fünf Suiten grün (357 Tests)
- [x] Normfundstellen für FS-102/103/105/106/107/108/109 aus dem Originalentscheid zurückgeholt (entscheidsuche.ch, gleiche Mechanik wie npm run kandidaten, Volltext nicht im Repo gespeichert) und ausgewertet — berichte/RUECKHOLUNG-NORMEN.md; sieben neue Register-Einträge R-CH-0011–0017 angelegt (Schema unverändert), regel_id/regel_version/norm_fundstelle in allen sieben Geschichten gesetzt; committet und gepusht (60f584f)
- [x] FS-107 rubrik: Warnweiser redaktionell entschieden (Weg zur Herabsetzung existierte, scheiterte an fehlender Substantiierung — berichte/RUECKHOLUNG-NORMEN.md §6) — alle neun Geschichten tragen jetzt alle sieben §3-Felder; sieben laden im Feed (FS-107 neu dabei), FS-106/108 bleiben Entwurf. Story.md-Zeile „Rubrik: TEILWEISE" bewusst nicht mitgeändert (Redaktionshinweis, §6). Alle fünf Suiten grün (356 Tests). Committet und gepusht (69b4bc7)
- [x] Probelauf S-2026-08-08-B nach AUFTRAG-FALLAUFNAHME durchgeführt: zwei Entwürfe angelegt (FS-110, FS-111), ein Fall verweigert (RU260009, Verfahren nicht abgeschlossen). Beide neuen Entwürfe tragen regel_id OFFEN: — Registereinträge stehen aus, die Fälle zählen in keine Quote. Parser akzeptiert jetzt das OFFEN-Muster; neuer Ausschlussgrund regel_id_offen. entwuerfe.test.ts nicht mehr auf einen festen Bestand fixiert. Acht Lücken in AUFTRAG-FALLAUFNAHME gemeldet (Bericht berichte/stapel/S-2026-08-08-B.md), Überarbeitung steht aus. Bis dahin kein weiterer Stapel.

## Regel
Keine neuen Plandokumente, keine Review-Runden über Papier.
Nächste Projektleistung ist ausführbarer Code gemäss Plan §4 Schritt 1.

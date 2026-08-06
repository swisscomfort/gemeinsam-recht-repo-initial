# Fixtures des Beschaffungswerkzeugs (AUFTRAG-R0 §4)

`beispiel-antwort.json` ist eine GESPEICHERTE Beispiel-Antwort des
Elasticsearch-Endpunkts `POST https://entscheidsuche.ch/_search.php`
(mit `_source`-Filter auf Metadaten-Felder), aufgezeichnet am 2026-08-07
bei der Schnittstellen-Abklärung. Die drei Einträge sind Metadaten
ECHTER, öffentlich publizierter Entscheide — nichts ist erfunden
(Invariante 2 betrifft erfundene Fälle; hier stehen echte, öffentliche
Metadaten als das, was sie sind).

Die Tests prüfen ausschliesslich das deterministische Listenformat aus
dieser Datei; der Netz-Abruf selbst wird in Tests nie ausgeführt.

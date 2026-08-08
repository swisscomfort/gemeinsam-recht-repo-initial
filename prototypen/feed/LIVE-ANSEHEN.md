# Den Feed-Prototyp live ansehen

Der Prototyp ist eine installierbare Web-App (PWA): einmal geladen, laeuft er
vollstaendig ohne Netz. Alle Geschichten stecken zur Bauzeit im Bundle, es gibt
keinen Server, keine Uebertragung, kein Tracking. Der Service Worker legt nur
Dateien gleicher Herkunft ab (Details und Grenzen: `public/sw.js`).

Nichts hiervon ist oeffentlich. Die folgenden Wege laufen alle auf dem eigenen
Rechner beziehungsweise im eigenen Netz.

## 1. Am Rechner, waehrend der Arbeit

```bash
cd prototypen/feed
npm install        # einmalig
npm run dev        # http://localhost:5173
```

Im Dev-Server wird der Service Worker **nicht** angemeldet (`src/pwa.ts`) — sonst
wuerde der Zwischenspeicher die Modul-Auslieferung von Vite verfaelschen. Zum
Pruefen der PWA-Eigenschaften also die gebaute Fassung nehmen:

```bash
npm run build
npm run preview    # http://localhost:4173
```

`localhost` gilt als sicherer Kontext. In Chrome/Edge erscheint dort im
Adressfeld das Installieren-Symbol; nach der Installation laeuft die
Morgenausgabe im eigenen Fenster und auch bei getrennter Verbindung weiter.

## 2. Auf dem Telefon im gleichen WLAN

```bash
npm run build
npm run vorschau-lan   # zeigt die Netzwerk-Adresse an, z. B. http://192.168.1.20:4173
```

Diese Adresse am Telefon oeffnen. **Ansehen** funktioniert sofort.
**Installieren und offline lesen** verlangt einen sicheren Kontext; ueber
schlichtes `http://` im LAN gibt es daher keinen Service Worker. Zwei Wege ohne
fremden Dienst:

- Android/Chrome: unter `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
  die LAN-Adresse eintragen und den Browser neu starten.
- Per USB: `adb reverse tcp:4173 tcp:4173`, dann am Telefon
  `http://localhost:4173` oeffnen — damit gilt der sichere Kontext regulaer.

## 3. Als Ordner weitergeben

`npm run build` erzeugt `dist/` mit relativen Pfaden (`base: "./"`). Der Ordner
laeuft unter jedem statischen Server und auch in einem Unterpfad. Ein
Doppelklick auf `dist/index.html` (`file://`) reicht nicht: Module und Service
Worker brauchen `http(s)`.

## Symbole

`public/symbol-*.png` entstehen aus Code, nicht aus einer Bilddatei:

```bash
npm run symbole
```

Der Generator (`tools/icons.mjs`) benutzt nur die Node-Standardbibliothek. Die
erzeugten Dateien sind mitversioniert, `npm run build` braucht den Schritt also
nicht.

## Was geprueft ist

`npm test` deckt die Anmelde-Entscheidung, das Web-App-Manifest, die Grenzen von
`sw.js` und `index.html` ab (`tests/pwa.test.ts`) — unter anderem, dass weder
Seite noch Service Worker eine fremde Adresse nennen.

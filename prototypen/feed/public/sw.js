/*
 * sw.js — Service Worker des Feed-Prototyps.
 *
 * Zweck: die gebaute Ausgabe offline verfuegbar machen, damit der Prototyp
 * auf einem Geraet installiert und ohne Netz gelesen werden kann.
 *
 * Grenzen, die hier bewusst eingehalten werden (AUFTRAG-F0/F1, Manifest §9):
 * - Nur gleiche Herkunft (Origin). Fremde Adressen werden nicht angefasst,
 *   nicht zwischengespeichert und nicht umgeleitet.
 * - Nur GET. Keine Hintergrund-Synchronisierung, kein Push, kein Tracking,
 *   keine Telemetrie, kein Aufruf von sich aus.
 * - Der Zwischenspeicher enthaelt ausschliesslich das, was die Seite selbst
 *   schon geladen hat: die eigenen Bau-Dateien. Geschichten sind zur Bauzeit
 *   eingebettet, es gibt also keine Datenabfrage zur Laufzeit.
 *
 * Die Version unten bei jeder Aenderung an dieser Datei erhoehen: sie bildet
 * den Namen des Zwischenspeichers, alte Staende werden beim Aktivieren
 * geloescht.
 */

const VERSION = "v1";
const SPEICHER = `gemeinsam-recht-feed-${VERSION}`;

// Bau-Dateien tragen einen Inhalts-Hash im Namen und sind daher unveraenderlich;
// nur diese beiden Einstiege sind zur Installationszeit bekannt.
const GRUNDGERUEST = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", (ereignis) => {
  ereignis.waitUntil(
    (async () => {
      const speicher = await caches.open(SPEICHER);
      // Einzeln statt addAll: ein fehlender Eintrag darf die Installation
      // nicht scheitern lassen (z. B. Unterpfad-Auslieferung ohne "./").
      await Promise.all(
        GRUNDGERUEST.map((pfad) => speicher.add(new Request(pfad, { cache: "reload" })).catch(() => undefined)),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (ereignis) => {
  ereignis.waitUntil(
    (async () => {
      const namen = await caches.keys();
      await Promise.all(
        namen
          .filter((name) => name.startsWith("gemeinsam-recht-feed-") && name !== SPEICHER)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Nur eigene GET-Anfragen werden bedient; alles andere laeuft unveraendert durch. */
function istZustaendig(anfrage) {
  if (anfrage.method !== "GET") return false;
  const adresse = new URL(anfrage.url);
  if (adresse.origin !== self.location.origin) return false;
  return adresse.protocol === "http:" || adresse.protocol === "https:";
}

self.addEventListener("fetch", (ereignis) => {
  const anfrage = ereignis.request;
  if (!istZustaendig(anfrage)) return;

  ereignis.respondWith(
    (async () => {
      const speicher = await caches.open(SPEICHER);

      // Zuerst der Zwischenspeicher: Bau-Dateien sind durch ihren Hash
      // eindeutig, ein Treffer ist immer der richtige Stand.
      const treffer = await speicher.match(anfrage, { ignoreSearch: anfrage.mode === "navigate" });
      if (treffer) return treffer;

      try {
        const antwort = await fetch(anfrage);
        // Nur vollstaendige, eigene Antworten ablegen (kein 206, kein opaque).
        if (antwort.ok && antwort.type === "basic") {
          await speicher.put(anfrage, antwort.clone());
        }
        return antwort;
      } catch (fehler) {
        // Offline: Seitenaufrufe auf die zwischengespeicherte Ausgabe zuruecknehmen.
        if (anfrage.mode === "navigate") {
          const ausgabe = (await speicher.match("./index.html")) ?? (await speicher.match("./"));
          if (ausgabe) return ausgabe;
        }
        throw fehler;
      }
    })(),
  );
});

// Erlaubt der Seite, eine wartende neue Fassung sofort zu uebernehmen.
self.addEventListener("message", (ereignis) => {
  if (ereignis.data === "uebernehmen") void self.skipWaiting();
});

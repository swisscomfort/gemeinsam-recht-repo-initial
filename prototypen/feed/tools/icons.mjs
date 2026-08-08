// icons.mjs — erzeugt die PWA-Symbole aus Code statt aus Binaerdateien.
//
// Kein Netzwerkzugriff, keine Abhaengigkeit ausserhalb der Node-Standardbibliothek
// (zlib fuer die PNG-Kompression). Aufruf: `npm run symbole`.
// Die erzeugten Dateien liegen unter public/ und werden mitversioniert, damit
// `npm run build` ohne diesen Schritt auskommt.

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HIER = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HIER, "..", "public");

/* ---------- Farben (identisch zu src/stil.css) ---------- */

const AKZENT = [0x27, 0x4c, 0x77];
const PAPIER = [0xf6, 0xf4, 0xef];
const TINTE = [0x1c, 0x24, 0x30];
const GRAU = [0x5a, 0x65, 0x72];

/* ---------- PNG-Schreiber (8 bit RGBA, ohne Interlace) ---------- */

const CRC_TABELLE = (() => {
  const tabelle = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabelle[n] = c >>> 0;
  }
  return tabelle;
})();

function crc32(puffer) {
  let c = 0xffffffff;
  for (const byte of puffer) c = CRC_TABELLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(typ, daten) {
  const laenge = Buffer.alloc(4);
  laenge.writeUInt32BE(daten.length, 0);
  const koerper = Buffer.concat([Buffer.from(typ, "ascii"), daten]);
  const pruefsumme = Buffer.alloc(4);
  pruefsumme.writeUInt32BE(crc32(koerper), 0);
  return Buffer.concat([laenge, koerper, pruefsumme]);
}

function png(breite, hoehe, pixel) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0);
  ihdr.writeUInt32BE(hoehe, 4);
  ihdr[8] = 8; // Bittiefe
  ihdr[9] = 6; // Farbtyp RGBA
  // 10..12 bleiben 0: Deflate, Adaptive Filter, kein Interlace

  const zeilen = Buffer.alloc(hoehe * (breite * 4 + 1));
  for (let y = 0; y < hoehe; y += 1) {
    const start = y * (breite * 4 + 1);
    zeilen[start] = 0; // Filtertyp "None"
    pixel.copy(zeilen, start + 1, y * breite * 4, (y + 1) * breite * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(zeilen, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- Motiv: Karte mit Schlagzeile und drei Textzeilen ---------- */

/** Deckt (x, y) in Einheitskoordinaten ein abgerundetes Rechteck ab? */
function inRechteck(x, y, [x0, y0, x1, y1], radius) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const dx = Math.max(x0 + radius - x, x - (x1 - radius), 0);
  const dy = Math.max(y0 + radius - y, y - (y1 - radius), 0);
  return dx * dx + dy * dy <= radius * radius;
}

const KARTE = [0.14, 0.12, 0.86, 0.88];
const BALKEN = [
  { rechteck: [0.24, 0.24, 0.76, 0.34], farbe: TINTE, radius: 0.012 },
  { rechteck: [0.24, 0.44, 0.76, 0.5], farbe: GRAU, radius: 0.01 },
  { rechteck: [0.24, 0.56, 0.76, 0.62], farbe: GRAU, radius: 0.01 },
  { rechteck: [0.24, 0.68, 0.58, 0.74], farbe: GRAU, radius: 0.01 },
];

/**
 * Farbe an der Stelle (u, v) in Einheitskoordinaten. `inhalt` schrumpft das
 * Motiv zur Mitte (maskierbare Symbole brauchen 20 % Rand als Sicherheitszone).
 */
function farbeAn(u, v, inhalt) {
  const x = (u - 0.5) / inhalt + 0.5;
  const y = (v - 0.5) / inhalt + 0.5;
  for (const balken of BALKEN) {
    if (inRechteck(x, y, balken.rechteck, balken.radius)) return balken.farbe;
  }
  if (inRechteck(x, y, KARTE, 0.06)) return PAPIER;
  return AKZENT;
}

/** Zeichnet mit 3x3-Ueberabtastung, damit die Kanten nicht ausfransen. */
function zeichne(groesse, inhalt) {
  const pixel = Buffer.alloc(groesse * groesse * 4);
  const proben = 3;
  for (let y = 0; y < groesse; y += 1) {
    for (let x = 0; x < groesse; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let py = 0; py < proben; py += 1) {
        for (let px = 0; px < proben; px += 1) {
          const farbe = farbeAn(
            (x + (px + 0.5) / proben) / groesse,
            (y + (py + 0.5) / proben) / groesse,
            inhalt,
          );
          r += farbe[0];
          g += farbe[1];
          b += farbe[2];
        }
      }
      const anzahl = proben * proben;
      const versatz = (y * groesse + x) * 4;
      pixel[versatz] = Math.round(r / anzahl);
      pixel[versatz + 1] = Math.round(g / anzahl);
      pixel[versatz + 2] = Math.round(b / anzahl);
      pixel[versatz + 3] = 255;
    }
  }
  return png(groesse, groesse, pixel);
}

/* ---------- Ausgabe ---------- */

const SYMBOLE = [
  { datei: "symbol-192.png", groesse: 192, inhalt: 1 },
  { datei: "symbol-512.png", groesse: 512, inhalt: 1 },
  { datei: "symbol-maskierbar-512.png", groesse: 512, inhalt: 0.72 },
];

mkdirSync(PUBLIC, { recursive: true });
for (const { datei, groesse, inhalt } of SYMBOLE) {
  writeFileSync(join(PUBLIC, datei), zeichne(groesse, inhalt));
  console.log(`geschrieben: public/${datei} (${groesse}x${groesse})`);
}

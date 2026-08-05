/**
 * DTM-Trace gemaess docs/LEGAL_AI_OPERATING_RULES.md §4.
 *
 * Enthaelt eine reine TypeScript-SHA-256-Implementierung (keine
 * Laufzeit-Abhaengigkeiten, kein node:crypto — damit bleibt src/
 * plattformneutral und ohne externe Typen kompilierbar) sowie eine
 * kanonische JSON-Serialisierung (sortierte Schluessel) fuer den
 * deterministischen fallobjekt_hash.
 */
import { REGELVERSION } from "./regeln.js";
import { QUELLENSTAND } from "./quellen.js";
import type { DtmTrace, IsoDate } from "./types.js";

/* ---------- kanonisches JSON ---------- */

export function stableStringify(wert: unknown): string {
  if (wert === null || typeof wert !== "object") {
    return JSON.stringify(wert) ?? "null";
  }
  if (Array.isArray(wert)) {
    return `[${wert.map((e) => stableStringify(e)).join(",")}]`;
  }
  const obj = wert as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  const teile = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
  return `{${teile.join(",")}}`;
}

/* ---------- SHA-256 (FIPS 180-4), reine TS-Implementierung ---------- */

const K: readonly number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function utf8Bytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let cp = text.codePointAt(i) as number;
    if (cp > 0xffff) i++; // Surrogatpaar
    if (cp < 0x80) {
      bytes.push(cp);
    } else if (cp < 0x800) {
      bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    }
  }
  return bytes;
}

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

export function sha256Hex(text: string): string {
  const msg = utf8Bytes(text);
  const bitLen = msg.length * 8;

  // Padding
  msg.push(0x80);
  while (msg.length % 64 !== 56) msg.push(0x00);
  // 64-Bit-Laenge big-endian (JS-Zahlen reichen fuer < 2^53 Bit)
  const hi = Math.floor(bitLen / 0x100000000);
  const lo = bitLen >>> 0;
  msg.push((hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff);
  msg.push((lo >>> 24) & 0xff, (lo >>> 16) & 0xff, (lo >>> 8) & 0xff, lo & 0xff);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const w = new Array<number>(64);
  for (let block = 0; block < msg.length; block += 64) {
    for (let t = 0; t < 16; t++) {
      const i = block + t * 4;
      w[t] =
        (((msg[i] as number) << 24) |
          ((msg[i + 1] as number) << 16) |
          ((msg[i + 2] as number) << 8) |
          (msg[i + 3] as number)) >>>
        0;
    }
    for (let t = 16; t < 64; t++) {
      const w15 = w[t - 15] as number;
      const w2 = w[t - 2] as number;
      const s0 = (rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3)) >>> 0;
      const s1 = (rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10)) >>> 0;
      w[t] = ((w[t - 16] as number) + s0 + (w[t - 7] as number) + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; t++) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + (K[t] as number) + (w[t] as number)) >>> 0;
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e;
      e = (d + temp1) >>> 0;
      d = c; c = b; b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((x) => x.toString(16).padStart(8, "0"))
    .join("");
}

/* ---------- Trace ---------- */

export function hashFallobjekt(fall: unknown): string {
  return sha256Hex(stableStringify(fall));
}

export function baueTrace(args: {
  heute: IsoDate;
  fallobjektHash: string;
  alternativen: string[];
  begruendung: string;
}): DtmTrace {
  return {
    gegenstand: "fristenberechnung_mietkuendigung",
    // Deterministisch aus dem injizierten `heute` gesetzt (kein Date.now).
    zeitpunkt: `${args.heute}T00:00:00Z`,
    rolle: "fall-engine",
    basis: {
      fallobjekt_hash: args.fallobjektHash,
      regelversion: REGELVERSION,
      quellenstand: QUELLENSTAND,
    },
    alternativen: args.alternativen,
    begruendung: args.begruendung,
  };
}

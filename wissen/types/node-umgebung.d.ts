// Minimale Ambient-Typen fuer die Node-Werkzeuge unter wissen/tools/.
// Bewusst KEIN @types/node: keine neuen Dev-Abhaengigkeiten ohne Freigabe
// (CLAUDE.md); die Werkzeuge nutzen nur diese wenigen Funktionen.

declare module "node:fs" {
  export function readFileSync(pfad: string, encoding: "utf8"): string;
  export function writeFileSync(pfad: string, inhalt: string): void;
  export function mkdirSync(pfad: string, optionen?: { recursive?: boolean }): void;
  export function readdirSync(pfad: string): string[];
  export function existsSync(pfad: string): boolean;
}

declare module "node:path" {
  export function join(...teile: string[]): string;
  export function dirname(pfad: string): string;
  export function basename(pfad: string): string;
}

declare module "node:url" {
  export function fileURLToPath(url: string): string;
}

declare const process: {
  argv: string[];
  exitCode: number | undefined;
};

declare const console: {
  log(...argumente: unknown[]): void;
};

/** Nur was vitest.config.ts braucht (wie im Feed: keine @types/node). */
declare class URL {
  constructor(url: string, basis?: string);
  pathname: string;
}

interface ImportMeta {
  url: string;
}

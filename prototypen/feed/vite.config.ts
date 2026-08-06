import { defineConfig } from "vitest/config";

// Stories (prototypen/stories/), der S2-Fragebaum (webflow/src/fragen.ts,
// gemeinsames Modul gemaess AUFTRAG-F1 §2) und der deterministische Kern
// (core/src) liegen ausserhalb des Vite-Roots; der Dev-Server braucht dafuer
// eine fs-Freigabe auf die Repo-Wurzel. Pfade ohne node:url aufloesen,
// damit keine zusaetzlichen Dev-Abhaengigkeiten (@types/node) noetig sind.
const pfad = (relativ: string): string =>
  decodeURIComponent(new URL(relativ, import.meta.url).pathname);

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "@core": pfad("../../core/src"),
    },
  },
  server: {
    fs: {
      allow: [pfad("../..")],
    },
  },
  test: {
    environment: "node",
  },
});

import { defineConfig } from "vitest/config";

// Der deterministische Kern (core/src) und der Feed-Prototyp (prototypen/feed)
// liegen ausserhalb dieses Pakets; Pfade ohne node:url aufloesen, damit keine
// zusaetzlichen Dev-Abhaengigkeiten (@types/node) noetig sind (wie im Feed).
const pfad = (relativ: string): string =>
  decodeURIComponent(new URL(relativ, import.meta.url).pathname);

export default defineConfig({
  resolve: {
    alias: {
      "@core": pfad("../core/src"),
    },
  },
  test: {
    environment: "node",
  },
});

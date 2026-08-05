import { defineConfig } from "vitest/config";

// Die Stories liegen ausserhalb des Vite-Roots (prototypen/stories/); der
// Dev-Server braucht dafuer eine fs-Freigabe. Pfade ohne node:url aufloesen,
// damit keine zusaetzlichen Dev-Abhaengigkeiten (@types/node) noetig sind.
const pfad = (relativ: string): string =>
  decodeURIComponent(new URL(relativ, import.meta.url).pathname);

export default defineConfig({
  base: "./",
  server: {
    fs: {
      allow: [pfad("..")],
    },
  },
  test: {
    environment: "node",
  },
});

import { defineConfig } from "vite";

// Die Fachlogik kommt unveraendert aus core/src (S1/S2); es gibt keinen
// eigenen Rechenpfad im Webflow. Pfade ohne node:url aufloesen, damit
// keine zusaetzlichen Dev-Abhaengigkeiten (@types/node) noetig sind.
const pfad = (relativ: string): string =>
  decodeURIComponent(new URL(relativ, import.meta.url).pathname);

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "@core": pfad("../core/src"),
    },
  },
  server: {
    fs: {
      allow: [pfad("..")],
    },
  },
});

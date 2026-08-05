// quelle.ts — einzige Story-Quelle des Prototyps (AUFTRAG-F0, Teil A).
//
// Geschichten kommen ausschliesslich aus prototypen/stories/<ID>/meta.yaml
// + story.md. Die Dateiliste entsteht beim Build (Vite-Glob); zur Laufzeit
// gibt es keinerlei Netzzugriff.

import { pruefeStory, type Story, type Verweigerung } from "./story";

const metaDateien = import.meta.glob("../../stories/*/meta.yaml", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const storyDateien = import.meta.glob("../../stories/*/story.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function verzeichnisVon(pfad: string): string {
  return pfad.slice(0, pfad.lastIndexOf("/"));
}

export interface Ladeergebnis {
  akzeptiert: Story[];
  verweigert: Verweigerung[];
}

export function ladeAlle(): Ladeergebnis {
  const verzeichnisse = new Set<string>();
  for (const pfad of Object.keys(metaDateien)) verzeichnisse.add(verzeichnisVon(pfad));
  for (const pfad of Object.keys(storyDateien)) verzeichnisse.add(verzeichnisVon(pfad));

  const akzeptiert: Story[] = [];
  const verweigert: Verweigerung[] = [];

  for (const verzeichnis of [...verzeichnisse].sort()) {
    const name = verzeichnis.slice(verzeichnis.lastIndexOf("/") + 1);
    const metaRoh = metaDateien[`${verzeichnis}/meta.yaml`];
    const storyRoh = storyDateien[`${verzeichnis}/story.md`];
    if (metaRoh === undefined || storyRoh === undefined) {
      verweigert.push({
        quelle: name,
        gruende: [metaRoh === undefined ? "meta.yaml fehlt" : "story.md fehlt"],
      });
      continue;
    }
    const ergebnis = pruefeStory(name, metaRoh, storyRoh);
    if (ergebnis.ok) {
      akzeptiert.push(ergebnis.story);
    } else {
      verweigert.push(ergebnis.verweigerung);
    }
  }

  return { akzeptiert, verweigert };
}

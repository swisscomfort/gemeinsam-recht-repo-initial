// pwa.ts — Anmeldung des Service Workers (public/sw.js).
//
// Der Prototyp soll auf einem Geraet installierbar und ohne Netz lesbar sein.
// Registriert wird nur in der gebauten Fassung: im Dev-Server wuerde ein
// Zwischenspeicher die Modul-Auslieferung von Vite verfaelschen.
//
// Diese Datei entscheidet und meldet an; sie ruft von sich aus nichts ab.
// Die Regeln des Zwischenspeichers stehen vollstaendig in public/sw.js.

export interface PwaUmgebung {
  /** Gebaute Fassung (nicht Dev-Server)? */
  produktion: boolean;
  /** Sicherer Kontext (https oder localhost)? Sonst gibt es keine Service Worker. */
  sichererKontext: boolean;
  /** Kennt der Browser Service Worker? */
  unterstuetzt: boolean;
}

/**
 * Reine Entscheidung, ohne Seiteneffekt: Soll der Service Worker angemeldet
 * werden? Alle drei Bedingungen muessen zutreffen.
 */
export function sollRegistrieren(umgebung: PwaUmgebung): boolean {
  return umgebung.produktion && umgebung.sichererKontext && umgebung.unterstuetzt;
}

/** Liest die tatsaechliche Umgebung aus. */
export function umgebungLesen(): PwaUmgebung {
  return {
    produktion: import.meta.env.PROD,
    sichererKontext: typeof window !== "undefined" && window.isSecureContext,
    unterstuetzt: typeof navigator !== "undefined" && "serviceWorker" in navigator,
  };
}

/**
 * Meldet public/sw.js an — relativ zur Seite, damit die Auslieferung in einem
 * Unterpfad genauso funktioniert wie im Wurzelverzeichnis (`base: "./"`).
 * Fehler bleiben folgenlos: ohne Service Worker laeuft der Prototyp unveraendert,
 * nur eben nicht offline.
 */
export function registriereServiceWorker(umgebung: PwaUmgebung = umgebungLesen()): void {
  if (!sollRegistrieren(umgebung)) return;

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => undefined);
  });
}

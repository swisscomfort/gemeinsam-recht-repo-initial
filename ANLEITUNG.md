# Repo anlegen (zwei Wege)

## Weg A — Browser-Agent oder von Hand (ohne Kommandozeile)
1. GitHub → New repository → Name z. B. `gemeinsam-recht` → **Private** → ohne README anlegen.
2. Kompletten Inhalt dieses Pakets strukturgetreu hochladen (ein Commit: "M0: Kanon + Governance + Auftrag S1").
3. Prüfen: SHA-256 von `DER_PLAN_v1.0_FROZEN.md` muss dem Wert in `FREEZE.txt` entsprechen.
4. Settings → Branches → Protection rule für `main`: "Require a pull request before merging", Direktpushes verbieten.
5. Alt-Repos `gemeinsam-recht-case-system` und `…-march`: Settings → "Archive this repository".

## Weg B — Kommandozeile
```bash
cd /pfad/zum/entpackten/gemeinsam-recht
git init -b main && git add -A
git commit -m "M0: Kanon + Governance + Auftrag S1 (Plan-Anker 32b3b899…)"
gh repo create gemeinsam-recht --private --source . --push
# danach Schritt 4 und 5 aus Weg A im Browser
```

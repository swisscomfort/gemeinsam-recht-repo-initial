#!/usr/bin/env bash
# Holt das neueste Claude-Code-Protokoll dieses Projekts in den Projektordner.
set -e
PROJ="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$PROJ/terminalausgabeclaudecli"; mkdir -p "$DIR"
SLUG=$(printf '%s' "$PROJ" | sed 's#[/.]#-#g')
SRC=$(ls -t "$HOME/.claude/projects/$SLUG"/*.jsonl 2>/dev/null | head -1)
[ -n "$SRC" ] || { echo "Kein Protokoll unter ~/.claude/projects/$SLUG gefunden"; exit 1; }
BASE="$DIR/$(date +%Y-%m-%d)_$(basename "$SRC" .jsonl)"
cp "$SRC" "$BASE.jsonl"
jq -r '.message? // empty | .role as $r
  | (.content | if type=="string" then .
     else ([ .[]? | select(.type=="text") | .text ] | join("\n")) end)
  | select(length>0) | "[\($r)]\n\(.)\n"' "$BASE.jsonl" > "$BASE.txt" || true
echo "Gespeichert:"; ls -la "$BASE".*

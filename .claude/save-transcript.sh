#!/usr/bin/env bash
IN=$(cat)
PROJ="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
DIR="$PROJ/terminalausgabeclaudecli"; mkdir -p "$DIR"
echo "$(date '+%F %T') hook: $(printf '%s' "$IN" | jq -r '.hook_event_name // "?"')" >> "$DIR/.hook.log"
TP=$(printf '%s' "$IN" | jq -r '.transcript_path // empty')
SID=$(printf '%s' "$IN" | jq -r '.session_id // "sitzung"')
[ -n "$TP" ] && [ -f "$TP" ] || exit 0
BASE="$DIR/$(date +%Y-%m-%d)_${SID}"
cp "$TP" "$BASE.jsonl"
jq -r '.message? // empty | .role as $r
  | (.content | if type=="string" then .
     else ([ .[]? | select(.type=="text") | .text ] | join("\n")) end)
  | select(length>0) | "[\($r)]\n\(.)\n"' "$BASE.jsonl" > "$BASE.txt" 2>/dev/null || true
exit 0

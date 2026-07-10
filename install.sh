#!/usr/bin/env bash
# Install the /codex skill into Claude Code (~/.claude/skills/codex/).
set -euo pipefail

DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}/codex"
SRC="$(cd "$(dirname "$0")" && pwd)"

if ! command -v codex >/dev/null 2>&1; then
  echo "!! The 'codex' CLI isn't installed. Install it and run 'codex login' first:"
  echo "   https://developers.openai.com/codex/cli"
  echo "   (installing the skill anyway — it just won't work until codex is available)"
fi

mkdir -p "$DEST/scripts" "$DEST/schemas"
cp "$SRC/SKILL.md" "$DEST/SKILL.md"
cp "$SRC/scripts/codex-quota.mjs" "$DEST/scripts/codex-quota.mjs"
cp "$SRC/schemas/result.schema.json" "$DEST/schemas/result.schema.json"

echo "✓ Installed /codex → $DEST"
echo "  (SKILL.md + scripts/codex-quota.mjs + schemas/result.schema.json)"
echo "  Try:  /codex write tests for <file>"

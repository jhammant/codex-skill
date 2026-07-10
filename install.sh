#!/usr/bin/env bash
# Install the /codex skill into Claude Code (~/.claude/skills/codex/SKILL.md).
set -euo pipefail

DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}/codex"
SRC="$(cd "$(dirname "$0")" && pwd)/SKILL.md"

if ! command -v codex >/dev/null 2>&1; then
  echo "!! The 'codex' CLI isn't installed. Install it and run 'codex login' first:"
  echo "   https://developers.openai.com/codex/cli"
  echo "   (installing the skill anyway — it just won't work until codex is available)"
fi

mkdir -p "$DEST"
cp "$SRC" "$DEST/SKILL.md"
echo "✓ Installed /codex → $DEST/SKILL.md"
echo "  Start a new Claude Code session, then try:  /codex write tests for <file>"

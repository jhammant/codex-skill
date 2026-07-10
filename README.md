# codex-skill

A [Claude Code](https://claude.com/claude-code) skill that delegates a self-contained
coding task to **[Codex](https://developers.openai.com/codex/cli)** (OpenAI's CLI agent)
— running it in the background on its **own quota pool** while you keep working in
Claude, then handing you the diff to review.

Two AI coding agents, one terminal, two separate quotas. Use Claude for the work that
needs your conversation's context; spin off well-scoped units to Codex — write tests,
implement a module, refactor a file — without spending Claude's budget.

## Why

- **Parallelism.** Codex churns on a hand-off-able task while you keep moving in Claude.
- **Separate quota.** Codex runs on your ChatGPT subscription, so it doesn't eat Claude
  quota — and it spends Codex quota that would otherwise expire unused.
- **Sandboxed + reviewed.** Codex runs `--sandbox workspace-write` (edits in-dir only,
  no network) and the skill never auto-commits — you always see the diff first.

## Install

Requires the [`codex` CLI](https://developers.openai.com/codex/cli) installed and signed
in (`codex login`).

```bash
git clone https://github.com/jhammant/codex-skill.git
cd codex-skill
./install.sh          # copies SKILL.md to ~/.claude/skills/codex/SKILL.md
```

Or manually:

```bash
mkdir -p ~/.claude/skills/codex
cp SKILL.md ~/.claude/skills/codex/SKILL.md
```

Restart Claude Code (or start a new session) so it picks up the skill.

## Use

In Claude Code:

```
/codex write tests for src/parser.ts covering the empty-input and unicode cases
```

Claude will package a self-contained prompt, dispatch `codex exec` (in the background if
it's a longer job), and — when Codex finishes — show you what changed and let you decide
whether to keep it.

Good tasks are self-contained and checkable ("implement X so its tests pass"). Keep
anything needing back-and-forth, cross-repo orchestration, or this conversation's
context on Claude.

## How it works

Under the hood the skill runs:

```bash
codex exec --json --sandbox workspace-write --skip-git-repo-check \
  -C "<dir>" -o "/tmp/codex-<slug>.txt" "<self-contained prompt>"
```

It inherits the model from `~/.codex/config.toml` (e.g. `gpt-5.6-sol`); pass `-m <model>`
or `-c model_reasoning_effort=<low|medium|high|xhigh>` to override.

## License

MIT — see [LICENSE](LICENSE).

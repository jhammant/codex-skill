---
name: codex
description: >-
  Delegate a self-contained coding task to Codex (OpenAI's CLI agent, gpt-5.6-sol) so
  it runs in the background on its own quota pool while you keep working in Claude Code,
  then review its diff. Use when asked to "send this to codex", "spawn a codex task",
  run both models in parallel, or hand off a well-scoped unit (write tests, implement a
  module, refactor a file) — especially when Claude's quota is tight.
---

# /codex — delegate a task to Codex

Hand a **self-contained** coding task to the `codex` CLI. Codex runs sandboxed to the
working directory on a separate (ChatGPT-subscription) quota pool, so it's ideal for
parallelising work or conserving Claude quota. Requires the `codex` CLI installed and
authenticated (`codex login`).

## When invoked as `/codex <task>` (or asked to delegate to Codex)

1. **Scope it — Codex has NONE of this conversation's context.** Write ONE
   self-contained prompt containing: the exact files/paths to touch, what to change,
   the acceptance criteria, and an explicit "run the tests and report the results".
   Resolve any `@file` mentions to absolute paths. If the task is vague, sharpen it with
   the user before dispatching — a fuzzy spec wastes a whole Codex run.

2. **Pick the working dir + safety.**
   - Default: the current repo/dir. Codex runs `--sandbox workspace-write` — it can read
     and write files *inside that dir* but has no network and no access outside it.
   - For risky or large changes, create a branch first (`git switch -c codex/<slug>`) so
     the work lands somewhere you review before it touches anything you care about.

3. **Dispatch.** Run via the Bash tool:
   ```bash
   codex exec --json --sandbox workspace-write --skip-git-repo-check \
     -C "<dir>" -o "/tmp/codex-<slug>.txt" "<self-contained prompt>"
   ```
   - To **spawn it off** and keep working in Claude, run this in the **background**
     (Bash `run_in_background: true`). You'll be re-invoked when it finishes.
   - Run it in the **foreground** for quick tasks you want to wait on.
   - It inherits the model from `~/.codex/config.toml` (currently `gpt-5.6-sol`). Add
     `-m <model>` to override, or `-c model_reasoning_effort=<low|medium|high|xhigh>` to
     tune effort — start low for simple tasks, raise it for hard ones.

4. **Review — never auto-commit.** When Codex finishes:
   - Read `/tmp/codex-<slug>.txt` (its final message).
   - Run `git -C "<dir>" diff` and `git -C "<dir>" status` to see exactly what changed.
   - Summarise what it did and show the diff. Let the **user** decide to keep, tweak, or
     discard it. Only commit if they ask.

5. **If it reports auth trouble** ("sign in again" / token expired / `refresh_token`),
   tell the user to run `codex login` — don't silently retry.

## Good vs bad tasks

**Good** (hand-off-able, self-contained, checkable):
- "Write tests for `src/foo.mjs` covering the edge cases; run them and report."
- "Implement the parser in `parser.ts` so `parser.test.ts` passes."
- "Refactor `X` into `Y` across this package; keep the existing tests green."

**Bad** (keep these on Claude):
- Anything needing this conversation's context or tight back-and-forth.
- Iterative exploration, or cross-repo orchestration.
- Tasks where you can't write a clear acceptance check.

## Why this pattern

Codex and Claude draw from **separate quota pools**, so delegating genuinely
parallelises work rather than competing for Claude's budget — and it lets you spend
Codex/ChatGPT quota that would otherwise sit idle. It complements Claude Code's Task
tool: **Task** spawns *Claude* subagents (Claude quota); **/codex** spawns *Codex* (its
own pool).

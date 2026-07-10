---
name: codex
description: >-
  Delegate self-contained coding tasks to Codex (OpenAI's CLI agent, gpt-5.6-sol) so they
  run sandboxed in the background on a separate quota pool while you keep working in Claude
  Code — then Claude verifies the result (runs the tests, fixes failures) and hands you the
  diff to review. Use when asked to "send this to codex", "spawn a codex task", run both
  models in parallel, or hand off well-scoped units (write tests, implement a module,
  refactor a file) — especially when Claude's quota is tight. Supports fan-out across
  several files at once.
---

# /codex — delegate a task (or several) to Codex, then verify

Hand **self-contained** coding tasks to the `codex` CLI. Codex runs sandboxed to the
working directory on a separate (ChatGPT-subscription) quota pool. Requires the `codex`
CLI installed and signed in (`codex login`). Scripts referenced below live in this
skill's base directory (call it `SKILL_DIR`).

## 0. Quota pre-check

Run `node "$SKILL_DIR/scripts/codex-quota.mjs"` first. It prints the 5h + weekly Codex
usage and exits non-zero (3) when weekly is near the cap. If it warns, tell the user
Codex is nearly spent and ask whether to proceed or keep the work on Claude. (If codex
isn't set up yet it just says so and exits 0 — proceed.)

## 1. Scope it — Codex has NONE of this conversation's context

Write ONE self-contained prompt per task: the exact files/paths to touch, what to change,
the acceptance criteria, and an explicit "run the tests and report the results". Resolve
any `@file` mentions to absolute paths. If the task is vague, sharpen it with the user
first — a fuzzy spec wastes a whole Codex run.

**Pick reasoning effort by difficulty** (Sol is strong at low effort — start low, raise
for hard jobs). Add `-c model_reasoning_effort=<effort>`:
- `low` — mechanical/small: single-function edits, adding obvious tests, renames.
- `medium` — a contained module or a few files with clear structure.
- `high` / `xhigh` — genuinely hard: tricky algorithms, wide refactors, subtle bugs.
Don't just inherit the config default (often `xhigh`) — it's slower and costs more than
simple tasks need.

## 2. Safety — branch by default for file-changing tasks

If the task modifies files (anything but a pure question), create a branch first so main
is never touched and review/rollback is trivial:
```bash
git -C "<dir>" switch -c "codex/<slug>" 2>/dev/null || git -C "<dir>" switch "codex/<slug>"
```
Codex runs `--sandbox workspace-write` — it reads/writes *inside `<dir>` only*, no network,
nothing outside. For a pure question, use `--sandbox read-only` and skip the branch.

## 3. Dispatch — one task, or fan out across several

**Single task** (background if it's more than a quick job — you keep working in Claude and
get re-invoked when it finishes):
```bash
codex exec --json --sandbox workspace-write --skip-git-repo-check \
  -c model_reasoning_effort="<effort>" \
  -C "<dir>" -o "/tmp/codex-<slug>.txt" "<self-contained prompt>"
```

**Fan-out** — for independent units ("write tests for every file in `src/`"), dispatch
several runs **in parallel in the background** (each with its own `-C`/`-o`/slug), then
collect all their results. This is where the separate quota pool pays off: many Codex
runs at once cost zero Claude quota. Keep each unit independent so they don't collide on
the same files.

**Structured results (optional but preferred for multi-file work):** add
`--output-schema "$SKILL_DIR/schemas/result.schema.json"` so Codex's final message is JSON
(`{summary, filesChanged, testsRun, testsPassed, status, notes}`) you can parse reliably
instead of scraping prose.

Model: inherits `~/.codex/config.toml` (currently `gpt-5.6-sol`); add `-m <model>` to
override.

## 4. Verify-and-fix loop (don't just trust the output)

After each task finishes, **Claude** verifies — don't take Codex's word for it:
1. Read `/tmp/codex-<slug>.txt` (its final message / structured result).
2. Run the project's tests yourself (e.g. `npm test`, `pytest`, whatever the repo uses).
3. **If they fail**, re-dispatch to Codex with the failure output appended:
   `"Your previous change left these tests failing: <paste>. Fix them; run the tests again."`
   — same branch/dir. Cap at **2 fix passes**; if still red, stop and report to the user
   with the failures rather than looping.

This turns fire-and-forget into a reliable delegated unit: Codex builds it, Claude checks
it, Codex fixes it.

## 5. Review — never auto-commit

- `git -C "<dir>" diff` and `git -C "<dir>" status` to see exactly what changed.
- Summarise what each task did, the test result, and show the diff (per branch for fan-out).
- Let the **user** decide to keep, tweak, merge, or discard. Only commit/merge if they ask.
- If Codex reports auth trouble ("sign in again" / token expired / `refresh_token`), tell
  the user to run `codex login` — don't silently retry.

## Good vs bad tasks

**Good** (hand-off-able, self-contained, checkable): "Write tests for `src/foo.mjs`
covering the edge cases; run them." · "Implement the parser in `parser.ts` so
`parser.test.ts` passes." · "Refactor `X` into `Y`; keep the tests green."

**Bad** (keep on Claude): anything needing this conversation's context or tight
back-and-forth · iterative exploration · cross-repo orchestration · tasks with no clear
acceptance check.

## Why this pattern

Codex and Claude draw from **separate quota pools**, so delegating parallelises work
rather than competing for Claude's budget — and it spends Codex/ChatGPT quota that would
otherwise sit idle. It complements Claude Code's Task tool: **Task** spawns *Claude*
subagents (Claude quota); **/codex** spawns *Codex* (its own pool).

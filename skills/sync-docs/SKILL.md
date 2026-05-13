---
name: sync-docs
description: Keep paperclip-docs in lockstep with the parent paperclipai/paperclip codebase. Detects code-surface changes (CLI, env vars, API routes, adapters, plugin SDK, schemas) and produces friendly-tutorial-voice doc updates. Two modes — `nightly` (tracks parent main, targets the `nightly` branch, preview deploy) and `release` (on parent tag, merges nightly → main, tags, ships live). Trigger phrases:  "sync docs", "update docs from paperclip", "/sync-docs", "check for paperclip changes", "is docs current".
---

# /sync-docs — Paperclip docs sync skill

This skill keeps **paperclip-docs** in lockstep with the parent code repo **paperclipai/paperclip**, rewriting changes in our friendly-tutorial voice for an audience that spans end users, operators, and developers.

> Our docs are not a translation of the parent's docs. The **parent's code** is the source of truth. The parent's release notes and inline docs are reference data for understanding intent.

## Mental model

| | `nightly` mode | `release` mode |
|---|---|---|
| Tracks | parent `main` HEAD | parent's latest **release tag** |
| Targets | `nightly` branch of this repo | `main` branch of this repo (via PR from `nightly`) |
| Deploys to | Cloudflare Pages branch preview | docs.paperclip.ing |
| Audience | early adopters, contributors | everyone — end users to devs |
| Run cadence | daily (cron / `/loop 24h`) | when a new parent tag appears |
| Touches live? | No | Yes |

The branch model is non-negotiable: end users on the latest *released* paperclip must never see docs for features that aren't out yet.

## Files this skill reads / writes

- `scripts/sync/anchor-map.json` — read-only config: which parent paths to watch, which docs paths they map to, which tier (auto-merge vs PR).
- `.sync-state.json` — read/write: where this branch last left off.
- `docs/user-guides/screenshots/registry.json` — read/write: screenshot dependency tracking.
- `PENDING.md` (on `nightly` branch only) — write: human-readable change manifest accumulating since last release.

## Invocation

```
/sync-docs                  # auto: nightly if no new parent tag, release if new tag
/sync-docs --nightly        # force nightly mode
/sync-docs --release        # force release mode
/sync-docs --dry-run        # triage only, no edits, no commits, no PRs
/sync-docs --since v2026.318.0   # override starting point
/sync-docs --batched        # release mode only: one PR per release tag (use for big gaps)
```

## Preconditions to verify before doing anything

1. `gh auth status` is logged in (we need GitHub API for parent repo).
2. Working tree is clean (`git status`). If dirty, abort and tell the user — never stash their work.
3. `.sync-state.json` exists and parses. If missing, abort and tell the user to seed it from `scripts/sync/state.example.json`.
4. `scripts/sync/anchor-map.json` exists and parses.

## Step-by-step

### Phase 1 — Decide mode and target branch

1. Read `.sync-state.json`. Note `mode` and `synced_to`.
2. Fetch parent's latest release: `gh api repos/paperclipai/paperclip/releases/latest -q '.tag_name'`.
3. Auto-detect mode (unless overridden):
   - If a new release tag exists AND `synced_to` is older → **release mode**.
   - Otherwise → **nightly mode**.
4. Check out the right branch:
   - Release mode: ensure on `main`. If `nightly` branch doesn't exist yet, the release is a no-op until nightly has produced drafts; tell the user and exit.
   - Nightly mode: ensure on `nightly`. If `nightly` doesn't exist, create it from `main`.
5. Nightly mode only: **merge `main` into `nightly` first** to absorb any hot-fix typos that landed on released docs. Resolve trivially or abort if conflicts need human attention.

### Phase 2 — Resolve the diff window

- Release mode: `prev_tag = synced_to`, `next_tag = latest release tag`. Build a list of tags between them (chronological) so we can produce one PR per tag if `--batched`.
- Nightly mode: `prev_sha = synced_sha`, `next_sha = parent main HEAD`. Apply quarantine: subtract any commits younger than `quarantine_hours` from the window.

For each window:

```
gh api repos/paperclipai/paperclip/compare/$PREV...$NEXT \
  -q '.files[] | {filename, status, additions, deletions, patch}'
```

Cache result under `/tmp/paperclip-sync/<sha>/` so we don't refetch within a run.

### Phase 3 — Surface diff (the change manifest)

For each watcher in `anchor-map.json`:

1. Intersect the changed-files list with the watcher's `parent_paths` globs.
2. For matching files, apply the watcher's detection rule (descriptions in `anchor-map.json`'s `detect` field — interpret semantically, you're not running grep blindly).
3. Output a structured entry:

```yaml
- watcher: cli-commands
  parent_files: [cli/src/commands/worktree.ts]
  change_kind: added            # added | modified | renamed | removed
  surface: "paperclipai worktree prune"
  evidence: "New program.command('prune') call at line 84"
  docs_targets: [docs/reference/cli/worktree.md]
  tier: pr
  parent_commits: [a1b2c3d, e4f5g6h]
  release_context: "v2026.319.0 — Highlights: 'Worktree pruning for orphaned dirs'"
```

Filter the change manifest:

- Drop commits matching any `skip_patterns` regex.
- Drop watcher-`context-only` entries (they only feed framing into other entries).
- Sort by tier (auto-merge first, then PR).

Write the manifest to `/tmp/paperclip-sync/manifest.yaml` and, in nightly mode, append a human-readable rollup to `PENDING.md` at repo root.

### Phase 4 — Dry-run gate

If `--dry-run`: print the manifest summary, no further action. Always show:

- Total changed parent files in window.
- Manifest entries by tier.
- Auto-merge candidates (count + bullet list).
- PR candidates (count + bullet list).
- Screenshot staleness flags (from Phase 6).

Stop here.

### Phase 5 — Apply edits

For each manifest entry, top-down:

**Auto-merge tier** (only if it passes `auto_merge_safety` thresholds in anchor-map.json):
- Make the mechanical edit directly. Examples: append a row to `environment-variables.md`, add an adapter name to a list.
- Do NOT auto-merge if the entry: removes/renames anything, changes more than `max_files_changed`, or exceeds `max_lines_changed`.
- Failed safety check → demote to PR tier.

**PR tier** (judgment calls):
- Spawn a subagent per entry, in parallel where possible. Give each:
  - The manifest entry.
  - The relevant parent code (read-only — fetch via `gh api .../contents/<path>`, do not clone full parent).
  - The current state of the target docs file(s).
  - One neighbouring doc page as a tone/structure reference (e.g. for a new adapter, pass the closest existing adapter page).
  - The release-context line if release mode.
- Subagent's instruction (paste this verbatim when spawning):

> Rewrite the target docs file(s) to incorporate the change described in the manifest entry. Voice rules:
> - Friendly-tutorial style. Audience is everyone — end users, operators, developers — not only devs.
> - Lead with the user's goal, then the mechanics.
> - Use second person ("you can…"), present tense, short paragraphs.
> - Never paste from the parent repo's own docs. Their tone is dev-focused; ours is not.
> - Preserve existing page structure unless the change demands new sections. Keep cross-references intact.
> - If a new page is needed, mirror the structure of the neighbour page you were given, then register it in `site/content.json` under the correct section.
> - Add `paperclip_version: <tag>` to the frontmatter of touched pages in release mode; leave alone in nightly mode (nightly pages are versionless until they merge to main).
> Return only the edited file contents (or the new file). Do not commit.

- After the subagent returns, write the file(s).

### Phase 6 — Screenshot staleness check

Read `docs/user-guides/screenshots/registry.json`. For each entry:

- Compare its `captured_sha` against the current parent ref.
- If any of the entry's `depends_on` parent paths changed in the window → mark stale.

Output stale entries to `SCREENSHOTS_PENDING.md` (committed) and to the PR/commit body. Do NOT attempt to capture — capture is a manual step for now (see MAINTENANCE.md → Screenshots).

### Phase 7 — Verify & commit

1. Run `npm run docs:build`. Fail loud on build errors — do not commit.
2. Run any link check available (skip if none configured).
3. Stage edits.
4. Commit strategy:
   - Nightly auto-merge edits → single commit titled `nightly: <surface name> (paperclip <short-sha>)`.
   - Nightly PR-tier edits → branch `nightly-draft/<short-sha>-<surface>` off `nightly`, open PR against `nightly`.
   - Release mode → branch `release/v2026.X.Y` off `nightly`, open PR against `main` titled `Release docs for paperclip v2026.X.Y`. PR body = manifest + screenshot staleness + checklist.
5. Update `.sync-state.json`:
   ```json
   {
     "mode": "<nightly|release>",
     "synced_to": "<tag-or-main>",
     "synced_sha": "<parent-sha>",
     "synced_at": "<ISO timestamp>",
     "last_run_at": "<ISO timestamp>",
     "last_run_outcome": "<applied|dry-run|no-changes|error>"
   }
   ```
6. Commit the state update on top.

### Phase 8 — Hand off

- **Never push without asking.** Always end the run by printing:
  - The branch you're on.
  - The commits/PRs you created (with URLs if PRs were opened).
  - Anything that needs human attention (PR-tier drafts, stale screenshots, build warnings).
  - Ask: "Push these changes / open the PR?"

## Special cases

### First-ever run / large gap
Use `--batched` in release mode if more than 2 release tags are between `synced_to` and latest. Produces one PR per tag. Easier to review, easier to revert a single bad release.

### Reverts mid-window
The 24h quarantine catches most. If a revert lands inside an already-processed window, the next run's diff against the new SHA will naturally undo the doc edit. Don't try to roll back — let the next cycle correct.

### Half-built features on parent main
By design, nightly drafts in PR tier so half-built features don't auto-land on live docs. Auto-merge tier is restricted to schema-bound edits which by definition can't be "half-built" (the env var either exists or it doesn't).

### Hot-fix on released docs (e.g. typo on main)
Fix directly on `main` of this repo. The skill's "merge main into nightly at start of each run" rule keeps the branches aligned automatically.

## What this skill does NOT do

- Push to remote. Ever. Without explicit user approval.
- Auto-merge PRs. Even auto-merge tier means "auto-commit to nightly branch," not "auto-merge to main."
- Generate docs from code by template/codegen. Every doc edit goes through subagent rewriting in our voice.
- Copy text from the parent's own docs.
- Capture screenshots. Only flags staleness.
- Modify `site/content.json` without a corresponding new doc page (no orphan nav entries).
- Delete pages without explicit confirmation, even if a watcher detects a removed surface.

## Failure modes & recovery

| Failure | Recovery |
|---|---|
| `gh` not authed | Abort, tell user to run `gh auth login`. |
| Dirty working tree | Abort, tell user. Never stash. |
| Build fails after edits | Roll back edits in working tree, save manifest to `/tmp/paperclip-sync/failed-manifest.yaml`, tell user which entry caused it. |
| Subagent produces something that doesn't match voice rules | Show diff to user, ask before committing. |
| Conflict merging `main` into `nightly` | Abort with clear conflict report, ask user to resolve. |
| Anchor-map watcher pattern matches nothing for many runs | Note in run summary — likely a parent refactor moved files; suggest user updates `anchor-map.json`. |

## Maintenance of this skill

When the parent repo restructures (e.g. moves `cli/src/commands` → `apps/cli/src/cmds`), `anchor-map.json` needs updating. Symptoms: nightly runs report "no changes detected" while parent is clearly active, or surface diffs route to wrong docs paths. Fix the map, not the skill.

When a new product surface ships that doesn't fit any existing watcher (e.g. a new GraphQL endpoint type), add a new watcher entry to `anchor-map.json` with appropriate `tier` and `detect` prose.

## Installation as a Claude Code skill

This skill ships inside the repo at `skills/sync-docs/`. To use it locally with Claude Code, symlink (or copy) it into your Claude skills directory so the `/sync-docs` slash command is recognised:

```sh
mkdir -p ~/.claude/skills
ln -s "$PWD/skills/sync-docs" ~/.claude/skills/sync-docs
```

Or use a project-level skills directory if your Claude Code config supports one (`.claude/skills/` linking to `../../skills/sync-docs`).

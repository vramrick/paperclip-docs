# Maintenance

Operational notes for maintainers of the Paperclip docs site. Reader-facing instructions live in [README.md](README.md).

## Repo layout

```
site/                    # Static site shell + release builder
├── index.html           # Main SPA (routing, rendering, TOC, search)
├── content.json         # Section/page manifest — source of truth for sidebar & landing (titles, icons, descriptions, pages)
└── build-release.mjs    # Produces a standalone bundle in .site/
docs/                    # Markdown content only
├── guides/              # Quickstart, Day-to-Day, Org & Agents, Projects & Workflow, Power Features
├── how-to/              # Field-tested recipes (budgets, approvals, skills, deployment troubleshooting)
├── administration/      # Company settings, plugins, CLI auth, company config
├── reference/           # API, CLI, adapters, deploy, skills (the "what" reference tier)
│   ├── api/
│   ├── cli/
│   ├── adapters/
│   ├── deploy/
│   └── skills.md
└── user-guides/         # Long-form user guides + screenshots/{light,dark}
    └── screenshots/
        └── registry.json   # Screenshot dependency tracking (see Screenshots)
scripts/
├── publish-gh-pages.sh  # Builds and pushes to the gh-pages branch fallback
├── rewrite-links.mjs    # Link-rewriting utility for builds
└── sync/                # /sync-docs skill config (anchor map, state template)
skills/                  # Claude Code skills shipped with this repo
└── sync-docs/SKILL.md   # The /sync-docs orchestrator
.sync-state.json         # Per-branch sync state (committed)
wrangler.jsonc           # Cloudflare Pages project config
.github/ISSUE_TEMPLATE/  # Support / bug / docs-feedback templates
```

## Commands

```sh
# Build the static site into .site/ using the production custom-domain base path
npm run docs:build

# Build with auto base-path detection (useful when serving from the repo root locally)
npm run docs:build:auto

# Serve .site/ on http://localhost:4321/
npm run docs:serve

# Build and deploy to Cloudflare Pages
npm run docs:publish

# Build and push to the gh-pages branch fallback
npm run docs:publish:github
```

## Base paths

`build-release.mjs` accepts `--base-path <path|auto>`:

- **Production custom domain** — use `/` (the default in `docs:build` and `docs:publish`) for `https://docs.paperclip.ing/`.
- **GitHub Pages repo subpath preview** — use `/paperclip-docs/` via `npm run docs:build:github-subpath`.
- **Local preview** — use `auto` (`docs:build:auto`). Paths resolve relative to `index.html`, so the site works under any prefix (or none).
- **Self-hosting under a different prefix** — pass an explicit path, e.g. `--base-path /docs/`.

Mismatched base paths are the most common cause of 404s after a build — if asset URLs point to `/paperclip-docs/...` but you serve at `/`, everything breaks.

## Adding or moving pages

1. Create the Markdown file in the appropriate `docs/<section>/` folder.
2. Register it in `site/content.json` under the correct section. The `file` field is relative to `site/` (typically `"../docs/<section>/<page>.md"`).
3. Page titles, section grouping, and sidebar order all derive from `content.json`. There is no filesystem-based auto-discovery.
4. Slugs are derived from the file path — `user-guides/guides/foo.md` becomes `/#/foo`, other sections keep their path.

## Section icons

Landing cards and sidebar section headers render icons via [Lucide](https://lucide.dev). The UMD build is loaded from CDN in `site/index.html`.

To set or change a section's icon, edit its `icon` field in `site/content.json`:

```json
{
  "title": "CLI",
  "icon": "terminal",
  "desc": "…",
  "pages": [ … ]
}
```

The value is any Lucide icon id in kebab-case (e.g. `rocket`, `layout-dashboard`, `settings-2`, `braces`). Browse [lucide.dev/icons](https://lucide.dev/icons) to find one. No code changes are required — `app.js` emits `<i data-lucide="<name>"></i>` placeholders and calls `lucide.createIcons()` after each nav render to swap them for inline SVG. If the name doesn't match a Lucide icon, the placeholder stays empty, so test after changing.

## Screenshots

Store UI captures under `docs/user-guides/screenshots/{light,dark}/<name>.png`. The renderer automatically swaps the correct theme variant at runtime based on the user's current theme. Always provide both.

### Registry

Every screenshot used in docs should have an entry in `docs/user-guides/screenshots/registry.json` so the sync skill can flag staleness when the underlying UI code changes:

```json
{
  "file": "screenshots/light/dashboard-issues.png",
  "route": "/issues",
  "viewport": "1440x900",
  "theme": "light",
  "captured_against": "v2026.318.0",
  "captured_sha": "<parent commit sha at capture>",
  "depends_on": [
    "server/src/routes/issues.ts",
    "ui/src/pages/Issues.tsx"
  ]
}
```

`depends_on` lists parent-repo paths whose changes likely invalidate this screenshot. The `/sync-docs` skill diffs those paths across each run window and writes any stale entries to `SCREENSHOTS_PENDING.md`. Capture is currently manual — see the [sync workflow](#sync-workflow) below.

## Per-article feedback links

Every article ends with "Suggest an edit" and "Report an issue" links. These are generated in `loadPage()` in `site/index.html` and point at:

- `github.com/paperclipai/paperclip-docs/edit/main/<path>` — GitHub web editor.
- `github.com/paperclipai/paperclip-docs/issues/new?template=03-docs-feedback.yml&...` — prefilled docs-feedback issue.

If the repo is ever renamed or mirrored, update `DOCS_REPO_SLUG` / `DOCS_REPO_BRANCH` constants near the top of `appendPageFeedback()`.

## Issue templates

`.github/ISSUE_TEMPLATE/` holds three templates:

- `01-support.yml` — end-user support questions.
- `02-bug.yml` — bug reports against the docs site itself (not product bugs).
- `03-docs-feedback.yml` — referenced by the per-article "Report an issue" link. The `docs_page` field id must stay in sync with the URL param emitted in `appendPageFeedback`.

## Publishing

Primary publishing uses Cloudflare Pages, matching the rest of the public Paperclip sites:

```sh
npm run docs:publish
```

That command builds `.site/` and runs:

```sh
wrangler pages deploy .site --project-name paperclip-docs --branch main
```

The Cloudflare Pages project name is `paperclip-docs`; production deploys use branch `main`.

### GitHub Pages fallback

`scripts/publish-gh-pages.sh` clones the repo into a tempdir, checks out (or creates) `gh-pages`, replaces its contents with a fresh build, commits, and pushes. It leaves the working tree untouched, so it's safe to run with uncommitted changes. A `.nojekyll` marker is added so GitHub Pages serves files whose names start with `_`.

By default, the publish script builds for `https://docs.paperclip.ing/` and writes a `CNAME` file containing `docs.paperclip.ing`. Override with `PAGES_BASE_PATH=/paperclip-docs/ PAGES_CUSTOM_DOMAIN= npm run docs:publish:github` only when intentionally publishing a GitHub Pages subpath preview without the custom domain.

## Sync workflow

These docs follow the parent **paperclipai/paperclip** repo automatically via the [`/sync-docs`](skills/sync-docs/SKILL.md) skill. The skill detects code-surface changes (CLI commands, env vars, REST routes, adapters, plugin SDK, schemas) and produces edits in our friendly-tutorial voice.

> Our docs are **not** a translation of the parent's docs. The parent's *code* is the source of truth; its release notes and inline docs are reference data for understanding intent.

### Branch model

| Branch | Tracks | Deploys to | Audience |
|---|---|---|---|
| `main` | Latest parent **release tag** (e.g. `v2026.512.0`) | `docs.paperclip.ing` (production) | Everyone — end users to devs |
| `nightly` | Parent's `main` HEAD | Cloudflare Pages branch preview | Early adopters, contributors |

End users on the latest *released* paperclip must never see docs for unreleased features. That's why nightly drafts live on a separate branch and never touch `main` until a parent release tag drops.

### Two modes

**Nightly mode** — runs daily.
- Diffs `last_synced_sha → parent main HEAD`.
- Auto-commits trivial mechanical edits (e.g. appending a new env var to the env-vars reference) directly to `nightly`.
- Opens PRs against `nightly` for judgment-call rewrites.
- Updates `PENDING.md` so you can see the accumulating doc backlog.

**Release mode** — runs when a new parent release tag appears.
- Diffs `last_synced_tag → new_tag`.
- Most of the work is already done by nightly drafts; this mode mainly verifies completeness, stamps `paperclip_version` frontmatter, and opens a single PR: `Release docs for paperclip vX.Y.Z` (merges `nightly` → `main`).
- On merge to `main`, tag this repo `docs/vX.Y.Z`, Cloudflare deploys live.

### Running the skill

```sh
# Auto-detect mode (nightly unless a new parent tag exists)
/sync-docs

# Force a mode
/sync-docs --nightly
/sync-docs --release

# Triage only — no edits, no commits, no PRs
/sync-docs --dry-run

# Override starting point (useful after manual interventions)
/sync-docs --since v2026.318.0

# Release mode: produce one PR per intermediate tag (use for big gaps)
/sync-docs --release --batched
```

Recommended cadence: `/loop 24h /sync-docs` for nightly. Release mode is auto-detected on the next run after a parent tag drops.

### Config files

| File | Purpose |
|---|---|
| `scripts/sync/anchor-map.json` | Maps parent-repo paths → docs paths. Edit when adding new doc sections or new product surfaces. |
| `scripts/sync/state.example.json` | Template for `.sync-state.json`. |
| `.sync-state.json` | Per-branch sync state (committed). `main` records the last synced release tag; `nightly` records the last synced parent SHA. |
| `docs/user-guides/screenshots/registry.json` | Screenshot dependency tracking — see [Screenshots](#screenshots). |

See [`skills/sync-docs/SKILL.md`](skills/sync-docs/SKILL.md) for the full operational playbook.

### Hot-fixes on released docs

If you spot a typo or broken example on `main` (released docs), fix it on `main` directly — it deploys to `docs.paperclip.ing` on merge. The sync skill merges `main` back into `nightly` at the start of every nightly run, so the fix isn't lost.

### Screenshots in the sync flow

The skill **flags** stale screenshots based on `registry.json` `depends_on` paths but does **not** capture them. When `SCREENSHOTS_PENDING.md` lists stale entries, capture light + dark variants manually and update `captured_against` + `captured_sha` in `registry.json`. Playwright-based automated capture may come later — it requires a reproducible seeded demo state in the parent repo.

### Installing the skill locally

```sh
mkdir -p ~/.claude/skills
ln -s "$PWD/skills/sync-docs" ~/.claude/skills/sync-docs
```

After that, `/sync-docs` is available in any Claude Code session.

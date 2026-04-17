# Maintaining paperclip-docs

This repository is a community-maintained documentation and support layer for Paperclip. It is intentionally local-first:

- source content lives on `main`
- the published static site lives on `gh-pages`
- publishing happens from your machine with a local script
- upstream reference syncing happens from your machine with a local script
- GitHub Issues are used for support and docs feedback

This document is the maintainer playbook for keeping the repo current.

## Purpose

This repo exists to solve a specific problem:

- upstream Paperclip docs and support are not currently good enough for the user experience you want
- you want to maintain a better docs site independently
- you still need a local upstream checkout for comparison and fact-checking
- you do not want to depend on recurring GitHub Actions usage

This is not the official upstream repo. Keep that visible in the docs and in issue responses.

## Branch model

- `main`: source branch for markdown docs, screenshots, support forms, and local scripts
- `gh-pages`: built static site only

Rules:

- edit only on `main`
- never hand-edit `gh-pages`
- regenerate and publish `gh-pages` from `main` with `npm run docs:publish`

## Local workflow

From the repo root:

```sh
cd /Users/aronprins/Documents/Development/paperclip-docs
```

Sync the local upstream reference checkout:

```sh
npm run references:sync
```

Build the static site bundle:

```sh
npm run docs:build
```

Preview the built bundle locally:

```sh
npm run docs:serve
```

That serves the built site at:

```text
http://localhost:4321
```

Publish the current build to GitHub Pages:

```sh
npm run docs:publish
```

## Site URL model

The published site uses hash routing so GitHub Pages does not need rewrite rules.

Example:

```text
https://aronprins.github.io/paperclip-docs/#/installation
https://aronprins.github.io/paperclip-docs/#/api/issues
```

Deep links should always be shared in hash-route form.

## What lives where

- `docs/`: public docs source, screenshots, and site shell
- `docs/docs-website/`: custom docs app and release builder
- `docs/user-guides/screenshots/`: light and dark screenshot assets used by the public guides
- `references/upstream-paperclip/`: local upstream checkout for comparison
- `references/upstream.json`: records the current synced upstream commit
- `references/tools/`: copied maintenance helpers from the Paperclip repo
- `notes/`: planning notes and working documents for future docs work

More detail:

- content structure: [docs/README.md](docs/README.md)
- site shell details: [docs/docs-website/README.md](docs/docs-website/README.md)
- reference checkout details: [references/README.md](references/README.md)
- planning notes details: [notes/README.md](notes/README.md)

## Updating the docs

Typical maintenance loop:

1. Run `npm run references:sync`
2. Inspect upstream changes in `references/upstream-paperclip/`
3. Update the relevant markdown pages in `docs/`
4. Rebuild with `npm run docs:build`
5. Preview with `npm run docs:serve`
6. Commit changes on `main`
7. Publish with `npm run docs:publish`

Good sources for truth-checking:

- upstream implementation and source in `references/upstream-paperclip/`
- copied planning notes in `notes/`
- your own fork if you are documenting fork-specific behavior

If you are documenting your fork rather than upstream, say so explicitly in the relevant page.

## Updating screenshots

Screenshots are already checked in under:

- `docs/user-guides/screenshots/light/`
- `docs/user-guides/screenshots/dark/`

The public guide markdown uses `../images/...` paths, and the custom viewer remaps those at runtime to the themed screenshot folders.

Practical screenshot workflow:

1. sync upstream or your fork reference
2. run the product locally from the codebase you are documenting
3. seed or prepare the data needed for the target UI state
4. capture replacement screenshots into the existing light/dark folder structure
5. rebuild and preview the docs site
6. verify that the affected pages still render the screenshots correctly

Reference material for this work lives in:

- [notes/prompt-screenshots.md](notes/prompt-screenshots.md)
- [references/tools/seed-screenshots.ts](references/tools/seed-screenshots.ts)

Important:

- `seed-screenshots.ts` is a copied helper, not a guaranteed turnkey script for every future upstream version
- if upstream schema or UI changes, update your screenshot process accordingly

## Support triage

Support intake is handled through GitHub Issue Forms in `.github/ISSUE_TEMPLATE/`.

Current buckets:

- support request
- bug report
- docs feedback

Suggested handling:

- answer docs-only issues directly in this repo
- fix wording, broken links, and missing steps here
- forward upstream product bugs to `paperclipai/paperclip` when needed
- keep a visible distinction between upstream bugs and docs gaps

When replying, ask for:

- docs page URL
- upstream branch, tag, or commit
- platform
- install path used
- exact divergence from the documented flow

## GitHub Pages maintenance

This repo intentionally avoids depending on recurring Actions minutes.

The Pages model is:

- source branch: `gh-pages`
- publish method: local script
- build output: generated into a temporary directory, then pushed to `gh-pages`

The script used is:

- [scripts/publish-gh-pages.sh](scripts/publish-gh-pages.sh)

Do not edit `gh-pages` manually unless you are recovering from a publish failure.

## Reference sync maintenance

Use:

```sh
npm run references:sync
```

That script:

- clones upstream into `references/upstream-paperclip/` if missing
- fetches the configured branch if it already exists
- writes the synced commit SHA and timestamp to `references/upstream.json`

Defaults:

- upstream URL: `https://github.com/paperclipai/paperclip.git`
- upstream branch: `master`

Override them when needed:

```sh
UPSTREAM_URL=https://github.com/your-user/paperclip.git UPSTREAM_REF=feature/docs npm run references:sync
```

## Files you usually should not touch casually

- `docs/docs-website/index.html`
  This is the custom site shell. Change it only when you need routing, rendering, layout, or runtime behavior changes.

- `docs/docs-website/build-release.mjs`
  This is the release bundler. Change it only when the publish bundle contents or base-path behavior need to change.

- `gh-pages`
  Generated output branch only.

## Known repo conventions

- this repo is local-first by design
- the published site is static
- the current production docs surface is the custom site under `docs/docs-website/`
- `docs/docs.json` is retained from the imported docs set, but the custom site is the active publishing path

## Recommended checklist before publishing

- upstream reference synced if this change depends on product behavior
- modified pages reviewed locally
- screenshots render in the right theme folders
- internal markdown links still work
- site builds cleanly with `npm run docs:build`
- changes committed to `main`
- published with `npm run docs:publish`


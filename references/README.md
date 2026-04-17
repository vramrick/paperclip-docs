# References

This folder is for local maintenance support, not for publishing.

- `upstream-paperclip/` is a local checkout of the upstream `paperclipai/paperclip` repository.
- `upstream.json` records the last synced upstream commit.
- `tools/` contains helper files copied from the Paperclip repo that are useful when maintaining docs and screenshots.

Refresh the upstream checkout locally with:

```sh
npm run references:sync
```

## Why this exists

This repository is intentionally separate from upstream, so maintainers still need a reliable way to compare documentation against the current Paperclip codebase.

The local reference checkout is used for:

- checking whether docs are outdated
- confirming current behavior against source
- comparing API, UI, and CLI changes before editing docs
- reviewing upstream drift without turning this repo into a full source mirror

## What gets updated

The sync script keeps a shallow git checkout of upstream under `references/upstream-paperclip/` and records the synced commit in `references/upstream.json`.

That means:

- the folder is a real git checkout
- it is ignored by this repo
- it can be refreshed repeatedly without bloating this repo history

## Defaults

- upstream URL: `https://github.com/paperclipai/paperclip.git`
- upstream branch: `master`

Override them for fork or branch comparisons:

```sh
UPSTREAM_URL=https://github.com/aronprins/paperclip.git UPSTREAM_REF=chore/beginner-user-guides npm run references:sync
```

## Tools

`tools/` is for copied helper material that supports docs maintenance but is not part of the public site.

Right now this includes:

- `seed-screenshots.ts`

Treat copied tools as reference material. They may need changes before they work against current upstream state.

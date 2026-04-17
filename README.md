# paperclip-docs

Community-maintained Paperclip docs and support site.

This repository is not the upstream `paperclipai/paperclip` repository. It exists to host improved public-facing documentation, screenshots, and a lightweight support queue while keeping a live upstream checkout under `references/` for comparison.

## Maintainer docs

- repo maintenance workflow: [MAINTAINING.md](MAINTAINING.md)
- docs tree overview: [docs/README.md](docs/README.md)
- custom site shell details: [docs/docs-website/README.md](docs/docs-website/README.md)
- reference checkout details: [references/README.md](references/README.md)
- planning notes overview: [notes/README.md](notes/README.md)

## Repo layout

- `docs/` source docs, screenshots, and the custom docs viewer
- `notes/` planning/reference docs copied from the original documentation work
- `references/upstream-paperclip/` local reference checkout of upstream Paperclip
- `references/tools/` helper files copied from the Paperclip repo for screenshot and docs maintenance
- `scripts/` local-first maintenance scripts

## Local workflow

Build the static site bundle locally:

```sh
npm run docs:build
```

Preview the built bundle locally:

```sh
npm run docs:serve
```

Publish the built bundle to the `gh-pages` branch locally:

```sh
npm run docs:publish
```

Refresh the upstream reference checkout locally:

```sh
npm run references:sync
```

## GitHub Pages

This repo is set up for hash routing so GitHub Pages does not need rewrite rules. The intended published URL shape is:

```text
https://aronprins.github.io/paperclip-docs/#/installation
```

The local publish script writes the built site to the `gh-pages` branch and adds `.nojekyll` so GitHub Pages can serve the static bundle directly.

## Support

GitHub Issues in this repo are intended for:

- docs feedback
- install/setup help
- support questions
- bugs reproducible from the documented experience

Upstream product bugs may still need to be forwarded to `paperclipai/paperclip`.

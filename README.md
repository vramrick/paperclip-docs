# paperclip-docs

Lean source repo for the Paperclip documentation site.

## Commands

Build the static site into `.site/`:

```sh
npm run docs:build
```

Preview the built site locally:

```sh
npm run docs:serve
```

Publish the current site to `gh-pages`:

```sh
npm run docs:publish
```

## Repo Layout

- `docs/docs-website/`
  Static site shell, navigation manifest, and release builder.
- `docs/user-guides/`
  User-facing guide pages and screenshots.
- `docs/adapters/`
  Adapter documentation.
- `docs/api/`
  API reference pages.
- `docs/deploy/`
  Deployment documentation.
- `docs/cli/`
  CLI reference pages.
- `scripts/publish-gh-pages.sh`
  Local publish script for GitHub Pages.

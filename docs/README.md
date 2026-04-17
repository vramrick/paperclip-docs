# Docs Structure

This file documents the public documentation tree in this repository.

## Main areas

- `start/`
  High-level introductory material.

- `user-guides/guides/`
  Task-oriented end-user documentation. This is the most important user-facing section for the custom docs site.

- `api/`
  API reference pages.

- `adapters/`
  Adapter reference and implementation notes intended for more technical users.

- `deploy/`
  Deployment and runtime environment documentation.

- `cli/`
  CLI command documentation.

- `docs-website/`
  The custom static docs app used for publishing this repo to GitHub Pages.

- `user-guides/screenshots/`
  Screenshot assets used by the user guide pages, split by theme.

## Public publishing model

The published site does not expose the entire `docs/` tree as-is. The release builder starts from the navigation manifest in `docs/docs-website/nav.json` and copies the reachable markdown files and screenshots into the final bundle.

That means:

- not every markdown file under `docs/` is guaranteed to be published
- navigation starts from `docs/docs-website/nav.json`
- internal markdown links can pull additional markdown files into the release bundle

## Editing content safely

When editing docs pages:

- prefer keeping file paths stable unless a rename is really necessary
- update `docs/docs-website/nav.json` if a published page is renamed or moved
- verify internal markdown links after edits
- rebuild locally after structural changes

## Screenshots

Guide pages use placeholder-style image paths such as:

```md
![Example](../images/dashboard/dashboard-overview.png)
```

The custom site rewrites those at runtime to:

- `docs/user-guides/screenshots/light/...`
- `docs/user-guides/screenshots/dark/...`

That means the markdown stays theme-agnostic while the site swaps assets based on the selected theme.

## Legacy and reference content

Some content in this imported tree is not part of the main public experience yet. Treat these as secondary unless you intentionally wire them into the public nav:

- plans
- some legacy guide paths
- imported docs format files such as `docs.json`

## Related docs

- maintainer workflow: [../MAINTAINING.md](../MAINTAINING.md)
- custom site shell: [docs-website/README.md](docs-website/README.md)


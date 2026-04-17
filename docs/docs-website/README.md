# Docs Website

`docs/docs-website/` contains the custom static docs application used to publish this repository on GitHub Pages.

## Files

- `index.html`
  Single-file docs app shell. It handles routing, markdown loading, search, theme switching, image remapping, table of contents behavior, and navigation.

- `nav.json`
  Navigation manifest that defines the published reading structure.

- `build-release.mjs`
  Release builder that creates the publishable static bundle.

## Routing

The site uses hash routing for GitHub Pages compatibility.

Examples:

- `/#/installation`
- `/#/api/issues`

This avoids needing server rewrites for deep links.

## How the site loads content

At runtime the app:

1. loads `nav.json`
2. determines the current route
3. maps the route to a markdown file
4. fetches that markdown file from the published bundle
5. renders the page client-side

The site also:

- rewrites screenshot references from `../images/...` to themed screenshot folders
- turns callout-style blockquotes into styled callout blocks
- turns tab comment syntax into interactive tab UIs
- builds a local search index in the browser

## Build process

The release builder:

1. reads `nav.json`
2. collects the referenced markdown files
3. follows linked local markdown references
4. rewrites the nav file for the release bundle
5. copies markdown files and screenshots into the output directory
6. writes `index.html`, `nav.json`, `.htaccess`, `nginx.conf.example`, and `DEPLOY.md`

Typical build command:

```sh
npm run docs:build
```

## When to edit `index.html`

Edit `index.html` only when you need to change site behavior such as:

- routing
- navigation
- theme behavior
- markdown rendering behavior
- screenshot remapping behavior
- search or TOC behavior

Do not edit it for normal content updates.

## When to edit `nav.json`

Edit `nav.json` when:

- you add a new published page
- you remove a published page
- you change the order of the public docs
- you reorganize the main reading paths

## When to edit `build-release.mjs`

Edit the release builder only when:

- the output bundle contents need to change
- base-path handling changes
- publishing rules change
- the set of copied assets changes

## Local verification

After changing the site shell or nav:

```sh
npm run docs:build
npm run docs:serve
```

Then verify:

- the homepage loads
- navigation works
- hash-route deep links work
- screenshots render
- search still finds pages
- internal markdown links still resolve


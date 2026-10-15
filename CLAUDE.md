# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

`@richardmcquiston01/custom-catalog-component`: a framework-agnostic,
accessible TypeScript catalog view. A two-column layout with search, filters,
sorting, and a Grid / Carousel / List switch. It was extracted from the Fusion
360 hub site (`RichardMcQuiston01/fusion-360-hub-site`), which is its first user.

- `src/core.ts`: pure logic (state, URL params, matching, sorting, grouping).
- `src/render.ts`: `renderCatalog()` returns the HTML as a string.
- `src/controller.ts`: `mountCatalog()` adds the behaviour to that HTML.
- `src/catalog.css`: styles, driven by `--cc-*` variables.

## Development workflow

Follow the `git-workflow` skill (`.claude/skills/git-workflow/SKILL.md`):
feature branches off `dev`, PRs into `dev`, and `dev` → `main` by PR only when a
stage is done and tested. Use Conventional Commits.

## Commands

Package manager is Bun.

- `bun install` installs dependencies.
- `bun run test` runs the Bun tests (a simulated DOM comes from happy-dom).
- `bun run typecheck`, `bun run format:check`, `bun run build`.
- CI runs all four on every PR and push to `dev` and `main`.

## Rules

- **No framework code.** Do not import React, Astro, Vue or similar, and do not
  depend on Tailwind. The package must work from a plain HTML string.
- **No runtime dependencies.** Dev dependencies only.
- **Accessibility is a requirement** (WCAG 2.2 AA): labelled controls, fieldsets
  for checkbox groups, a polite live region for the result count, visible focus,
  keyboard-only use, 24 px targets, reduced motion, 4.5:1 text contrast and 3:1
  UI contrast. Escape every string put into HTML (`escapeHtml`).
- Cards stay real links, and the full list is in the HTML, so the page works and
  can be indexed without JavaScript.
- Add or update tests for every behaviour change.

## Releasing

Versions are published to npm by `.github/workflows/release.yml` when a tag
`vX.Y.Z` is pushed. The tagged commit must be on `main` and the tag must match
`package.json`. To release: bump the version and `CHANGELOG.md` on a feature
branch, merge to `dev`, promote `dev` to `main`, then tag `main`. The workflow
uses the repository secret `NPM_TOKEN`; never commit tokens.

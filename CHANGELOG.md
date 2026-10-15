# CHANGELOG

## Unreleased

## 0.2.0

- New `buttons` option: show the Show filters and Clear buttons as text only
  (default), icon with text, or icon only, and replace their wording and icons.
- New `layout` option: `split` (always two columns: search, sort and filters on
  the left, results and the view switch on the right), `stacked` (always a
  toolbar above the results) or `auto` (the previous behaviour, still the
  default, using `sidebarMinItems`).

- First version: `renderCatalog`, `mountCatalog`, the pure logic helpers, and
  the stylesheet, extracted from the Fusion 360 hub site.
- CI (format, type-check, tests, build) and a release workflow that publishes to
  npm when a `v*` tag on `main` is pushed.

# @richardmcquiston01/custom-catalog-component

- Author: [Richard McQuiston](mailto:richard.mcquiston@gmail.com)
- Website: https://richardmcquiston.com/

## Table of Contents

| [Overview](#overview) | [Getting Started](#getting-started) | [Buy Me a Coffee](#buy-me-a-coffee) | [License](#license) | [Copyright](#copyright) |

## Overview

Framework agnostic TypeScript package for a reusable catalog component. Two-Column view with support for Filters, Sorting, and toggling between Grid, Carousel, and List view styles.

[Back to Top](#table-of-contents)

## Getting Started

### Prerequisites

Any modern browser. The package has no runtime dependencies and no framework
requirements. Developing it needs [Bun](https://bun.sh/) 1.1 or later.

### Installation

```sh
npm install @richardmcquiston01/custom-catalog-component
```

### Usage

`renderCatalog` returns the catalog as an HTML string. Put it on the page
(on the server or in the browser), import the styles, then call `mountCatalog`
in the browser to switch on searching, filtering, sorting and the view switch.

```ts
import {
  renderCatalog,
  mountAllCatalogs,
  type CatalogItem,
} from '@richardmcquiston01/custom-catalog-component';
import '@richardmcquiston01/custom-catalog-component/styles.css';

const items: CatalogItem[] = [
  {
    id: 'living-hinge',
    title: 'Living Hinge',
    summary: 'Draw a living-hinge slit pattern as a Fusion sketch.',
    href: '/living-hinge/',
    group: 'laser-cutting',
    badge: 'Free',
    facets: { price: 'free' },
    searchText: 'Living Hinge kerf bend slit pattern',
    addedOn: '2026-10-14',
  },
];

document.querySelector('#app')!.innerHTML = renderCatalog({
  items,
  groups: [
    {
      slug: 'laser-cutting',
      name: 'Laser cutting',
      description: 'Parts ready to cut.',
    },
  ],
  facets: [
    {
      key: 'price',
      label: 'Price',
      options: [
        { value: 'free', label: 'Free' },
        { value: 'paid', label: 'Paid' },
      ],
    },
  ],
  noun: { singular: 'add-in', plural: 'add-ins' },
  searchLabel: 'Search add-ins',
});

mountAllCatalogs();
```

Because the HTML is complete before any JavaScript runs, the list works and can
be indexed without it, and every card is a normal link. Render on the server
(for example in a static site generator) and call `mountAllCatalogs()` in the
browser.

#### Options for `renderCatalog`

| Option            | Meaning                                                                           |
| ----------------- | --------------------------------------------------------------------------------- |
| `items`           | The things to list (see `CatalogItem`).                                           |
| `groups`          | Rows of the catalog. A group with no items is not shown.                          |
| `facets`          | Filters other than the built-in group filter. Each item gives one value per key.  |
| `noun`            | What items are called, for the result message ("3 add-ins shown").                |
| `searchLabel`     | Label of the search box. Default `Search`.                                        |
| `defaultView`     | `grid`, `carousel` (default) or `list`.                                           |
| `layout`          | `split` (two columns), `stacked` (toolbar above the results) or `auto` (default). |
| `sidebarMinItems` | For `auto`: at this many items or more, use `split`. Default 8.                   |
| `idPrefix`        | Prefix for element ids, so several catalogs can share a page.                     |
| `sorts`           | Sort choices. Default: name A to Z, name Z to A, newest first.                    |

#### Behaviour

- **Layout.** `split` gives wide screens two columns: the search, sort and
  filters in the left column, and the results with the Grid / Carousel / List
  switch in the right. `stacked` puts search and sort in a toolbar above the
  results, with the filters collapsed behind a button. `auto` (the default)
  uses `split` at `sidebarMinItems` items or more, otherwise `stacked`. Narrow
  screens always stack, with the filters behind the button.
- **Views.** Grid, Carousel (scroll-snap with arrow buttons that appear only when
  a row overflows) and List. The visitor's choice is remembered.
- **State in the URL.** `?q=hinge&price=free&sort=newest&view=list`, so a view can
  be shared and the back button works. Pass `syncUrl: false` to `mountCatalog`
  to turn this off.
- **Pure logic.** `itemMatches`, `sortItems`, `groupItems`, `stateFromParams` and
  `stateToParams` are exported if you need them without the DOM.

#### Theming

Override the `--cc-*` variables on `.cc-catalog`:

```css
.cc-catalog {
  --cc-accent: #0b5cad;
  --cc-accent-tint: #dbeafe;
  --cc-font-heading: 'My Heading Font', sans-serif;
}
```

The defaults are a warm "Workshop" palette. If you change colours, keep text at
4.5:1 contrast and borders of inputs and buttons (`--cc-control`) at 3:1 against
their background.

#### Accessibility

Built to WCAG 2.2 level AA: every control has a label, checkbox groups are
fieldsets with legends, the result count is announced politely when it changes,
focus is always visible, everything works from the keyboard (the view switch is
a native radio group, so arrow keys work), targets are at least 24 by 24 px,
motion respects the reduced-motion setting, and the carousel has a Grid and a
List alternative. Automated checks (axe-core) pass on the Fusion 360 hub site,
but the component has not been tested with screen readers; please do that in your
own project.

### Examples

See the Fusion 360 hub site: https://fusion360.hiredhandhq.com

[Back to Top](#table-of-contents)

## Buy Me a Coffee

If this app, code, or repository has helped you or someone you know, please consider donating. I appreciate any help to offset the costs of development and/or AI Credits.

[**Donate via Stripe**](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800), or scan:

[![Donate via Stripe](./donate.svg)](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800)

[Back to Top](#table-of-contents)

## License

Apache 2

[Back to Top](#table-of-contents)

## Copyright

(c)2026 Richard McQuiston. All rights reserved.

[Back to Top](#table-of-contents)

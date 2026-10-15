import {
  CATALOG_VIEWS,
  DEFAULT_SORT,
  DEFAULT_SORTS,
  GROUP_FACET_KEY,
  groupItems,
  statusMessage,
} from './core.ts';
import type {
  CatalogFacet,
  CatalogGroup,
  CatalogItem,
  CatalogNoun,
  CatalogSortOption,
  CatalogViewName,
} from './types.ts';

/**
 * How the search, sort and filters sit beside the results.
 * - `split`: two columns on wide screens, with the search, sort and filters in
 *   the left column and the results (with the Grid / Carousel / List switch) in
 *   the right. Narrow screens stack them.
 * - `stacked`: the search and sort sit in a toolbar above the results.
 * - `auto`: `split` at `sidebarMinItems` items or more, otherwise `stacked`.
 */
export type CatalogLayout = 'auto' | 'split' | 'stacked';

export interface CatalogOptions {
  items: CatalogItem[];
  groups: CatalogGroup[];
  /** Filters other than the built-in group filter. */
  facets?: CatalogFacet[];
  /** What the items are called, for the results message. */
  noun: CatalogNoun;
  searchLabel?: string;
  defaultView?: CatalogViewName;
  /** The column layout. Default `auto`. */
  layout?: CatalogLayout;
  /**
   * For the `auto` layout: with fewer items than this, the search and filters
   * sit in a toolbar above the results. At or above it they get a left-hand
   * column on wide screens. Default 8.
   */
  sidebarMinItems?: number;
  /** Prefix for element ids, so several catalogs can share a page. */
  idPrefix?: string;
  sorts?: CatalogSortOption[];
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes text for use in HTML content and attribute values. */
export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) => ESCAPES[character] ?? character
  );
}

function renderCard(item: CatalogItem): string {
  const facetAttributes = Object.entries(item.facets)
    .map(
      ([key, value]) => ` data-facet-${escapeHtml(key)}="${escapeHtml(value)}"`
    )
    .join('');
  return `<li class="cc-card" data-catalog-item data-id="${escapeHtml(item.id)}" data-title="${escapeHtml(item.title)}" data-added="${escapeHtml(item.addedOn)}" data-search="${escapeHtml(item.searchText.toLowerCase())}" data-facet-${GROUP_FACET_KEY}="${escapeHtml(item.group)}"${facetAttributes}>
<p class="cc-badge">${escapeHtml(item.badge)}</p>
<h3 class="cc-card-title"><a class="cc-card-link" href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a></h3>
<p class="cc-card-summary">${escapeHtml(item.summary)}</p>
<p class="cc-card-more">View details <span aria-hidden="true">&rarr;</span></p>
</li>`;
}

function renderGroup(
  group: CatalogGroup,
  items: CatalogItem[],
  idPrefix: string
): string {
  const headingId = `${idPrefix}-heading-${group.slug}`;
  return `<section class="cc-group" id="${escapeHtml(group.slug)}" aria-labelledby="${escapeHtml(headingId)}" data-catalog-group>
<div class="cc-group-header">
<div>
<h2 class="cc-group-title" id="${escapeHtml(headingId)}">${escapeHtml(group.name)}</h2>
<p class="cc-group-description">${escapeHtml(group.description)}</p>
</div>
<div class="cc-arrows" data-carousel-controls hidden>
<button type="button" class="cc-button cc-arrow" data-carousel-prev aria-label="Scroll ${escapeHtml(group.name)} back"><span aria-hidden="true">&larr;</span></button>
<button type="button" class="cc-button cc-arrow" data-carousel-next aria-label="Scroll ${escapeHtml(group.name)} forward"><span aria-hidden="true">&rarr;</span></button>
</div>
</div>
<ul class="cc-list" role="list" data-catalog-list tabindex="0" aria-label="${escapeHtml(group.name)}">
${items.map(renderCard).join('\n')}
</ul>
</section>`;
}

function renderFacet(facet: CatalogFacet, items: CatalogItem[]): string {
  const count = (value: string): number =>
    items.filter((item) =>
      facet.key === GROUP_FACET_KEY
        ? item.group === value
        : item.facets[facet.key] === value
    ).length;
  const options = facet.options
    .map(
      (option) =>
        `<label class="cc-check"><input type="checkbox" name="${escapeHtml(facet.key)}" value="${escapeHtml(option.value)}" data-catalog-facet="${escapeHtml(facet.key)}"><span>${escapeHtml(option.label)} <span class="cc-count">(${count(option.value)})</span></span></label>`
    )
    .join('\n');
  return `<fieldset class="cc-fieldset">
<legend class="cc-label">${escapeHtml(facet.label)}</legend>
<div class="cc-checks">
${options}
</div>
</fieldset>`;
}

/**
 * Returns the catalog as an HTML string. Put it on the page, then call
 * `mountCatalog` on the `[data-catalog]` element to switch on searching,
 * filtering, sorting and the view switch. Without JavaScript the full list is
 * still shown and every card is still a link.
 */
export function renderCatalog(options: CatalogOptions): string {
  const {
    items,
    groups,
    facets = [],
    noun,
    searchLabel = 'Search',
    defaultView = 'carousel',
    layout: layoutOption = 'auto',
    sidebarMinItems = 8,
    idPrefix = 'catalog',
    sorts = DEFAULT_SORTS,
  } = options;

  const split =
    layoutOption === 'split' ||
    (layoutOption === 'auto' && items.length >= sidebarMinItems);
  // `sidebar` and `toolbar` are the values styles and the controller key off.
  const layout = split ? 'sidebar' : 'toolbar';
  const grouped = groupItems(groups, items);
  const groupFacet: CatalogFacet = {
    key: GROUP_FACET_KEY,
    label: 'Group',
    options: groups
      .filter((group) => items.some((item) => item.group === group.slug))
      .map((group) => ({ value: group.slug, label: group.name })),
  };
  const allFacets = [...facets, groupFacet];
  const id = (suffix: string): string => escapeHtml(`${idPrefix}-${suffix}`);

  const sortOptions = sorts
    .map(
      (sort) =>
        `<option value="${escapeHtml(sort.value)}"${sort.value === DEFAULT_SORT ? ' selected' : ''}>${escapeHtml(sort.label)}</option>`
    )
    .join('');
  const viewOptions = CATALOG_VIEWS.map(
    (view) =>
      `<label class="cc-segment"><input class="cc-visually-hidden" type="radio" name="${id('view')}" value="${view.value}" data-catalog-view${view.value === defaultView ? ' checked' : ''}><span class="cc-tick" aria-hidden="true">&#10003;</span>${escapeHtml(view.label)}</label>`
  ).join('');

  return `<div class="cc-catalog" data-catalog data-layout="${layout}" data-view="${defaultView}" data-default-view="${defaultView}" data-default-sort="${escapeHtml(DEFAULT_SORT)}" data-noun-singular="${escapeHtml(noun.singular)}" data-noun-plural="${escapeHtml(noun.plural)}">
<div class="cc-layout">
<aside class="cc-aside" aria-label="${escapeHtml(searchLabel)} and filters">
<form class="cc-form" data-catalog-form role="search" aria-label="${escapeHtml(searchLabel)}" action="" method="get">
<div class="cc-field cc-field-search">
<label class="cc-label" for="${id('search')}">${escapeHtml(searchLabel)}</label>
<input class="cc-input" id="${id('search')}" name="q" type="search" autocomplete="off" data-catalog-search>
</div>
<div class="cc-field cc-field-sort">
<label class="cc-label" for="${id('sort')}">Sort by</label>
<select class="cc-input" id="${id('sort')}" name="sort" data-catalog-sort>${sortOptions}</select>
</div>
<button type="button" class="cc-button cc-toggle" data-catalog-filters-toggle aria-expanded="false" aria-controls="${id('facets')}" hidden><span data-catalog-filters-toggle-label>Show filters</span></button>
<div class="cc-facets" id="${id('facets')}" data-catalog-facets>
${allFacets.map((facet) => renderFacet(facet, items)).join('\n')}
</div>
<div class="cc-field"><button type="button" class="cc-button" data-catalog-clear>Clear search and filters</button></div>
</form>
</aside>
<div class="cc-main">
<div class="cc-toolbar">
<p class="cc-status" role="status" aria-live="polite" data-catalog-status>${escapeHtml(statusMessage(items.length, noun))}</p>
<fieldset class="cc-fieldset cc-views"><legend class="cc-label">View</legend><div class="cc-segments">${viewOptions}</div></fieldset>
</div>
<div data-catalog-results>
${grouped.map(({ group, items: groupItemsList }) => renderGroup(group, groupItemsList, idPrefix)).join('\n')}
</div>
<p class="cc-empty" data-catalog-empty hidden>No ${escapeHtml(noun.plural)} match your search and filters. Try fewer words, or use the "Clear search and filters" button.</p>
</div>
</div>
</div>`;
}

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

/**
 * What the Show filters and Clear buttons show: their text, an icon and their
 * text, or just an icon. With `icon` the text is still there for screen readers
 * (and as a tooltip), only hidden from sight.
 */
export type CatalogButtonDisplay = 'text' | 'icon-text' | 'icon';

/**
 * Wording and icons of the Show filters and Clear buttons. Every field is
 * optional; leave one out to keep the default.
 */
export interface CatalogButtonsOptions {
  /** `text` (default), `icon-text` or `icon`. */
  display?: CatalogButtonDisplay;
  filters?: {
    /** Text while the filters are collapsed. Default "Show filters". */
    showText?: string;
    /** Text while the filters are open. Default "Hide filters". */
    hideText?: string;
    /** Icon markup (an inline SVG) replacing the default funnel. */
    iconHtml?: string;
  };
  clear?: {
    /** Default "Clear search and filters". */
    text?: string;
    /** Icon markup (an inline SVG) replacing the default cross. */
    iconHtml?: string;
  };
}

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
  /** Icons and wording of the Show filters and Clear buttons. */
  buttons?: CatalogButtonsOptions;
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

const ICON_ATTRIBUTES =
  'viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false"';

const DEFAULT_FILTERS_ICON = `<svg ${ICON_ATTRIBUTES}><path d="M3 4h14l-5.5 6.5V16l-3-1.5v-4z"/></svg>`;
const DEFAULT_CLEAR_ICON = `<svg ${ICON_ATTRIBUTES}><path d="M5 5l10 10M15 5L5 15"/></svg>`;

/**
 * The content of a button: its text, its icon, or both. The icon is decoration
 * only, so it is hidden from screen readers and the text stays the button's
 * name; with an icon-only button the text is hidden from sight, not removed.
 * `iconHtml` is markup chosen by the page's author, so it is inserted as it
 * is; never build it from visitor input.
 */
function renderButtonContent(
  text: string,
  iconHtml: string,
  display: CatalogButtonDisplay,
  textAttributes = ''
): string {
  const icon =
    display === 'text'
      ? ''
      : `<span class="cc-btn-icon" aria-hidden="true">${iconHtml}</span>`;
  const textClass =
    display === 'icon' ? 'cc-btn-text cc-visually-hidden' : 'cc-btn-text';
  return `${icon}<span class="${textClass}"${textAttributes}>${escapeHtml(text)}</span>`;
}

/** A tooltip for icon-only buttons, since their text is not visible. */
function titleAttribute(text: string, display: CatalogButtonDisplay): string {
  return display === 'icon' ? ` title="${escapeHtml(text)}"` : '';
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
    buttons = {},
  } = options;

  const display: CatalogButtonDisplay = buttons.display ?? 'text';
  const showFiltersText = buttons.filters?.showText ?? 'Show filters';
  const hideFiltersText = buttons.filters?.hideText ?? 'Hide filters';
  const filtersButtonContent = renderButtonContent(
    showFiltersText,
    buttons.filters?.iconHtml ?? DEFAULT_FILTERS_ICON,
    display,
    ' data-catalog-filters-toggle-label'
  );
  const clearText = buttons.clear?.text ?? 'Clear search and filters';
  const clearButtonContent = renderButtonContent(
    clearText,
    buttons.clear?.iconHtml ?? DEFAULT_CLEAR_ICON,
    display
  );

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
<button type="button" class="cc-button cc-toggle" data-catalog-filters-toggle${titleAttribute(showFiltersText, display)} data-show-text="${escapeHtml(showFiltersText)}" data-hide-text="${escapeHtml(hideFiltersText)}" aria-expanded="false" aria-controls="${id('facets')}" hidden>${filtersButtonContent}</button>
<div class="cc-facets" id="${id('facets')}" data-catalog-facets>
${allFacets.map((facet) => renderFacet(facet, items)).join('\n')}
</div>
<div class="cc-field"><button type="button" class="cc-button" data-catalog-clear${titleAttribute(clearText, display)}>${clearButtonContent}</button></div>
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

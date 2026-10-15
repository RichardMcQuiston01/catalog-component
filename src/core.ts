import type {
  CatalogDefaults,
  CatalogGroup,
  CatalogItem,
  CatalogNoun,
  CatalogSortOption,
  CatalogState,
  CatalogViewName,
} from './types.ts';

export const CATALOG_VIEWS: { value: CatalogViewName; label: string }[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'list', label: 'List' },
];

export const DEFAULT_SORTS: CatalogSortOption[] = [
  { value: 'name', label: 'Name (A to Z)' },
  { value: 'name-desc', label: 'Name (Z to A)' },
  { value: 'newest', label: 'Newest first' },
];

export const DEFAULT_SORT = 'name';

/** The key used for the built-in group filter. */
export const GROUP_FACET_KEY = 'group';

export function isViewName(
  value: string | null | undefined
): value is CatalogViewName {
  return CATALOG_VIEWS.some((view) => view.value === value);
}

/** Reads a state from URL parameters, ignoring anything that is not valid. */
export function stateFromParams(
  params: URLSearchParams,
  facetKeys: readonly string[],
  defaults: CatalogDefaults,
  sorts: readonly CatalogSortOption[] = DEFAULT_SORTS
): CatalogState {
  const filters: Record<string, string[]> = {};
  for (const key of facetKeys) {
    filters[key] = (params.get(key) ?? '').split(',').filter(Boolean);
  }
  const sort = params.get('sort');
  const view = params.get('view');
  return {
    query: params.get('q') ?? '',
    filters,
    sort: sorts.some((option) => option.value === sort)
      ? (sort as string)
      : defaults.sort,
    view: isViewName(view) ? view : defaults.view,
  };
}

/** Writes a state as URL parameters, leaving out anything that is the default. */
export function stateToParams(
  state: CatalogState,
  defaults: CatalogDefaults
): URLSearchParams {
  const params = new URLSearchParams();
  const query = state.query.trim();
  if (query) {
    params.set('q', query);
  }
  for (const [key, values] of Object.entries(state.filters)) {
    if (values.length > 0) {
      params.set(key, values.join(','));
    }
  }
  if (state.sort !== defaults.sort) {
    params.set('sort', state.sort);
  }
  if (state.view !== defaults.view) {
    params.set('view', state.view);
  }
  return params;
}

/** True when an item matches every search word and every active filter. */
export function itemMatches(item: CatalogItem, state: CatalogState): boolean {
  const text = item.searchText.toLowerCase();
  const termsMatch = state.query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => text.includes(term));
  if (!termsMatch) {
    return false;
  }
  for (const [key, values] of Object.entries(state.filters)) {
    if (values.length === 0) {
      continue;
    }
    const itemValue = key === GROUP_FACET_KEY ? item.group : item.facets[key];
    if (itemValue === undefined || !values.includes(itemValue)) {
      return false;
    }
  }
  return true;
}

/** Returns a sorted copy. Unknown sort values fall back to name order. */
export function sortItems(
  items: readonly CatalogItem[],
  sort: string
): CatalogItem[] {
  const byTitle = (a: CatalogItem, b: CatalogItem): number =>
    a.title.localeCompare(b.title, undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  const copy = [...items];
  if (sort === 'name-desc') {
    return copy.sort((a, b) => byTitle(b, a));
  }
  if (sort === 'newest') {
    return copy.sort((a, b) =>
      a.addedOn === b.addedOn ? byTitle(a, b) : a.addedOn < b.addedOn ? 1 : -1
    );
  }
  return copy.sort(byTitle);
}

/** The groups that have at least one item, in the order given. */
export function groupItems(
  groups: readonly CatalogGroup[],
  items: readonly CatalogItem[]
): { group: CatalogGroup; items: CatalogItem[] }[] {
  return groups
    .map((group) => ({
      group,
      items: items.filter((item) => item.group === group.slug),
    }))
    .filter((entry) => entry.items.length > 0);
}

/** The message that tells a screen reader how many results are showing. */
export function statusMessage(count: number, noun: CatalogNoun): string {
  if (count === 0) {
    return `No ${noun.plural} shown`;
  }
  return `${count} ${count === 1 ? noun.singular : noun.plural} shown`;
}

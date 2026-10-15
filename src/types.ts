/** The three ways the results can be laid out. */
export type CatalogViewName = 'grid' | 'carousel' | 'list';

export interface CatalogGroup {
  slug: string;
  name: string;
  description: string;
}

export interface CatalogFacetOption {
  value: string;
  label: string;
}

/** A filter such as price. Each item gives one value per facet key. */
export interface CatalogFacet {
  key: string;
  label: string;
  options: CatalogFacetOption[];
}

export interface CatalogItem {
  id: string;
  title: string;
  summary: string;
  href: string;
  /** Slug of the group this item belongs to. */
  group: string;
  /** Short label shown on the card, for example "Free". */
  badge: string;
  /** One value per facet key, for example { price: 'free' }. */
  facets: Record<string, string>;
  /** Everything a search should match, in any case. */
  searchText: string;
  /** ISO date (YYYY-MM-DD) used by the "Newest first" sort. */
  addedOn: string;
}

export interface CatalogSortOption {
  value: string;
  label: string;
}

export interface CatalogNoun {
  singular: string;
  plural: string;
}

/** What a visitor has chosen: search words, filters, sort order and view. */
export interface CatalogState {
  query: string;
  /** Selected values per facet key. A key with no values is not filtering. */
  filters: Record<string, string[]>;
  sort: string;
  view: CatalogViewName;
}

export interface CatalogDefaults {
  sort: string;
  view: CatalogViewName;
}

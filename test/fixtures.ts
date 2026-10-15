import type { CatalogFacet, CatalogGroup, CatalogItem } from '../src/types.ts';

export const groups: CatalogGroup[] = [
  { slug: 'laser', name: 'Laser cutting', description: 'Parts ready to cut.' },
  { slug: 'text', name: 'Text and signs', description: 'Lettering.' },
  { slug: 'empty', name: 'Empty group', description: 'Nothing here.' },
];

export const facets: CatalogFacet[] = [
  {
    key: 'price',
    label: 'Price',
    options: [
      { value: 'free', label: 'Free' },
      { value: 'paid', label: 'Paid' },
    ],
  },
];

export function makeItem(
  overrides: Partial<CatalogItem> & { id: string }
): CatalogItem {
  return {
    title: overrides.id,
    summary: `Summary of ${overrides.id}`,
    href: `/${overrides.id}/`,
    group: 'laser',
    badge: 'Free',
    facets: { price: 'free' },
    searchText: overrides.title ?? overrides.id,
    addedOn: '2026-01-01',
    ...overrides,
  };
}

export const items: CatalogItem[] = [
  makeItem({
    id: 'hinge',
    title: 'Living Hinge',
    searchText: 'Living Hinge slit pattern',
    addedOn: '2026-03-01',
  }),
  makeItem({
    id: 'kerf',
    title: 'Kerf Test',
    group: 'text',
    searchText: 'Kerf Test gauge',
    addedOn: '2026-02-01',
  }),
  makeItem({
    id: 'stencil',
    title: 'Stencil Text',
    group: 'text',
    badge: 'Paid',
    facets: { price: 'paid' },
    searchText: 'Stencil Text letters',
    addedOn: '2026-04-01',
  }),
  makeItem({
    id: 'puzzle',
    title: 'Jigsaw Puzzle',
    badge: 'Paid',
    facets: { price: 'paid' },
    searchText: 'Jigsaw Puzzle tabs',
    addedOn: '2026-01-15',
  }),
];

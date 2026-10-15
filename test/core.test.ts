import { describe, expect, test } from 'bun:test';
import {
  groupItems,
  itemMatches,
  sortItems,
  stateFromParams,
  stateToParams,
  statusMessage,
} from '../src/core.ts';
import type { CatalogState } from '../src/types.ts';
import { groups, items, makeItem } from './fixtures.ts';

const defaults = { sort: 'name', view: 'carousel' } as const;
const noFilters: CatalogState = {
  query: '',
  filters: {},
  sort: 'name',
  view: 'carousel',
};

describe('stateFromParams', () => {
  test('reads query, filters, sort and view', () => {
    const state = stateFromParams(
      new URLSearchParams('q=hinge&price=free,paid&sort=newest&view=list'),
      ['price', 'group'],
      defaults
    );
    expect(state).toEqual({
      query: 'hinge',
      filters: { price: ['free', 'paid'], group: [] },
      sort: 'newest',
      view: 'list',
    });
  });

  test('ignores an unknown sort or view instead of trusting the URL', () => {
    const state = stateFromParams(
      new URLSearchParams('sort=bogus&view=cube'),
      [],
      defaults
    );
    expect(state.sort).toBe('name');
    expect(state.view).toBe('carousel');
  });
});

describe('stateToParams', () => {
  test('leaves out defaults and empty filters', () => {
    expect(stateToParams(noFilters, defaults).toString()).toBe('');
  });

  test('round-trips a non-default state', () => {
    const state: CatalogState = {
      query: 'living hinge',
      filters: { price: ['free'], group: [] },
      sort: 'newest',
      view: 'grid',
    };
    const params = stateToParams(state, defaults);
    expect(stateFromParams(params, ['price', 'group'], defaults)).toEqual(
      state
    );
  });
});

describe('itemMatches', () => {
  const hinge = items[0]!;
  const stencil = items[2]!;

  test('every search word must match, in any case', () => {
    expect(itemMatches(hinge, { ...noFilters, query: 'HINGE slit' })).toBe(
      true
    );
    expect(itemMatches(hinge, { ...noFilters, query: 'hinge gauge' })).toBe(
      false
    );
  });

  test('a facet filter keeps only matching values', () => {
    expect(
      itemMatches(hinge, { ...noFilters, filters: { price: ['free'] } })
    ).toBe(true);
    expect(
      itemMatches(stencil, { ...noFilters, filters: { price: ['free'] } })
    ).toBe(false);
  });

  test('selecting several values of one facet matches any of them', () => {
    expect(
      itemMatches(stencil, {
        ...noFilters,
        filters: { price: ['free', 'paid'] },
      })
    ).toBe(true);
  });

  test('the group filter uses the item group', () => {
    expect(
      itemMatches(hinge, { ...noFilters, filters: { group: ['text'] } })
    ).toBe(false);
    expect(
      itemMatches(stencil, { ...noFilters, filters: { group: ['text'] } })
    ).toBe(true);
  });

  test('an item missing a facet value does not match that facet', () => {
    const bare = { ...hinge, facets: {} };
    expect(
      itemMatches(bare, { ...noFilters, filters: { price: ['free'] } })
    ).toBe(false);
  });

  test('an empty filter list does not filter', () => {
    expect(itemMatches(stencil, { ...noFilters, filters: { price: [] } })).toBe(
      true
    );
  });
});

describe('sortItems', () => {
  const titles = (sort: string): string[] =>
    sortItems(items, sort).map((item) => item.title);

  test('sorts by name, A to Z', () => {
    expect(titles('name')).toEqual([
      'Jigsaw Puzzle',
      'Kerf Test',
      'Living Hinge',
      'Stencil Text',
    ]);
  });

  test('sorts by name, Z to A', () => {
    expect(titles('name-desc')).toEqual([
      'Stencil Text',
      'Living Hinge',
      'Kerf Test',
      'Jigsaw Puzzle',
    ]);
  });

  test('sorts newest first', () => {
    expect(titles('newest')).toEqual([
      'Stencil Text',
      'Living Hinge',
      'Kerf Test',
      'Jigsaw Puzzle',
    ]);
  });

  test('puts numbers in natural order (Gear 2 before Gear 10)', () => {
    const numbered = ['Gear 10', 'Gear 2', 'Gear 1'].map((title) =>
      makeItem({ id: title, title })
    );
    expect(sortItems(numbered, 'name').map((item) => item.title)).toEqual([
      'Gear 1',
      'Gear 2',
      'Gear 10',
    ]);
  });

  test('does not change the original array', () => {
    const before = items.map((item) => item.id);
    sortItems(items, 'name-desc');
    expect(items.map((item) => item.id)).toEqual(before);
  });
});

describe('groupItems', () => {
  test('keeps group order and drops groups with no items', () => {
    const grouped = groupItems(groups, items);
    expect(grouped.map((entry) => entry.group.slug)).toEqual(['laser', 'text']);
    expect(grouped[0]!.items.map((item) => item.id)).toEqual([
      'hinge',
      'puzzle',
    ]);
  });
});

describe('statusMessage', () => {
  const noun = { singular: 'add-in', plural: 'add-ins' };
  test('uses the right singular and plural', () => {
    expect(statusMessage(1, noun)).toBe('1 add-in shown');
    expect(statusMessage(3, noun)).toBe('3 add-ins shown');
    expect(statusMessage(0, noun)).toBe('No add-ins shown');
  });
});

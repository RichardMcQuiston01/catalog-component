import { beforeEach, describe, expect, test } from 'bun:test';
import { mountCatalog } from '../src/controller.ts';
import type { MountOptions } from '../src/controller.ts';
import { renderCatalog } from '../src/render.ts';
import type { CatalogOptions } from '../src/render.ts';
import { facets, groups, items } from './fixtures.ts';

const noun = { singular: 'add-in', plural: 'add-ins' };

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

function setUp(
  catalogOptions: Partial<CatalogOptions> = {},
  mountOptions: MountOptions = {}
): { root: HTMLElement; storage: MemoryStorage; destroy: () => void } {
  document.body.innerHTML = renderCatalog({
    items,
    groups,
    facets,
    noun,
    ...catalogOptions,
  });
  const root = document.querySelector<HTMLElement>('[data-catalog]')!;
  const storage = new MemoryStorage();
  const handle = mountCatalog(root, { storage, ...mountOptions });
  return { root, storage, destroy: handle.destroy };
}

function type(root: HTMLElement, text: string): void {
  const input = root.querySelector<HTMLInputElement>('[data-catalog-search]')!;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function check(
  root: HTMLElement,
  key: string,
  value: string,
  checked = true
): void {
  const input = root.querySelector<HTMLInputElement>(
    `[data-catalog-facet="${key}"][value="${value}"]`
  )!;
  input.checked = checked;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function chooseView(root: HTMLElement, view: string): void {
  const input = root.querySelector<HTMLInputElement>(
    `[data-catalog-view][value="${view}"]`
  )!;
  input.checked = true;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const shownTitles = (root: HTMLElement): string[] =>
  Array.from(root.querySelectorAll<HTMLElement>('[data-catalog-item]'))
    .filter((element) => !element.hidden)
    .map((element) => element.dataset.title ?? '');

const status = (root: HTMLElement): string =>
  root.querySelector('[data-catalog-status]')!.textContent ?? '';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  document.body.innerHTML = '';
});

describe('mountCatalog', () => {
  test('throws a clear error when the element is not a catalog', () => {
    const div = document.createElement('div');
    expect(() => mountCatalog(div)).toThrow(/renderCatalog/);
  });

  test('shows everything at first', () => {
    const { root } = setUp();
    expect(shownTitles(root).length).toBe(4);
    expect(status(root)).toBe('4 add-ins shown');
  });

  test('searching narrows the results, hides empty groups and updates the status and URL', () => {
    const { root } = setUp();
    type(root, 'kerf');
    expect(shownTitles(root)).toEqual(['Kerf Test']);
    expect(status(root)).toBe('1 add-in shown');
    const sections = Array.from(
      root.querySelectorAll<HTMLElement>('[data-catalog-group]')
    );
    expect(sections.map((section) => section.hidden)).toEqual([true, false]);
    expect(window.location.search).toBe('?q=kerf');
  });

  test('a filter keeps only matching items', () => {
    const { root } = setUp();
    check(root, 'price', 'paid');
    expect(shownTitles(root).sort()).toEqual(['Jigsaw Puzzle', 'Stencil Text']);
    expect(window.location.search).toBe('?price=paid');
  });

  test('shows the empty message when nothing matches', () => {
    const { root } = setUp();
    type(root, 'zzzz');
    expect(
      root.querySelector<HTMLElement>('[data-catalog-empty]')!.hidden
    ).toBe(false);
    expect(status(root)).toBe('No add-ins shown');
    type(root, '');
    expect(
      root.querySelector<HTMLElement>('[data-catalog-empty]')!.hidden
    ).toBe(true);
  });

  test('clear resets the search and filters, clears the URL and focuses the search box', () => {
    const { root } = setUp();
    type(root, 'kerf');
    check(root, 'price', 'free');
    root.querySelector<HTMLButtonElement>('[data-catalog-clear]')!.click();
    expect(shownTitles(root).length).toBe(4);
    expect(window.location.search).toBe('');
    expect(document.activeElement).toBe(
      root.querySelector('[data-catalog-search]')
    );
  });

  test('sorting reorders the cards inside each group', () => {
    const { root } = setUp();
    const select = root.querySelector<HTMLSelectElement>(
      '[data-catalog-sort]'
    )!;
    select.value = 'name-desc';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const laser = Array.from(
      root.querySelectorAll<HTMLElement>('#laser [data-catalog-item]')
    ).map((element) => element.dataset.title);
    expect(laser).toEqual(['Living Hinge', 'Jigsaw Puzzle']);
    expect(window.location.search).toBe('?sort=name-desc');
  });

  test('switching the view updates the page, the URL and the remembered choice', () => {
    const { root, storage } = setUp();
    chooseView(root, 'list');
    expect(root.dataset.view).toBe('list');
    expect(window.location.search).toBe('?view=list');
    expect(storage.getItem('catalog-view')).toBe('list');
    chooseView(root, 'carousel');
    expect(window.location.search).toBe('');
  });

  test('restores the state from the URL', () => {
    window.history.replaceState(
      null,
      '',
      '/?q=text&price=paid&view=grid&sort=newest'
    );
    const { root } = setUp();
    expect(
      root.querySelector<HTMLInputElement>('[data-catalog-search]')!.value
    ).toBe('text');
    expect(root.dataset.view).toBe('grid');
    expect(
      root.querySelector<HTMLSelectElement>('[data-catalog-sort]')!.value
    ).toBe('newest');
    expect(shownTitles(root)).toEqual(['Stencil Text']);
  });

  test('uses the remembered view when the URL does not choose one', () => {
    document.body.innerHTML = renderCatalog({ items, groups, facets, noun });
    const storage = new MemoryStorage();
    storage.setItem('catalog-view', 'grid');
    const root = document.querySelector<HTMLElement>('[data-catalog]')!;
    mountCatalog(root, { storage });
    expect(root.dataset.view).toBe('grid');
  });

  test('works when storage throws', () => {
    document.body.innerHTML = renderCatalog({ items, groups, facets, noun });
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const root = document.querySelector<HTMLElement>('[data-catalog]')!;
    mountCatalog(root, { storage: broken });
    chooseView(root, 'list');
    expect(root.dataset.view).toBe('list');
  });

  test('can leave the URL alone', () => {
    const { root } = setUp({}, { syncUrl: false });
    type(root, 'kerf');
    expect(window.location.search).toBe('');
  });

  test('in the toolbar layout the facet filters start collapsed behind a button', () => {
    const { root } = setUp();
    const panel = root.querySelector<HTMLElement>('[data-catalog-facets]')!;
    const toggle = root.querySelector<HTMLButtonElement>(
      '[data-catalog-filters-toggle]'
    )!;
    expect(panel.hidden).toBe(true);
    expect(toggle.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    expect(panel.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(
      root.querySelector('[data-catalog-filters-toggle-label]')!.textContent
    ).toBe('Hide filters');
  });

  test('opens the filters when the URL already has filters in it', () => {
    window.history.replaceState(null, '', '/?price=free');
    const { root } = setUp();
    expect(
      root.querySelector<HTMLElement>('[data-catalog-facets]')!.hidden
    ).toBe(false);
  });

  test('destroy removes the listeners', () => {
    const { root, destroy } = setUp();
    destroy();
    type(root, 'kerf');
    expect(shownTitles(root).length).toBe(4);
  });

  test('the back button restores an earlier state', () => {
    const { root } = setUp();
    type(root, 'kerf');
    window.history.replaceState(null, '', '/');
    window.dispatchEvent(new Event('popstate'));
    expect(
      root.querySelector<HTMLInputElement>('[data-catalog-search]')!.value
    ).toBe('');
    expect(shownTitles(root).length).toBe(4);
  });
});

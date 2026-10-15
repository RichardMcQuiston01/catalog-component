import { describe, expect, test } from 'bun:test';
import { escapeHtml, renderCatalog } from '../src/render.ts';
import { facets, groups, items, makeItem } from './fixtures.ts';

const noun = { singular: 'add-in', plural: 'add-ins' };

function render(
  overrides: Partial<Parameters<typeof renderCatalog>[0]> = {}
): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = renderCatalog({
    items,
    groups,
    facets,
    noun,
    ...overrides,
  });
  return container;
}

describe('escapeHtml', () => {
  test('escapes the characters that matter in HTML', () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;'
    );
  });
});

describe('renderCatalog', () => {
  test('escapes item text so it cannot inject markup', () => {
    const container = render({
      items: [
        makeItem({
          id: 'x',
          title: '<img src=x onerror=alert(1)>',
          summary: '<b>bold</b>',
        }),
      ],
    });
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('.cc-card-link')?.textContent).toBe(
      '<img src=x onerror=alert(1)>'
    );
  });

  test('renders one linked card per item and no empty groups', () => {
    const container = render();
    const links = Array.from(
      container.querySelectorAll<HTMLAnchorElement>('.cc-card-link')
    );
    expect(links.map((link) => link.getAttribute('href')).sort()).toEqual([
      '/hinge/',
      '/kerf/',
      '/puzzle/',
      '/stencil/',
    ]);
    expect(container.querySelectorAll('[data-catalog-group]').length).toBe(2);
    expect(container.textContent).not.toContain('Empty group');
  });

  test('auto layout uses a toolbar below the threshold and a sidebar at or above it', () => {
    const layoutOf = (options?: Parameters<typeof render>[0]): string | null =>
      render(options)
        .querySelector('[data-catalog]')
        ?.getAttribute('data-layout') ?? null;
    expect(layoutOf()).toBe('toolbar');
    expect(layoutOf({ sidebarMinItems: 4 })).toBe('sidebar');
    expect(layoutOf({ layout: 'auto', sidebarMinItems: 4 })).toBe('sidebar');
  });

  test('the split layout always has the left column, even with few items', () => {
    const container = render({ layout: 'split' });
    expect(
      container.querySelector('[data-catalog]')?.getAttribute('data-layout')
    ).toBe('sidebar');
    const aside = container.querySelector('.cc-layout > .cc-aside');
    const main = container.querySelector('.cc-layout > .cc-main');
    expect(aside?.querySelector('[data-catalog-search]')).not.toBeNull();
    expect(aside?.querySelector('[data-catalog-sort]')).not.toBeNull();
    expect(aside?.querySelector('[data-catalog-facet]')).not.toBeNull();
    expect(main?.querySelector('[data-catalog-view]')).not.toBeNull();
    expect(main?.querySelector('[data-catalog-results]')).not.toBeNull();
  });

  test('the stacked layout keeps the toolbar even with many items', () => {
    const container = render({ layout: 'stacked', sidebarMinItems: 1 });
    expect(
      container.querySelector('[data-catalog]')?.getAttribute('data-layout')
    ).toBe('toolbar');
  });

  test('gives every control a label and groups checkboxes in fieldsets', () => {
    const container = render();
    for (const control of container.querySelectorAll(
      'input[type="search"], select'
    )) {
      const id = control.getAttribute('id');
      expect(container.querySelector(`label[for="${id}"]`)).not.toBeNull();
    }
    expect(
      container.querySelectorAll('fieldset > legend').length
    ).toBeGreaterThanOrEqual(3);
    expect(
      container.querySelector('[role="status"][aria-live="polite"]')
        ?.textContent
    ).toBe('4 add-ins shown');
  });

  test('shows how many items each filter option has', () => {
    const container = render();
    expect(
      container.querySelector('input[value="paid"]')?.parentElement?.textContent
    ).toContain('(2)');
    expect(
      container.querySelector('input[value="text"]')?.parentElement?.textContent
    ).toContain('(2)');
  });

  test('ids from different catalogs do not collide', () => {
    const a = render({ idPrefix: 'one' }).querySelector(
      'input[type="search"]'
    )?.id;
    const b = render({ idPrefix: 'two' }).querySelector(
      'input[type="search"]'
    )?.id;
    expect(a).not.toBe(b);
  });

  test('contains no script or inline event handler', () => {
    const html = renderCatalog({ items, groups, facets, noun });
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/\son[a-z]+=/);
  });

  test('marks the default view as checked', () => {
    const checked = render({
      defaultView: 'list',
    }).querySelector<HTMLInputElement>('input[data-catalog-view][checked]');
    expect(checked?.value).toBe('list');
  });
});

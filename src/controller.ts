import {
  DEFAULT_SORT,
  DEFAULT_SORTS,
  GROUP_FACET_KEY,
  isViewName,
  itemMatches,
  sortItems,
  stateFromParams,
  stateToParams,
  statusMessage,
} from './core.ts';
import type {
  CatalogDefaults,
  CatalogItem,
  CatalogSortOption,
  CatalogState,
  CatalogViewName,
} from './types.ts';

export interface MountOptions {
  /** Where the chosen view is remembered. Pass null to remember nothing. */
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  storageKey?: string;
  /** Keep the state in the page URL (default true). */
  syncUrl?: boolean;
  /** Sort choices; must match what was rendered. */
  sorts?: CatalogSortOption[];
}

export interface CatalogHandle {
  /** Re-reads the form and updates the page. */
  refresh(): void;
  /** Removes every listener this call added. */
  destroy(): void;
}

const WIDE_SCREEN_QUERY = '(min-width: 64rem)';
const FACET_ATTRIBUTE_PREFIX = 'data-facet-';

/** Builds an item from the data attributes that `renderCatalog` writes. */
function readItem(element: HTMLElement): CatalogItem {
  const facets: Record<string, string> = {};
  let group = '';
  for (const attribute of Array.from(element.attributes)) {
    if (!attribute.name.startsWith(FACET_ATTRIBUTE_PREFIX)) {
      continue;
    }
    const key = attribute.name.slice(FACET_ATTRIBUTE_PREFIX.length);
    if (key === GROUP_FACET_KEY) {
      group = attribute.value;
    } else {
      facets[key] = attribute.value;
    }
  }
  return {
    id: element.dataset.id ?? '',
    title: element.dataset.title ?? '',
    summary: '',
    href: '',
    group,
    badge: '',
    facets,
    searchText: element.dataset.search ?? '',
    addedOn: element.dataset.added ?? '',
  };
}

function readStoredView(
  storage: MountOptions['storage'],
  key: string
): CatalogViewName | null {
  try {
    const stored = storage?.getItem(key) ?? null;
    return isViewName(stored) ? stored : null;
  } catch {
    // Storage can be blocked (private windows, site settings). That is fine.
    return null;
  }
}

function storeView(
  storage: MountOptions['storage'],
  key: string,
  view: CatalogViewName
): void {
  try {
    storage?.setItem(key, view);
  } catch {
    // Not remembering the choice is harmless.
  }
}

/**
 * Switches on searching, filtering, sorting, the Grid / Carousel / List switch
 * and the carousel arrows for a catalog made by `renderCatalog`.
 */
export function mountCatalog(
  root: HTMLElement,
  options: MountOptions = {}
): CatalogHandle {
  const {
    storage = typeof window === 'undefined' ? null : safeLocalStorage(),
    storageKey = 'catalog-view',
    syncUrl = true,
    sorts = DEFAULT_SORTS,
  } = options;

  const form = root.querySelector<HTMLFormElement>('[data-catalog-form]');
  const searchInput = root.querySelector<HTMLInputElement>(
    '[data-catalog-search]'
  );
  const sortSelect = root.querySelector<HTMLSelectElement>(
    '[data-catalog-sort]'
  );
  if (!form || !searchInput || !sortSelect) {
    throw new Error(
      'mountCatalog: the element has no catalog form, search box or sort control. Was it made by renderCatalog?'
    );
  }

  const facetInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>('[data-catalog-facet]')
  );
  const viewInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>('[data-catalog-view]')
  );
  const clearButton = root.querySelector<HTMLButtonElement>(
    '[data-catalog-clear]'
  );
  const status = root.querySelector<HTMLElement>('[data-catalog-status]');
  const emptyMessage = root.querySelector<HTMLElement>('[data-catalog-empty]');
  const facetsPanel = root.querySelector<HTMLElement>('[data-catalog-facets]');
  const toggleButton = root.querySelector<HTMLButtonElement>(
    '[data-catalog-filters-toggle]'
  );
  const toggleLabel = root.querySelector<HTMLElement>(
    '[data-catalog-filters-toggle-label]'
  );
  const sections = Array.from(
    root.querySelectorAll<HTMLElement>('[data-catalog-group]')
  );

  const defaultViewAttribute = root.dataset.defaultView ?? null;
  const defaults: CatalogDefaults = {
    sort: root.dataset.defaultSort ?? DEFAULT_SORT,
    view: isViewName(defaultViewAttribute) ? defaultViewAttribute : 'carousel',
  };
  const noun = {
    singular: root.dataset.nounSingular ?? 'item',
    plural: root.dataset.nounPlural ?? 'items',
  };
  const facetKeys = Array.from(
    new Set(facetInputs.map((input) => input.dataset.catalogFacet ?? ''))
  ).filter((key) => key !== '');
  const filtersCollapsibleAlways = root.dataset.layout === 'toolbar';

  const controller = new AbortController();
  const { signal } = controller;
  const wideScreen = window.matchMedia(WIDE_SCREEN_QUERY);
  const resizeObservers: ResizeObserver[] = [];
  let filtersExpanded = false;

  // ----- Inputs <-> state -----

  function readState(): CatalogState {
    const filters: Record<string, string[]> = {};
    for (const key of facetKeys) {
      filters[key] = facetInputs
        .filter((input) => input.dataset.catalogFacet === key && input.checked)
        .map((input) => input.value);
    }
    const checkedView =
      viewInputs.find((input) => input.checked)?.value ?? null;
    return {
      query: searchInput!.value,
      filters,
      sort: sortSelect!.value,
      view: isViewName(checkedView) ? checkedView : defaults.view,
    };
  }

  function writeState(state: CatalogState): void {
    searchInput!.value = state.query;
    sortSelect!.value = state.sort;
    for (const input of facetInputs) {
      const key = input.dataset.catalogFacet ?? '';
      input.checked = (state.filters[key] ?? []).includes(input.value);
    }
    for (const input of viewInputs) {
      input.checked = input.value === state.view;
    }
  }

  function stateFromLocation(): CatalogState {
    const params = new URLSearchParams(window.location.search);
    const state = stateFromParams(params, facetKeys, defaults, sorts);
    if (!params.has('view')) {
      state.view = readStoredView(storage, storageKey) ?? defaults.view;
    }
    return state;
  }

  function writeUrl(state: CatalogState): void {
    if (!syncUrl) {
      return;
    }
    const query = stateToParams(state, defaults).toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', url);
  }

  // ----- Updating the page -----

  function applyItems(state: CatalogState): number {
    let visibleTotal = 0;
    for (const section of sections) {
      const list = section.querySelector<HTMLElement>('[data-catalog-list]');
      if (!list) {
        continue;
      }
      const elements = Array.from(
        list.querySelectorAll<HTMLElement>('[data-catalog-item]')
      );
      const byId = new Map(
        elements.map((element) => [element, readItem(element)])
      );
      const sorted = sortItems(Array.from(byId.values()), state.sort);
      const elementFor = new Map(
        Array.from(byId.entries()).map(([element, item]) => [item, element])
      );
      let visibleInSection = 0;
      for (const item of sorted) {
        const element = elementFor.get(item);
        if (!element) {
          continue;
        }
        const show = itemMatches(item, state);
        element.hidden = !show;
        if (show) {
          visibleInSection += 1;
        }
        list.appendChild(element);
      }
      section.hidden = visibleInSection === 0;
      visibleTotal += visibleInSection;
    }
    return visibleTotal;
  }

  function updateStatus(visibleTotal: number): void {
    if (status) {
      status.textContent = statusMessage(visibleTotal, noun);
    }
    if (emptyMessage) {
      emptyMessage.hidden = visibleTotal !== 0;
    }
  }

  function updateCarousels(): void {
    for (const section of sections) {
      const list = section.querySelector<HTMLElement>('[data-catalog-list]');
      const controls = section.querySelector<HTMLElement>(
        '[data-carousel-controls]'
      );
      const prev = section.querySelector<HTMLButtonElement>(
        '[data-carousel-prev]'
      );
      const next = section.querySelector<HTMLButtonElement>(
        '[data-carousel-next]'
      );
      if (!list || !controls || !prev || !next) {
        continue;
      }
      const overflows =
        root.dataset.view === 'carousel' &&
        list.scrollWidth > list.clientWidth + 1;
      controls.hidden = !overflows;
      prev.disabled = list.scrollLeft <= 0;
      next.disabled =
        list.scrollLeft + list.clientWidth >= list.scrollWidth - 1;
    }
  }

  function apply(updateUrl: boolean): void {
    const state = readState();
    root.dataset.view = state.view;
    updateStatus(applyItems(state));
    updateCarousels();
    if (updateUrl) {
      writeUrl(state);
    }
  }

  function updateFiltersPanel(): void {
    if (!facetsPanel || !toggleButton || !toggleLabel) {
      return;
    }
    const collapsible = filtersCollapsibleAlways || !wideScreen.matches;
    toggleButton.hidden = !collapsible;
    facetsPanel.hidden = collapsible && !filtersExpanded;
    toggleButton.setAttribute('aria-expanded', String(!facetsPanel.hidden));
    toggleLabel.textContent = filtersExpanded ? 'Hide filters' : 'Show filters';
  }

  // ----- Wiring -----

  toggleButton?.addEventListener(
    'click',
    () => {
      filtersExpanded = !filtersExpanded;
      updateFiltersPanel();
    },
    { signal }
  );
  wideScreen.addEventListener('change', updateFiltersPanel, { signal });

  for (const section of sections) {
    const list = section.querySelector<HTMLElement>('[data-catalog-list]');
    const prev = section.querySelector<HTMLButtonElement>(
      '[data-carousel-prev]'
    );
    const next = section.querySelector<HTMLButtonElement>(
      '[data-carousel-next]'
    );
    if (!list || !prev || !next) {
      continue;
    }
    const scrollByPage = (direction: 1 | -1): void => {
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      list.scrollBy({
        left: direction * list.clientWidth * 0.9,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    };
    prev.addEventListener('click', () => scrollByPage(-1), { signal });
    next.addEventListener('click', () => scrollByPage(1), { signal });
    list.addEventListener('scroll', updateCarousels, { passive: true, signal });
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateCarousels);
      observer.observe(list);
      resizeObservers.push(observer);
    }
  }

  form.addEventListener('submit', (event) => event.preventDefault(), {
    signal,
  });
  form.addEventListener('input', () => apply(true), { signal });
  form.addEventListener('change', () => apply(true), { signal });

  for (const input of viewInputs) {
    input.addEventListener(
      'change',
      () => {
        if (input.checked && isViewName(input.value)) {
          storeView(storage, storageKey, input.value);
        }
        apply(true);
      },
      { signal }
    );
  }

  clearButton?.addEventListener(
    'click',
    () => {
      writeState({
        query: '',
        filters: Object.fromEntries(facetKeys.map((key) => [key, []])),
        sort: defaults.sort,
        view: readState().view,
      });
      apply(true);
      searchInput.focus();
    },
    { signal }
  );

  window.addEventListener(
    'popstate',
    () => {
      writeState(stateFromLocation());
      apply(false);
    },
    { signal }
  );

  // ----- Start -----

  const initial = stateFromLocation();
  writeState(initial);
  filtersExpanded = Object.values(initial.filters).some(
    (values) => values.length > 0
  );
  updateFiltersPanel();
  apply(false);

  return {
    refresh: () => apply(false),
    destroy: () => {
      controller.abort();
      for (const observer of resizeObservers) {
        observer.disconnect();
      }
    },
  };
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Mounts every catalog on the page. Returns one handle per catalog. */
export function mountAllCatalogs(
  scope: ParentNode = document,
  options: MountOptions = {}
): CatalogHandle[] {
  return Array.from(scope.querySelectorAll<HTMLElement>('[data-catalog]')).map(
    (root) => mountCatalog(root, options)
  );
}

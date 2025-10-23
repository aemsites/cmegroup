import {
  getMetadata,
  buildBlock,
  decorateBlock,
  loadBlock,
  loadSection,
  toClassName,
} from '../../scripts/aem.js';
import {
  normalizePath,
  computeProductRoot,
  loadProductIndex,
} from '../../scripts/utils/product.js';

import { decorateMain } from '../../scripts/scripts.js';

// Simple in-memory prefetch cache for intra-product navigation
const PREFETCH_CACHE = new Map();
let POPSTATE_BOUND = false;

function findProductTabsSection() {
  const main = document.querySelector('main');
  return main?.querySelector('.product-tabs-container');
}

function findHeroSection() {
  const main = document.querySelector('main');
  const hero = main?.querySelector('.hero-baseball');
  return hero ? hero.closest('.section') : null;
}

async function indexHasPath(path) {
  const idx = await loadProductIndex();
  if (!idx || !Array.isArray(idx.data)) return false;
  const norm = normalizePath(path);
  return !!idx.data.find((row) => normalizePath(row.path) === norm);
}

async function insertFragmentAfter(section, href) {
  const a = document.createElement('a');
  a.setAttribute('href', href);
  a.textContent = href;
  const frag = buildBlock('fragment', [[a]]);
  section.parentNode.insertBefore(frag, section.nextSibling);
  decorateBlock(frag);
  await loadBlock(frag);
}

function removeDuplicateTabs() {
  const containers = document.querySelectorAll('.product-tabs-container');
  if (containers.length <= 1) return;
  containers.forEach((container, index) => {
    if (index === 0) return;
    const sec = container.closest('.section');
    if (sec && sec.parentNode) {
      sec.parentNode.removeChild(sec);
    }
  });
}

function createSectionWithBlock(blockEl) {
  const section = document.createElement('div');
  section.className = 'section';
  const wrapper = document.createElement('div');
  section.appendChild(wrapper);
  wrapper.appendChild(blockEl);
  return section;
}

async function fetchLandingTabRows(productRoot) {
  try {
    const resp = await fetch(`${productRoot}.plain.html`);
    if (!resp.ok) return null;
    const html = await resp.text();
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const block = temp.querySelector('.product-tabs');
    if (!block) return null;
    const rows = [];
    block.querySelectorAll(':scope > div').forEach((row) => {
      const cols = row.children ? [...row.children] : [];
      const label = cols[0] ? cols[0].textContent.trim() : '';
      const a = cols[1] ? cols[1].querySelector('a') : null;
      const href = a ? a.getAttribute('href') : '';
      if (label && href) rows.push([label, href]);
    });
    return rows.length ? rows : null;
  } catch (e) {
    return null;
  }
}

function buildProductTabsBlock(productRoot, rowsOverride) {
  const rows = [];
  const TABS = rowsOverride && rowsOverride.length ? rowsOverride : [
    ['Overview', productRoot],
    ['Quotes', `${productRoot}/quotes`],
    ['Settlements', `${productRoot}/settlements`],
    ['Volume & OI', `${productRoot}/volume`],
    ['Contract Specs', `${productRoot}/specs`],
    ['Margins', `${productRoot}/margins`],
    ['Calendar', `${productRoot}/calendar`],
  ];
  TABS.forEach(([label, href]) => {
    const a = document.createElement('a');
    a.setAttribute('href', href);
    a.textContent = href;
    rows.push([{ elems: [document.createElement('p')] }, { elems: [document.createElement('p')] }]);
    rows[rows.length - 1][0].elems[0].textContent = label;
    rows[rows.length - 1][1].elems[0].appendChild(a);
  });
  const block = buildBlock('product-tabs', rows);
  return block;
}

async function insertProductTabsIfMissing(productRoot) {
  const main = document.querySelector('main');
  if (!main) return null;
  const tabsSection = main.querySelector('.product-tabs-container');
  if (tabsSection) return tabsSection;
  const landingRows = await fetchLandingTabRows(productRoot);
  let rowsForBuild = landingRows;
  if (!rowsForBuild) {
    // filter canonical by index existence
    await loadProductIndex();
    const canonical = [
      ['Overview', productRoot],
      ['Quotes', `${productRoot}/quotes`],
      ['Settlements', `${productRoot}/settlements`],
      ['Volume & OI', `${productRoot}/volume`],
      ['Contract Specs', `${productRoot}/specs`],
      ['Margins', `${productRoot}/margins`],
      ['Calendar', `${productRoot}/calendar`],
    ];
    // eslint-disable-next-line no-await-in-loop
    const filtered = [];
    for (let i = 0; i < canonical.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await indexHasPath(canonical[i][1])) filtered.push(canonical[i]);
    }
    rowsForBuild = filtered;
  }
  const block = buildProductTabsBlock(productRoot, rowsForBuild);
  const section = createSectionWithBlock(block);
  const heroSection = findHeroSection();
  if (heroSection && heroSection.parentNode) {
    heroSection.parentNode.insertBefore(section, heroSection.nextSibling);
  } else {
    main.insertBefore(section, main.firstChild);
  }
  decorateBlock(block);
  await loadBlock(block);
  return section;
}

async function insertHeroIfMissing() {
  const main = document.querySelector('main');
  if (!main) return;
  const existing = main.querySelector('.hero-baseball');
  if (existing) return;
  const hero = buildBlock('hero-baseball', '');
  const section = createSectionWithBlock(hero);
  section.classList.add('full-width');
  main.insertBefore(section, main.firstChild);
  decorateBlock(hero);
  await loadBlock(hero);
}

function ensureHeroThenTabsOrder() {
  const heroSection = findHeroSection();
  const tabsSection = findProductTabsSection();
  if (!heroSection || !tabsSection) return;
  const next = heroSection.nextElementSibling;
  if (next !== tabsSection) {
    heroSection.parentNode.insertBefore(tabsSection, heroSection.nextSibling);
  }
}

async function insertSubTabsIfApplicable(productRoot) {
  const main = document.querySelector('main');
  if (!main) return;
  const tabsSection = findProductTabsSection();
  if (!tabsSection) return;
  // Always remove any existing inline sub-tabs first so stale toggles don't linger
  const stale = tabsSection.querySelector('.product-subtabs');
  if (stale && stale.parentNode) {
    stale.parentNode.removeChild(stale);
  }

  // Determine if we are on a primary tab or its /options variant
  const currentPath = normalizePath(window.location.pathname);
  const rel = normalizePath(currentPath).replace(normalizePath(productRoot), '');
  const parts = rel.split('/').filter((p) => p);
  if (parts.length === 0) return; // on product root
  const primaryTab = parts[0];
  if (primaryTab === 'overview') return; // no sub-tabs on overview

  const futuresPath = `${productRoot}/${primaryTab}`;
  const optionsPath = `${futuresPath}/options`;

  const [hasFutures, hasOptions] = await Promise.all([
    indexHasPath(futuresPath),
    indexHasPath(optionsPath),
  ]);
  if (!hasFutures || !hasOptions) return; // show toggle only if both exist

  // Build sub-tabs nav
  const nav = document.createElement('nav');
  nav.className = 'product-subtabs';
  nav.setAttribute('aria-label', 'Sub tabs');

  const list = document.createElement('ul');
  list.className = 'product-subtabs-list';

  if (hasFutures) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = futuresPath;
    a.textContent = 'Futures';
    if (currentPath === normalizePath(futuresPath)) a.classList.add('is-active');
    li.appendChild(a);
    list.appendChild(li);
  }
  if (hasOptions) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = optionsPath;
    a.textContent = 'Options';
    if (currentPath === normalizePath(optionsPath)) a.classList.add('is-active');
    li.appendChild(a);
    list.appendChild(li);
  }

  nav.appendChild(list);

  // Place sub-tabs inline, to the right of product-tabs within the same wrapper
  const wrapper = tabsSection.querySelector('.product-tabs-wrapper')
    || tabsSection.querySelector(':scope > div');
  if (!wrapper) return;
  wrapper.appendChild(nav);
}

function ensureSubTabsContentContainer() {
  const tabsSection = findProductTabsSection();
  if (!tabsSection || !tabsSection.parentNode) return null;
  let container = tabsSection.nextElementSibling;
  if (!container || !container.classList.contains('product-subtabs-content')) {
    container = document.createElement('div');
    container.className = 'section product-subtabs-content';
    const inner = document.createElement('div');
    container.appendChild(inner);
    tabsSection.parentNode.insertBefore(container, tabsSection.nextSibling);
  }
  return container.querySelector('div');
}

function moveCurrentPageContentUnderSubTabs() {
  const container = ensureSubTabsContentContainer();
  if (!container) return;
  const main = document.querySelector('main');
  const sections = [...main.querySelectorAll(':scope > .section')];
  const movable = sections.filter((sec) => !sec.querySelector('.hero-baseball')
    && !sec.classList.contains('product-tabs-container')
    && !sec.classList.contains('product-subtabs-content'));
  if (!movable.length) return;
  movable.forEach((sec) => container.appendChild(sec));
}

export default async function productTemplate() {
  const template = (getMetadata('template') || '').toLowerCase();
  if (template !== 'product') return;

  const productRoot = computeProductRoot(window.location.pathname);

  // ensure hero first
  await insertHeroIfMissing();

  // ensure tabs exist on both landing and tab pages
  const productTabsSection = findProductTabsSection()
    || await insertProductTabsIfMissing(productRoot);

  // enforce order: hero first, then tabs
  ensureHeroThenTabsOrder();

  // insert sub-tabs (e.g., Futures/Options) when applicable
  await insertSubTabsIfApplicable(productRoot);
  // normalize current page content to live under sub-tabs area
  moveCurrentPageContentUnderSubTabs();

  // Enable SPA-like navigation within the same product
  enableProductSpaNavigation(productRoot);

  const onRoot = normalizePath(window.location.pathname) === normalizePath(productRoot);
  // Only inject fragment on true product root; not on tab or options pages
  if (onRoot) {
    const hashKey = toClassName(window.location.hash.replace('#', ''));
    const targetKey = hashKey || 'overview';
    const targetHref = targetKey === 'overview' ? `${productRoot}/overview` : `${productRoot}/${targetKey}`;
    await insertFragmentAfter(productTabsSection, targetHref);
    removeDuplicateTabs();
  }
}

/**
 * SPA-like navigation: intercept intra-product links (tabs and sub-tabs)
 * and swap only the content area below tabs, keeping hero and nav stable.
 */
function enableProductSpaNavigation(productRoot) {
  const tabsNav = document.querySelector('.product-tabs-nav');
  const subTabsNav = document.querySelector('.product-subtabs');
  if (tabsNav && !tabsNav.dataset.spaBound) {
    wireNavClicks(tabsNav, productRoot);
    wirePrefetches(tabsNav, productRoot);
    tabsNav.dataset.spaBound = 'y';
  }
  if (subTabsNav && !subTabsNav.dataset.spaBound) {
    wireNavClicks(subTabsNav, productRoot);
    wirePrefetches(subTabsNav, productRoot);
    subTabsNav.dataset.spaBound = 'y';
  }

  if (!POPSTATE_BOUND) {
    window.addEventListener('popstate', () => {
      const url = window.location.pathname + window.location.search + window.location.hash;
      renderProductPath(url, productRoot);
    });
    POPSTATE_BOUND = true;
  }
}

function wireNavClicks(container, productRoot) {
  const debouncedNavigate = ((href) => {
    window.history.pushState({}, '', href);
    renderProductPath(href, productRoot);
  });
  container.querySelectorAll('a[href]')
    .forEach((a) => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (!href) return;
        const targetRoot = computeProductRoot(href);
        // Only intercept links within the same product
        if (normalizePath(targetRoot) !== normalizePath(productRoot)) return;
        e.preventDefault();
        debouncedNavigate(href);
      });
    });
}

async function renderProductPath(url, productRoot) {
  try {
    // Avoid serving stale prefetched HTML across different tab families
    const myToken = Date.now();
    renderProductPath.currentToken = myToken;
    PREFETCH_CACHE.clear();
    // Update active state in product tabs immediately
    updateTabsActiveState(url);

    // Ensure sub-tabs reflect the destination and content is placed under them
    await insertSubTabsIfApplicable(productRoot);
    moveCurrentPageContentUnderSubTabs();
    // Re-wire nav clicks in case sub-tabs were re-rendered
    enableProductSpaNavigation(productRoot);

    // Fetch target page and swap renderable sections below tabs
    let html = null;
    const cached = PREFETCH_CACHE.get(url);
    if (cached) {
      html = await cached.catch(() => null);
    }
    if (!html) {
      const resp = await fetch(`${url}.plain.html`);
      if (!resp.ok) return;
      html = await resp.text();
    }
    const tempMain = document.createElement('main');
    tempMain.innerHTML = html;
    decorateMain(tempMain);

    const container = ensureSubTabsContentContainer();
    if (!container) return;
    const renderables = [...tempMain.querySelectorAll(':scope > .section')]
      .filter((sec) => !sec.querySelector('.hero-baseball')
        && !sec.classList.contains('product-tabs-container')
        && !sec.classList.contains('product-subtabs-content')
        && !sec.classList.contains('product-subtabs'));

    if (renderProductPath.currentToken !== myToken) return;
    container.innerHTML = '';
    const clones = renderables.map((sec) => {
      const cloned = sec.cloneNode(true);
      container.appendChild(cloned);
      return cloned;
    });
    await Promise.all(clones.map((cl) => loadSection(cl)));
  } catch (e) {
    // On failure, allow a normal navigation fallback on next click
  }
}

function updateTabsActiveState(url) {
  const currPath = normalizePath(new URL(url, window.location.origin).pathname);

  const isEquivalentToTab = (current, tabHref) => {
    const linkPath = normalizePath(new URL(tabHref, window.location.origin).pathname);
    // Base path for the tab (strip /overview if present)
    const base = linkPath.endsWith('/overview')
      ? normalizePath(linkPath.replace(/\/overview$/, ''))
      : linkPath;
    return current === base
      || current === normalizePath(`${base}/overview`)
      || current === normalizePath(`${base}/options`);
  };

  document.querySelectorAll('.product-tabs-nav a').forEach((link) => {
    const href = link.getAttribute('href');
    const active = isEquivalentToTab(currPath, href);
    link.classList.toggle('is-active', active);
  });

  document.querySelectorAll('.product-subtabs a').forEach((link) => {
    const linkPath = normalizePath(new URL(link.getAttribute('href'), window.location.origin).pathname);
    link.classList.toggle('is-active', currPath === linkPath);
  });
}

function wirePrefetches(container, productRoot) {
  const links = [...container.querySelectorAll('a[href]')]
    .filter((a) => normalizePath(computeProductRoot(a.getAttribute('href'))) === normalizePath(productRoot));

  const prefetch = (href) => {
    if (!href || PREFETCH_CACHE.has(href)) return;
    const promise = fetch(`${href}.plain.html`).then((r) => (r.ok ? r.text() : null));
    PREFETCH_CACHE.set(href, promise);
  };

  // Hover/focus intent
  links.forEach((a) => {
    const href = a.getAttribute('href');
    a.addEventListener('mouseenter', () => prefetch(href));
    a.addEventListener('focus', () => prefetch(href));
    // Also prefetch the sibling options/futures counterpart to avoid mixing content
    const sibling = href.endsWith('/options') ? href.replace(/\/options$/, '') : `${href}/options`;
    a.addEventListener('mouseenter', () => prefetch(sibling));
    a.addEventListener('focus', () => prefetch(sibling));
  });

  // Viewport intent (disconnect old observer to avoid stacking)
  try {
    if (container.productIo) {
      container.productIo.disconnect();
      container.productIo = null;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const href = entry.target.getAttribute('href');
          prefetch(href);
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '200px' });
    links.forEach((a) => io.observe(a));
    container.productIo = io;
  } catch (e) {
    // IntersectionObserver not available; best-effort via hover/focus
  }
}

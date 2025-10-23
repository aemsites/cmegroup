import {
  getMetadata,
  buildBlock,
  decorateBlock,
  loadBlock,
  toClassName,
} from '../../scripts/aem.js';

import {
  normalizePath,
  computeProductRoot,
  loadProductIndex,
} from '../../scripts/utils/product.js';

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
  if (!hasFutures && !hasOptions) return;
  if (hasFutures && !hasOptions) return; // single page, no toggle

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
  // Remove any existing inline sub-tabs first
  const existingInline = tabsSection.querySelector('.product-subtabs');
  if (existingInline && existingInline.parentNode) {
    existingInline.parentNode.removeChild(existingInline);
  }
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

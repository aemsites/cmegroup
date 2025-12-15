/**
 * Product Template - DOM Helper Functions
 * Handles DOM manipulation, section building, and tab discovery
 */

import { normalizePath, loadProductIndex, indexHasPath } from '../../scripts/utils/product.js';
import { buildBlock, decorateBlock, loadBlock } from '../../scripts/aem.js';
import { i18n, createElement } from '../../scripts/utils.js';

/**
 * Find the product tabs section in the DOM
 */
export function findProductTabsSection() {
  const main = document.querySelector('main');
  return main?.querySelector('.product-tabs-container');
}

/**
 * Find the hero section in the DOM
 */
export function findHeroSection() {
  const main = document.querySelector('main');
  const hero = main?.querySelector('.hero-baseball');
  return hero ? hero.closest('.section') : null;
}

/**
 * Preload the path index cache to avoid delays during user interactions
 * ✅ REFACTORED: Now uses shared cache from utils/product.js
 */
export async function preloadPathIndex() {
  try {
    // Determine base path from current location
    const currentPath = window.location.pathname;
    const basePath = `/${currentPath.split('/')[1]}`;

    // Load the shared product index (will use cache if already loaded)
    await loadProductIndex(basePath);
  } catch (e) {
    // Silent fail
  }
}

// Note: indexHasPath is now imported from utils/product.js
// No need to re-export it here, just import directly where needed

/**
 * Create a section wrapper with a block inside
 */
export function createSectionWithBlock(blockEl) {
  const wrapper = createElement('div', null, blockEl);
  const section = createElement('div', { class: 'section' }, wrapper);
  return section;
}

let productRootPromise = null;

/**
 * Fetch the product root document
 */
export async function fetchProductRoot(productRoot) {
  if (!productRootPromise) {
    productRootPromise = new Promise((resolve, reject) => {
      (async () => {
        try {
          const url = `${productRoot}.plain.html`;
          const resp = await fetch(url);
          if (!resp.ok) {
            resolve();
          }
          const html = await resp.text();
          const temp = createElement('div');
          temp.innerHTML = html;
          resolve(temp);
        } catch (e) {
          reject(e);
        }
      })();
    });
  }
  return productRootPromise;
}

/**
 * Fetch tab rows from the parent product page
 * Handles both flat and nested HTML structures
 */
export async function fetchLandingTabRows(productRoot) {
  try {
    const temp = await fetchProductRoot(productRoot);
    const block = temp.querySelector('.product-tabs');

    if (!block) return null;

    const rows = [];
    const blockChildren = block.querySelectorAll(':scope > div');

    // Detect structure type: flat (alternating divs) vs nested (row/column)
    const firstChild = blockChildren[0];
    const firstChildColCount = firstChild ? firstChild.children.length : 0;
    const isFlatStructure = firstChildColCount < 2;

    if (isFlatStructure) {
      // Flat: <div>Label</div><div>path</div>...
      for (let i = 0; i < blockChildren.length; i += 2) {
        const labelDiv = blockChildren[i];
        const pathDiv = blockChildren[i + 1];

        if (labelDiv && pathDiv) {
          const label = labelDiv.textContent.trim();
          const path = pathDiv.textContent.trim();

          if (label && path) {
            const href = path.startsWith('http') || path.startsWith('/')
              ? path
              : `${productRoot}/${path}`;
            rows.push([label, href]);
          }
        }
      }
    } else {
      // Nested: <div><div>Label</div><div><a>...</a></div></div>...
      blockChildren.forEach((row) => {
        const cols = row.children ? [...row.children] : [];

        if (cols.length === 2) {
          const label = cols[0].textContent.trim();
          const a = cols[1].querySelector('a');
          let href = a ? a.getAttribute('href') : '';

          if (!href) {
            const path = cols[1].textContent.trim();
            href = path.startsWith('http') || path.startsWith('/')
              ? path
              : `${productRoot}/${path}`;
          }

          if (label && href) {
            rows.push([label, href]);
          }
        }
      });
    }

    return rows.length ? rows : null;
  } catch (e) {
    return null;
  }
}

/**
 * Get the default tab from the parent page (first tab in the list)
 * Falls back to 'overview' if unable to fetch
 */
export async function getDefaultTab(productRoot) {
  try {
    const rows = await fetchLandingTabRows(productRoot);
    if (rows && rows.length > 0) {
      const firstHref = rows[0][1];
      const normalized = normalizePath(firstHref).replace(normalizePath(productRoot), '');
      const parts = normalized.split('/').filter((p) => p);
      return parts[0] || 'overview';
    }
  } catch (e) {
    // Silent fail - use fallback
  }

  return 'overview';
}

/**
 * Build product tabs block from rows
 */
export async function buildProductTabsBlock(productRoot, rowsOverride) {
  const rows = [];
  let TABS = rowsOverride;

  // If no override provided, build canonical tabs with i18n
  if (!rowsOverride || !rowsOverride.length) {
    const [
      overviewLabel,
      quotesLabel,
      settlementsLabel,
      volumeLabel,
      specsLabel,
      marginsLabel,
      calendarLabel,
    ] = await Promise.all([
      i18n('Overview'),
      i18n('Quotes'),
      i18n('Settlements'),
      i18n('Volume'),
      i18n('Contract Specs'),
      i18n('Margins'),
      i18n('Calendar'),
    ]);

    TABS = [
      [overviewLabel, `${productRoot}/overview`],
      [quotesLabel, `${productRoot}/quotes`],
      [settlementsLabel, `${productRoot}/settlements`],
      [volumeLabel, `${productRoot}/volume`],
      [specsLabel, `${productRoot}/specs`],
      [marginsLabel, `${productRoot}/margins`],
      [calendarLabel, `${productRoot}/calendar`],
    ];
  }

  TABS.forEach(([label, href]) => {
    const a = createElement('a', { href }, href);
    rows.push([{ elems: [createElement('p')] }, { elems: [createElement('p')] }]);
    rows[rows.length - 1][0].elems[0].textContent = label;
    rows[rows.length - 1][1].elems[0].appendChild(a);
  });

  return buildBlock('product-tabs', rows);
}

/**
 * Insert product tabs if missing
 */
export async function insertProductTabsIfMissing(productRoot) {
  const main = document.querySelector('main');
  if (!main) return null;

  const tabsSection = main.querySelector('.product-tabs-container');
  if (tabsSection) return tabsSection;

  const landingRows = await fetchLandingTabRows(productRoot);
  let rowsForBuild = landingRows;

  if (!rowsForBuild) {
    const [
      overviewLabel,
      quotesLabel,
      settlementsLabel,
      volumeLabel,
      specsLabel,
      marginsLabel,
      calendarLabel,
    ] = await Promise.all([
      i18n('Overview'),
      i18n('Quotes'),
      i18n('Settlements'),
      i18n('Volume'),
      i18n('Contract Specs'),
      i18n('Margins'),
      i18n('Calendar'),
    ]);

    const canonical = [
      [overviewLabel, productRoot],
      [quotesLabel, `${productRoot}/quotes`],
      [settlementsLabel, `${productRoot}/settlements`],
      [volumeLabel, `${productRoot}/volume`],
      [specsLabel, `${productRoot}/specs`],
      [marginsLabel, `${productRoot}/margins`],
      [calendarLabel, `${productRoot}/calendar`],
    ];

    const filtered = [];
    for (let i = 0; i < canonical.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await indexHasPath(canonical[i][1])) filtered.push(canonical[i]);
    }
    rowsForBuild = filtered;
  }

  const block = await buildProductTabsBlock(productRoot, rowsForBuild);
  const section = createSectionWithBlock(block);
  section.classList.add('product-tabs-container', 'full-width');
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

export async function fetchHero(productRoot) {
  const temp = await fetchProductRoot(productRoot);
  const block = temp.querySelector('.hero-baseball');
  return block;
}

/**
 * Insert hero if missing
 */
export async function insertHeroIfMissing(productRoot) {
  const main = document.querySelector('main');
  if (!main) return;
  const existing = main.querySelector('.hero-baseball');
  if (existing) return;
  let hero = await fetchHero(productRoot);
  if (!hero) {
    hero = buildBlock('hero-baseball', '');
  }
  const rootHero = createSectionWithBlock(hero);
  rootHero.classList.add('full-width');
  main.insertBefore(rootHero, main.firstChild);
  decorateBlock(hero);
  await loadBlock(hero);
}

/**
 * Ensure subtabs content container exists
 */
export function ensureSubTabsContentContainer() {
  const tabsSection = findProductTabsSection();
  if (!tabsSection || !tabsSection.parentNode) return null;

  let container = tabsSection.nextElementSibling;
  if (!container || !container.classList.contains('product-subtabs-content')) {
    const inner = createElement('div');
    container = createElement('div', { class: 'section product-subtabs-content full-width' }, inner);
    tabsSection.parentNode.insertBefore(container, tabsSection.nextSibling);
  }

  return container.querySelector('div');
}

/**
 * Move current page content under subtabs
 */
export function moveCurrentPageContentUnderSubTabs() {
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

export async function fetchFragment(productRoot) {
  try {
    // eslint-disable-next-line no-console
    console.log('[Fragment] Fetching fragment block from product root:', productRoot);
    const temp = await fetchProductRoot(productRoot);
    if (!temp) {
      // eslint-disable-next-line no-console
      console.log('[Fragment] Product root HTML not found');
      return null;
    }
    const block = temp.querySelector('.fragment');
    if (block) {
      // eslint-disable-next-line no-console
      console.log('[Fragment] Fragment block found in product root');
    } else {
      // eslint-disable-next-line no-console
      console.log('[Fragment] Fragment block not found in product root HTML');
    }
    return block || null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[Fragment] Error fetching fragment block:', e);
    return null;
  }
}

export function isFragmentApplicable(productRoot) {
  const currentPath = normalizePath(window.location.pathname);
  const normalizedRoot = normalizePath(productRoot);
  const rel = currentPath.replace(normalizedRoot, '');
  const parts = rel.split('/').filter((p) => p && p !== 'options');

  const isRoot = currentPath === normalizedRoot;
  const isOverview = parts.length === 0 || parts[0] === 'overview';

  // eslint-disable-next-line no-console
  console.log('[Fragment] Checking applicability:', {
    currentPath,
    normalizedRoot,
    rel,
    parts,
    isRoot,
    isOverview,
    shouldInsert: !isRoot && !isOverview,
  });

  return !isRoot && !isOverview;
}

export function extractFragmentPath(fragmentBlock) {
  if (!fragmentBlock) {
    // eslint-disable-next-line no-console
    console.log('[Fragment] Fragment block is null, cannot extract path');
    return null;
  }

  const link = fragmentBlock.querySelector('a');
  if (link) {
    const href = link.getAttribute('href');
    if (href) {
      // eslint-disable-next-line no-console
      console.log('[Fragment] Extracted fragment path from link:', href.trim());
      return href.trim();
    }
  }

  const textContent = fragmentBlock.textContent.trim();
  if (textContent) {
    // eslint-disable-next-line no-console
    console.log('[Fragment] Extracted fragment path from textContent:', textContent);
    return textContent;
  }

  // eslint-disable-next-line no-console
  console.log('[Fragment] No fragment path found in block');
  return null;
}

export function removeExistingFragment(container) {
  if (!container || !container.parentElement) return;

  const existingFragment = container.parentElement.querySelector('.fragment-section');
  if (existingFragment) {
    existingFragment.remove();
  }
}

export function buildFragmentBlock(fragmentPath) {
  // eslint-disable-next-line no-console
  console.log('[Fragment] Building fragment block with path:', fragmentPath);
  const fragmentLink = createElement('a', { href: fragmentPath }, fragmentPath);
  const block = buildBlock('fragment', [[fragmentLink]]);
  // eslint-disable-next-line no-console
  console.log('[Fragment] Fragment block built:', block);
  return block;
}

export async function insertFragmentIfApplicable(productRoot, blocking = true) {
  // eslint-disable-next-line no-console
  console.log('[Fragment] insertFragmentIfApplicable called with productRoot:', productRoot);

  const container = ensureSubTabsContentContainer();
  if (!container) {
    // eslint-disable-next-line no-console
    console.log('[Fragment] Container not found, cannot insert fragment');
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[Fragment] Container found:', container);

  if (!isFragmentApplicable(productRoot)) {
    // eslint-disable-next-line no-console
    console.log('[Fragment] Fragment not applicable for current page, removing existing fragment');
    removeExistingFragment(container);
    return;
  }

  removeExistingFragment(container);

  const fragmentBlock = await fetchFragment(productRoot);
  if (!fragmentBlock) {
    // eslint-disable-next-line no-console
    console.log('[Fragment] Fragment block not found in product root, aborting');
    return;
  }

  const fragmentPath = extractFragmentPath(fragmentBlock);
  if (!fragmentPath) {
    // eslint-disable-next-line no-console
    console.log('[Fragment] Fragment path not found, aborting');
    return;
  }

  const newFragmentBlock = buildFragmentBlock(fragmentPath);
  const fragmentWrapper = createSectionWithBlock(newFragmentBlock);
  fragmentWrapper.classList.add('fragment-section', 'full-width');
  // eslint-disable-next-line no-console
  console.log('[Fragment] Fragment wrapper created:', fragmentWrapper);

  const contentContainer = container.parentElement;
  if (contentContainer) {
    // eslint-disable-next-line no-console
    console.log('[Fragment] Inserting fragment wrapper into content container');
    contentContainer.appendChild(fragmentWrapper);

    // eslint-disable-next-line no-console
    console.log('[Fragment] Decorating and loading fragment block');
    decorateBlock(newFragmentBlock);

    if (blocking) {
      await loadBlock(newFragmentBlock);
      // eslint-disable-next-line no-console
      console.log('[Fragment] Fragment block loaded successfully');
    } else {
      loadBlock(newFragmentBlock).then(() => {
        // eslint-disable-next-line no-console
        console.log('[Fragment] Fragment block loaded successfully');
      }).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('[Fragment] Error loading fragment block:', error);
      });
    }
  } else {
    // eslint-disable-next-line no-console
    console.error('[Fragment] Content container not found, cannot insert fragment');
  }
}

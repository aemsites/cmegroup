/**
 * Product Template - DOM Helper Functions
 * Handles DOM manipulation, section building, and tab discovery
 */

import { loadProductIndex, normalizePath } from '../../scripts/utils/product.js';
import { buildBlock } from '../../scripts/aem.js';

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
 * Check if a path exists in the product index
 */
export async function indexHasPath(path) {
  const idx = await loadProductIndex();
  if (!idx || !Array.isArray(idx.data)) return false;
  const norm = normalizePath(path);
  return !!idx.data.find((row) => normalizePath(row.path) === norm);
}

/**
 * Create a section wrapper with a block inside
 */
export function createSectionWithBlock(blockEl) {
  const section = document.createElement('div');
  section.className = 'section';
  const wrapper = document.createElement('div');
  section.appendChild(wrapper);
  wrapper.appendChild(blockEl);
  return section;
}

/**
 * Fetch tab rows from the parent product page
 * Handles both flat and nested HTML structures
 */
export async function fetchLandingTabRows(productRoot) {
  try {
    const url = `${productRoot}.plain.html`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    
    const html = await resp.text();
    const temp = document.createElement('div');
    temp.innerHTML = html;
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
export function buildProductTabsBlock(productRoot, rowsOverride) {
  const rows = [];
  const TABS = rowsOverride && rowsOverride.length ? rowsOverride : [
    ['Overview', `${productRoot}/overview`],
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
  
  const { decorateBlock, loadBlock } = await import('../../scripts/aem.js');
  decorateBlock(block);
  await loadBlock(block);
  
  return section;
}

/**
 * Insert hero if missing
 */
export async function insertHeroIfMissing() {
  const main = document.querySelector('main');
  if (!main) return;
  
  const existing = main.querySelector('.hero-baseball');
  if (existing) return;
  
  const { buildBlock, decorateBlock, loadBlock } = await import('../../scripts/aem.js');
  const hero = buildBlock('hero-baseball', '');
  const section = createSectionWithBlock(hero);
  section.classList.add('full-width');
  main.insertBefore(section, main.firstChild);
  decorateBlock(hero);
  await loadBlock(hero);
}

/**
 * Ensure hero appears before tabs
 */
export function ensureHeroThenTabsOrder() {
  const heroSection = findHeroSection();
  const tabsSection = findProductTabsSection();
  if (!heroSection || !tabsSection) return;
  
  const next = heroSection.nextElementSibling;
  if (next !== tabsSection) {
    heroSection.parentNode.insertBefore(tabsSection, heroSection.nextSibling);
  }
}

/**
 * Ensure subtabs content container exists
 */
export function ensureSubTabsContentContainer() {
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


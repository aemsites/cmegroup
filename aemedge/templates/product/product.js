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

// Debounce timer for navigation
let navigationDebounceTimer = null;

// Track if toggle is being created (prevents duplicates during async operations)
let isCreatingToggle = false;
let currentToggleOperation = null; // Track current operation for cancellation

// Cache for pre-built dropdown elements (reused across tabs)
const prebuiltDropdownCache = new Map();

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

  // PERFORMANCE: Prefetch options data FIRST to avoid race conditions
  // This ensures data is available before dropdown is built
  await prefetchProductData(productRoot);

  // ensure hero first
  await insertHeroIfMissing();

  // ensure tabs exist on both landing and tab pages
  const productTabsSection = findProductTabsSection()
    || await insertProductTabsIfMissing(productRoot);

  // enforce order: hero first, then tabs
  ensureHeroThenTabsOrder();

  // insert sub-tabs (e.g., Futures/Options) when applicable
  // ENHANCED: Using dropdown version with contract selection
  await insertEnhancedSubTabsIfApplicable(productRoot);

  // normalize current page content to live under sub-tabs area
  moveCurrentPageContentUnderSubTabs();

  // Enable SPA-like navigation within the same product
  enableProductSpaNavigation(productRoot);

  // Check if we're on the product root (redirect to overview)
  const onRoot = normalizePath(window.location.pathname) === normalizePath(productRoot);
  if (onRoot) {
    // Redirect root to overview page for consistency
    const overviewUrl = `${productRoot}/overview`;
    window.history.replaceState({}, '', overviewUrl);
    await renderProductPath(overviewUrl, productRoot);
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
    // Cancel any pending navigation
    if (navigationDebounceTimer) {
      clearTimeout(navigationDebounceTimer);
    }
    
    // Update URL immediately for instant visual feedback
    window.history.pushState({}, '', href);
    
    // Debounce the actual content rendering (prevents duplicate toggles on rapid clicks)
    navigationDebounceTimer = setTimeout(() => {
      renderProductPath(href, productRoot);
      navigationDebounceTimer = null;
    }, 100); // 100ms debounce - adjust if needed
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
    PREFETCH_CACHE.clear(); // Clear HTML cache, but keep product data cache for reuse
    // Update active state in product tabs immediately
    updateTabsActiveState(url);

    // Ensure sub-tabs reflect the destination and content is placed under them
    // ENHANCED: Using dropdown version during SPA navigation
    // Use forceRecreate=false to just update state (no flash)
    await insertEnhancedSubTabsIfApplicable(productRoot, false);
    moveCurrentPageContentUnderSubTabs();
    // Re-wire nav clicks only if sub-tabs were recreated
    // (The function checks if handlers are already bound)
    enableProductSpaNavigation(productRoot);

    // Fetch target page and swap renderable sections below tabs
    // Strip query params for fetching - we only need the base page HTML
    const urlObj = new URL(url, window.location.origin);
    const basePath = urlObj.pathname; // Without query params
    
    let html = null;
    const cached = PREFETCH_CACHE.get(basePath);
    if (cached) {
      html = await cached.catch(() => null);
    }
    if (!html) {
      const resp = await fetch(`${basePath}.plain.html`);
      
      if (!resp.ok) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch page:', basePath, 'Status:', resp.status);
        // Show error in container
        const errorContainer = ensureSubTabsContentContainer();
        if (errorContainer) {
          errorContainer.innerHTML = `
            <div class="navigation-error">
              <h3>Page Not Found</h3>
              <p>Unable to load content for: <code>${basePath}</code></p>
              <p><a href="${url}">Refresh page</a></p>
            </div>
          `;
        }
        return;
      }
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
    
    // Special handling for overview/root - might have empty sections
    const isNavigatingToRoot = normalizePath(basePath) === normalizePath(productRoot);
    
    // Check if sections are empty (even if they exist)
    const hasEmptyContent = renderables.length > 0 && renderables.every((sec) => !sec.innerHTML || sec.innerHTML.trim().length === 0);
    
    if ((renderables.length === 0 || hasEmptyContent) && isNavigatingToRoot) {
      // Try fetching /overview page instead of root
      try {
        const overviewPath = `${productRoot}/overview`;
        const overviewResp = await fetch(`${overviewPath}.plain.html`);
        
        if (overviewResp.ok) {
          const overviewHtml = await overviewResp.text();
          const overviewMain = document.createElement('main');
          overviewMain.innerHTML = overviewHtml;
          decorateMain(overviewMain);
          
          const overviewSections = [...overviewMain.querySelectorAll(':scope > .section')]
            .filter((sec) => !sec.querySelector('.hero-baseball')
              && !sec.classList.contains('product-tabs-container')
              && !sec.classList.contains('product-subtabs-content')
              && !sec.classList.contains('product-subtabs'));
          
          if (overviewSections.length > 0) {
            container.innerHTML = '';
            const overviewClones = overviewSections.map((sec) => {
              const cloned = sec.cloneNode(true);
              container.appendChild(cloned);
              return cloned;
            });
            await Promise.all(overviewClones.map((cl) => loadSection(cl)));
            return;
          }
        }
      } catch (e) {
        // Silent fail
      }
      
      // Last resort: Show message that content is unavailable
      container.innerHTML = `
        <div class="no-content-message">
          <h3>Overview content not available</h3>
          <p>The overview page is empty or doesn't exist.</p>
          <p><small>Expected: ${productRoot}/overview.plain.html</small></p>
        </div>
      `;
      return;
    }
    
    if (renderables.length === 0) {
      container.innerHTML = `
        <div class="no-content-message">
          <p>No content available for this tab.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = '';
    const clones = renderables.map((sec) => {
      const cloned = sec.cloneNode(true);
      container.appendChild(cloned);
      return cloned;
    });
    
    await Promise.all(clones.map((cl) => loadSection(cl)));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('SPA navigation failed:', e);
    // On failure, show error message
    const container = ensureSubTabsContentContainer();
    if (container) {
      container.innerHTML = `
        <div class="navigation-error">
          <h3>Failed to load content</h3>
          <p>There was an error loading the page content.</p>
          <p><a href="${url}">Click here to reload the page</a></p>
        </div>
      `;
    }
  }
}

function updateTabsActiveState(url) {
  const currPath = normalizePath(new URL(url, window.location.origin).pathname);

  const isEquivalentToTab = (current, tabHref) => {
    const linkPath = normalizePath(new URL(tabHref, window.location.origin).pathname);
    const cur = normalizePath(current);
    
    // Exact match
    if (cur === linkPath) return true;
    
    // For overview tab: /corn/overview should also match /corn (root) for backward compatibility
    if (linkPath.endsWith('/overview')) {
      const root = normalizePath(linkPath.replace(/\/overview$/, ''));
      return cur === root;
    }
    
    // For other tabs: /corn/quotes should also match /corn/quotes/options
    return cur === normalizePath(`${linkPath}/options`);
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
    if (!href) return;
    // Strip query params for cache key and fetching
    const urlObj = new URL(href, window.location.origin);
    const basePath = urlObj.pathname;
    
    if (PREFETCH_CACHE.has(basePath)) return;
    
    const promise = fetch(`${basePath}.plain.html`).then((r) => (r.ok ? r.text() : null));
    PREFETCH_CACHE.set(basePath, promise);
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

// ==================== ENHANCED FUTURES/OPTIONS TOGGLE FUNCTIONS ====================
// New functions for dropdown-based toggle (Step 2 of implementation)
// These are separate from existing functions to avoid modifying working code

/**
 * Get product ID from metadata with fallback to hardcoded value for testing
 * @returns {string} Product ID
 */
function getProductId() {
  let productId = getMetadata('product-id');

  // Fallback: Use hardcoded value for corn during development/testing
  if (!productId) {
    productId = '300'; // Default to corn for testing
  }

  return productId;
}

/**
 * Prefetch product data on page load for performance optimization
 * Fetches options dropdown data once per product and stores in window.productData
 * Clears cache when switching between products (corn -> wheat)
 * @param {string} productRoot - Product root path
 */
async function prefetchProductData(productRoot) {
  try {
    // Get product ID from metadata with fallback
    const productId = getProductId();

    if (!productId) {
      return; // No product ID, can't fetch data
    }

    // Normalize product root for comparison
    const normalizedRoot = normalizePath(productRoot);

    // Check if product changed (e.g., corn -> wheat)
    if (window.productData?.productRoot &&
        normalizePath(window.productData.productRoot) !== normalizedRoot) {
      // Product changed - clear all caches to prevent memory bloat
      window.productData = null;
      prebuiltDropdownCache.clear();
      PREFETCH_CACHE.clear();
    }

    // Initialize data store if needed
    if (!window.productData) {
      window.productData = {};
    }

    // Check if already fetching for this product (prevent duplicate calls)
    if (window.productData.fetchPromise) {
      await window.productData.fetchPromise;
      return;
    }

    // Check if data already exists for this product
    if (window.productData.optionsExpirations &&
        window.productData.productId === productId) {
      return; // Data already available
    }

    // Import utilities
    const { fetchExpirationsData } = await import('./product-toggle-utils.js');

    // Create fetch promise with fallback to local JSON
    const fetchPromise = (async () => {
      try {
        const data = await fetchExpirationsData(productId);
        return data;
      } catch (apiError) {
        // Fallback to local JSON file
        try {
          const localPath = `${window.location.origin}/templates/product/${productId}.json`;
          const response = await fetch(localPath);

          if (!response.ok) {
            throw new Error(`Failed to fetch local JSON: ${response.status}`);
          }

          const jsonData = await response.json();

          // Transform local JSON to match expected format
          const optionsData = jsonData.optionsLabels || [];
          return optionsData;
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
    })();

    window.productData.fetchPromise = fetchPromise;
    window.productData.productRoot = normalizedRoot;
    window.productData.productId = productId;

    // Fetch and store data
    const optionsData = await fetchPromise;
    window.productData.optionsExpirations = optionsData;
    window.productData.fetchedAt = Date.now();
    window.productData.fetchPromise = null; // Clear promise after completion
  } catch (error) {
    // Clear failed promise so it can be retried
    if (window.productData) {
      window.productData.fetchPromise = null;
    }
    // Silent fail - will fetch on demand if prefetch fails
  }
}

/**
 * Build enhanced sub-tabs with Futures/Options dropdown
 * This is a NEW function - does not modify existing insertSubTabsIfApplicable()
 * @param {string} productRoot - Product root path
 * @param {string} currentPath - Current page path
 * @param {string} primaryTab - Primary tab name (quotes, settlements, etc.)
 * @returns {Promise<Element|null>} Navigation element with toggle
 */
async function buildEnhancedSubTabs(productRoot, currentPath, primaryTab) {
  const futuresPath = `${productRoot}/${primaryTab}`;
  const optionsPath = `${futuresPath}/options`;

  const [hasFutures, hasOptions] = await Promise.all([
    indexHasPath(futuresPath),
    indexHasPath(optionsPath),
  ]);

  if (!hasFutures || !hasOptions) {
    return null;
  }

  // Import utilities
  const {
    createOptionsDropdown,
    fetchExpirationsData,
    getSelectedContractFromURL,
    prefetchOptionPages,
    TOGGLE_CONSTANTS,
  } = await import('./product-toggle-utils.js');

  // Create toggle container
  const nav = document.createElement('nav');
  nav.className = 'product-subtabs enhanced';
  nav.setAttribute('aria-label', 'Sub tabs');
  nav.dataset.primaryTab = primaryTab; // Track which tab this toggle belongs to

  const container = document.createElement('div');
  container.className = TOGGLE_CONSTANTS.toggleClasses.container;

  // Create Futures button
  const futuresBtn = document.createElement('button');
  futuresBtn.className = TOGGLE_CONSTANTS.toggleClasses.button;
  futuresBtn.setAttribute('data-toggle', TOGGLE_CONSTANTS.toggleTypes.futures);
  futuresBtn.setAttribute('data-href', futuresPath);
  futuresBtn.textContent = 'FUTURES';
  futuresBtn.type = 'button';

  if (normalizePath(currentPath) === normalizePath(futuresPath)) {
    futuresBtn.classList.add(TOGGLE_CONSTANTS.toggleClasses.active);
  }

  container.appendChild(futuresBtn);

  // PERFORMANCE: Ensure we have data for current product
  const productId = getProductId();
  let expirationsData = window.productData?.optionsExpirations;

  // If no data or wrong product, fetch it (should rarely happen due to prefetch)
  if (!expirationsData || window.productData?.productRoot !== normalizePath(productRoot)) {
    await prefetchProductData(productRoot);
    expirationsData = window.productData?.optionsExpirations || await fetchExpirationsData(productId);
  }

  // Build dropdown fresh each time (data is cached, so this is fast)
  // NOTE: We cannot cache the dropdown DOM element because cloneNode() doesn't copy event listeners
  const selectedContract = getSelectedContractFromURL();
  const optionsDropdown = createOptionsDropdown(expirationsData, selectedContract);

  // Always update href for current context
  optionsDropdown.setAttribute('data-href', optionsPath);
  const items = optionsDropdown.querySelectorAll('.dropdown-item');

  items.forEach((item) => {
    item.classList.toggle('selected', item.dataset.productId === selectedContract);
  });

  // Prefetch top N option pages immediately for instant navigation
  if (TOGGLE_CONSTANTS.prefetch.prefetchOnHover && expirationsData.length > 0) {
    prefetchOptionPages(optionsPath, expirationsData, TOGGLE_CONSTANTS.prefetch.optionsCount, PREFETCH_CACHE);
  }

  // Mark as active if on options page
  if (normalizePath(currentPath).startsWith(normalizePath(optionsPath))) {
    const dropdownBtn = optionsDropdown.querySelector(`.${TOGGLE_CONSTANTS.toggleClasses.dropdownButton}`);
    if (dropdownBtn) {
      dropdownBtn.classList.add(TOGGLE_CONSTANTS.toggleClasses.active);
    }
  }

  container.appendChild(optionsDropdown);
  nav.appendChild(container);

  return nav;
}

/**
 * Handle options dropdown navigation with SPA behavior
 * This is a NEW function for dropdown event handling
 * @param {Element} nav - Navigation element containing dropdown
 * @param {string} productRoot - Product root path
 * @param {string} primaryTab - Primary tab name
 */
async function handleOptionsDropdownNavigation(nav, productRoot, primaryTab) {
  // Prevent duplicate event handlers
  if (nav.dataset.handlersBound === 'true') return;
  nav.dataset.handlersBound = 'true';

  const { buildContractURL, prefetchOptionPages, TOGGLE_CONSTANTS } = await import('./product-toggle-utils.js');

  // Handle Futures button click
  const futuresBtn = nav.querySelector('[data-toggle="futures"]');
  if (futuresBtn) {
    futuresBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const href = futuresBtn.getAttribute('data-href');
      if (href) {
        // Cancel any pending navigation
        if (navigationDebounceTimer) {
          clearTimeout(navigationDebounceTimer);
          navigationDebounceTimer = null;
        }
        
        // Update URL immediately
        window.history.pushState({}, '', href);
        
        // Debounced rendering
        navigationDebounceTimer = setTimeout(() => {
          renderProductPath(href, productRoot);
          navigationDebounceTimer = null;
        }, 100);
      }
    });
  }

  // Handle dropdown hovered - early prefetch (highest priority)
  nav.addEventListener('optionsDropdownHovered', (e) => {
    const { expirationsData } = e.detail;
    const optionsPath = `${productRoot}/${primaryTab}/options`;
    prefetchOptionPages(optionsPath, expirationsData, TOGGLE_CONSTANTS.prefetch.optionsCount, PREFETCH_CACHE);
  }, { once: true });

  // Handle dropdown opened - backup prefetch
  nav.addEventListener('optionsDropdownOpened', (e) => {
    const { expirationsData } = e.detail;
    const optionsPath = `${productRoot}/${primaryTab}/options`;
    prefetchOptionPages(optionsPath, expirationsData, TOGGLE_CONSTANTS.prefetch.optionsCount, PREFETCH_CACHE);
  });

  // Handle Options dropdown selection
  nav.addEventListener('optionContractSelected', async (e) => {
    const { contract, productId } = e.detail;
    const contractId = contract || productId;
    const optionsPath = `${productRoot}/${primaryTab}/options`;
    const fullUrl = buildContractURL(optionsPath, contractId);

    // Cancel any pending navigation
    if (navigationDebounceTimer) {
      clearTimeout(navigationDebounceTimer);
      navigationDebounceTimer = null;
    }

    // Add updating class for visual feedback
    nav.classList.add('updating');

    // Update URL immediately
    window.history.pushState({}, '', fullUrl);
    
    // Debounced rendering
    navigationDebounceTimer = setTimeout(async () => {
      await renderProductPath(fullUrl, productRoot);
      nav.classList.remove('updating');
      navigationDebounceTimer = null;
    }, 100);
  });

  // NOTE: Removed navigation handler for dropdown button
  // The dropdown component manages its own open/close state via createOptionsDropdown()
  // Navigation happens when an item is selected (via optionContractSelected event above)
}

/**
 * Update dropdown active state based on current URL
 * This is a NEW function for maintaining state during navigation
 * @param {Element} nav - Navigation element
 */
async function updateDropdownActiveState(nav) {
  if (!nav) return;

  const { getSelectedContractFromURL, TOGGLE_CONSTANTS } = await import('./product-toggle-utils.js');
  const selectedContract = getSelectedContractFromURL();

  // Update selected item in dropdown
  const dropdown = nav.querySelector(`.${TOGGLE_CONSTANTS.toggleClasses.dropdown}`);
  if (dropdown && selectedContract) {
    const items = dropdown.querySelectorAll(`.${TOGGLE_CONSTANTS.toggleClasses.dropdownItem}`);
    items.forEach((item) => {
      if (item.dataset.value === selectedContract) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  // Update active button state
  const currentPath = normalizePath(window.location.pathname);
  const futuresBtn = nav.querySelector('[data-toggle="futures"]');
  const dropdownBtn = nav.querySelector(`.${TOGGLE_CONSTANTS.toggleClasses.dropdownButton}`);

  if (futuresBtn && dropdownBtn) {
    const futuresPath = futuresBtn.getAttribute('data-href');
    const isOnFutures = currentPath === normalizePath(futuresPath);
    const isOnOptions = currentPath.includes('/options');

    futuresBtn.classList.toggle(TOGGLE_CONSTANTS.toggleClasses.active, isOnFutures);
    dropdownBtn.classList.toggle(TOGGLE_CONSTANTS.toggleClasses.active, isOnOptions);
  }
}

/**
 * NEW ENHANCED VERSION of insertSubTabsIfApplicable
 * Call this instead of the original to use dropdown functionality
 * @param {string} productRoot - Product root path
 * @param {boolean} forceRecreate - Force recreation instead of updating state
 */
async function insertEnhancedSubTabsIfApplicable(productRoot, forceRecreate = false) {
  // Create unique token for this operation
  const myToken = Date.now();
  currentToggleOperation = myToken;

  const main = document.querySelector('main');
  if (!main) {
    return;
  }

  const tabsSection = findProductTabsSection();
  if (!tabsSection) {
    return;
  }

  // Determine current tab
  const currentPath = normalizePath(window.location.pathname);
  const rel = normalizePath(currentPath).replace(normalizePath(productRoot), '');
  const parts = rel.split('/').filter((p) => p);

  // IMMEDIATE removal for ALL existing toggles (prevents duplicates)
  const existingToggles = tabsSection.querySelectorAll('.product-subtabs');
  existingToggles.forEach((toggle) => {
    if (toggle.parentNode) toggle.parentNode.removeChild(toggle);
  });

  // Check if we should have sub-tabs
  const shouldHaveSubTabs = parts.length > 0 && parts[0] !== 'overview';

  if (!shouldHaveSubTabs) {
    // Don't create toggle for overview or root
    isCreatingToggle = false;
    currentToggleOperation = null;
    return;
  }

  const primaryTab = parts[0];

  // Prevent concurrent toggle creation
  if (isCreatingToggle) {
    currentToggleOperation = null;
    return;
  }

  // Set flag to prevent concurrent creation
  isCreatingToggle = true;

  // Check if both futures and options pages exist for this tab
  const futuresPath = `${productRoot}/${primaryTab}`;
  const optionsPath = `${futuresPath}/options`;

  const [hasFutures, hasOptions] = await Promise.all([
    indexHasPath(futuresPath),
    indexHasPath(optionsPath),
  ]);

  // Check if operation was cancelled while checking paths
  if (currentToggleOperation !== myToken) {
    isCreatingToggle = false;
    return;
  }

  // If both pages don't exist, don't create toggle
  if (!hasFutures || !hasOptions) {
    isCreatingToggle = false;
    currentToggleOperation = null;
    return;
  }

  // Build enhanced sub-tabs with dropdown
  const nav = await buildEnhancedSubTabs(productRoot, currentPath, primaryTab);

  // Check if operation was cancelled while building
  if (currentToggleOperation !== myToken) {
    isCreatingToggle = false;
    return;
  }

  if (!nav) {
    isCreatingToggle = false;
    currentToggleOperation = null;
    return;
  }

  // Insert sub-tabs inline
  const wrapper = tabsSection.querySelector('.product-tabs-wrapper')
    || tabsSection.querySelector(':scope > div');
  if (!wrapper) {
    isCreatingToggle = false;
    currentToggleOperation = null;
    return;
  }

  wrapper.appendChild(nav);

  // Setup navigation handlers (only once when creating)
  await handleOptionsDropdownNavigation(nav, productRoot, primaryTab);

  // Final check before updating state
  if (currentToggleOperation !== myToken) {
    // Operation was cancelled, remove the toggle we just created
    if (nav.parentNode) nav.parentNode.removeChild(nav);
    isCreatingToggle = false;
    return;
  }

  // Update active state
  await updateDropdownActiveState(nav);

  // Reset flags after toggle is fully created
  isCreatingToggle = false;
  currentToggleOperation = null;
}

// ==================== END OF ENHANCED TOGGLE FUNCTIONS ====================

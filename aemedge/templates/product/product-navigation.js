/**
 * Product Template - Navigation Functions
 * Handles SPA-like navigation, prefetching, and state management
 */

import { normalizePath, computeProductRoot } from '../../scripts/utils/product.js';
import { decorateMain } from '../../scripts/scripts.js';
import { loadSection } from '../../scripts/aem.js';
import { store } from '../../scripts/store/store.js';
import {
  setNavigationToken,
  setGlobalOptionSelection,
  clearGlobalOptionSelection,
} from '../../scripts/actions/product.js';
import { getDefaultTab, ensureSubTabsContentContainer } from './product-dom-helpers.js';

// Export for use in other modules
export const PREFETCH_CACHE = new Map();
// Note: navigationDebounceTimer is not exported to avoid mutation issues
let navigationDebounceTimer = null;
// Note: POPSTATE_BOUND is not exported to avoid mutation issues
let POPSTATE_BOUND = false;

// Tab options support cache
const TAB_OPTIONS_SUPPORT_CACHE = {};

// ✅ PERFORMANCE: Cache dynamic imports to avoid repeated async loading
let cachedModules = null;
async function getModules() {
  if (!cachedModules) {
    cachedModules = await Promise.all([
      // eslint-disable-next-line import/no-cycle
      import('./product-toggle-manager.js'),
      import('./product-dom-helpers.js'),
    ]);
  }
  return {
    toggleSubTabsVisibility: cachedModules[0].toggleSubTabsVisibility,
    moveCurrentPageContentUnderSubTabs: cachedModules[1].moveCurrentPageContentUnderSubTabs,
  };
}

/**
 * ✅ EXTRACTED: Check if a section is product content (not hero, tabs, or container)
 * Filters out sections that are displayed separately from the main content area:
 * - hero-baseball: Product hero section (shown at top)
 * - product-tabs-container: Navigation tabs (shown separately)
 * - product-subtabs-content: The container we render INTO (avoid recursion)
 * - product-subtabs: Futures/options toggle (shown separately)
 * @param {Element} sec - Section element to check
 * @returns {boolean} True if section should be rendered as product content
 */
const isProductContentSection = (sec) => !sec.querySelector('.hero-baseball')
  && !sec.classList.contains('product-tabs-container')
  && !sec.classList.contains('product-subtabs-content')
  && !sec.classList.contains('product-subtabs');

/**
 * Check if a tab supports options by checking for /options.plain.html file
 */
export async function checkTabSupportsOptions(productRoot, tabName) {
  const cacheKey = `${productRoot}/${tabName}`;
  if (cacheKey in TAB_OPTIONS_SUPPORT_CACHE) {
    return TAB_OPTIONS_SUPPORT_CACHE[cacheKey];
  }

  const optionsPath = `${productRoot}/${tabName}/options.plain.html`;

  try {
    const response = await fetch(optionsPath, { method: 'HEAD' });
    const supportsOptions = response.ok;
    TAB_OPTIONS_SUPPORT_CACHE[cacheKey] = supportsOptions;
    return supportsOptions;
  } catch (error) {
    TAB_OPTIONS_SUPPORT_CACHE[cacheKey] = false;
    return false;
  }
}

/**
 * Get cached options support for a tab (synchronous)
 */
export function getCachedTabOptionsSupport(productRoot, tabName) {
  const cacheKey = `${productRoot}/${tabName}`;
  return TAB_OPTIONS_SUPPORT_CACHE[cacheKey] ?? null;
}

/**
 * Enable SPA navigation for product pages
 * Uses MutationObserver to wait for tabs nav to appear (no polling!)
 */
export function enableProductSpaNavigation(productRoot) {
  const tabsNav = document.querySelector('.product-tabs-nav');
  const subTabsNav = document.querySelector('.product-subtabs');

  // If tabs nav doesn't exist yet, use MutationObserver to wait for it
  if (!tabsNav) {
    const observer = new MutationObserver((mutations, obs) => {
      const foundTabsNav = document.querySelector('.product-tabs-nav');
      if (foundTabsNav) {
        obs.disconnect();
        // Call this function again now that tabs exist
        enableProductSpaNavigation(productRoot);
      }
    });
    
    // Watch the main element for child additions
    const main = document.querySelector('main');
    if (main) {
      observer.observe(main, {
        childList: true,
        subtree: true,
      });
      
      // ✅ CRITICAL: No timeout - wait as long as needed for tabs to appear
      // The observer will automatically disconnect when tabs are found
      // Store observer reference for debugging
      if (!window.productTabsObserver) {
        window.productTabsObserver = observer;
      }
    }
    return;
  }

  if (tabsNav && !tabsNav.dataset.spaBound) {
    wireNavClicks(tabsNav, productRoot);
    wirePrefetches(tabsNav, productRoot);
    tabsNav.dataset.spaBound = 'y';
    
    // Set up a mutation observer to detect if tabs nav gets replaced
    try {
      const tabsContainer = tabsNav.closest('.product-tabs-container');
      if (tabsContainer && !tabsContainer.dataset.mutationObserverSet) {
        const observer = new MutationObserver(() => {
          // Monitor for removed tabs nav
        });
        observer.observe(tabsContainer, { childList: true, subtree: true });
        tabsContainer.dataset.mutationObserverSet = 'true';
      }
    } catch (e) {
      // Silent fail - mutation observer not critical
    }
  }

  if (subTabsNav) {
    const hasLinks = subTabsNav.querySelectorAll('a[href]').length > 0;
    const alreadyBound = subTabsNav.dataset.spaBound === 'y';

    // Wire clicks if: (1) not bound yet, OR (2) bound but has new links (dropdown populated)
    if (!alreadyBound || (alreadyBound && hasLinks)) {
      wireNavClicks(subTabsNav, productRoot);
      wirePrefetches(subTabsNav, productRoot);
      subTabsNav.dataset.spaBound = 'y';
    }
  }

  if (!POPSTATE_BOUND) {
    window.addEventListener('popstate', () => {
      const url = window.location.pathname + window.location.search + window.location.hash;
      renderProductPath(url, productRoot);
    });
    POPSTATE_BOUND = true;
  }
}

/**
 * Wire navigation clicks with global options persistence
 */
function wireNavClicks(container, productRoot) {
  const debouncedNavigate = (async (href) => {
    
    if (navigationDebounceTimer) {
      clearTimeout(navigationDebounceTimer);
    }

    // ✅ IMMEDIATE FEEDBACK: Update active state right away for instant visual response
    updateTabsActiveState(href);

    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const state = store.getState();

    // GLOBAL OPTION SELECTION: Save/clear globally (applies to all tabs)
    if (currentPath.includes('/options') && (currentSearch.includes('productId=') || currentSearch.includes('optionProductId='))) {
      const urlParams = new URLSearchParams(currentSearch);
      const selectedContract = urlParams.get('optionProductId') || urlParams.get('productId');
      if (selectedContract) {
        store.dispatch(setGlobalOptionSelection(selectedContract));
      }
    } else if (!currentPath.includes('/options')) {
      const currentRel = normalizePath(currentPath).replace(normalizePath(productRoot), '');
      const currentParts = currentRel.split('/').filter((p) => p);
      const currentTab = currentParts[0];

      let currentTabSupportsOpts = getCachedTabOptionsSupport(productRoot, currentTab);

      if (currentTabSupportsOpts === null && currentTab) {
        checkTabSupportsOptions(productRoot, currentTab);
        currentTabSupportsOpts = null;
      }

      if (currentTabSupportsOpts === true && state.globalOptionSelection.selectedContract) {
        store.dispatch(clearGlobalOptionSelection());
      }
    }

    // Determine target tab from href
    const targetUrl = new URL(href, window.location.origin);
    const targetPath = targetUrl.pathname;
    const targetRel = normalizePath(targetPath).replace(normalizePath(productRoot), '');
    const targetParts = targetRel.split('/').filter((p) => p && p !== 'options');
    const targetTab = targetParts[0];

    let finalHref = href;

    // Apply global selection to target tab (if exists)
    const updatedState = store.getState();
    const globalContract = updatedState.globalOptionSelection.selectedContract;

    if (targetTab && targetTab !== 'overview' && globalContract) {
      const tabSupportsOptions = await checkTabSupportsOptions(productRoot, targetTab);

      if (tabSupportsOptions) {
        if (!targetPath.includes('/options')) {
          finalHref = `${href}/options?optionProductId=${globalContract}`;
        } else {
          finalHref = targetUrl.search ? href : `${href}?optionProductId=${globalContract}`;
        }
      }
    }

    window.history.pushState({}, '', finalHref);

    // ✅ REDUCED DEBOUNCE: 100ms → 10ms for faster perceived navigation
    navigationDebounceTimer = setTimeout(() => {
      renderProductPath(finalHref, productRoot);
      navigationDebounceTimer = null;
    }, 10);
  });

  const links = container.querySelectorAll('a[href]');

  links.forEach((a, index) => {
    const href = a.getAttribute('href');
    
    // Mark the link so we can verify handlers are attached
    a.dataset.spaWired = 'true';
    a.dataset.spaIndex = index;
    
    a.addEventListener('click', (e) => {
      // ✅ UX: Prevent clicking on already active tab
      if (a.classList.contains('is-active')) {
        e.preventDefault();
        return;
      }

      const clickedHref = a.getAttribute('href');
      
      if (!clickedHref) {
        return;
      }
      
      const targetRoot = computeProductRoot(clickedHref);
      
      if (normalizePath(targetRoot) !== normalizePath(productRoot)) {
        return;
      }

      e.preventDefault();
      debouncedNavigate(clickedHref);
    });
  });
  
}

/**
 * Render product path content via SPA navigation
 */
export async function renderProductPath(url, productRoot) {
  try {
    const myToken = Date.now();
    store.dispatch(setNavigationToken(myToken));

    // ✅ PRESERVE PREFETCH: Don't clear cache to use hover-prefetched content
    // PREFETCH_CACHE.clear(); // Removed - wastes prefetch work!

    // Active state already updated in wireNavClicks for immediate feedback
    // updateTabsActiveState(url); // Removed - already done on click

    const urlObj = new URL(url, window.location.origin);
    const basePath = urlObj.pathname;
    const normalizedRoot = normalizePath(productRoot);
    const rel = normalizePath(basePath).replace(normalizedRoot, '');
    const parts = rel.split('/').filter((p) => p && p !== 'options');
    let destinationTab = parts[0];

    if (!destinationTab) {
      destinationTab = await getDefaultTab(productRoot);
    }

    // ✅ USE CACHED IMPORTS: Much faster than dynamic import every time
    const {
      toggleSubTabsVisibility,
      moveCurrentPageContentUnderSubTabs,
    } = await getModules();

    // ✅ SHOW LOADING STATE IMMEDIATELY
    const container = ensureSubTabsContentContainer();
    if (!container) return;

    // Start fade out immediately for smooth transition
    container.style.transition = 'opacity 0.2s ease-out';
    container.style.opacity = '0.5';

    // ✅ RUN EVERYTHING IN PARALLEL (non-blocking)
    const domOpsPromise = toggleSubTabsVisibility(productRoot).then(() => {
      moveCurrentPageContentUnderSubTabs();
      // NOTE: Don't call enableProductSpaNavigation here - it's already wired up
      // from product.js and calling it repeatedly creates unnecessary retry chains
    });

    // Fetch HTML (check cache first)
    let html = null;
    const cached = PREFETCH_CACHE.get(basePath);
    if (cached) {
      html = await cached.catch(() => null);
    }
    if (!html) {
      const resp = await fetch(`${basePath}.plain.html`);

      if (!resp.ok) {
        container.innerHTML = `
          <div class="navigation-error">
            <h3>Page Not Found</h3>
            <p>Unable to load content for: <code>${basePath}</code></p>
            <p><a href="${url}">Refresh page</a></p>
          </div>
        `;
        container.style.opacity = '1';
        return;
      }
      html = await resp.text();
    }

    const tempMain = document.createElement('main');
    tempMain.innerHTML = html;
    decorateMain(tempMain);

    // ✅ REFACTORED: Use extracted filter function for better maintainability
    const renderables = [...tempMain.querySelectorAll(':scope > .section')]
      .filter(isProductContentSection);

    const currentState = store.getState();
    if (currentState.navigation.currentToken !== myToken) return;

    const isNavigatingToRoot = normalizePath(basePath) === normalizePath(productRoot);
    const hasEmptyContent = renderables.length > 0
      && renderables.every((sec) => !sec.innerHTML || sec.innerHTML.trim().length === 0);

    if ((renderables.length === 0 || hasEmptyContent) && isNavigatingToRoot) {
      try {
        const defaultTab = await getDefaultTab(productRoot);
        const defaultPath = `${productRoot}/${defaultTab}`;
        const defaultResp = await fetch(`${defaultPath}.plain.html`);

        if (defaultResp.ok) {
          const defaultHtml = await defaultResp.text();
          const defaultMain = document.createElement('main');
          defaultMain.innerHTML = defaultHtml;
          decorateMain(defaultMain);

          // ✅ REFACTORED: Use extracted filter function for better maintainability
          const defaultSections = [...defaultMain.querySelectorAll(':scope > .section')]
            .filter(isProductContentSection);

          if (defaultSections.length > 0) {
            container.innerHTML = '';
            const defaultClones = defaultSections.map((sec) => {
              const cloned = sec.cloneNode(true);
              container.appendChild(cloned);
              return cloned;
            });
            await Promise.all(defaultClones.map((cl) => loadSection(cl)));
            return;
          }
        }
      } catch (e) {
        // Silent fail
      }

      const defaultTab = await getDefaultTab(productRoot);
      container.innerHTML = `
        <div class="no-content-message">
          <h3>Default content not available</h3>
          <p>The default tab page is empty or doesn't exist.</p>
          <p><small>Expected: ${productRoot}/${defaultTab}.plain.html</small></p>
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

    // ✅ SMOOTH FADE IN: Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
      container.style.opacity = '1';
    });

    // ✅ BACKGROUND LOADING: Load blocks and toggle asynchronously
    Promise.all([
      ...clones.map((cl) => loadSection(cl)),
      domOpsPromise, // Let toggle populate in background
    ]).catch(() => {});
  } catch (e) {
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

/**
 * Update active state of tabs based on URL
 */
function updateTabsActiveState(url) {
  const currPath = normalizePath(new URL(url, window.location.origin).pathname);

  const isEquivalentToTab = (current, tabHref) => {
    const linkPath = normalizePath(new URL(tabHref, window.location.origin).pathname);
    const cur = normalizePath(current);

    if (cur === linkPath) return true;

    if (linkPath.endsWith('/overview')) {
      const root = normalizePath(linkPath.replace(/\/overview$/, ''));
      return cur === root;
    }

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

/**
 * Wire prefetch behavior for links
 * ✅ FIX: Proper cleanup for IntersectionObserver to prevent memory leaks
 */
function wirePrefetches(container, productRoot) {
  const links = [...container.querySelectorAll('a[href]')]
    .filter((a) => normalizePath(computeProductRoot(a.getAttribute('href'))) === normalizePath(productRoot));

  const prefetch = (href) => {
    if (!href) return;
    const urlObj = new URL(href, window.location.origin);
    const basePath = urlObj.pathname;

    if (PREFETCH_CACHE.has(basePath)) return;

    const promise = fetch(`${basePath}.plain.html`).then((r) => (r.ok ? r.text() : null));
    PREFETCH_CACHE.set(basePath, promise);
  };

  // ✅ FIX: Use AbortController for hover/focus event cleanup
  const abortController = new AbortController();
  const { signal } = abortController;

  links.forEach((a) => {
    const href = a.getAttribute('href');
    a.addEventListener('mouseenter', () => prefetch(href), { signal });
    a.addEventListener('focus', () => prefetch(href), { signal });
    const sibling = href.endsWith('/options') ? href.replace(/\/options$/, '') : `${href}/options`;
    a.addEventListener('mouseenter', () => prefetch(sibling), { signal });
    a.addEventListener('focus', () => prefetch(sibling), { signal });
  });

  try {
    // ✅ FIX: Disconnect previous IntersectionObserver if exists
    if (container.productIo) {
      container.productIo.disconnect();
      container.productIo = null;
    }

    // ✅ FIX: Cleanup previous MutationObserver if exists
    if (container.productMutationObserver) {
      container.productMutationObserver.disconnect();
      container.productMutationObserver = null;
    }

    // ✅ FIX: Cleanup previous AbortController if exists
    if (container.productAbortController) {
      container.productAbortController.abort();
      container.productAbortController = null;
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
    container.productAbortController = abortController;

    // ✅ FIX: Auto-cleanup when container is removed from DOM
    const cleanupObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === container || (node.contains && node.contains(container))) {
            // Cleanup IntersectionObserver
            if (container.productIo) {
              container.productIo.disconnect();
              container.productIo = null;
            }
            // Cleanup AbortController
            if (container.productAbortController) {
              container.productAbortController.abort();
              container.productAbortController = null;
            }
            // Cleanup this observer
            cleanupObserver.disconnect();
          }
        });
      });
    });

    // Observe parent for removal
    if (container.parentNode) {
      cleanupObserver.observe(container.parentNode, { childList: true, subtree: true });
      container.productMutationObserver = cleanupObserver;
    }
  } catch (e) {
    // IntersectionObserver not available - cleanup AbortController
    abortController.abort();
  }
}

/**
 * Product Template - Toggle Manager
 * Handles futures/options toggle building and management
 */

/* eslint-disable import/no-cycle */
// Circular dependency with product-navigation.js is intentional and safe
// Uses dynamic imports to avoid initialization issues

import { normalizePath } from '../../scripts/utils/product.js';
import { store } from '../../scripts/store/store.js';
import {
  setToggleOperation,
  setCreatingToggle,
  setTabSelection,
  clearTabSelection,
} from '../../scripts/actions/product.js';
import { indexHasPath, findProductTabsSection } from './product-dom-helpers.js';
import { getProductId, prefetchProductData } from './product-data.js';
import { renderProductPath, PREFETCH_CACHE } from './product-navigation.js';
/* eslint-enable import/no-cycle */

// Local debounce timer for toggle navigation
let toggleDebounceTimer = null;

/**
 * Build enhanced subtabs (futures/options toggle)
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

  const {
    createOptionsDropdown,
    fetchExpirationsData,
    getSelectedContractFromURL,
    prefetchOptionPages,
    TOGGLE_CONSTANTS,
  } = await import('./product-toggle-utils.js');

  const nav = document.createElement('nav');
  nav.className = 'product-subtabs enhanced';
  nav.setAttribute('aria-label', 'Sub tabs');
  nav.dataset.primaryTab = primaryTab;

  const container = document.createElement('div');
  container.className = TOGGLE_CONSTANTS.toggleClasses.container;

  const futuresBtn = document.createElement('button');
  futuresBtn.className = TOGGLE_CONSTANTS.toggleClasses.button;
  futuresBtn.setAttribute('data-toggle', TOGGLE_CONSTANTS.toggleTypes.futures);
  futuresBtn.setAttribute('data-href', futuresPath);
  futuresBtn.textContent = 'FUTURES';
  futuresBtn.type = 'button';

  const isFuturesActive = normalizePath(currentPath) === normalizePath(futuresPath);

  if (isFuturesActive) {
    futuresBtn.classList.add(TOGGLE_CONSTANTS.toggleClasses.active);
  }

  container.appendChild(futuresBtn);

  const productId = getProductId();
  const state = store.getState();
  let expirationsData = state.productData.optionsExpirations;

  const isWrongProduct = state.productData.productRoot !== normalizePath(productRoot);
  if (!expirationsData || isWrongProduct) {
    await prefetchProductData(productRoot);
    const fallbackData = await fetchExpirationsData(productId);
    const updatedState = store.getState();
    expirationsData = updatedState.productData.optionsExpirations || fallbackData;
  }

  const selectedContract = getSelectedContractFromURL();

  const optionsDropdown = createOptionsDropdown(expirationsData, selectedContract);

  optionsDropdown.setAttribute('data-href', optionsPath);
  const items = optionsDropdown.querySelectorAll('.dropdown-item');

  items.forEach((item) => {
    const isSelected = item.dataset.productId === selectedContract;
    item.classList.toggle('selected', isSelected);
  });

  if (TOGGLE_CONSTANTS.prefetch.prefetchOnHover && expirationsData.length > 0) {
    const count = TOGGLE_CONSTANTS.prefetch.optionsCount;
    prefetchOptionPages(optionsPath, expirationsData, count, PREFETCH_CACHE);
  }

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
 * Handle options dropdown navigation events
 */
async function handleOptionsDropdownNavigation(nav, productRoot, primaryTab) {
  if (nav.dataset.handlersBound === 'true') return;
  nav.dataset.handlersBound = 'true';

  const { buildContractURL, prefetchOptionPages, TOGGLE_CONSTANTS } = await import('./product-toggle-utils.js');

  const futuresBtn = nav.querySelector('[data-toggle="futures"]');
  if (futuresBtn) {
    futuresBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const href = futuresBtn.getAttribute('data-href');
      if (href) {
        store.dispatch(clearTabSelection(primaryTab));

        if (toggleDebounceTimer) {
          clearTimeout(toggleDebounceTimer);
          toggleDebounceTimer = null;
        }

        window.history.pushState({}, '', href);

        toggleDebounceTimer = setTimeout(() => {
          renderProductPath(href, productRoot);
          toggleDebounceTimer = null;
        }, 100);
      }
    });
  }

  nav.addEventListener('optionsDropdownHovered', (e) => {
    const { expirationsData } = e.detail;
    const optionsPath = `${productRoot}/${primaryTab}/options`;
    const count = TOGGLE_CONSTANTS.prefetch.optionsCount;
    prefetchOptionPages(optionsPath, expirationsData, count, PREFETCH_CACHE);
  }, { once: true });

  nav.addEventListener('optionsDropdownOpened', (e) => {
    const { expirationsData } = e.detail;
    const optionsPath = `${productRoot}/${primaryTab}/options`;
    const count = TOGGLE_CONSTANTS.prefetch.optionsCount;
    prefetchOptionPages(optionsPath, expirationsData, count, PREFETCH_CACHE);
  });

  nav.addEventListener('optionContractSelected', async (e) => {
    const { contract, productId } = e.detail;
    const contractId = contract || productId;
    const optionsPath = `${productRoot}/${primaryTab}/options`;
    const fullUrl = buildContractURL(optionsPath, contractId);

    store.dispatch(setTabSelection(primaryTab, contractId));

    if (toggleDebounceTimer) {
      clearTimeout(toggleDebounceTimer);
      toggleDebounceTimer = null;
    }

    nav.classList.add('updating');

    window.history.pushState({}, '', fullUrl);

    toggleDebounceTimer = setTimeout(async () => {
      await renderProductPath(fullUrl, productRoot);
      nav.classList.remove('updating');
      toggleDebounceTimer = null;
    }, 100);
  });
}

/**
 * Update dropdown active state based on current URL
 */
async function updateDropdownActiveState(nav) {
  if (!nav) return;

  const { getSelectedContractFromURL, TOGGLE_CONSTANTS } = await import('./product-toggle-utils.js');
  const selectedContract = getSelectedContractFromURL();

  const dropdown = nav.querySelector(`.${TOGGLE_CONSTANTS.toggleClasses.dropdown}`);
  if (dropdown && selectedContract) {
    const items = dropdown.querySelectorAll(`.${TOGGLE_CONSTANTS.toggleClasses.dropdownItem}`);
    items.forEach((item) => {
      const isSelected = item.dataset.value === selectedContract;
      item.classList.toggle('selected', isSelected);
    });
  }

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
 * ✅ FAST: Just show/hide existing toggle (no rebuild)
 * Called on navigation after initial load
 */
export async function toggleSubTabsVisibility(productRoot) {
  const tabsSection = findProductTabsSection();
  if (!tabsSection) return;

  const currentPath = normalizePath(window.location.pathname);
  const rel = normalizePath(currentPath).replace(normalizePath(productRoot), '');
  const parts = rel.split('/').filter((p) => p);

  const existingToggle = tabsSection.querySelector('.product-subtabs.enhanced');
  const shouldShowSubTabs = parts.length > 0 && parts[0] !== 'overview';

  if (!shouldShowSubTabs) {
    // Hide toggle for overview
    if (existingToggle) {
      existingToggle.style.display = 'none';
    }
    return;
  }

  const primaryTab = parts[0];
  const futuresPath = `${productRoot}/${primaryTab}`;
  const optionsPath = `${futuresPath}/options`;

  const [hasFutures, hasOptions] = await Promise.all([
    indexHasPath(futuresPath),
    indexHasPath(optionsPath),
  ]);

  if (!hasFutures || !hasOptions) {
    // Tab doesn't support options - hide toggle
    if (existingToggle) {
      existingToggle.style.display = 'none';
    }
    return;
  }

  // Tab supports options - show toggle
  if (existingToggle) {
    existingToggle.style.display = '';
    existingToggle.dataset.primaryTab = primaryTab;

    // ✅ UPDATE DATA-HREF: Point futures button to current tab
    const futuresBtn = existingToggle.querySelector('[data-toggle="futures"]');
    if (futuresBtn) {
      futuresBtn.setAttribute('data-href', futuresPath);
    }

    // ✅ UPDATE OPTIONS DATA-HREF: Point to current tab's options
    const optionsBtn = existingToggle.querySelector('[data-toggle="options"]');
    if (optionsBtn) {
      optionsBtn.setAttribute('data-href', optionsPath);
    }

    // Update active state and selected option
    await updateDropdownActiveState(existingToggle);
  } else {
    // First time on a tab with options - build it
    await insertEnhancedSubTabsIfApplicable(productRoot);
  }
}

/**
 * Insert enhanced subtabs if applicable for current tab
 * ONLY called on initial load or first time visiting options tab
 */
export async function insertEnhancedSubTabsIfApplicable(productRoot) {
  const myToken = Date.now();
  store.dispatch(setToggleOperation(myToken));

  const main = document.querySelector('main');
  if (!main) return;

  const tabsSection = findProductTabsSection();
  if (!tabsSection) return;

  const currentPath = normalizePath(window.location.pathname);
  const currentSearch = window.location.search;
  const rel = normalizePath(currentPath).replace(normalizePath(productRoot), '');
  const parts = rel.split('/').filter((p) => p);

  const existingToggles = tabsSection.querySelectorAll('.product-subtabs');
  existingToggles.forEach((toggle) => {
    if (toggle.parentNode) toggle.parentNode.removeChild(toggle);
  });

  const shouldHaveSubTabs = parts.length > 0 && parts[0] !== 'overview';

  if (!shouldHaveSubTabs) {
    store.dispatch(setCreatingToggle(false));
    store.dispatch(setToggleOperation(null));
    return;
  }

  const primaryTab = parts[0];

  // Save initial state if page loaded with an options contract selected
  if (currentPath.includes('/options') && (currentSearch.includes('productId=') || currentSearch.includes('optionProductId='))) {
    const urlParams = new URLSearchParams(currentSearch);
    const selectedContract = urlParams.get('optionProductId') || urlParams.get('productId');
    const state = store.getState();
    if (selectedContract && primaryTab && !state.tabSelections[primaryTab]) {
      store.dispatch(setTabSelection(primaryTab, selectedContract));
    }
  }

  const state = store.getState();
  if (state.navigation.isCreatingToggle) {
    store.dispatch(setToggleOperation(null));
    return;
  }

  store.dispatch(setCreatingToggle(true));

  const futuresPath = `${productRoot}/${primaryTab}`;
  const optionsPath = `${futuresPath}/options`;

  const [hasFutures, hasOptions] = await Promise.all([
    indexHasPath(futuresPath),
    indexHasPath(optionsPath),
  ]);

  const currentState = store.getState();
  if (currentState.navigation.currentToggleOperation !== myToken) {
    store.dispatch(setCreatingToggle(false));
    return;
  }

  if (!hasFutures || !hasOptions) {
    store.dispatch(setCreatingToggle(false));
    store.dispatch(setToggleOperation(null));
    return;
  }

  const nav = await buildEnhancedSubTabs(productRoot, currentPath, primaryTab);

  const stateAfterBuild = store.getState();
  if (stateAfterBuild.navigation.currentToggleOperation !== myToken) {
    store.dispatch(setCreatingToggle(false));
    return;
  }

  if (!nav) {
    store.dispatch(setCreatingToggle(false));
    store.dispatch(setToggleOperation(null));
    return;
  }

  const wrapper = tabsSection.querySelector('.product-tabs-wrapper')
    || tabsSection.querySelector(':scope > div');
  if (!wrapper) {
    store.dispatch(setCreatingToggle(false));
    store.dispatch(setToggleOperation(null));
    return;
  }

  wrapper.appendChild(nav);

  await handleOptionsDropdownNavigation(nav, productRoot, primaryTab);

  const finalState = store.getState();
  if (finalState.navigation.currentToggleOperation !== myToken) {
    if (nav.parentNode) nav.parentNode.removeChild(nav);
    store.dispatch(setCreatingToggle(false));
    return;
  }

  await updateDropdownActiveState(nav);

  store.dispatch(setCreatingToggle(false));
  store.dispatch(setToggleOperation(null));
}

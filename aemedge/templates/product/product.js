/**
 * Product Template - Main Entry Point
 * Orchestrates product page functionality
 *
 * REFACTORED ARCHITECTURE:
 * - product.js (this file) - Main coordination & exports
 * - product-dom-helpers.js - DOM manipulation & tab discovery
 * - product-navigation.js - SPA navigation & prefetching
 * - product-data.js - API configuration & data fetching
 * - product-toggle-manager.js - Futures/options toggle management
 */

import { getMetadata } from '../../scripts/aem.js';
import { computeProductRoot, normalizePath } from '../../scripts/utils/product.js';
import { store } from '../../scripts/store/store.js';
import {
  updateProductField,
  setAPIData,
  setProductData,
  setGlobalOptionSelection,
  clearGlobalOptionSelection,
} from '../../scripts/actions/product.js';

// Import module functions
import {
  insertHeroIfMissing,
  ensureHeroThenTabsOrder,
  insertProductTabsIfMissing,
  moveCurrentPageContentUnderSubTabs,
  getDefaultTab,
  findProductTabsSection,
  preloadPathIndex,
} from './product-dom-helpers.js';

import {
  enableProductSpaNavigation,
  renderProductPath,
  checkTabSupportsOptions,
} from './product-navigation.js';

import {
  schedulePrefetch,
  getProductId,
} from './product-data.js';

import {
  insertEnhancedSubTabsIfApplicable,
} from './product-toggle-manager.js';

import {
  fetchExpirationsData,
} from './product-toggle-utils.js';

// Export store and actions for use by blocks (backwards compatibility)
export { store as productStore, updateProductField, setAPIData };

// ==================== DEVELOPMENT HELPERS ====================

window.inspectProductStore = () => {
  const state = store.getState();
  // eslint-disable-next-line no-console
  console.log('=== Product Store State ===');
  // eslint-disable-next-line no-console
  console.log('Product Data:', state.productData);
  // eslint-disable-next-line no-console
  console.log('Tab Selections:', state.tabSelections);
  // eslint-disable-next-line no-console
  console.log('Global Option Selection:', state.globalOptionSelection);
  // eslint-disable-next-line no-console
  console.log('Navigation:', state.navigation);
};

window.inspectTabSelections = () => {
  const state = store.getState();
  // eslint-disable-next-line no-console
  console.log('=== Options Selections ===');
  // eslint-disable-next-line no-console
  console.log('GLOBAL Selection:', state.globalOptionSelection.selectedContract || 'None (Futures)');
  // eslint-disable-next-line no-console
  console.log('Per-Tab Selections (legacy):', state.tabSelections);
};

// Expose for debugging
window.productStore = store;
window.updateProductField = updateProductField;
window.setAPIData = setAPIData;
window.setGlobalOptionSelection = setGlobalOptionSelection;
window.clearGlobalOptionSelection = clearGlobalOptionSelection;
window.checkTabSupportsOptions = checkTabSupportsOptions;
window.getDefaultTab = getDefaultTab;
window.getProductId = getProductId;

// ==================== MAIN TEMPLATE FUNCTION ====================

/**
 * Main product template initialization
 * Called when page loads with template=product
 */
export default async function productTemplate() {
  const template = (getMetadata('template') || '').toLowerCase();
  if (template !== 'product') return;

  const productRoot = computeProductRoot(window.location.pathname);

  // Preload path index cache to avoid delays during user interactions
  preloadPathIndex();

  // Prefetch options dropdown data immediately (don't wait for idle)
  // This ensures dropdown is ready when user clicks any tab
  fetchExpirationsData().then((data) => {
    if (data && data.length > 0) {
      store.dispatch(setProductData({ optionsExpirations: data }));
    }
  }).catch(() => {});

  // Schedule data prefetching during idle time
  schedulePrefetch(productRoot);

  // Insert hero if missing
  await insertHeroIfMissing();

  // Insert product tabs if missing
  if (!findProductTabsSection()) {
    await insertProductTabsIfMissing(productRoot);
  }

  // Ensure correct order (hero → tabs)
  ensureHeroThenTabsOrder();

  // Insert futures/options toggle if applicable
  await insertEnhancedSubTabsIfApplicable(productRoot);

  // Move current page content under subtabs
  moveCurrentPageContentUnderSubTabs();

  // Enable SPA navigation (initial setup)
  enableProductSpaNavigation(productRoot);

  // Re-enable after subtabs are populated (to wire up dropdown links)
  // This ensures options dropdown links have click handlers
  enableProductSpaNavigation(productRoot);

  // If on root path, render default tab (without changing URL)
  const onRoot = normalizePath(window.location.pathname) === normalizePath(productRoot);

  if (onRoot) {
    const defaultTab = await getDefaultTab(productRoot);
    const defaultUrl = `${productRoot}/${defaultTab}`;
    await renderProductPath(defaultUrl, productRoot);
  }
}

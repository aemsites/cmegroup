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
 * - scripts/services/ProductAutoUpdateService.js - Real-time data updates
 */

import { getMetadata } from '../../scripts/aem.js';
import { computeProductRoot } from '../../scripts/utils/product.js';
import { store } from '../../scripts/store/store.js';
import {
  updateProductField,
  setAPIData,
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

// Auto-update service (exposed for manual control)
window.startAutoUpdates = async (...args) => {
  const { startAutoUpdates } = await import('../../scripts/services/ProductAutoUpdateService.js');
  return startAutoUpdates(...args);
};

window.stopAutoUpdates = async (timers) => {
  const { stopAutoUpdates } = await import('../../scripts/services/ProductAutoUpdateService.js');
  stopAutoUpdates(timers);
};

// ==================== MAIN TEMPLATE FUNCTION ====================

/**
 * Main product template initialization
 * Called when page loads with template=product
 */
export default async function productTemplate() {
  const template = (getMetadata('template') || '').toLowerCase();
  if (template !== 'product') return;

  const productRoot = computeProductRoot(window.location.pathname);

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

  // Enable SPA navigation
  enableProductSpaNavigation(productRoot);

  // If on root path, render default tab (without changing URL)
  const { normalizePath } = await import('../../scripts/utils/product.js');
  const onRoot = normalizePath(window.location.pathname) === normalizePath(productRoot);
  
  if (onRoot) {
    const defaultTab = await getDefaultTab(productRoot);
    const defaultUrl = `${productRoot}/${defaultTab}`;
    await renderProductPath(defaultUrl, productRoot);
  }
}

// ==================== AUTO-UPDATE CONFIGURATION ====================
//
// To enable auto-updating of product data (quotes, settlements, etc.):
//
// PRODUCTION (real APIs):
// import { startAutoUpdates, AUTO_UPDATE_CONFIG } from '../../scripts/services/ProductAutoUpdateService.js';
// const productId = getProductId();
// const updateTimers = startAutoUpdates(productId, AUTO_UPDATE_CONFIG);
//
// DEMO (using sample.json):
// import { startAutoUpdates } from '../../scripts/services/ProductAutoUpdateService.js';
// const demoConfig = {
//   quotes: {
//     endpoint: () => '/aemedge/blocks/quotes-table/sample.json',
//     storeKey: 'quotesData.table',
//     interval: 30 * 1000, // 30 seconds
//     transform: (data) => data.quotes,
//     enabled: true,
//   },
// };
// const updateTimers = startAutoUpdates('300', demoConfig);
//
// To stop (in console): window.stopAutoUpdates(updateTimers);
//
// ==================== END OF AUTO-UPDATE CONFIGURATION ====================


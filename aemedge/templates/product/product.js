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
import { setProductData } from '../../scripts/actions/product.js';

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
} from './product-navigation.js';

import {
  schedulePrefetch,
} from './product-data.js';

import {
  insertEnhancedSubTabsIfApplicable,
} from './product-toggle-manager.js';

import {
  fetchExpirationsData,
} from './product-toggle-utils.js';

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

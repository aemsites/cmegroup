/**
 * Product Template - Main Entry Point
 * Orchestrates product page functionality
 *
 * REFACTORED ARCHITECTURE:
 * - product.js (this file) - Main coordination & exports
 * - product-dom-helpers.js - DOM manipulation & tab discovery
 * - product-navigation.js - SPA navigation & prefetching
 * - product-toggle-manager.js - Futures/options toggle management
 * - product-toggle-utils.js - Toggle utilities & options data fetching
 */

import { getMetadata } from '../../scripts/aem.js';
import { computeProductRoot, normalizePath, getProductMetadata } from '../../scripts/utils/product.js';
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

  // Expose store to window for debugging (dev console access)
  if (!window.productStore) {
    window.productStore = store;
  }

  // Ensure product metadata (including product ID) is available
  // If missing from page metadata, fetch from search API
  const productMetadata = await getProductMetadata();
  if (!productMetadata.productId) {
    // eslint-disable-next-line no-console
    console.warn('Product template: Unable to determine product ID for path:', window.location.pathname);
    // Continue anyway - some functionality may be limited
  }

  // Preload path index cache to avoid delays during user interactions
  preloadPathIndex();

  // Fetch options dropdown data and product metadata in background
  // Promise caching ensures no duplicate calls even if accessed before completion
  fetchExpirationsData().then((data) => {
    if (data && data.expirations && data.expirations.length > 0) {
      const payload = { optionsExpirations: data.expirations };
      // Also store product metadata if available from API
      if (data.productSymbol) payload.productSymbol = data.productSymbol;
      if (data.productName) payload.productName = data.productName;
      store.dispatch(setProductData(payload));
    }
  }).catch(() => {
    // Non-critical - continue without options data
  });

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
  // Use requestAnimationFrame to ensure DOM has fully settled after all mutations
  await new Promise((resolve) => {
    requestAnimationFrame(() => {
      enableProductSpaNavigation(productRoot);
      resolve();
    });
  });

  // If on root path, render default tab (without changing URL)
  const onRoot = normalizePath(window.location.pathname) === normalizePath(productRoot);

  if (onRoot) {
    const defaultTab = await getDefaultTab(productRoot);
    const defaultUrl = `${productRoot}/${defaultTab}`;
    await renderProductPath(defaultUrl, productRoot);
  }
}

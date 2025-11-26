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
import {
  computeProductRoot,
  normalizePath,
  getProductMetadata,
  loadProductData,
} from '../../scripts/utils/product.js';
import { store } from '../../scripts/store/store.js';

// Import module functions
import {
  insertHeroIfMissing,
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

// Initialize mock data for localhost (no VPN needed for local dev)
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
  getProductMetadata().then(({ productId }) => {
    loadProductData(productId);
  });
  // Continue anyway - some functionality may be limited even without product ID

  // Preload path index cache to avoid delays during user interactions
  preloadPathIndex();

  // ✅ OPTIMIZATION: Start hero insertion in background (non-blocking)
  // Hero is independent and populates via store subscription
  const heroExists = document.querySelector('.hero-baseball');
  if (!heroExists) {
    // Fire and forget - don't block page initialization
    insertHeroIfMissing(productRoot).catch(() => {
      // Silent fail - hero is non-critical for page functionality
    });
  }

  // ✅ OPTIMIZATION: Start product tabs insertion and store promise
  // We'll await it only when needed by dependent operations
  let productTabsPromise = Promise.resolve();
  if (!findProductTabsSection()) {
    productTabsPromise = insertProductTabsIfMissing(productRoot);
  }

  // Enable SPA navigation for main tabs early (before toggle/content moves)
  // Uses MutationObserver to wait for async block decoration (no polling!)
  enableProductSpaNavigation(productRoot);

  // ✅ OPTIMIZATION: Don't fetch options data on page load
  // Instead, fetch after tab with options dropdown finishes loading (lazy background fetch)
  // This prevents blocking UI while still having data ready when user needs it
  // See product-toggle-manager.js for the lazy fetch implementation

  // ✅ Await product tabs before operations that depend on them
  await productTabsPromise;

  // Insert futures/options toggle if applicable
  await insertEnhancedSubTabsIfApplicable(productRoot);

  // Move current page content under subtabs
  moveCurrentPageContentUnderSubTabs();

  // If on root path, render default tab (without changing URL)
  const onRoot = normalizePath(window.location.pathname) === normalizePath(productRoot);

  if (onRoot) {
    const defaultTab = await getDefaultTab(productRoot);
    const defaultUrl = `${productRoot}/${defaultTab}`;
    await renderProductPath(defaultUrl, productRoot);
  }
}

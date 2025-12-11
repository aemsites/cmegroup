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

  if (!window.productStore) {
    window.productStore = store;
  }

  getProductMetadata().then(({ productId }) => {
    loadProductData(productId);
  });

  preloadPathIndex();

  const heroExists = document.querySelector('.hero-baseball');
  if (!heroExists) {
    insertHeroIfMissing(productRoot).catch(() => {});
  }

  if (!findProductTabsSection()) {
    insertProductTabsIfMissing(productRoot);
  }

  const onRoot = normalizePath(window.location.pathname) === normalizePath(productRoot);

  let loadingTemplate = false;
  store.subscribe(({ productTab }) => productTab, async ({ loaded }) => {
    if (loaded && !loadingTemplate) {
      loadingTemplate = true;
      enableProductSpaNavigation(productRoot);
      await insertEnhancedSubTabsIfApplicable(productRoot);
      moveCurrentPageContentUnderSubTabs();
      if (onRoot) {
        const defaultTab = await getDefaultTab(productRoot);
        const defaultUrl = `${productRoot}/${defaultTab}`;
        await renderProductPath(defaultUrl, productRoot);
      }
    }
  });
}

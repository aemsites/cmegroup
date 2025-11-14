import { getMetadata } from '../aem.js';
import { getIndexedContent } from '../indexing.js';
import { store } from '../store/store.js';
import { setProductData } from '../actions/product.js';

// Shared cache for product index results
// Stores full search API results to avoid duplicate calls
let productIndexCache = null;

export function normalizePath(pathname) {
  try {
    const url = new URL(pathname, window.location.origin);
    const p = url.pathname;
    return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
  } catch (e) {
    return pathname;
  }
}

export function computeProductRoot(pathname) {
  const path = normalizePath(pathname);
  const segs = path.split('/').filter((s) => s);
  if (!segs.length) return '/';
  let trimmed = [...segs];
  if ((trimmed[trimmed.length - 1] || '').toLowerCase() === 'options') {
    trimmed = trimmed.slice(0, -1);
  }
  const TABS = ['overview', 'quotes', 'settlements', 'volume', 'specs', 'margins', 'calendar'];
  if (TABS.includes((trimmed[trimmed.length - 1] || '').toLowerCase())) {
    trimmed = trimmed.slice(0, -1);
  }
  return `/${trimmed.join('/')}`;
}

/**
 * Load product index from search API and cache results
 * ✅ CONSOLIDATED: Single source of truth, eliminates duplicate API calls
 * @param {string} basePath - Base path for filtering (e.g., '/markets')
 * @returns {Promise<Array>} Array of indexed product pages
 */
export async function loadProductIndex(basePath) {
  // Return cached results if already loaded
  if (productIndexCache) {
    return productIndexCache;
  }

  try {
    const indexFilter = {
      templates: ['product'],
      basePaths: [basePath],
      limit: 1000,
    };

    const results = await getIndexedContent(indexFilter);

    // Cache the full results (not just paths)
    productIndexCache = results || [];
    return productIndexCache;
  } catch (e) {
    productIndexCache = [];
    return [];
  }
}

/**
 * Check if a specific path exists in the product index
 * @param {string} path - Path to check (e.g., '/markets/corn/quotes')
 * @returns {Promise<boolean>} True if path exists
 */
export async function indexHasPath(path) {
  try {
    // Determine base path from the path being checked
    const basePath = `/${path.split('/')[1]}`;

    // Load index if not cached
    const results = await loadProductIndex(basePath);

    // Check if the specific path exists
    const normalizedPath = normalizePath(path);
    return results.some((item) => normalizePath(item.path) === normalizedPath);
  } catch (e) {
    return false;
  }
}

/**
 * Get product page metadata from search API for a specific product path
 * ✅ REFACTORED: Now uses shared cache, no duplicate API call
 * @param {string} productPath - The product root path (e.g., '/markets/corn')
 * @returns {Promise<Object>} Product metadata {productId, productName, productSymbol}
 */
async function getProductFromSearchAPI(productPath) {
  try {
    // Determine base path (e.g., /markets or /drafts)
    const basePath = `/${productPath.split('/')[1]}`;

    // Use shared cache - no duplicate API call!
    const results = await loadProductIndex(basePath);

    if (!results || results.length === 0) {
      return null;
    }

    // Find the specific product page
    const normalizedPath = normalizePath(productPath);
    const productPage = results.find((item) => normalizePath(item.path) === normalizedPath);

    if (!productPage) {
      return null;
    }

    // Extract metadata from search API response
    const metadata = {
      productId: productPage.metadata?.['product-id'] || '',
      productName: productPage.metadata?.product || productPage.title || '',
      productSymbol: productPage.metadata?.['product-symbol'] || '',
    };

    return metadata;
  } catch (e) {
    return null;
  }
}

/**
 * Get product metadata with persistent caching across SPA navigation
 * Uses Redux store to persist metadata when navigating between tabs
 * that may not have metadata tags (prevents hero/blocks from going blank)
 */
export async function getProductMetadata() {
  const productRoot = computeProductRoot(window.location.pathname);
  const state = store.getState();
  const { productData } = state;

  // Check if we already have cached metadata in store for this product
  if (productData.productRoot === productRoot
      && productData.productId
      && productData.productName) {
    return {
      productId: productData.productId,
      productName: productData.productName,
      productSymbol: productData.productSymbol || '',
    };
  }

  // Try to get metadata from HTML meta tags
  const context = {
    productId: getMetadata('product-id') || '',
    productName: getMetadata('product') || '',
    productSymbol: getMetadata('product-symbol') || '',
  };

  // If we have complete metadata from tags, cache in store and return it
  if (context.productId && context.productName) {
    store.dispatch(setProductData({
      productRoot,
      productId: context.productId,
      productName: context.productName,
      productSymbol: context.productSymbol,
    }));

    return context;
  }

  // Fallback: try to get metadata from search API
  const searchMetadata = await getProductFromSearchAPI(productRoot);

  if (searchMetadata) {
    context.productId = context.productId || searchMetadata.productId || '';
    context.productName = context.productName || searchMetadata.productName || '';
    context.productSymbol = context.productSymbol || searchMetadata.productSymbol || '';
  }

  // Only save to store if we have at least productId or productName
  // Don't overwrite existing data with empty values
  if (context.productId || context.productName) {
    store.dispatch(setProductData({
      productRoot,
      productId: context.productId || productData.productId,
      productName: context.productName || productData.productName,
      productSymbol: context.productSymbol || productData.productSymbol,
    }));
  } else if (productData.productId || productData.productName) {
    // Return existing store data if available, otherwise empty context
    return {
      productId: productData.productId || '',
      productName: productData.productName || '',
      productSymbol: productData.productSymbol || '',
    };
  }

  return context;
}

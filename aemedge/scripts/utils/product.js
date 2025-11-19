import { getMetadata } from '../aem.js';
import { getIndexedContent } from '../indexing.js';
import { store } from '../store/store.js';
import { setProductData } from '../actions/product.js';
import { apiGet, apiPost, getResponseData } from './fetch.js';
import { urlByEnvType } from './env.js';
import { loadScript, setupDayjsLibs, getCdtDate } from '../utils.js';

// API Configuration
const API_CONFIG = {
  // Expirations endpoint - requires productId parameter
  fullProductWithOptionsEndpoint: '/CmeWS/md/Product/V2/FullProductWithOptions/ProductId/',
  contractsByNumberEndpoint: '/CmeWS/mvc/quotes/v2/contracts-by-number',
};

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

let productSearchApiPromise = null;

/**
 * Load product index from search API and cache results
 * ✅ CONSOLIDATED: Single source of truth, eliminates duplicate API calls
 * @param {string} basePath - Base path for filtering (e.g., '/markets')
 * @returns {Promise<Array>} Array of indexed product pages
 */
export async function loadProductIndex(basePath) {
  if (!productSearchApiPromise) {
    productSearchApiPromise = new Promise((resolve, reject) => {
      (async () => {
        try {
          const indexFilter = {
            templates: ['product'],
            basePaths: [basePath],
            limit: 1000,
          };
          const results = await getIndexedContent(indexFilter);
          resolve(results);
        } catch (e) {
          reject(e);
        }
      })();
    });
  }
  return productSearchApiPromise;
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
    // Use shared cache - no duplicate API call!
    const results = await loadProductIndex(productPath);

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
    };

    return metadata;
  } catch (e) {
    return null;
  }
}

let productMetaDataPromise = null;

export async function getProductMetadata() {
  if (!productMetaDataPromise) {
    productMetaDataPromise = new Promise((resolve, reject) => {
      (async () => {
        try {
          // Try to get metadata from HTML meta tags
          const context = {
            productId: getMetadata('product-id') || '',
            productName: getMetadata('product') || '',
          };
          // If we have complete metadata from tags
          if (context.productId && context.productName) {
            resolve(context);
          }
          // Fallback: try to get metadata from search API
          const productRoot = computeProductRoot(window.location.pathname);
          const searchMetadata = await getProductFromSearchAPI(productRoot);
          if (searchMetadata) {
            context.productId = context.productId || searchMetadata.productId || '';
            context.productName = context.productName || searchMetadata.productName || '';
          }
          resolve(context);
        } catch (e) {
          reject(e);
        }
      })();
    });
  }
  return productMetaDataPromise;
}

export function isValidTradeDate(date, hoursToSubtract) {
  const today = getCdtDate(Date.now());
  const prevDay = getCdtDate(date).subtract(hoursToSubtract, 'hour');
  return today.isSameOrAfter(prevDay, 'hour');
}

let productDataPromise = null;

export async function loadProductData(productId) {
  if (!productId) {
    store.dispatch(setProductData({
      loaded: true,
      isTrading: false,
    }));
  }
  if (!productDataPromise) {
    productDataPromise = new Promise((resolve, reject) => {
      (async () => {
        try {
          const endpoint = `${urlByEnvType()}${API_CONFIG.fullProductWithOptionsEndpoint}${productId}`;
          const [response] = await Promise.all([
            apiGet(endpoint, {}, {}, { withCredentials: false }),
            setupDayjsLibs(),
            loadScript('/aemedge/scripts/third-party/dayjs/isSameOrAfter.js'),
          ]);
          /* eslint-disable no-undef */
          dayjs.extend(dayjs_plugin_isSameOrAfter);
          const data = getResponseData(response) || response.data;
          if (data && data.optionsLabels && Array.isArray(data.optionsLabels)) {
            data.optionsLabels = data.optionsLabels.map((option) => ({
              ...option,
              weekly: option.weekly === 'true' || option.weekly === true,
              daily: option.daily === 'true' || option.daily === true,
              isActive: option.listDate ? isValidTradeDate(option.listDate, 24) : true,
              isTrading: option.listDate ? isValidTradeDate(option.listDate, 8) : true,
            }));
          }
          store.dispatch(setProductData({
            loaded: true,
            ...data,
            productSymbol: data.shortName,
            isActive: data.listDate ? isValidTradeDate(data.listDate, 24) : true,
            isTrading: data.listDate ? isValidTradeDate(data.listDate, 8) : true,
          }));
          resolve(data);
        } catch (e) {
          store.dispatch(setProductData({
            loaded: true,
            isTrading: false,
          }));
          reject(e);
        }
      })();
    });
  }
  return productDataPromise;
}

export async function getContractsByNumber(productId) {
  const endpoint = `${urlByEnvType()}${API_CONFIG.contractsByNumberEndpoint}`;
  const payload = {
    productIds: [productId],
    contractsNumber: [1],
    type: 'VOLUME',
    showQuarterly: [0],
  };
  const headers = {
    'Content-Type': 'application/json',
  };
  const response = await apiPost(endpoint, payload, headers);
  const data = getResponseData(response) || response.data;
  return data;
}

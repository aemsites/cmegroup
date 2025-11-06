/**
 * Product Template - Data Management
 * Handles API configuration, data fetching, and prefetching
 */

import { getMetadata } from '../../scripts/aem.js';
import { normalizePath } from '../../scripts/utils/product.js';
import { store } from '../../scripts/store/store.js';
import {
  setProductData,
  updateProductField,
  clearProductData,
  clearAllTabSelections,
  setAPIData,
  setFetchPromise,
  clearFetchPromise,
} from '../../scripts/actions/product.js';

/**
 * API Configuration
 * Maps API names to endpoints, transformations, and cache keys
 */
export const API_CONFIG = {
  optionsExpirations: {
    apiEndpoint: (productId) => `/CmeWS/md/Product/V2/FullProductWithOptions/ProductId/${productId}`,
    transform: (data) => data.optionsLabels || data,
    cacheKey: 'optionsExpirations',
  },
  quotesTable: {
    apiEndpoint: (productId) => `/CmeWS/mvc/quotes/v2/${productId}`,
    transform: (data) => data.quotes || data,
    cacheKey: 'quotesData.table',
  },
  quotesLabels: {
    apiEndpoint: (productId) => `/api/quotes/v2/getlabels/${productId}`,
    transform: (data) => data,
    cacheKey: 'quotesData.labels',
  },
  cvol: {
    apiEndpoint: (productId) => `/api/quotes/cvol/${productId}`,
    transform: (data) => data,
    cacheKey: 'quotesData.cvol',
  },
  marketRecap: {
    apiEndpoint: () => '/CmeWS/mvc/Ags/Reports',
    transform: (data) => data,
    cacheKey: 'quotesData.marketRecap',
  },
  settlementsDates: {
    apiEndpoint: (productId) => `/CmeWS/mvc/Settlements/Futures/TradeDate/${productId}`,
    transform: (data) => data,
    cacheKey: 'settlementsData.tradeDates',
  },
  contractsMetadata: {
    apiEndpoint: (productId) => `/api/contracts/${productId}`,
    transform: (data) => data,
    cacheKey: 'contractsMetadata',
  },
};

/**
 * Prefetch strategies per tab
 */
const PREFETCH_STRATEGIES = {
  initial: [
    'optionsExpirations',
    'contractsMetadata',
    'quotesTable',
    'quotesLabels',
    'cvol',
    'marketRecap',
    'settlementsDates',
  ],
  quotes: [],
  settlements: [],
  overview: [],
  volume: [],
  specs: [],
  margins: [],
  calendar: [],
};

// Cache for pre-built dropdown elements
export const prebuiltDropdownCache = new Map();

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

/**
 * Fetch data from API endpoint
 */
async function fetchFromAPI(apiName, productId) {
  const config = API_CONFIG[apiName];
  if (!config) {
    throw new Error(`Unknown API: ${apiName}`);
  }

  const apiUrl = config.apiEndpoint(productId);
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`API failed: ${response.status}`);
  }

  const data = await response.json();
  return config.transform(data);
}

/**
 * Fetch and cache API data with promise deduplication
 */
async function fetchAndCache(apiName, productId) {
  const config = API_CONFIG[apiName];
  const { cacheKey } = config;
  const state = store.getState();

  // Check if already fetching
  if (state.productData.fetchPromises[apiName]) {
    return state.productData.fetchPromises[apiName];
  }

  // Check if data already cached
  const cachedData = getNestedValue(state.productData, cacheKey);
  if (cachedData) {
    return cachedData;
  }

  // Create fetch promise
  const fetchPromise = (async () => {
    try {
      const data = await fetchFromAPI(apiName, productId);
      store.dispatch(setAPIData(cacheKey, data));
      store.dispatch(clearFetchPromise(apiName));
      return data;
    } catch (error) {
      store.dispatch(clearFetchPromise(apiName));
      throw error;
    }
  })();

  store.dispatch(setFetchPromise(apiName, fetchPromise));
  return fetchPromise;
}

/**
 * Get product ID from metadata
 */
export function getProductId() {
  return getMetadata('product-id') || '300';
}

/**
 * Schedule prefetch during idle time
 */
export function schedulePrefetch(productRoot) {
  if (document.readyState === 'complete') {
    scheduleIdlePrefetch(productRoot);
  } else {
    window.addEventListener('load', () => {
      scheduleIdlePrefetch(productRoot);
    }, { once: true });
  }
}

/**
 * Schedule idle prefetch
 */
function scheduleIdlePrefetch(productRoot) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      prefetchProductData(productRoot);
    }, { timeout: 2000 });
  } else {
    setTimeout(() => {
      prefetchProductData(productRoot);
    }, 1000);
  }
}

/**
 * Prefetch product data for current tab
 */
export async function prefetchProductData(productRoot, currentTab = null) {
  try {
    const productId = getProductId();
    if (!productId) return;

    const normalizedRoot = normalizePath(productRoot);
    const state = store.getState();

    // Check if product changed
    if (state.productData.productRoot
        && normalizePath(state.productData.productRoot) !== normalizedRoot) {
      store.dispatch(clearProductData());
      store.dispatch(clearAllTabSelections());
      prebuiltDropdownCache.clear();
      
      const { PREFETCH_CACHE } = await import('./product-navigation.js');
      PREFETCH_CACHE.clear();
    }

    // Initialize data store if needed
    if (!state.productData.productId) {
      store.dispatch(setProductData({
        productId,
        productRoot: normalizedRoot,
        fetchedAt: Date.now(),
      }));
    }

    let activeTab = currentTab;
    if (!activeTab) {
      const currentPath = normalizePath(window.location.pathname);
      const rel = currentPath.replace(normalizedRoot, '');
      const parts = rel.split('/').filter((p) => p);
      activeTab = parts[0] || 'overview';
    }

    const apisToFetch = [
      ...PREFETCH_STRATEGIES.initial,
      ...(PREFETCH_STRATEGIES[activeTab] || []),
    ];

    const results = await Promise.allSettled(
      apisToFetch.map((apiName) => fetchAndCache(apiName, productId)),
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        // Silent fail - API failures are non-critical
      }
    });

    store.dispatch(updateProductField('fetchedAt', Date.now()));
  } catch (error) {
    // Silent fail - prefetch errors are non-critical
  }
}


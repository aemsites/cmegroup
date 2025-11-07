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
 * ✅ UPDATED: Using correct CME Group API endpoints
 */
export const API_CONFIG = {
  // ✅ OPTIONS: Expirations dropdown data
  optionsExpirations: {
    apiEndpoint: (productId) => `/CmeWS/mvc/atm/expirations/${productId}`,
    transform: (data) => data,
    cacheKey: 'optionsExpirations',
  },
  
  // ✅ FUTURES: Quotes table
  quotesTable: {
    apiEndpoint: (productId) => `/CmeWS/mvc/quotes/v2/${productId}`,
    transform: (data) => data.quotes || data,
    cacheKey: 'quotesData.table',
  },
  
  // ✅ OPTIONS: ATM (At The Money) strike prices table
  atmTable: {
    apiEndpoint: (productId, year, month) => {
      // Default to current month if not provided
      const now = new Date();
      const y = year || now.getFullYear();
      const m = month || (now.getMonth() + 1);
      return `/CmeWS/mvc/atm/strike-prices/${productId}/${y}/${m}/ATM`;
    },
    transform: (data) => data,
    cacheKey: 'optionsData.atmTable',
  },
  
  // ✅ CVOL: Index card (separate block)
  cvol: {
    apiEndpoint: () => `/services/cvol?symbol=CVL`,
    transform: (data) => data,
    cacheKey: 'quotesData.cvol',
  },
  
  // ✅ MARKET RECAP: Report (separate block)
  marketRecap: {
    apiEndpoint: () => '/CmeWS/mvc/Ags/Reports',
    transform: (data) => data,
    cacheKey: 'quotesData.marketRecap',
  },
  
  // ✅ SETTLEMENTS: Trade dates
  settlementsDates: {
    apiEndpoint: (productId) => `/CmeWS/mvc/Settlements/Futures/TradeDate/${productId}`,
    transform: (data) => data,
    cacheKey: 'settlementsData.tradeDates',
  },
  
  // ✅ METADATA: Contracts info
  contractsMetadata: {
    apiEndpoint: (productId) => `/api/contracts/${productId}`,
    transform: (data) => data,
    cacheKey: 'contractsMetadata',
  },
};

/**
 * ✅ LAZY LOADING: Map tabs to their required APIs
 * Data is fetched on-demand when user clicks a tab
 */
export const TAB_API_MAPPING = {
  quotes: [
    'quotesTable',      // Futures quotes
    'atmTable',         // Options ATM table
    'cvol',             // CVOL index card
    'marketRecap',      // Market recap report
    'contractsMetadata' // Contract metadata
  ],
  settlements: ['settlementsDates', 'contractsMetadata'],
  volume: ['contractsMetadata'],
  specs: ['contractsMetadata'],
  margins: ['contractsMetadata'],
  calendar: ['contractsMetadata'],
  overview: ['contractsMetadata'],
};

/**
 * Prefetch strategies per tab
 * ✅ MINIMAL INITIAL LOAD: Only fetch what's needed for options dropdown
 */
const PREFETCH_STRATEGIES = {
  initial: [
    'optionsExpirations', // ✅ ONLY fetch options dropdown data on initial load
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
 * ✅ LAZY LOADING: Fetch data for specific tab on-demand
 * Called when user clicks a tab
 */
export async function fetchTabData(productRoot, tabName) {
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

    // ✅ FETCH ONLY WHAT THIS TAB NEEDS
    const apisToFetch = TAB_API_MAPPING[tabName] || [];
    
    if (apisToFetch.length === 0) {
      return; // No APIs needed for this tab
    }

    // Fetch all APIs for this tab in parallel
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
    // Silent fail - fetch errors are non-critical
  }
}

/**
 * Prefetch product data for current tab
 * ✅ DEPRECATED: Use fetchTabData() instead for lazy loading
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


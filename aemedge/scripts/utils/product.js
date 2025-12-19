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
  contractSpecsEndpoint: '/CmeWS/mvc/ContractSpecs/List/productId',
  cvolEndpoint: '/services/cvol',
  calendarEndpoint: '/CmeWS/mvc/ProductCalendar/Future',
  calendarOptionsEndpoint: '/CmeWS/mvc/ProductCalendar/Options',
};

const minimumPriceOrderedKeys = [
  'CME Globex:',
  'CME ClearPort:',
  'CME ClearPort and Open Outcry:',
  'Default:',
  'Outright:',
  'Spreads',
  'HALF TICK',
  'Reduced Tick:',
  'CAB',
  'CALENDAR SPREAD',
  'All Mid-Curves',
  'Quarterly and Serial',
  'Note',
];

const tradingHoursOrderedKeys = [
  'CME Globex:',
  'CME ClearPort:',
  'Open Outcry:',
  'Default:',
];

const productOrderedKeys = [
  'CmeGlobex',
  'ClearPort',
  'OpenOutCry',
  'tickerPut',
  'tickerCall',
  'ClearingCode',
  'TAS',
  'TAM',
  'BTIC',
  'TACO',
  'TMAC',
];

const productFormattedKey = {
  CmeGlobex: 'CME Globex',
  ClearPort: 'CME ClearPort',
  OpenOutCry: 'Open Outcry',
  ClearingCode: 'Clearing',
  tickerCall: 'Open Outcry Call',
  tickerPut: 'Open Outcry Put',
  TAS: 'TAS',
  TAM: 'TAM',
  BTIC: 'BTIC',
  TACO: 'TACO',
  TMAC: 'TMAC',
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

export function computeAssetClass(pathname) {
  const path = normalizePath(pathname);
  const segs = path.split('/markets/');
  if (!segs.length || segs.length < 2) return '';
  return segs[1].split('/')[0];
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

export async function getProductTitle(optionProductId, componentName) {
  return new Promise((resolve) => {
    const unsubscribe = store.subscribe(
      ({ productData }) => ({ productData }),
      (stateSlices) => {
        const { productData } = stateSlices;
        if (productData && productData.loaded) {
          const { optionsLabels, fullProductName } = productData;
          const optionSelected = optionProductId;
          let title = '';

          const option = optionsLabels?.find(
            ({ productId }) => productId === optionSelected,
          );

          if (option) {
            title = option.name;
          } else {
            title = fullProductName;
          }

          const fullTitle = title ? `${title} - ${componentName}` : '';
          resolve(fullTitle);
          if (unsubscribe) {
            unsubscribe();
          }
        }
      },
    );
  });
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
    return null;
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
          const data = getResponseData(response) || response.data;

          /* eslint-disable no-undef */
          dayjs.extend(dayjs_plugin_isSameOrAfter);
          let hasOptions = false;
          if (data && data.optionsLabels && Array.isArray(data.optionsLabels)) {
            hasOptions = true;
            data.optionsLabels = data.optionsLabels.map((option) => ({
              ...option,
              weekly: option.weekly === 'true' || option.weekly === true,
              daily: option.daily === 'true' || option.daily === true,
              isActive: option.listDate ? isValidTradeDate(option.listDate, 24) : true,
              isTrading: option.listDate ? isValidTradeDate(option.listDate, 8) : true,
            }));
          }
          data.fullProductName = data.productName;
          data.productName = data.productName.replace(/futures/ig, '').trim();
          store.dispatch(setProductData({
            ...data,
            loaded: true,
            hasOptions,
            productSubtitle: hasOptions ? 'Futures and Options' : 'Futures',
            productSymbol: data.shortName,
            isActive: data.listDate ? isValidTradeDate(data.listDate, 24) : true,
            isTrading: data.listDate ? isValidTradeDate(data.listDate, 8) : true,
          }));
          resolve(data);
        } catch (e) {
          store.dispatch(setProductData({
            productId,
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

export async function getContractSpecs(productId) {
  const endpoint = `${urlByEnvType()}${API_CONFIG.contractSpecsEndpoint}/${productId}`;
  const response = await apiGet(endpoint, {}, {}, { withCredentials: false });
  const data = getResponseData(response) || response.data;
  return data;
}

export async function getCvolIndexData(productIds) {
  const strProductIds = Array.isArray(productIds) ? productIds.join(',') : productIds;
  const endpoint = `${urlByEnvType()}${API_CONFIG.cvolEndpoint}?symbol=${strProductIds}`;

  try {
    const response = await apiGet(endpoint, {}, {}, { withCredentials: false });
    const rawResponse = getResponseData(response) || response.data || [];

    return productIds.map((prodId) => {
      const item = rawResponse.find(({ symbol }) => prodId === symbol);
      if (item) {
        let changeColor = '';
        if (item.cvolPriceChange && item.cvolPriceChange.length > 0) {
          if (item.cvolPriceChange[0] === '+') {
            changeColor = 'positive';
          } else if (item.cvolPriceChange[0] === '-' && item.cvolPriceChange.length > 1) {
            changeColor = 'negative';
          }
        }
        return {
          ...item,
          changeColor,
        };
      }
      return {
        symbol: prodId,
        cvolPrice: '-',
        cvolPriceChange: '-',
        insertTime: '-',
        changeColor: '',
      };
    });
  } catch (e) {
    return [];
  }
}

export async function getCalendarFutures(productId) {
  const endpoint = `${urlByEnvType()}${API_CONFIG.calendarEndpoint}/${productId}`;
  const response = await apiGet(endpoint, {}, {}, { withCredentials: false });
  const data = getResponseData(response) || response.data;
  return data;
}

export async function getCalendarOptions(productId, optionProductId) {
  const endpoint = `${urlByEnvType()}${API_CONFIG.calendarOptionsEndpoint}/${productId}`;
  const response = await apiGet(endpoint, {}, {}, { withCredentials: false });
  const data = getResponseData(response) || response.data;
  const optionData = data.filter((item) => item.productIds[0] === Number(optionProductId));
  return optionData[0].calendarEntries;
}

/**
 * Replace block content with matching authored override section (if any).
 */
export async function applyAuthorOverride(block, dataAttribute, value) {
  if (!value) {
    block.classList.remove('override-active');
    return false;
  }

  let section = document.querySelector(`.product-subtabs-content .section[data-${dataAttribute}="${value}"][data-override="true"]`);
  if (!section) {
    section = document.querySelector(`main .section[data-${dataAttribute}="${value}"][data-override="true"]`);
  }

  if (!section || !section.innerHTML.trim()) {
    block.classList.remove('override-active');
    return false;
  }

  block.innerHTML = '';
  section.childNodes.forEach((node) => {
    block.appendChild(node.cloneNode(true));
  });

  const blocks = block.querySelectorAll('.block');
  const blocksNeedingDecoration = Array.from(blocks).filter(
    (innerBlock) => innerBlock.dataset.blockStatus !== 'loaded',
  );

  if (blocksNeedingDecoration.length) {
    const { decorateBlock, loadBlock } = await import('../aem.js');
    // eslint-disable-next-line no-restricted-syntax
    for (const innerBlock of blocksNeedingDecoration) {
      decorateBlock(innerBlock);
      // eslint-disable-next-line no-await-in-loop
      await loadBlock(innerBlock);
    }
  }

  block.classList.add('override-active');
  return true;
}

/**
 * Asset Class Navigation
 */
const viewAnotherProductDropdownEndpoint = '/eds-config/view-another-product-dropdown.json';
let viewAnotherProductDropdownPromise = null;

function fetchViewAnotherProductDropdown() {
  if (!viewAnotherProductDropdownPromise) {
    viewAnotherProductDropdownPromise = new Promise((resolve, reject) => {
      (async () => {
        try {
          const response = await apiGet(viewAnotherProductDropdownEndpoint);
          const data = getResponseData(response) || response.data;
          const assetClassNavigation = {};
          Object.keys(data).forEach((k) => {
            if (!data[k].data) {
              return;
            }
            let currentSubgroup = {};
            assetClassNavigation[k] = {};
            data[k].data.forEach(({
              title,
              subgroup,
              linkUrl,
              text,
            }) => {
              if (title) {
                assetClassNavigation[k].title = title;
                assetClassNavigation[k].items = [];
              } else if (subgroup) {
                currentSubgroup = {
                  subgroup,
                  linkUrl,
                  text,
                  products: [],
                };
                assetClassNavigation[k].items.push(currentSubgroup);
              } else {
                currentSubgroup.products.push({ linkUrl, text });
              }
            });
          });
          resolve(assetClassNavigation);
        } catch (e) {
          reject(e);
        }
      })();
    });
  }
  return viewAnotherProductDropdownPromise;
}

/**
 * Returns the subgroup/product structure of an asset class
 */
export function getViewAnotherProductDropdown(assetClass) {
  return fetchViewAnotherProductDropdown().then(
    (assetClasses) => assetClasses[assetClass] || {},
  );
}

/* Get options/optionProductId mode from URL */
export function getDisplayMode() {
  const isOptions = window.location.pathname.includes('/options');
  const urlParams = new URLSearchParams(window.location.search);
  const optionProductId = urlParams.get('optionProductId');

  return { isOptions, optionProductId };
}

function fixAnchors(html) {
  if (typeof html !== 'string') {
    return html;
  }

  let newHtml = html;
  const replacements = [
    {
      // 1. Force https: added 's?' and simplified the capture group
      pattern: /href="http(?::)/gi,
      replace: 'href="https:',
    },
    {
      // 2. Add target="_blank" only if NOT already present
      // This looks for <a> tags that do NOT contain the word 'target'
      pattern: /<a\s+(?![^>]*target=)([^>]+)>/gi,
      replace: '<a $1 target="_blank">',
    },
  ];

  replacements.forEach(({ pattern, replace }) => {
    newHtml = newHtml.replace(pattern, replace);
  });

  return newHtml;
}

function renderRow(
  items,
  key,
  def,
  orderedKeys,
  formattedKey,
) {
  // Case 1: Simple String/Number
  if (typeof items !== 'object') {
    return `
      <div class="spec-item single">
        ${fixAnchors(items)}
      </div>
    `;
  }

  let nItems = items;
  if (orderedKeys) {
    nItems = orderedKeys.reduce((acc, item) => {
      const element = def ? items.find((x) => x[def] === item) : items[item];
      if (element) {
        acc.push(Array.isArray(items) ? element : item);
      }
      return acc;
    }, []);
  }

  // Case 2: Array of Items
  if (Array.isArray(items)) {
    const content = nItems.map((element) => {
      const showTitle = def && element[def].toLowerCase() !== 'default:';
      return `
        <div class="item-container">
          ${showTitle ? `<div class="title">${element[def]}</div>` : ''}
          <div>${fixAnchors(element[key])}</div>
        </div>
      `;
    }).join('');

    return `<div class="spec-item multi">${content}</div>`;
  }

  // Case 3: Objects
  const objectContent = nItems.map((item) => {
    const label = (formattedKey && formattedKey[item]) || item;
    return `
      <div class="item-container">
        <span class="title">${label}: </span>
        <span>${fixAnchors(items[item])}</span>
      </div>
    `;
  }).join('');

  return `<div class="spec-item object">${objectContent}</div>`;
}

export function getSpecItemView(spec, key) {
  switch (key) {
    case 'MinimumPriceFluctuation':
      return renderRow(
        spec.ticks ? spec.ticks : spec,
        'mintk',
        'type',
        typeof minimumPriceOrderedKeys !== 'undefined' ? minimumPriceOrderedKeys : null,
      );
    case 'TerminationOfTrading':
      return renderRow(
        spec.terminationOfTrading ? spec.terminationOfTrading : spec,
        'termsOfTrading',
      );
    case 'ListedContracts':
      return renderRow(
        spec.contractMonthsList ? spec.contractMonthsList : spec,
        'contrMonth',
        'type',
      );
    case 'TradingHours':
      return renderRow(
        spec.vandhr ? spec.vandhr : spec,
        'hours',
        'venue',
        typeof tradingHoursOrderedKeys !== 'undefined' ? tradingHoursOrderedKeys : null,
      );
    case 'ProductCode':
      return renderRow(
        spec,
        '',
        '',
        typeof productOrderedKeys !== 'undefined' ? productOrderedKeys : null,
        typeof productFormattedKey !== 'undefined' ? productFormattedKey : null,
      );
    default:
      return renderRow(spec);
  }
}

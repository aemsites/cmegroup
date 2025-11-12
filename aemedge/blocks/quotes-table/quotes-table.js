/* eslint-disable max-len */
/**
 * Quotes Table Block - STORE PATTERN VERSION
 * Displays futures or options quotes based on URL
 * Adapted from v1 tabs/quotes.js for v3 URL-based architecture
 *
 * STORE PATTERN OPTIMIZATION:
 * - Uses productStore from product.js for centralized state management
 * - Immutable state updates via store.dispatch()
 * - Observable state changes via store.subscribe()
 * - Perfect for real-time data updates (e.g., pricing every few minutes)
 */

import { getMetadata } from '../../scripts/aem.js';
import { getProductMetadata } from '../../scripts/utils/product.js';
import { apiGet, getResponseData, urlByEnvType } from '../../scripts/utils/index.js';
import { createElement, i18n } from '../../scripts/utils.js';

// Import store and actions from centralized store
import { store as productStore } from '../../scripts/store/store.js';
import { updateProductField } from '../../scripts/actions/product.js';

// API Configuration
// Uses urlByEnvType() to automatically select correct environment
const API_CONFIG = {
  quotesEndpoint: '/CmeWS/mvc/quotes/v2',
  optionsLabelsEndpoint: '/CmeWS/mvc/quotes/v2/contract',
};

// Cache tracking for performance metrics
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Get performance metrics for debugging
 * Usage: window.getQuotesTableMetrics()
 */
window.getQuotesTableMetrics = () => {
  // eslint-disable-next-line no-console
  console.log('=== Quotes Table Performance Metrics (Store Pattern) ===');
  // eslint-disable-next-line no-console
  console.log('Cache Hits:', cacheHits);
  // eslint-disable-next-line no-console
  console.log('Cache Misses:', cacheMisses);
  // eslint-disable-next-line no-console
  console.log('Cache Hit Rate:', cacheHits + cacheMisses > 0
    ? `${((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(1)}%`
    : 'N/A');
};

// Table Constants
const TABLE_CONSTANTS = {
  placeholders: {
    noData: '--',
    chart: 'CHT',
    options: 'OPT',
  },
};

// Table Formatters
const TABLE_FORMATTERS = {
  volume: (value) => (value && !Number.isNaN(Number(value)) ? parseInt(value, 10).toLocaleString() : '--'),
  change: (change, percentage) => {
    const changeVal = change || '--';
    const percentVal = percentage || '--';
    const isNegative = changeVal.toString().startsWith('-');
    const className = isNegative ? 'change-negative' : 'change-positive';
    return `<span class="${className}">${changeVal} (${percentVal})</span>`;
  },
  simpleTime: (value) => {
    if (!value) return '--';
    try {
      const date = new Date(value);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return '--';
    }
  },
};

/**
 * Get current mode from URL
 * @returns {Object} { isOptions: boolean, optionProductId: string|null }
 */
function getDisplayMode() {
  const isOptions = window.location.pathname.includes('/options');
  const urlParams = new URLSearchParams(window.location.search);
  const optionProductId = urlParams.get('optionProductId');

  return { isOptions, optionProductId };
}

/**
 * Fetch quotes table data for futures
 * STORE PATTERN: Reads from productStore, dispatches updates to store
 */
async function fetchQuotesTableData(productId) {
  // Try productStore cache first (prefetched by product.js)
  const state = productStore.getState();
  const cachedData = state.productData?.quotesData?.table;

  if (cachedData) {
    cacheHits += 1;
    return Array.isArray(cachedData) ? { quotes: cachedData } : cachedData;
  }

  // Cache miss - fetch from API
  cacheMisses += 1;

  try {
    const url = `${urlByEnvType()}${API_CONFIG.quotesEndpoint}/${productId}`;
    const response = await apiGet(url);
    const data = getResponseData(response) || response.data;

    if (data) {
      const tableData = data.quotes || data;
      productStore.dispatch(updateProductField('quotesData.table', tableData));
      return data;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch quotes table data:', error);
    return null;
  }

  return null;
}

/**
 * Fetch options labels for a specific product
 * STORE PATTERN: Reads from productStore, dispatches updates to store
 */
async function fetchOptionsLabels(productId) {
  // IMPORTANT: Use separate cache key to avoid collision with product toggle dropdown
  // - productData.optionsExpirations = OPTIONS LABELS (for product toggle)
  // - productData.contractExpirations = CONTRACT MONTHS (for quotes-table)

  // Try productStore cache first (prefetched by product.js)
  const state = productStore.getState();
  const contractExpirations = state.productData?.contractExpirations;

  if (contractExpirations) {
    cacheHits += 1;
    return contractExpirations;
  }

  // Also check if we can extract from optionsExpirations (optionsLabels)
  const optionsExpirations = state.productData?.optionsExpirations;
  if (optionsExpirations) {
    cacheHits += 1;

    // Transform cached data to expected format
    // product.js stores optionsLabels directly from the API
    if (Array.isArray(optionsExpirations) && optionsExpirations.length > 0) {
      // Check if it's already in the right format
      if (optionsExpirations[0]?.contractExpirations) {
        // From real API - needs transformation
        const transformed = optionsExpirations[0].contractExpirations.map((contract) => ({
          expirationMonth: contract.label,
          quoteCode: contract.underlyingFutureContract,
          expirationCode: contract.underlyingFutureExpirationCode,
        }));

        // Store in separate cache key via dispatch
        productStore.dispatch(updateProductField('contractExpirations', transformed));

        return transformed;
      }
    }
  }

  // Cache miss - fetch from API
  cacheMisses += 1;

  try {
    const url = `${urlByEnvType()}${API_CONFIG.optionsLabelsEndpoint}/${productId}`;
    const response = await apiGet(url);
    const data = getResponseData(response) || response.data;

    if (data && Array.isArray(data)) {
      const transformed = data.map((item) => ({
        expirationMonth: item.expirationMonth || item.label,
        quoteCode: item.quoteCode || item.underlyingFutureContract,
        expirationCode: item.expirationCode || item.underlyingFutureExpirationCode,
      }));

      productStore.dispatch(updateProductField('contractExpirations', transformed));
      return transformed;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch options labels:', error);
    return null;
  }

  return null;
}

/**
 * Fetch options data for a specific quote code
 */
async function fetchOptionsData(productId, quoteCode) {
  try {
    const url = `${urlByEnvType()}${API_CONFIG.quotesEndpoint}/${productId}/${quoteCode}`;
    const response = await apiGet(url);
    const data = getResponseData(response) || response.data;
    return data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch options data:', error);
    // Return placeholder data structure when data unavailable
    return {
      quotes: [{
        last: '--',
        change: '--',
        percentageChange: '--',
        priorSettle: '--',
        high: '--',
        low: '--',
        volume: '0',
        updated: null,
      }],
      _placeholder: true,
      _quoteCode: quoteCode,
    };
  }
}

/**
 * Build HTML table structure
 */
function buildTable(headers, data, tableId = '') {
  const table = createElement('table');
  if (tableId) table.id = tableId;

  const thead = createElement('thead');
  const headerRow = createElement('tr');

  headers.forEach((header) => {
    const th = createElement('th');
    th.innerHTML = header;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = createElement('tbody');
  data.forEach((rowData) => {
    const tr = createElement('tr');
    rowData.forEach((cellData) => {
      const td = createElement('td');
      if (typeof cellData === 'string') {
        td.innerHTML = cellData;
      } else if (cellData instanceof HTMLElement) {
        td.appendChild(cellData);
      } else {
        td.innerHTML = cellData;
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
}

/**
 * Create futures quotes table
 */
async function createFuturesTable() {
  const productMetadata = await getProductMetadata();
  const productId = productMetadata.productId || getMetadata('product-id');

  if (!productId) return null;

  const quotesData = await fetchQuotesTableData(productId);

  if (!quotesData || !quotesData.quotes || quotesData.quotes.length === 0) {
    return null;
  }

  const [month, options, chart, last, change, priorSettle, open, high, low, volume, updated] = await Promise.all([
    i18n('MONTH'),
    i18n('OPTIONS'),
    i18n('CHART'),
    i18n('LAST'),
    i18n('CHANGE'),
    i18n('PRIOR SETTLE'),
    i18n('OPEN'),
    i18n('HIGH'),
    i18n('LOW'),
    i18n('VOLUME'),
    i18n('UPDATED'),
  ]);

  const headers = [month, options, chart, last, change, priorSettle, open, high, low, volume, updated];

  const tableData = quotesData.quotes.map((quote) => [
    `${quote.expirationMonth || TABLE_CONSTANTS.placeholders.noData}<br>${quote.quoteCode || ''}`,
    TABLE_CONSTANTS.placeholders.options,
    TABLE_CONSTANTS.placeholders.chart,
    quote.last || TABLE_CONSTANTS.placeholders.noData,
    TABLE_FORMATTERS.change(quote.change, quote.percentageChange),
    quote.priorSettle || TABLE_CONSTANTS.placeholders.noData,
    quote.open || TABLE_CONSTANTS.placeholders.noData,
    quote.high || TABLE_CONSTANTS.placeholders.noData,
    quote.low || TABLE_CONSTANTS.placeholders.noData,
    TABLE_FORMATTERS.volume(quote.volume),
    TABLE_FORMATTERS.simpleTime(quote.updated),
  ]);

  return buildTable(headers, tableData, 'futures-quotes-table');
}

/**
 * Create options quotes table with month selector
 */
async function createOptionsTable() {
  try {
    const productMetadata = await getProductMetadata();
    const baseProductId = productMetadata.productId || getMetadata('product-id');

    if (!baseProductId) return null;

    // IMPORTANT: Two-level selection system:
    // 1. Top dropdown (OPTIONS ▼): Selects option TYPE (optionProductId=301 = American Options)
    // 2. Month selector (in table): Selects specific CONTRACT MONTH (ZCZ5, ZCH6, etc.)
    //
    // For now, we show contract months for the base product (300 = Corn Futures)
    // All option types (American, Calendar Spread, etc.) use the same underlying futures
    //
    // Future enhancement: Filter contract months based on selectedProductId

    const labelsData = await fetchOptionsLabels(baseProductId);
    if (!labelsData || labelsData.length === 0) return null;

    // Use first available quote code (ZCZ5, ZCH6, etc.)
    const defaultQuoteCode = labelsData[0].quoteCode;
    const optionsData = await fetchOptionsData(baseProductId, defaultQuoteCode);

    // eslint-disable-next-line no-underscore-dangle
    const isPlaceholder = optionsData && optionsData._placeholder;

    const [underlyingFuture, chart, last, change, priorSettle, high, low, volume, updated] = await Promise.all([
      i18n('UNDERLYING FUTURE'),
      i18n('CHART'),
      i18n('LAST'),
      i18n('CHANGE'),
      i18n('PRIOR SETTLE'),
      i18n('HIGH'),
      i18n('LOW'),
      i18n('VOLUME'),
      i18n('UPDATED'),
    ]);

    const headers = [underlyingFuture, chart, last, change, priorSettle, high, low, volume, updated];

    // Create dropdown for month selection
    const select = createElement('select', {
      class: 'options-month-selector',
      id: 'options-month-selector',
    });

    // Add data availability indicator
    if (isPlaceholder) {
      select.title = `Data not available for ${defaultQuoteCode} - showing placeholders`;
    }

    labelsData.forEach((item) => {
      const option = createElement('option');
      option.value = item.quoteCode;
      option.textContent = `${item.expirationMonth} ${item.quoteCode}`;
      if (item.quoteCode === defaultQuoteCode) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    // Prepare table data
    let tableData = [];
    if (optionsData && optionsData.quotes && optionsData.quotes.length > 0) {
      const quote = optionsData.quotes[0];
      tableData = [
        [
          select,
          TABLE_CONSTANTS.placeholders.chart,
          quote.last || TABLE_CONSTANTS.placeholders.noData,
          TABLE_FORMATTERS.change(quote.change, quote.percentageChange),
          quote.priorSettle || TABLE_CONSTANTS.placeholders.noData,
          quote.high || TABLE_CONSTANTS.placeholders.noData,
          quote.low || TABLE_CONSTANTS.placeholders.noData,
          TABLE_FORMATTERS.volume(quote.volume),
          TABLE_FORMATTERS.simpleTime(quote.updated),
        ],
      ];
    } else {
      // Fallback data
      const fallbackCells = [select];
      for (let i = 1; i < headers.length; i += 1) {
        fallbackCells.push(TABLE_CONSTANTS.placeholders.noData);
      }
      tableData = [fallbackCells];
    }

    return buildTable(headers, tableData, 'options-quotes-table');
  } catch (error) {
    return null;
  }
}

/**
 * Update options table when month is selected
 */
async function updateOptionsTable(productId, quoteCode) {
  try {
    const newData = await fetchOptionsData(productId, quoteCode);
    if (!newData || !newData.quotes || newData.quotes.length === 0) return;

    const quote = newData.quotes[0];
    const table = document.getElementById('options-quotes-table');
    if (!table) return;

    const tableElement = table.querySelector('table');
    const dataRow = tableElement ? tableElement.querySelector('tbody tr') : null;
    if (!dataRow) return;

    const cells = dataRow.querySelectorAll('td');
    if (cells.length >= 9) {
      cells[2].innerHTML = quote.last || '--';
      cells[3].innerHTML = TABLE_FORMATTERS.change(quote.change, quote.percentageChange);
      cells[4].innerHTML = quote.priorSettle || '--';
      cells[5].innerHTML = quote.high || '--';
      cells[6].innerHTML = quote.low || '--';
      cells[7].innerHTML = TABLE_FORMATTERS.volume(quote.volume);
      cells[8].innerHTML = TABLE_FORMATTERS.simpleTime(quote.updated);
    }
  } catch (error) {
    // Silent fail
  }
}

/**
 * Setup month selector change handler
 */
function setupMonthSelectorHandler(block, productId) {
  const select = block.querySelector('#options-month-selector');
  if (!select) return;

  select.addEventListener('change', async (e) => {
    const quoteCode = e.target.value;
    await updateOptionsTable(productId, quoteCode);
  });
}

/**
 * Render the appropriate table based on URL
 *
 * STORE PATTERN FLOW:
 * 1. Check productStore cache (populated by product.js during idle time)
 * 2. If cache hit -> instant render (0ms data fetch)
 * 3. If cache miss -> fetch from API and dispatch to store
 * 4. Subsequent renders use cached data from store
 * 5. Real-time updates: dispatch new data to store, subscribed components auto-update
 */
async function renderTable(block) {
  const { isOptions, optionProductId } = getDisplayMode();
  block.innerHTML = '<div class="loading">Loading quotes...</div>';

  // Get productId for API calls
  const productMetadata = await getProductMetadata();
  const productId = productMetadata.productId || getMetadata('product-id');

  if (!productId) {
    block.innerHTML = `
      <div class="no-results">
        <h4>Unable to load quotes</h4>
        <p>Product ID not found.</p>
      </div>
    `;
    return;
  }

  try {
    let table = null;

    if (isOptions) {
      // Options mode - use optionProductId from URL if available
      table = await createOptionsTable(optionProductId);

      if (table) {
        block.innerHTML = '';

        // Add option type header if optionProductId is specified
        if (optionProductId) {
          const header = createElement('div', { class: 'options-type-header' });
          header.innerHTML = `<p class="options-type-note">Showing options data (Product ID: ${optionProductId})</p>`;
          block.appendChild(header);
        }

        block.appendChild(table);
        setupMonthSelectorHandler(block, productId);

        // Add "About this Report" link
        const aboutLink = createElement('p', { class: 'about-report-wrapper' });
        aboutLink.innerHTML = '<a href="#" class="about-report-link">About this Report</a>';
        block.appendChild(aboutLink);
      } else {
        block.innerHTML = `
          <div class="no-results">
            <h4>Unable to load options quotes</h4>
            <p>Options data is currently unavailable.</p>
          </div>
        `;
      }
    } else {
      // Futures mode
      table = await createFuturesTable();

      if (table) {
        block.innerHTML = '';
        block.appendChild(table);

        // Add "About this Report" link
        const aboutLink = createElement('p', { class: 'about-report-wrapper' });
        aboutLink.innerHTML = '<a href="#" class="about-report-link">About this Report</a>';
        block.appendChild(aboutLink);
      } else {
        block.innerHTML = `
          <div class="no-results">
            <h4>Unable to load futures quotes</h4>
            <p>Quotes data is currently unavailable.</p>
          </div>
        `;
      }
    }
  } catch (error) {
    block.innerHTML = `
      <div class="no-results">
        <h4>Error loading quotes data</h4>
        <p>${error.message}</p>
      </div>
    `;
  }
}

/**
 * Handle "About this Report" modal
 */
function handleAboutReportModal(block) {
  block.addEventListener('click', async (e) => {
    if (e.target.classList.contains('about-report-link')) {
      e.preventDefault();
      try {
        const { openModal } = await import('../modal/modal.js');
        const fragmentUrl = '/drafts/kunwar/corn/fragments/product/about-quotes';
        await openModal(fragmentUrl);
      } catch (error) {
        // Silent fail
      }
    }
  });
}

/**
 * Setup real-time data subscription (for future CME pricing updates)
 *
 * USAGE FOR REAL-TIME UPDATES:
 * 1. Call this function to setup subscription
 * 2. When pricing data updates (every few minutes), dispatch to store:
 *    productStore.dispatch(updateProductField('quotesData.table', newPricingData))
 * 3. Subscribed blocks automatically re-render with new data
 *
 * This is the key advantage of the store pattern for real-time data!
 */
function setupRealtimeSubscription(block) {
  // Subscribe to quotes data changes in store
  const unsubscribe = productStore.subscribe(
    (state) => state.productData?.quotesData?.table,
    (quotesData) => {
      if (quotesData) {
        // eslint-disable-next-line no-console
        console.log('[quotes-table-store] 🔄 Quotes data updated in store, re-rendering...');

        // Re-render table with new data
        renderTable(block);
      }
    },
  );

  // Return unsubscribe function for cleanup
  return unsubscribe;
}

/**
 * Main block decorator
 * This is called when block is first loaded AND when page content is swapped via SPA
 *
 * STORE PATTERN INTEGRATION:
 * This block uses productStore from product.js for centralized state management.
 *
 * Benefits over direct window.productData:
 * - ✅ Immutable state updates (no accidental mutations)
 * - ✅ Observable changes (auto re-render on data updates)
 * - ✅ Centralized state (single source of truth)
 * - ✅ Perfect for real-time updates (dispatch new data, all subscribers update)
 * - ✅ Better debugging (track all state changes)
 *
 * Real-time Updates Example:
 * ```javascript
 * // Every 5 minutes, fetch new pricing data
 * setInterval(async () => {
 *   const newData = await fetchLatestPricing();
 *   productStore.dispatch(updateProductField('quotesData.table', newData));
 *   // All subscribed components automatically re-render!
 * }, 5 * 60 * 1000);
 * ```
 *
 * Debug:
 * - window.getQuotesTableMetrics() -> View cache hit/miss statistics
 * - window.inspectProductStore() -> View current store state (from product.js)
 * - productStore.getState().productData.quotesData -> View quotes data in store
 */
export default async function decorate(block) {
  // Add 'table' class to inherit table.css styles
  block.classList.add('table');

  // Add 'fixed-row-header' for sticky header (can be removed via author if not needed)
  if (!block.classList.contains('no-fixed-header')) {
    block.classList.add('fixed-row-header');
  }

  await renderTable(block);
  handleAboutReportModal(block);

  // Setup real-time subscription (for CME pricing updates)
  // Enable auto re-rendering when store data updates
  const unsubscribe = setupRealtimeSubscription(block);

  // Store unsubscribe function for cleanup (if needed)
  block.dataset.unsubscribe = unsubscribe;
}

// ==================== STORE PATTERN INTEGRATION NOTES ====================
//
// This block demonstrates the Store/Actions/Reducers pattern for state management
//
// Data Flow:
// 1. product.js prefetches data -> stores in productStore via dispatch()
// 2. quotes-table reads from productStore.getState()
// 3. On cache miss -> fetches from API and dispatch() to store
// 4. Real-time updates -> dispatch() new data, subscribers auto-update
//
// Key Differences from Baseline (window.productData):
// - READ:   productStore.getState().productData instead of window.productData
// - WRITE:  productStore.dispatch(updateProductField(...)) instead of window.productData.x = y
// - WATCH:  productStore.subscribe() for reactive updates
//
// Real-time Update Flow (for CME pricing use case):
// 1. Background job fetches new pricing every N minutes
// 2. Dispatch to store: productStore.dispatch(updateProductField('quotesData.table', newData))
// 3. All subscribed blocks automatically detect change and re-render
// 4. No manual cache invalidation needed!
//
// Performance Impact:
// - Same as baseline for initial render
// - Better for real-time updates (no manual re-rendering needed)
// - Observable pattern enables sophisticated update strategies
//
// ==================== END OF STORE PATTERN INTEGRATION NOTES ====================

/* eslint-disable max-len */
/**
 * Quotes Table Block
 * Displays futures or options quotes based on URL
 * Adapted from v1 tabs/quotes.js for v3 URL-based architecture
 */

import { getMetadata } from '../../scripts/aem.js';
import { getProductMetadata } from '../../scripts/utils/product.js';
import { apiGet, getResponseData } from '../../scripts/utils/index.js';
import { createElement } from '../../scripts/utils.js';

// API Configuration
const API_CONFIG = {
  quotesTableEndpoint: '/aemedge/blocks/dynamic/product-tabs/mock-api/quotes/quotes-table.json',
  optionsLabelsEndpoint: '/aemedge/blocks/dynamic/product-tabs/mock-api/quotes/quotes-v2-getlabels.json',
  optionsDataEndpoint: '/aemedge/blocks/dynamic/product-tabs/mock-api/quotes/quotes-v2-300-',
  productOptionsEndpoint: 'https://www.cmegroup.com/CmeWS/md/Product/V2/FullProductWithOptions/ProductId/',
  localProductFallback: '/aemedge/templates/product/',
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
 */
async function fetchQuotesTableData() {
  try {
    const response = await apiGet(API_CONFIG.quotesTableEndpoint);
    return getResponseData(response) || response.data;
  } catch (error) {
    return null;
  }
}

/**
 * Fetch options labels for a specific product
 */
async function fetchOptionsLabels(productId) {
  try {
    // Try real API first
    const endpoint = `${API_CONFIG.productOptionsEndpoint}${productId}`;
    const response = await apiGet(endpoint, {}, {}, { withCredentials: false });
    const data = getResponseData(response) || response.data;
    
    if (data && data.optionsLabels && Array.isArray(data.optionsLabels)) {
      const firstOption = data.optionsLabels[0];
      if (firstOption && firstOption.contractExpirations) {
        return firstOption.contractExpirations.map((contract) => ({
          expirationMonth: contract.label,
          quoteCode: contract.underlyingFutureContract,
          expirationCode: contract.underlyingFutureExpirationCode,
        }));
      }
    }
  } catch (error) {
    // Try mock fallback
  }

  // Fallback to simple mock data (contract expirations for options)
  try {
    const mockEndpoint = API_CONFIG.optionsLabelsEndpoint;
    const response = await fetch(mockEndpoint);
    if (!response.ok) throw new Error('Mock file not found');
    
    const data = await response.json();
    
    // Mock data is already in the format we need
    if (Array.isArray(data)) {
      return data.map((item) => ({
        expirationMonth: item.expirationMonth,
        quoteCode: item.quoteCode,
        expirationCode: item.expirationCode,
      }));
    }
  } catch (fallbackError) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch options labels:', fallbackError);
  }

  return null;
}

/**
 * Fetch options data for a specific quote code
 */
async function fetchOptionsData(quoteCode) {
  const url = `${API_CONFIG.optionsDataEndpoint}${quoteCode}.json`;
  
  try {
    const response = await apiGet(url);
    const data = getResponseData(response) || response.data;
    return data;
  } catch (error) {
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
  const quotesData = await fetchQuotesTableData();
  
  if (!quotesData || !quotesData.quotes || quotesData.quotes.length === 0) {
    return null;
  }
  
  const headers = [
    'MONTH',
    'OPTIONS',
    'CHART',
    'LAST',
    'CHANGE',
    'PRIOR SETTLE',
    'OPEN',
    'HIGH',
    'LOW',
    'VOLUME',
    'UPDATED',
  ];
  
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
async function createOptionsTable(selectedProductId = null) {
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
    const optionsData = await fetchOptionsData(defaultQuoteCode);
    
    const isPlaceholder = optionsData && optionsData._placeholder;
    
    const headers = [
      'UNDERLYING FUTURE',
      'CHART',
      'LAST',
      'CHANGE',
      'PRIOR SETTLE',
      'HIGH',
      'LOW',
      'VOLUME',
      'UPDATED',
    ];
    
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
async function updateOptionsTable(quoteCode) {
  try {
    const newData = await fetchOptionsData(quoteCode);
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
function setupMonthSelectorHandler(block) {
  const select = block.querySelector('#options-month-selector');
  if (!select) return;
  
  select.addEventListener('change', async (e) => {
    const quoteCode = e.target.value;
    await updateOptionsTable(quoteCode);
  });
}

/**
 * Render the appropriate table based on URL
 */
async function renderTable(block) {
  const { isOptions, optionProductId } = getDisplayMode();
  block.innerHTML = '<div class="loading">Loading quotes...</div>';
  
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
        setupMonthSelectorHandler(block);
        
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
 * Listen for contract selection from dropdown (SPA navigation)
 * When URL changes via SPA, the block will re-render
 */
function listenForContractChanges(block) {
  // Listen for SPA navigation completing
  const observer = new MutationObserver(() => {
    const { isOptions, contract } = getDisplayMode();
    const currentTableId = isOptions ? 'options-quotes-table' : 'futures-quotes-table';
    const existingTable = block.querySelector(`#${currentTableId}`);
    
    // If URL changed but table doesn't match, re-render
    if (!existingTable) {
      renderTable(block);
    }
  });
  
  // Observe URL changes (SPA navigation updates document)
  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Main block decorator
 * This is called when block is first loaded AND when page content is swapped via SPA
 */
export default async function decorate(block) {
  await renderTable(block);
  handleAboutReportModal(block);
}


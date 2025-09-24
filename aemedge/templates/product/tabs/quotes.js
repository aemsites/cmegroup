import {
  createTabSection,
  fetchJsonData,
  createModalLink,
  createTabFragment,
  organizeToggleContent,
  buildTable,
  MODAL_CONSTANTS,
  TOGGLE_CONSTANTS,
  TABLE_CONSTANTS,
  TABLE_FORMATTERS,
} from './utils.js';
import {
  buildBlock,
  decorateBlock,
  loadBlock,
  getMetadata,
} from '../../../scripts/aem.js';

// API Configuration - easy to switch between mock and real API
const API_CONFIG = {
  // For development: use mock data
  quotesReportsEndpoint: '/aemedge/templates/product/mock-api/quotes/market-recap.json',
  quotesTableEndpoint: '/aemedge/templates/product/mock-api/quotes/quotes-table.json',
  cvolEndpoint: '/aemedge/templates/product/mock-api/quotes/cvol.json',
  // Options table APIs
  optionsLabelsEndpoint: '/aemedge/templates/product/mock-api/quotes/quotes-v2-getlabels.json',
  optionsDataEndpoint: '/aemedge/templates/product/mock-api/quotes/quotes-v2-300-',
};

// Fragment URLs for modals - used in centralized modal initialization
const FRAGMENT_URLS = {
  aboutReport: '/drafts/kunwar/corn/fragments/product/about-quotes',
};

// Toggle configuration - set to true to enable Futures/Options toggle for this tab
export const HAS_FUTURES_OPTIONS_TOGGLE = true;

// Constants for table placeholders and classes
// Table-specific constants (using TABLE_CONSTANTS from utils.js for general ones)
const QUOTES_TABLE_CONSTANTS = {
  tableId: {
    quotes: 'quotes-table',
    options: 'options-table-quotes',
  },
};

// Constants for cards block variants
const CARDS_VARIANTS = {
  marketRecap: 'market-recap',
  cvol: 'cvol',
};

/**
 * Fetch quotes/market reports data
 * @returns {Promise<Array|null>} Array of market reports or null if fetch fails
 */
async function fetchQuotesData() {
  return fetchJsonData(API_CONFIG.quotesReportsEndpoint);
}

/**
 * Fetch quotes table data
 * @returns {Promise<Object|null>} Quotes data object or null if fetch fails
 */
async function fetchQuotesTableData() {
  return fetchJsonData(API_CONFIG.quotesTableEndpoint);
}

/**
 * Fetch CVOL data
 * @returns {Promise<Object|null>} CVOL data object or null if fetch fails
 */
async function fetchCvolData() {
  return fetchJsonData(API_CONFIG.cvolEndpoint);
}

/**
 * Fetch options labels for dropdown
 * @returns {Promise<Array|null>} Array of option labels or null if fetch fails
 */
async function fetchOptionsLabels() {
  return fetchJsonData(API_CONFIG.optionsLabelsEndpoint);
}

/**
 * Fetch options data for specific quote code
 * @param {string} quoteCode - The quote code (e.g., 'ZCZ5')
 * @returns {Promise<Array|null>} Array of options data or null if fetch fails
 */
async function fetchOptionsData(quoteCode) {
  const url = `${API_CONFIG.optionsDataEndpoint}${quoteCode}.json`;
  return fetchJsonData(url);
}

/**
 * Creates a quotes table block from JSON data
 * @param {Object} quotesData - The quotes data object from API
 * @returns {Element|null} Table block or null if creation fails
 */
async function createQuotesTable(quotesData = null) {
  try {
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
      quote.expirationMonth || TABLE_CONSTANTS.placeholders.noData,
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

    const tableBlock = await buildTable(headers, tableData, {
      variant: TABLE_CONSTANTS.variants.fixedRowHeader,
      tableId: QUOTES_TABLE_CONSTANTS.tableId.quotes,
      autoDecorate: true,
    });

    return tableBlock;
  } catch (error) {
    return null;
  }
}

/**
 * Creates a cards block with proper error handling
 * @returns {Element|null} Cards block or null if creation fails
 */
async function createMarketRecapCards(reportsData = null) {
  try {
    let cardsContent;

    if (reportsData && reportsData.length > 0) {
      // Get product options symbol from metadata (e.g., "OZC")
      const commodityCode = getMetadata('product-options-symbol') || '';

      // Find the latest matching report by commodity code
      let matchingReport = null;
      if (commodityCode) {
        // Filter reports by commodity code and find the latest by date
        const matchingReports = reportsData.filter((report) => report.reportCommodity
          && report.reportCommodity.toUpperCase() === commodityCode.toUpperCase());

        if (matchingReports.length > 0) {
          // Sort by date (newest first) and take the first one
          const sortedReports = matchingReports.sort((a, b) => {
            const dateA = new Date(a.reportDate);
            const dateB = new Date(b.reportDate);
            return dateB - dateA; // Descending order (newest first)
          });
          [matchingReport] = sortedReports;
        }
      }

      // Only proceed if we have a matching report
      if (!matchingReport) {
        return null;
      }

      const commodityName = getMetadata('product') || matchingReport.reportCommodity;

      // Format date
      const date = new Date(matchingReport.reportDate);
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      cardsContent = [
        [
          `<h3>${commodityName} Market Update</h3>`,
          `<p class="date">${formattedDate}</p>`,
          matchingReport.reportContent,
        ],
      ];
    } else {
      // No API data available
      return null;
    }

    const cardsBlock = buildBlock('cards', cardsContent);
    if (!cardsBlock) {
      return null;
    }

    // Add variant class
    cardsBlock.classList.add(CARDS_VARIANTS.marketRecap);

    return cardsBlock;
  } catch (error) {
    // Cards block creation failed - return null silently
    return null;
  }
}

/**
 * Creates a CVOL cards block with proper error handling
 * @param {Array} cvolDataArray - The CVOL data array from API
 * @returns {Element|null} Cards block or null if creation fails
 */
async function createCvolCards(cvolDataArray = null) {
  try {
    if (!cvolDataArray || !Array.isArray(cvolDataArray) || cvolDataArray.length === 0) {
      return null;
    }

    // Get the first (and likely only) object from the array
    const cvolData = cvolDataArray[0];

    const productName = getMetadata('product') || 'Product';

    // CVOL description text
    const cvolDescription = 'Track forward-looking risk expectations on Corn with the CME Group Volatility Index (CVOL™), a robust measure of 30-day implied volatility derived from deeply liquid options on Corn futures.';

    // Format the last updated time
    let formattedLastUpdated = 'N/A';
    if (cvolData.transactTime) {
      const lastUpdated = new Date(cvolData.transactTime);
      formattedLastUpdated = `${lastUpdated.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })} ${lastUpdated.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })}`;
    }

    // Format the data display
    const cvolDisplay = `
      <div class="cvol-data">
        <div class="cvol-metrics">
          <div class="metric">
            <span class="label">CODE:</span>
            <span class="value">${cvolData.symbol || 'CVL'}</span>
          </div>
          <div class="metric">
            <span class="label">CVOL:</span>
            <span class="value">${cvolData.cvolPrice || 'N/A'}</span>
          </div>
          <div class="metric">
            <span class="label">CHANGE:</span>
            <span class="value ${cvolData.cvolPriceChange && parseFloat(cvolData.cvolPriceChange) < 0 ? 'negative' : ''}">${cvolData.cvolPriceChange || 'N/A'}</span>
          </div>
        </div>
        <div class="last-updated">
          <span class="label">Last Updated:</span>
          <span class="value">${formattedLastUpdated}</span>
        </div>
      </div>
    `;

    const cardsContent = [
      [
        `<h3>${productName} CVOL Index</h3>`,
        `<p>${cvolDescription}</p>`,
        cvolDisplay,
      ],
    ];

    const cardsBlock = buildBlock('cards', cardsContent);
    if (!cardsBlock) {
      return null;
    }

    // Add CVOL variant class
    cardsBlock.classList.add(CARDS_VARIANTS.cvol);

    return cardsBlock;
  } catch (error) {
    // Cards block creation failed - return null silently
    return null;
  }
}

/**
 * Create shared content blocks (market recap, cvol, fragment)
 * @returns {Object} Object containing shared blocks
 */
async function createSharedContent() {
  // Fetch shared data
  const reportsData = await fetchQuotesData();
  const cvolData = await fetchCvolData();
  const fragmentBlock = await createTabFragment();

  // Create market recap cards
  const cardsBlock = await createMarketRecapCards(reportsData);
  if (cardsBlock) {
    try {
      decorateBlock(cardsBlock);
      await loadBlock(cardsBlock);
    } catch (error) {
      // Cards decoration failed - continue without cards block
    }
  }

  // Create CVOL cards
  const cvolCards = await createCvolCards(cvolData);
  if (cvolCards) {
    try {
      decorateBlock(cvolCards);
      await loadBlock(cvolCards);
    } catch (error) {
      // CVOL cards decoration failed - continue without CVOL cards block
    }
  }

  // Create QuikStrike attribution content
  const quikStrikeAttribution = '<p>Recap provided by QuikStrike, access further market information <a href="https://www.cmegroup.com/tools-information/quikstrike.html">here</a>.</p>';

  return {
    cardsBlock,
    quikStrikeAttribution,
    cvolCards,
    fragmentBlock,
  };
}

/**
 * Create futures-specific middle content
 * @returns {Array} Array of blocks for futures middle content
 */
async function createFuturesMiddleContent() {
  // Fetch quotes table data
  const quotesTableData = await fetchQuotesTableData();

  // Create quotes table
  const quotesTable = await createQuotesTable(quotesTableData);
  if (quotesTable) {
    try {
      decorateBlock(quotesTable);
      await loadBlock(quotesTable);
    } catch (error) {
      // Table decoration failed - continue without table
    }
  }

  // Create About this Report link
  const aboutReportLink = createModalLink(
    'About this Report',
    MODAL_CONSTANTS.linkClasses.aboutReport,
    FRAGMENT_URLS.aboutReport,
    MODAL_CONSTANTS.linkClasses.modalClass,
  );

  const middleBlocks = [];
  if (quotesTable) {
    middleBlocks.push(quotesTable);
    middleBlocks.push(aboutReportLink);
  }

  return middleBlocks;
}

/**
 * Create options table with dropdown functionality (same pattern as quotes table)
 * @returns {Promise<Element|null>} Options table block or null if creation fails
 */
async function createOptionsTable() {
  try {
    const labelsData = await fetchOptionsLabels();
    if (!labelsData || labelsData.length === 0) {
      return null;
    }

    const defaultQuoteCode = labelsData[0].quoteCode;
    const defaultData = await fetchOptionsData(defaultQuoteCode);

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

    // Create table block manually (simple approach)
    const tableBlock = document.createElement('div');
    tableBlock.classList.add('table', TABLE_CONSTANTS.variants.fixedRowHeader);
    tableBlock.dataset.blockName = 'table';
    tableBlock.id = QUOTES_TABLE_CONSTANTS.tableId.options;

    const table = document.createElement('table');
    const tbody = document.createElement('tbody');

    // Add header row
    const headerRow = document.createElement('tr');
    headers.forEach((header) => {
      const td = document.createElement('td');
      td.innerHTML = header;
      headerRow.appendChild(td);
    });
    tbody.appendChild(headerRow);

    // Add data row
    const dataRow = document.createElement('tr');

    // First cell with simple select dropdown
    const dropdownCell = document.createElement('td');
    const select = document.createElement('select');
    select.className = 'options-dropdown';
    select.id = 'options-dropdown-select';

    labelsData.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.quoteCode;
      option.textContent = item.expirationMonth;
      if (item.quoteCode === defaultQuoteCode) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    // Use event delegation for dropdown changes
    document.addEventListener('change', async (e) => {
      if (e.target.id === 'options-dropdown-select') {
        await updateOptionsTableData(e.target.value);
      }
    });

    dropdownCell.appendChild(select);
    dataRow.appendChild(dropdownCell);

    // Remaining cells with data
    if (defaultData && defaultData.quotes && defaultData.quotes.length > 0) {
      const quote = defaultData.quotes[0];
      const dataCells = [
        TABLE_CONSTANTS.placeholders.chart,
        quote.last || TABLE_CONSTANTS.placeholders.noData,
        TABLE_FORMATTERS.change(quote.change, quote.percentageChange),
        quote.priorSettle || TABLE_CONSTANTS.placeholders.noData,
        quote.high || TABLE_CONSTANTS.placeholders.noData,
        quote.low || TABLE_CONSTANTS.placeholders.noData,
        TABLE_FORMATTERS.volume(quote.volume),
        TABLE_FORMATTERS.timestamp(quote.updated),
      ];

      dataCells.forEach((cellData) => {
        const cell = document.createElement('td');
        cell.innerHTML = cellData;
        dataRow.appendChild(cell);
      });
    } else {
      for (let i = 1; i < headers.length; i += 1) {
        const cell = document.createElement('td');
        cell.innerHTML = TABLE_CONSTANTS.placeholders.noData;
        dataRow.appendChild(cell);
      }
    }

    tbody.appendChild(dataRow);
    table.appendChild(tbody);
    tableBlock.appendChild(table);

    // Decorate and load
    try {
      decorateBlock(tableBlock);
      await loadBlock(tableBlock);
    } catch (error) {
      // Continue if decoration fails
    }

    return tableBlock;
  } catch (error) {
    return null;
  }
}

/**
 * Create options-specific middle content
 * @returns {Promise<Array>} Array of blocks for options middle content
 */
async function createOptionsMiddleContent() {
  // Create the dynamic options table
  const optionsTable = await createOptionsTable();

  // Decorate and load the table block (same as quotes table)
  if (optionsTable) {
    try {
      decorateBlock(optionsTable);
      await loadBlock(optionsTable);
    } catch (error) {
      // Table decoration failed - continue without table
    }
  }

  const middleBlocks = [];
  if (optionsTable) {
    middleBlocks.push(optionsTable);
  } else {
    // Fallback if table creation fails
    const fallbackContent = `
      <div class="options-placeholder" id="options-content-quotes">
        <h3>Options Data</h3>
        <p>Loading options data...</p>
      </div>
    `;
    middleBlocks.push(fallbackContent);
  }

  return middleBlocks;
}

/**
 * Create futures-specific content for quotes tab
 * @returns {Array} Array of blocks for futures content
 */
async function createFuturesContent() {
  // Get shared content
  const {
    cardsBlock, quikStrikeAttribution, cvolCards, fragmentBlock,
  } = await createSharedContent();

  // Get futures-specific middle content
  const futuresMiddleContent = await createFuturesMiddleContent();

  // Create dynamic title using product metadata (will be updated by toggle)
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Futures - Quotes</h2>`;

  // Assemble blocks in order
  const blocks = [];
  blocks.push(titleContent);

  if (cardsBlock) {
    blocks.push(cardsBlock);
    blocks.push(quikStrikeAttribution);
  }

  // Add futures-specific middle content
  blocks.push(...futuresMiddleContent);

  if (cvolCards) {
    blocks.push(cvolCards);
  }

  if (fragmentBlock) {
    blocks.push(fragmentBlock);
  }

  return blocks;
}

/**
 * Create options-specific content for quotes tab
 * @returns {Array} Array of blocks for options content
 */
async function createOptionsContent() {
  // Get shared content (same as futures)
  const {
    cardsBlock, quikStrikeAttribution, cvolCards, fragmentBlock,
  } = await createSharedContent();

  // Get options-specific middle content
  const optionsMiddleContent = await createOptionsMiddleContent();

  // Create dynamic title using product metadata (will be updated by toggle)
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Options - Quotes</h2>`;

  // Assemble blocks in same order as futures
  const blocks = [];
  blocks.push(titleContent);

  if (cardsBlock) {
    blocks.push(cardsBlock);
    blocks.push(quikStrikeAttribution);
  }

  // Add options-specific middle content
  blocks.push(...optionsMiddleContent);

  if (cvolCards) {
    blocks.push(cvolCards);
  }

  if (fragmentBlock) {
    blocks.push(fragmentBlock);
  }

  return blocks;
}

/**
 * Update options table data based on selected quote code
 * @param {string} quoteCode - The selected quote code
 */
async function updateOptionsTableData(quoteCode) {
  try {
    const newData = await fetchOptionsData(quoteCode);

    if (!newData || !newData.quotes || newData.quotes.length === 0) {
      return;
    }

    const quote = newData.quotes[0];
    const table = document.getElementById('options-table-quotes');
    if (!table) {
      return;
    }

    const rows = table.querySelectorAll('tbody tr');
    const dataRow = rows.length === 1 ? rows[0] : rows[1];
    if (!dataRow) {
      return;
    }

    const cells = dataRow.querySelectorAll('td');
    if (cells.length >= 9) {
      cells[2].innerHTML = quote.last || '-';
      cells[3].innerHTML = `${quote.change || '-'} (${quote.percentageChange || '-'})`;
      cells[4].innerHTML = quote.priorSettle || '-';
      cells[5].innerHTML = quote.high || '-';
      cells[6].innerHTML = quote.low || '-';
      cells[7].innerHTML = parseInt(quote.volume || '0', 10).toLocaleString();
      cells[8].innerHTML = TABLE_FORMATTERS.timestamp(quote.updated);
    }
  } catch (error) {
    // Silent error handling
  }
}

/**
 * Handle option selection specific to quotes tab
 * Updates the middle content based on the selected product while keeping shared content
 */
function handleQuotesOptionSelection() {
  document.addEventListener('optionSelected', (event) => {
    const { tabId, productId, label } = event.detail;

    // Only handle this event if it's for the quotes tab
    if (tabId !== 'quotes') {
      return;
    }

    // Update the middle content area (between market recap and CVOL cards)
    const optionsContent = document.getElementById('options-content-quotes');
    if (optionsContent) {
      optionsContent.innerHTML = `
        <h3>${label}</h3>
        <p>Product ID: ${productId}</p>
        <div class="options-data-container">
          <p>Loading ${label} data...</p>
          <div class="loading-indicator">
            <p>Options chain and pricing data for <strong>${label}</strong> will be displayed here.</p>
            <p>This section will dynamically load:</p>
            <ul>
              <li>Strike prices and expiration dates</li>
              <li>Current bid/ask prices</li>
              <li>Volume and open interest</li>
              <li>Implied volatility data</li>
            </ul>
            <p><em>Note: Market recap cards and CVOL data remain consistent across all option types.</em></p>
          </div>
        </div>
      `;
    }

    // Future enhancement: Fetch specific option data based on productId
    // This is where you would call an API endpoint like:
    // fetchOptionData(productId).then(data => updateOptionsDisplay(data));
  });
}

/**
 * Create quotes-specific blocks and content with toggle support
 *
 * Template Structure (consistent for both Futures and Options):
 * 1. Dynamic Title (changes based on toggle selection)
 * 2. Market Recap Cards (shared - same for both)
 * 3. QuikStrike Attribution (shared - same for both)
 * 4. Middle Content (dynamic):
 *    - Futures: Quotes Table + About Report Link
 *    - Options: Dynamic content based on dropdown selection
 * 5. CVOL Cards (shared - same for both)
 * 6. Fragment (shared - same for both)
 *
 * @returns {Array} Array of blocks to include in the quotes tab
 */
async function createQuotesContent() {
  // Create both futures and options content with shared template structure
  const futuresBlocks = await createFuturesContent();
  const optionsBlocks = await createOptionsContent();

  // Create a container for toggle content
  const toggleContentContainer = organizeToggleContent({
    futuresBlocks,
    optionsBlocks,
    defaultActive: TOGGLE_CONSTANTS.toggleTypes.futures,
    tabId: 'quotes',
  });

  return toggleContentContainer;
}

/**
 * Builds the Quotes tab content
 * @returns {Element} Section element for quotes tab
 */
export default async function buildQuotesTab() {
  // Initialize option selection handler for this tab
  handleQuotesOptionSelection();

  const blocks = await createQuotesContent();
  return createTabSection('quotes', 'Quotes', blocks);
}

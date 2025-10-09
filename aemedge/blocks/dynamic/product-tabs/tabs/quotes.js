/* eslint-disable max-len */
/* eslint-disable import/no-cycle */
import { buildBlock, getMetadata } from '../../../../scripts/aem.js';

import {
  createTabSection,
  fetchJsonData,
  createModalLink,
  createTabFragment,
  organizeToggleContent,
  buildTable,
  createBlockWithErrorHandling,
} from './utils.js';

import {
  API_CONFIG,
  FRAGMENT_URLS,
  MODAL_CONSTANTS,
  TOGGLE_CONSTANTS,
  TABLE_CONSTANTS,
  TABLE_FORMATTERS,
  CARDS_VARIANTS,
  QUOTES_TABLE_CONSTANTS,
} from '../constants.js';

// Toggle configuration - set to true to enable Futures/Options toggle for this tab
export const HAS_FUTURES_OPTIONS_TOGGLE = true;

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
 * Fetch options labels for dropdown from expirations data
 * @param {number} optionsProductId - The selected options product ID from dropdown
 * @returns {Promise<Array|null>} Array of option labels or null if fetch fails
 */
async function fetchOptionsLabels(optionsProductId) {
  // Get product ID from metadata
  const productId = getMetadata('product-id');
  if (!productId) {
    return null;
  }

  // Using mock data for now (real API has CORS issues)
  const expirationsData = await fetchJsonData(API_CONFIG.expirations);

  if (!expirationsData || expirationsData.length === 0) {
    return null;
  }

  // Find the selected option by optionsProductId and extract its contractExpirations
  const selectedOption = expirationsData.find((option) => option.productId === optionsProductId);
  if (!selectedOption || !selectedOption.contractExpirations) {
    return null;
  }

  // Transform contractExpirations to match the expected format
  return selectedOption.contractExpirations.map((contract) => ({
    expirationMonth: contract.label,
    quoteCode: contract.underlyingFutureContract,
    expirationCode: contract.underlyingFutureExpirationCode,
    selected: false,
  }));
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

    const tableBlock = await buildTable(headers, tableData, {
      variant: TABLE_CONSTANTS.variants.fixedRowHeader,
      tableId: QUOTES_TABLE_CONSTANTS.tableId.quotes,
      autoDecorate: true, // This will auto-decorate following project pattern
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
    if (!reportsData || reportsData.length === 0) {
      return null;
    }

    // Get product symbol from metadata and prepend O to create commodity name
    const productSymbol = getMetadata('product-symbol');
    const commodityName = `O${productSymbol}`;

    // Find matching report (case-insensitive, latest entry)
    const matchingReport = reportsData.find((report) => report.reportCommodity?.toLowerCase() === commodityName.toLowerCase());

    if (!matchingReport) {
      return null;
    }

    const productName = getMetadata('product');
    const reportDate = new Date(matchingReport.reportDate);
    const formattedDate = reportDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const cardsContent = [
      [
        `<h3>${productName} Market Update</h3>
         <p class="date">${formattedDate}</p>
         ${matchingReport.reportContent}`,
      ],
    ];

    const cardsBlock = buildBlock('cards', cardsContent);
    cardsBlock.classList.add(CARDS_VARIANTS.marketRecap, 'api-backed');
    cardsBlock.dataset.blockName = 'cards';

    return cardsBlock;
  } catch (error) {
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

    // Get the first object from the array
    const cvolData = cvolDataArray[0];
    const productName = getMetadata('product') || 'Product';

    const cvolDisplay = `
      <div class="cvol-data">
        <div class="cvol-value">${cvolData.cvolPrice || 'N/A'}</div>
        <div class="cvol-change ${parseFloat(cvolData.cvolPriceChange || 0) >= 0 ? 'positive' : 'negative'}">
          ${cvolData.cvolPriceChange || 'N/A'} (${cvolData.cvolPricePercentChange || 'N/A'})
        </div>
      </div>
    `;

    const cvolDescription = cvolData.description || 'Corn Volatility Index measures the market\'s expectation of 30-day volatility.';

    const cardsContent = [
      [
        `<h3>${productName} CVOL Index</h3>
         <p>${cvolDescription}</p>
         ${cvolDisplay}`,
      ],
    ];

    const cardsBlock = buildBlock('cards', cardsContent);
    cardsBlock.classList.add(CARDS_VARIANTS.cvol, 'api-backed');
    cardsBlock.dataset.blockName = 'cards';

    return cardsBlock;
  } catch (error) {
    return null;
  }
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
  // Note: decoration/loading moved to after DOM insertion

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
  } else {
    // Show error message if table creation fails
    middleBlocks.push('<div class="no-results"><h4>Unable to load quotes table</h4></div>');
  }

  return middleBlocks;
}

/**
 * Create options table with dropdown functionality (same pattern as quotes table)
 * @param {number} optionsProductId - The selected options product ID from dropdown
 * @returns {Promise<Element|null>} Options table block or null if creation fails
 */
async function createOptionsTable(optionsProductId) {
  try {
    // If no optionsProductId provided, get the first available option from expirations API
    let productId = optionsProductId;
    if (!productId) {
      const expirationsData = await fetchJsonData(API_CONFIG.expirations);
      if (expirationsData && expirationsData.length > 0) {
        productId = expirationsData[0].productId; // Use first available option
      } else {
        return null; // No fallback - return null if no data available
      }
    }

    const labelsData = await fetchOptionsLabels(productId);
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

    // Create dropdown for first cell
    const select = document.createElement('select');
    select.className = 'options-dropdown';
    select.id = 'options-dropdown-select';

    labelsData.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.quoteCode;
      option.textContent = `${item.expirationMonth} ${item.quoteCode}`;
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

    // Prepare table data
    let tableData = [];
    if (defaultData && defaultData.quotes && defaultData.quotes.length > 0) {
      const quote = defaultData.quotes[0];
      tableData = [
        [
          select, // Custom dropdown in first cell
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
      const fallbackCells = [select]; // Dropdown in first cell
      for (let i = 1; i < headers.length; i += 1) {
        fallbackCells.push(TABLE_CONSTANTS.placeholders.noData);
      }
      tableData = [fallbackCells];
    }

    // Use standard buildTable utility with custom cells
    const customCells = new Map();
    customCells.set('0-0', select); // First cell (row 0, cell 0) gets the dropdown

    const tableBlock = await buildTable(headers, tableData, {
      variant: TABLE_CONSTANTS.variants.fixedRowHeader,
      tableId: QUOTES_TABLE_CONSTANTS.tableId.options,
      customCells,
    });

    return tableBlock;
  } catch (error) {
    return null;
  }
}

/**
 * Create options-specific middle content
 * @param {number} optionsProductId - The selected options product ID from dropdown
 * @returns {Promise<Array>} Array of blocks for options middle content
 */
async function createOptionsMiddleContent(optionsProductId) {
  // Create the dynamic options table
  const optionsTable = await createOptionsTable(optionsProductId);

  // Note: decoration/loading moved to after DOM insertion

  const middleBlocks = [];
  if (optionsTable) {
    middleBlocks.push(optionsTable);
  } else {
    // Simple error message if table creation fails
    middleBlocks.push('<div class="no-results"><h4>Unable to load options table</h4></div>');
  }

  return middleBlocks;
}

/**
 * Create futures-specific middle content (only the unique parts)
 * @returns {Array} Array of blocks for futures middle content
 */
async function createFuturesContent() {
  // Only return futures-specific middle content
  const futuresMiddleContent = await createFuturesMiddleContent();
  return futuresMiddleContent;
}

/**
 * Create options-specific middle content (only the unique parts)
 * @param {number} optionsProductId - The selected options product ID from dropdown
 * @returns {Array} Array of blocks for options middle content
 */
async function createOptionsContent(optionsProductId) {
  // Only return options-specific middle content
  const optionsMiddleContent = await createOptionsMiddleContent(optionsProductId);
  return optionsMiddleContent;
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
      cells[8].innerHTML = TABLE_FORMATTERS.simpleTime(quote.updated);
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
  document.addEventListener('optionSelected', async (event) => {
    const { tabId, productId, label } = event.detail;

    // Only handle this event if it's for the quotes tab
    if (tabId !== 'quotes') {
      return;
    }

    // Update the middle content area (between market recap and CVOL cards)
    const optionsContent = document.getElementById('options-content-quotes');
    if (optionsContent) {
      try {
        // Create new options content with the selected product ID
        const newOptionsContent = await createOptionsContent(parseInt(productId, 10));

        // Clear existing content and add new content
        optionsContent.innerHTML = '';
        newOptionsContent.forEach((block) => {
          if (typeof block === 'string') {
            const contentDiv = document.createElement('div');
            contentDiv.className = 'default-content-wrapper';
            contentDiv.innerHTML = block;
            optionsContent.appendChild(contentDiv);
          } else {
            const blockWrapper = document.createElement('div');
            blockWrapper.classList.add(`${block.dataset.blockName || 'block'}-wrapper`);
            blockWrapper.appendChild(block);
            optionsContent.appendChild(blockWrapper);
          }
        });
      } catch (error) {
        optionsContent.innerHTML = `
          <h3>${label}</h3>
          <div class="no-results"><h4>Unable to load options data</h4></div>
        `;
      }
    }
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
  const allBlocks = [];

  // Create each block completely independently - if one fails, others still load
  const blockCreators = [
    // Market recap cards
    async () => createBlockWithErrorHandling(
      async () => {
        const reportsData = await fetchQuotesData();
        return createMarketRecapCards(reportsData);
      },
      'market recap',
    ),

    // QuikStrike attribution
    async () => '<p>Recap provided by QuikStrike, access further market information <a href="https://www.cmegroup.com/tools-information/quikstrike.html">here</a>.</p>',

    // Tables and toggle system
    async () => {
      try {
        const futuresBlocks = await createFuturesContent();
        const optionsBlocks = await createOptionsContent();
        return organizeToggleContent({
          futuresBlocks,
          optionsBlocks,
          defaultActive: TOGGLE_CONSTANTS.toggleTypes.futures,
          tabId: 'quotes',
        });
      } catch (error) {
        return '<div class="no-results"><h4>Unable to load toggle system</h4></div>';
      }
    },

    // CVOL cards
    async () => createBlockWithErrorHandling(
      async () => {
        const cvolData = await fetchCvolData();
        return createCvolCards(cvolData);
      },
      'CVOL data',
    ),

    // Fragment
    async () => {
      try {
        return createTabFragment();
      } catch (error) {
        return null; // Silent fail
      }
    },
  ];

  // Load all blocks independently - failed blocks don't block successful ones
  const results = await Promise.allSettled(blockCreators.map((creator) => creator()));

  // Add only successful blocks to the tab
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      allBlocks.push(result.value);
    }
  });

  return allBlocks;
}

/**
 * Builds the Quotes tab content
 * @returns {Element} Section element for quotes tab
 */
export default async function buildQuotesTab() {
  // Initialize option selection handler for this tab
  handleQuotesOptionSelection();

  // Get blocks - each block loads independently, failures don't block others
  const blocks = await createQuotesContent();

  // Always return a section with whatever blocks succeeded
  return createTabSection('quotes', 'Quotes', blocks);
}

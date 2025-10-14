/* eslint-disable max-len */
/* eslint-disable import/no-cycle */

// Quotes Tab - Futures and Options with Toggle System

import { getMetadata } from '../../../../scripts/aem.js';
import {
  createTabSection,
  fetchJsonData,
  organizeToggleContent,
  buildTable,
  createErrorMessage,
} from '../helpers/utils.js';
import {
  API_CONFIG,
  FRAGMENT_URLS,
  TOGGLE_CONSTANTS,
  TABLE_CONSTANTS,
  TABLE_FORMATTERS,
  QUOTES_TABLE_CONSTANTS,
} from '../helpers/constants.js';

// API Functions
async function fetchQuotesTableData() {
  return fetchJsonData(API_CONFIG.quotesTableEndpoint);
}

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

// Table Functions
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
    });

    return tableBlock;
  } catch (error) {
    return null;
  }
}

// Content Functions
async function createFuturesContent() {
  // Fetch quotes table data
  const quotesTableData = await fetchQuotesTableData();

  // Create quotes table
  const quotesTable = await createQuotesTable(quotesTableData);

  // Create About this Report link
  const aboutReportLink = '<p><a href="#" class="about-report-link">About this Report</a></p>';

  const contentBlocks = [];
  if (quotesTable) {
    contentBlocks.push(quotesTable);
    contentBlocks.push(aboutReportLink);
  } else {
    // Show error message if table creation fails
    contentBlocks.push('<div class="no-results"><h4>Unable to load quotes table</h4></div>');
  }

  return contentBlocks;
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
          select, // Custom dropdown element in first cell
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

    // Use standard buildTable utility - elements in data array are handled automatically
    const tableBlock = await buildTable(headers, tableData, {
      variant: TABLE_CONSTANTS.variants.fixedRowHeader,
      tableId: QUOTES_TABLE_CONSTANTS.tableId.options,
    });

    return tableBlock;
  } catch (error) {
    return null;
  }
}

async function createOptionsContent(optionsProductId) {
  // Create the dynamic options table
  const optionsTable = await createOptionsTable(optionsProductId);

  const contentBlocks = [];
  if (optionsTable) {
    contentBlocks.push(optionsTable);
  } else {
    // Simple error message if table creation fails
    contentBlocks.push('<div class="no-results"><h4>Unable to load options table</h4></div>');
  }

  return contentBlocks;
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

    const tableElement = table.querySelector('table');
    const dataRow = tableElement ? tableElement.querySelector('tbody tr') : null;
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

function handleAboutReportModal() {
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('about-report-link')) {
      e.preventDefault();
      try {
        const { openModal } = await import('../../../modal/modal.js');
        await openModal(FRAGMENT_URLS.aboutReport);
      } catch (error) {
        // Silent error handling
      }
    }
  });
}

function handleQuotesOptionSelection() {
  document.addEventListener('optionSelected', async (event) => {
    const { tabId, productId, label } = event.detail;

    // Only handle this event if it's for the quotes tab
    if (tabId !== 'quotes') {
      return;
    }

    // Update the content area
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

async function createQuotesContent(tabId, tabTitle, hasFuturesOptionsToggle) {
  const allBlocks = [];

  if (hasFuturesOptionsToggle) {
    try {
      const toggleContent = await organizeToggleContent({
        futuresBlocks: await createFuturesContent(),
        optionsBlocks: await createOptionsContent(),
        defaultActive: TOGGLE_CONSTANTS.toggleTypes.futures,
        tabId,
      });
      if (toggleContent) {
        allBlocks.push(toggleContent);
      }
    } catch (error) {
      allBlocks.push(createErrorMessage(tabTitle));
    }
  }

  return allBlocks;
}

/**
 * @namespace ExportFunctions
 * @description Main entry point for the quotes tab
 * @returns {Promise<Element>} Section element for quotes tab
 */
export default async function buildQuotesTab(metadata = {}) {
  const { tabId, tabTitle, hasFuturesOptionsToggle } = metadata;

  handleAboutReportModal();
  handleQuotesOptionSelection();
  const blocks = await createQuotesContent(tabId, tabTitle, hasFuturesOptionsToggle);
  return createTabSection(tabId, tabTitle, blocks);
}

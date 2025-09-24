import {
  createTabSection,
  fetchJsonData,
  createModalLink,
  createTabFragment,
  MODAL_CONSTANTS,
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
};

// Fragment URLs for modals - used in centralized modal initialization
const FRAGMENT_URLS = {
  aboutReport: '/drafts/kunwar/corn/fragments/product/about-quotes',
};

// Constants for table placeholders and classes
const TABLE_CONSTANTS = {
  optionsPlaceholder: 'OPT',
  chartPlaceholder: 'CHT',
  blockClasses: {
    table: 'table',
    fixedRowHeader: 'fixed-row-header',
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
 * Creates a quotes table block from JSON data
 * @param {Object} quotesData - The quotes data object from API
 * @returns {Element|null} Table block or null if creation fails
 */
async function createQuotesTable(quotesData = null) {
  try {
    if (!quotesData || !quotesData.quotes || quotesData.quotes.length === 0) {
      return null;
    }

    // Table headers matching the screenshot
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

    // Build table content - first row is headers
    const tableContent = [headers];

    // Add data rows
    quotesData.quotes.forEach((quote) => {
      const updatedDate = new Date(quote.updated);
      const formattedUpdate = updatedDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });

      const row = [
        quote.expirationMonth || '-',
        TABLE_CONSTANTS.optionsPlaceholder,
        TABLE_CONSTANTS.chartPlaceholder,
        quote.last || '-',
        `${quote.change} (${quote.percentageChange})` || '-',
        quote.priorSettle || '-',
        quote.open || '-',
        quote.high || '-',
        quote.low || '-',
        quote.volume || '0',
        formattedUpdate || '-',
      ];

      tableContent.push(row);
    });

    // Create table block with proper HTML structure that the decorator expects
    const tableBlock = document.createElement('div');
    tableBlock.classList.add(
      TABLE_CONSTANTS.blockClasses.table,
      TABLE_CONSTANTS.blockClasses.fixedRowHeader,
    );
    tableBlock.dataset.blockName = TABLE_CONSTANTS.blockClasses.table;

    // Create table element with tbody
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');

    // Add all rows to tbody
    tableContent.forEach((row) => {
      const tr = document.createElement('tr');
      row.forEach((cell) => {
        const td = document.createElement('td');
        td.innerHTML = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableBlock.appendChild(table);

    return tableBlock;
  } catch (error) {
    // Table creation failed - return null silently
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
      // Get commodity code from metadata (e.g., "OZC")
      const commodityCode = getMetadata('commodity-name') || '';

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
 * Create quotes-specific blocks and content
 * @returns {Array} Array of blocks to include in the quotes tab
 */
async function createQuotesContent() {
  // Get fragment block directly
  const fragmentBlock = await createTabFragment();

  // Fetch market reports data, quotes table data, and CVOL data
  const reportsData = await fetchQuotesData();
  const quotesTableData = await fetchQuotesTableData();
  const cvolData = await fetchCvolData();

  // Try to create cards block with fetched data
  const cardsBlock = await createMarketRecapCards(reportsData);
  if (cardsBlock) {
    try {
      decorateBlock(cardsBlock);
      await loadBlock(cardsBlock);
    } catch (error) {
      // Cards decoration failed - continue without cards block
    }
  }

  // Try to create CVOL cards block with fetched data
  const cvolCards = await createCvolCards(cvolData);
  if (cvolCards) {
    try {
      decorateBlock(cvolCards);
      await loadBlock(cvolCards);
    } catch (error) {
      // CVOL cards decoration failed - continue without CVOL cards block
    }
  }

  // Try to create quotes table with fetched data
  const quotesTable = await createQuotesTable(quotesTableData);
  if (quotesTable) {
    try {
      decorateBlock(quotesTable);
      await loadBlock(quotesTable);
    } catch (error) {
      // Table decoration failed - continue without table
    }
  }

  // Create title using product metadata
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Futures - Quotes</h2>`;

  // Create QuikStrike attribution content
  const quikStrikeAttribution = '<p>Recap provided by QuikStrike, access further market information <a href="https://www.cmegroup.com/tools-information/quikstrike.html">here</a>.</p>';

  // Create About this Report link
  const aboutReportLink = createModalLink(
    'About this Report',
    MODAL_CONSTANTS.linkClasses.aboutReport,
    FRAGMENT_URLS.aboutReport,
    MODAL_CONSTANTS.linkClasses.modalClass,
  );

  const blocks = [];
  blocks.push(titleContent);
  if (cardsBlock) {
    blocks.push(cardsBlock);
    blocks.push(quikStrikeAttribution);
  }
  if (quotesTable) {
    blocks.push(quotesTable);
    blocks.push(aboutReportLink);
  }
  if (cvolCards) {
    blocks.push(cvolCards);
  }
  if (fragmentBlock) {
    blocks.push(fragmentBlock);
  }

  return blocks;
}

/**
 * Builds the Quotes tab content
 * @returns {Element} Section element for quotes tab
 */
export default async function buildQuotesTab() {
  const blocks = await createQuotesContent();
  return createTabSection('quotes', 'Quotes', blocks);
}

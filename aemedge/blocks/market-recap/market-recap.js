/* eslint-disable max-len */
import { getMetadata } from '../../scripts/aem.js';
import { fetchJsonData } from '../dynamic/product-tabs/tabs/utils.js';

const API_CONFIG = {
  reportsEndpoint: '/aemedge/blocks/dynamic/product-tabs/mock-api/quotes/market-recap.json',
};

/**
 * Fetch market reports data from API
 * @returns {Promise<Array|null>} Array of market reports or null if fetch fails
 */
async function fetchMarketReports() {
  return fetchJsonData(API_CONFIG.reportsEndpoint);
}

/**
 * Find matching report for the current product
 * @param {Array} reportsData - Array of market reports
 * @returns {Object|null} Matching report or null if not found
 */
function findMatchingReport(reportsData) {
  if (!reportsData || reportsData.length === 0) {
    return null;
  }

  // Get product symbol from metadata and prepend O to create commodity name
  const productSymbol = getMetadata('product-symbol');
  const commodityName = `O${productSymbol}`;

  // Find matching report (case-insensitive, latest entry)
  // The API data already has the full commodity code (e.g., "OZC")
  return reportsData.find((report) => report.reportCommodity?.toLowerCase() === commodityName.toLowerCase());
}

/**
 * Format report date for display
 * @param {string} reportDate - ISO date string
 * @returns {string} Formatted date string
 */
function formatReportDate(reportDate) {
  const date = new Date(reportDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Create market recap content
 * @param {HTMLElement} block - The market-recap block element
 */
async function createMarketRecapContent(block) {
  // Fetch market reports data
  const reportsData = await fetchMarketReports();
  const matchingReport = findMatchingReport(reportsData);

  if (!matchingReport) {
    // Show fallback message when no matching report found or API fails
    const productName = getMetadata('product') || 'Product';
    block.innerHTML = `
      <div class="market-recap-card">
        <div class="market-recap-header">
          <h3>${productName} Market Update</h3>
          <p class="market-recap-date">Unable to load market data</p>
        </div>
        <div class="market-recap-content">
          <div class="no-results">
            <h4>Market update temporarily unavailable</h4>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // Get product name and format date
  const productName = getMetadata('product') || 'Product';
  const formattedDate = formatReportDate(matchingReport.reportDate);

  // Create the market recap content
  block.innerHTML = `
    <div class="market-recap-card">
      <div class="market-recap-header">
        <h3>${productName} Market Update</h3>
        <p class="market-recap-date">${formattedDate}</p>
      </div>
      <div class="market-recap-content">
        ${matchingReport.reportContent}
      </div>
    </div>
  `;
}

/**
 * Decorate the market-recap block
 * @param {HTMLElement} block - The block element
 */
export default async function decorate(block) {
  // Create the market recap content
  await createMarketRecapContent(block);
}

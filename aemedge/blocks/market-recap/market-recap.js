/* eslint-disable max-len */
import { getMetadata } from '../../scripts/aem.js';
import { getProductMetadata } from '../../scripts/utils/product.js';
import { apiGet, getResponseData } from '../../scripts/utils/index.js';

const API_CONFIG = {
  reportsEndpoint: 'https://www.cmegroup.com/CmeWS/mvc/Ags/Reports',
};

async function fetchMarketReports() {
  try {
    const response = await apiGet(API_CONFIG.reportsEndpoint);
    return getResponseData(response) || response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('market-recap => fetchMarketReports error:', error);
    return null;
  }
}

async function findMatchingReport(reportsData) {
  if (!reportsData || reportsData.length === 0) {
    return null;
  }

  // Use v2's product utilities to get product symbol
  const productMetadata = await getProductMetadata();
  const productSymbol = productMetadata.productSymbol || getMetadata('product-symbol');
  
  if (!productSymbol) {
    return null;
  }

  const commodityName = `O${productSymbol}`;
  return reportsData.find((report) => report.reportCommodity?.toLowerCase() === commodityName.toLowerCase());
}

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
  const matchingReport = await findMatchingReport(reportsData);

  // Get product name from v2 utilities or fallback to metadata
  const productMetadata = await getProductMetadata();
  const productName = productMetadata.productName || getMetadata('product') || 'Product';

  if (!matchingReport) {
    // Show fallback message when no matching report found or API fails
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

  // Format date
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

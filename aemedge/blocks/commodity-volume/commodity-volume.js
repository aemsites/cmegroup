import { getMetadata } from '../../scripts/aem.js';
import { fetchJsonData } from '../dynamic/product-tabs/tabs/utils.js';

const API_CONFIG = {
  cvolEndpoint: '/aemedge/blocks/dynamic/product-tabs/mock-api/quotes/cvol.json',
};

/**
 * Fetch CVOL data from API
 * @returns {Promise<Array|null>} Array of CVOL data or null if fetch fails
 */
async function fetchCvolData() {
  return fetchJsonData(API_CONFIG.cvolEndpoint);
}

/**
 * Create commodity volume content
 * @param {HTMLElement} block - The commodity-volume block element
 */
async function createCommodityVolumeContent(block) {
  // Fetch CVOL data
  const cvolDataArray = await fetchCvolData();

  if (!cvolDataArray || !Array.isArray(cvolDataArray) || cvolDataArray.length === 0) {
    // Show fallback message when API fails
    block.innerHTML = `
      <div class="commodity-volume-card">
        <div class="commodity-volume-header">
          <h3>${getMetadata('product') || 'Product'} CVOL Index</h3>
          <p>Unable to load CVOL data at this time</p>
        </div>
        <div class="commodity-volume-content">
          <div class="no-results">
            <h4>Data temporarily unavailable</h4>
          </div>
        </div>
      </div>
    `;
    return;
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

  // Create the commodity volume content
  block.innerHTML = `
    <div class="commodity-volume-card">
      <div class="commodity-volume-header">
        <h3>${productName} CVOL Index</h3>
        <p>${cvolDescription}</p>
      </div>
      <div class="commodity-volume-content">
        ${cvolDisplay}
      </div>
    </div>
  `;
}

/**
 * Decorate the commodity-volume block
 * @param {HTMLElement} block - The block element
 */
export default async function decorate(block) {
  // Create the commodity volume content
  await createCommodityVolumeContent(block);
}

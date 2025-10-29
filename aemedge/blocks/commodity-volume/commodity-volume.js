import { getMetadata } from '../../scripts/aem.js';
import { getProductMetadata } from '../../scripts/utils/product.js';
import { apiGet, getResponseData } from '../../scripts/utils/index.js';

const API_CONFIG = {
  // Updated path - old mock API location was removed in v2
  // Consider moving mock data to /aemedge/blocks/commodity-volume/mock-api/ or using real API
  cvolEndpoint: '/aemedge/blocks/commodity-volume/mock-api/cvol.json',
};

async function fetchCvolData() {
  try {
    const response = await apiGet(API_CONFIG.cvolEndpoint);
    return getResponseData(response) || response.data;
  } catch (error) {
    return null;
  }
}

async function createCommodityVolumeContent(block) {
  const cvolDataArray = await fetchCvolData();
  
  // Use v2's product utilities to get product name
  const productMetadata = await getProductMetadata();
  const productName = productMetadata.productName || getMetadata('product') || 'Product';

  if (!cvolDataArray || !Array.isArray(cvolDataArray) || cvolDataArray.length === 0) {
    block.innerHTML = `
      <div class="commodity-volume-card">
        <div class="commodity-volume-header">
          <h3>${productName} CVOL Index</h3>
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

  const cvolData = cvolDataArray[0];

  const cvolDisplay = `
    <div class="cvol-data">
      <div class="cvol-value">${cvolData.cvolPrice || 'N/A'}</div>
      <div class="cvol-change ${parseFloat(cvolData.cvolPriceChange || 0) >= 0 ? 'positive' : 'negative'}">
        ${cvolData.cvolPriceChange || 'N/A'} (${cvolData.cvolPricePercentChange || 'N/A'})
      </div>
    </div>
  `;

  const cvolDescription = cvolData.description || 'Corn Volatility Index measures the market\'s expectation of 30-day volatility.';

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

export default async function decorate(block) {
  await createCommodityVolumeContent(block);
}


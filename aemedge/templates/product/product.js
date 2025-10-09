// Dynamic tab system now handled by blocks/dynamic/product-tabs/

import {
  getMetadata,
} from '../../scripts/aem.js';

import dynamicBlocks from '../../blocks/dynamic/index.js';

// Utility function for fetching JSON data (used by hero block)
async function fetchJsonData(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

const API_CONFIG = {
  contractsEndpoint: '/aemedge/blocks/dynamic/product-tabs/mock-api/contracts-by-number.json',
};

async function fetchContractData() {
  const contractsData = await fetchJsonData(API_CONFIG.contractsEndpoint);
  if (contractsData && Array.isArray(contractsData) && contractsData.length > 0) {
    return contractsData[0];
  }
  return null;
}

async function populateHeroData() {
  try {
    const contractData = await fetchContractData();
    if (!contractData) return;

    // Find the hero container and populate it
    const heroContainer = document.querySelector('.hero.baseball .container');
    if (!heroContainer) return;

    // Clear existing content and build the hero structure
    heroContainer.innerHTML = `
      <div class="hero-content">
        <h1>${contractData.productName || getMetadata('product') || 'Product'}</h1>
        <div class="hero-subtitle">${contractData.expirationMonth || ''}</div>
        
        <div class="price-section">
          <div class="current-price">
            <span class="label">Last</span>
            <span class="value">${contractData.last || 'N/A'}</span>
          </div>
          <div class="price-change">
            <span class="label">Change</span>
            <span class="value ${contractData.change && contractData.change.startsWith('-') ? 'change-negative' : 'change-positive'}">${contractData.change || 'N/A'} (${contractData.percentageChange || 'N/A'})</span>
          </div>
          <div class="volume-info">
            <span class="label">Volume</span>
            <span class="value">${contractData.volume ? parseInt(contractData.volume, 10).toLocaleString() : 'N/A'}</span>
          </div>
        </div>

        <div class="trading-data">
          <div class="trading-item">
            <span class="label">Prior Settle</span>
            <span class="value">${contractData.priorSettle || 'N/A'}</span>
          </div>
          <div class="trading-item">
            <span class="label">Open</span>
            <span class="value">${contractData.open || 'N/A'}</span>
          </div>
          <div class="trading-item">
            <span class="label">High</span>
            <span class="value">${contractData.high || 'N/A'}</span>
          </div>
          <div class="trading-item">
            <span class="label">Low</span>
            <span class="value">${contractData.low || 'N/A'}</span>
          </div>
        </div>

        <div class="update-time">
          Last Updated ${new Date(contractData.lastUpdated).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })}
        </div>
      </div>
    `;
  } catch (error) {
    // Silent fallback
  }
}

export default async function productTemplate(doc = document) {
  const main = doc.querySelector('main');

  if (!main) return;

  const hasTabsSection = main.querySelector('.section.tabs');
  if (!hasTabsSection) return;

  // Populate hero data if hero block exists in HTML
  await populateHeroData();
  await dynamicBlocks(main);
}

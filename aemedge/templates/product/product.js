// Dynamic tab system now handled by blocks/dynamic/product-tabs/

import {
  buildBlock,
  decorateBlock,
  loadBlock,
  getMetadata,
} from '../../scripts/aem.js';

import { createElement } from '../../scripts/utils.js';
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
  contractsEndpoint: '/aemedge/templates/product/mock-api/contracts-by-number.json',
};

async function fetchContractData() {
  const contractsData = await fetchJsonData(API_CONFIG.contractsEndpoint);
  if (contractsData && Array.isArray(contractsData) && contractsData.length > 0) {
    return contractsData[0];
  }
  return null;
}

async function addBaseballHeroBlock(main) {
  try {
    const productName = getMetadata('product') || 'Product';
    const contractData = await fetchContractData();

    let heroContent;

    if (contractData) {
      const lastUpdated = new Date(contractData.lastUpdated);
      const formattedTime = lastUpdated.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      const changeValue = contractData.change || '0';
      const isNegative = changeValue.startsWith('-');
      const changeClass = isNegative ? 'change-negative' : 'change-positive';

      heroContent = [
        [
          `<h1>${contractData.productName || productName}</h1>`,
          `<div class="hero-subtitle">${contractData.expirationMonth || ''}</div>`,
          `<div class="contract-data">
            <div class="price-section">
              <div class="current-price">
                <span class="label">LAST</span>
                <span class="value">${contractData.last || 'N/A'}</span>
              </div>
              <div class="price-change">
                <span class="label">CHANGE</span>
                <span class="value ${changeClass}">${contractData.change || 'N/A'} (${contractData.percentageChange || 'N/A'})</span>
              </div>
              <div class="volume-info">
                <span class="label">VOLUME</span>
                <span class="value">${contractData.volume ? parseInt(contractData.volume, 10).toLocaleString() : 'N/A'}</span>
              </div>
            </div>
            <div class="trading-data">
              <div class="trading-item">
                <span class="label">PRIOR SETTLE:</span>
                <span class="value">${contractData.priorSettle || 'N/A'}</span>
              </div>
              <div class="trading-item">
                <span class="label">OPEN:</span>
                <span class="value">${contractData.open || 'N/A'}</span>
              </div>
              <div class="trading-item">
                <span class="label">HIGH:</span>
                <span class="value">${contractData.high || 'N/A'}</span>
              </div>
              <div class="trading-item">
                <span class="label">LOW:</span>
                <span class="value">${contractData.low || 'N/A'}</span>
              </div>
            </div>
            <div class="market-update">
              <span class="update-time">Last Updated ${formattedTime}</span>
              <span class="market-note">Market data is delayed by at least 10 minutes</span>
            </div>
          </div>`,
        ],
      ];
    } else {
      heroContent = [
        [
          `<h1>${productName}</h1>`,
          '<div class="hero-subtitle">Futures and Options</div>',
          '<p>Loading market data...</p>',
        ],
      ];
    }

    const heroBlock = buildBlock('hero', heroContent);
    if (!heroBlock) return;

    heroBlock.classList.add('baseball');

    const section = createElement('div', { class: 'section full-width' });
    const blockWrapper = createElement('div', { class: 'hero-wrapper' });
    blockWrapper.appendChild(heroBlock);
    section.appendChild(blockWrapper);

    decorateBlock(heroBlock);
    await loadBlock(heroBlock);

    const firstSection = main.querySelector('.section');
    if (firstSection) {
      main.insertBefore(section, firstSection);
    } else {
      main.appendChild(section);
    }
  } catch (error) {
    // Silent fallback
  }
}

export default async function productTemplate(doc = document) {
  const main = doc.querySelector('main');

  if (!main) return;

  const hasTabsSection = main.querySelector('.section.tabs');
  if (!hasTabsSection) return;

  await addBaseballHeroBlock(main);
  await dynamicBlocks(main);
}

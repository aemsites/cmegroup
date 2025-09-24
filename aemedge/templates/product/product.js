/*
 * Product Template - Main Coordinator
 *
 * This template orchestrates the creation of dynamic product tabs.
 * Each tab is implemented as a separate module in the ./tabs/ folder
 * for better maintainability and team collaboration.
 *
 * Tab modules: quotes, settlements, volume, specs, margins, calendar
 * Shared utilities available in ./tabs/utils.js
 */

// Import all tab builders from the tabs module
import {
  buildQuotesTab,
  buildSettlementsTab,
  buildVolumeTab,
  buildSpecsTab,
  buildMarginsTab,
  buildCalendarTab,
} from './tabs/index.js';

// Import AEM utilities for block creation
import {
  buildBlock,
  decorateBlock,
  loadBlock,
  getMetadata,
} from '../../scripts/aem.js';

// Import utility functions
import { createElement } from '../../scripts/utils.js';
import { fetchJsonData } from './tabs/utils.js';

// API Configuration for hero block data
const API_CONFIG = {
  contractsEndpoint: '/aemedge/templates/product/mock-api/contracts-by-number.json',
};

/**
 * Fetch contract data for hero block
 * @returns {Promise<Object|null>} Contract data or null if fetch fails
 */
async function fetchContractData() {
  const contractsData = await fetchJsonData(API_CONFIG.contractsEndpoint);
  if (contractsData && Array.isArray(contractsData) && contractsData.length > 0) {
    return contractsData[0]; // Return the first contract
  }
  return null;
}

/**
 * Creates and adds a baseball hero block to the product page
 * @param {Element} main - The main content element
 */
async function addBaseballHeroBlock(main) {
  try {
    // Get product name from metadata
    const productName = getMetadata('product') || 'Product';

    // Fetch contract data
    const contractData = await fetchContractData();

    let heroContent;

    if (contractData) {
      // Format the last updated time
      const lastUpdated = new Date(contractData.lastUpdated);
      const formattedTime = lastUpdated.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      // Determine change styling
      const changeValue = contractData.change || '0';
      const isNegative = changeValue.startsWith('-');
      const changeClass = isNegative ? 'change-negative' : 'change-positive';

      // Create hero content with real contract data
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
      // Fallback content if API fails
      heroContent = [
        [
          `<h1>${productName}</h1>`,
          '<div class="hero-subtitle">Futures and Options</div>',
          '<p>Loading market data...</p>',
        ],
      ];
    }

    // Build the hero block
    const heroBlock = buildBlock('hero', heroContent);
    if (!heroBlock) {
      return;
    }

    // Add baseball variant class
    heroBlock.classList.add('baseball');

    // Create a section wrapper for the hero block
    const section = createElement('div', { class: 'section' });

    // Create block wrapper
    const blockWrapper = createElement('div', { class: 'hero-wrapper' });
    blockWrapper.appendChild(heroBlock);
    section.appendChild(blockWrapper);

    // Decorate and load the block first
    decorateBlock(heroBlock);
    await loadBlock(heroBlock);

    // Insert at beginning of main
    const firstSection = main.querySelector('.section');
    if (firstSection) {
      main.insertBefore(section, firstSection);
    } else {
      main.appendChild(section);
    }
  } catch (error) {
    // Silent fallback if hero block creation fails
  }
}

/**
 * Create dynamic product tabs and integrate them into the tabs system
 * Each tab section will be created with proper AEM structure
 * @param {Element} main - The main content element
 */
async function createDynamicTabs(main) {
  // Find the overview section (should have tabs class and overview tab-id)
  const overviewSection = main.querySelector('.section.tabs[data-tab-id="overview"]');

  if (!overviewSection) {
    return;
  }

  try {
    // Build all tabs in parallel using Promise.all for better performance
    const tabSections = await Promise.all([
      buildQuotesTab(),
      buildSettlementsTab(),
      buildVolumeTab(),
      buildSpecsTab(),
      buildMarginsTab(),
      buildCalendarTab(),
    ]);

    // Insert each tab section after the overview section
    let insertAfter = overviewSection;

    tabSections.forEach((tabSection) => {
      if (tabSection && insertAfter.parentNode) {
        insertAfter.parentNode.insertBefore(tabSection, insertAfter.nextSibling);
        insertAfter = tabSection;
      }
    });

    // Initialize toggle system after all tabs are loaded
    const { setToggleConfig, setupTabToggleIntegration, TOGGLE_CONSTANTS } = await import('./tabs/utils.js');

    // Configure toggles for tabs that have HAS_FUTURES_OPTIONS_TOGGLE enabled
    const tabModules = [
      { name: 'quotes', module: () => import('./tabs/quotes.js') },
      { name: 'settlements', module: () => import('./tabs/settlements.js') },
      { name: 'volume', module: () => import('./tabs/volume.js') },
      { name: 'specs', module: () => import('./tabs/specs.js') },
      { name: 'margins', module: () => import('./tabs/margins.js') },
      { name: 'calendar', module: () => import('./tabs/calendar.js') },
    ];

    // Check each tab for toggle configuration
    const tabChecks = tabModules.map(async (tab) => {
      try {
        const tabModule = await tab.module();
        if (tabModule.HAS_FUTURES_OPTIONS_TOGGLE === true) {
          setToggleConfig(tab.name, {
            showFutures: true,
            showOptions: true,
            defaultActive: TOGGLE_CONSTANTS.toggleTypes.futures,
            tabId: tab.name,
          });
        }
      } catch (error) {
        // Tab module doesn't exist or doesn't export HAS_FUTURES_OPTIONS_TOGGLE - skip
      }
    });

    await Promise.all(tabChecks);

    // Set up global toggle integration
    setupTabToggleIntegration();
  } catch (error) {
    // Silent failure - some tabs may not load but others can still work
  }
}

/**
 * Main product template function
 * @param {Document} doc - The document object
 */
export default async function productTemplate(doc = document) {
  const main = doc.querySelector('main');

  if (!main) {
    return;
  }

  // Check if this is actually a product page with tabs
  const hasTabsSection = main.querySelector('.section.tabs');
  if (!hasTabsSection) {
    return;
  }

  // Add hero block first (at the top)
  await addBaseballHeroBlock(main);

  // Create dynamic tabs after hero
  await createDynamicTabs(main);
}

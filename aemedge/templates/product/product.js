import {
  buildQuotesTab,
  buildSettlementsTab,
  buildVolumeTab,
  buildSpecsTab,
  buildMarginsTab,
  buildCalendarTab,
} from './tabs/index.js';

import {
  buildBlock,
  decorateBlock,
  loadBlock,
  getMetadata,
} from '../../scripts/aem.js';

import { createElement } from '../../scripts/utils.js';
import { fetchJsonData } from './tabs/utils.js';

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

/**
 * Create empty tab section immediately
 * @param {string} tabId - The tab identifier
 * @param {string} tabTitle - The tab title
 * @returns {Element} Empty tab section ready for content
 */
function createEmptyTabSection(tabId, tabTitle) {
  const section = createElement('div', { class: 'section tabs' });
  section.dataset.tabId = tabId;
  section.dataset.tabTitle = tabTitle;
  section.dataset.sectionStatus = 'initialized';
  section.style.display = 'none';
  section.textContent = '';
  return section;
}

/**
 * Populate tab content independently
 * @param {Element} tabSection - The empty tab section
 * @param {Function} builder - The tab builder function
 */
async function populateTabContent(tabSection, builder) {
  try {
    const tabContent = await builder();

    if (tabContent) {
      tabSection.textContent = '';
      const contentElements = Array.from(tabContent.children);
      contentElements.forEach((element) => {
        tabSection.appendChild(element);
      });

      try {
        const { setupTabToggleIntegration } = await import('./tabs/utils.js');
        setupTabToggleIntegration();
      } catch (toggleError) {
        // Toggle setup failed - non-critical
      }
    }
  } catch (error) {
    tabSection.textContent = '';
    const errorDiv = createElement('div', {
      style: 'padding: 2rem; text-align: center; color: var(--gray3);',
    });
    errorDiv.innerHTML = '<p>Failed to load content</p>';
    tabSection.appendChild(errorDiv);
  }
}

async function createDynamicTabs(main) {
  const overviewSection = main.querySelector('.section.tabs[data-tab-id="overview"]');
  if (!overviewSection) return;

  const tabDefinitions = [
    { id: 'quotes', title: 'Quotes', builder: buildQuotesTab },
    { id: 'settlements', title: 'Settlements', builder: buildSettlementsTab },
    { id: 'volume', title: 'Volume', builder: buildVolumeTab },
    { id: 'specs', title: 'Specs', builder: buildSpecsTab },
    { id: 'margins', title: 'Margins', builder: buildMarginsTab },
    { id: 'calendar', title: 'Calendar', builder: buildCalendarTab },
  ];

  // Step 1: Create empty tab sections immediately
  let insertAfter = overviewSection;
  tabDefinitions.forEach(({ id, title }) => {
    const emptySection = createEmptyTabSection(id, title);
    if (emptySection && insertAfter.parentNode) {
      insertAfter.parentNode.insertBefore(emptySection, insertAfter.nextSibling);
      insertAfter = emptySection;
    }
  });

  // Step 2: Setup toggle configurations early
  await setupToggleConfigurations();

  // Step 3: Populate each tab independently (resilient approach)
  tabDefinitions.forEach(async ({ id, builder }) => {
    const tabSection = main.querySelector(`[data-tab-id="${id}"]`);
    if (tabSection) {
      await populateTabContent(tabSection, builder);
    }
  });
}

async function setupToggleConfigurations() {
  try {
    const { setToggleConfig, setupTabToggleIntegration, TOGGLE_CONSTANTS } = await import('./tabs/utils.js');

    const tabModules = [
      { name: 'quotes', module: () => import('./tabs/quotes.js') },
      { name: 'settlements', module: () => import('./tabs/settlements.js') },
      { name: 'volume', module: () => import('./tabs/volume.js') },
      { name: 'specs', module: () => import('./tabs/specs.js') },
      { name: 'calendar', module: () => import('./tabs/calendar.js') },
    ];

    await Promise.all(tabModules.map(async (tab) => {
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
        // Skip if module doesn't exist or export toggle flag
      }
    }));

    setupTabToggleIntegration();
  } catch (error) {
    // Toggle setup failed - non-critical
  }
}

export default async function productTemplate(doc = document) {
  const main = doc.querySelector('main');

  if (!main) return;

  const hasTabsSection = main.querySelector('.section.tabs');
  if (!hasTabsSection) return;

  await addBaseballHeroBlock(main);
  await createDynamicTabs(main);
}

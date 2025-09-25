/* eslint-disable import/no-cycle */
/**
 * Product Tabs Dynamic Block
 *
 * Handles dynamic tab creation for product template pages.
 * This follows the same pattern as other dynamic blocks in the project.
 */

import { loadCSS } from '../../../scripts/aem.js';

// Global flag to prevent multiple instances
let isProductTabsInitialized = false;

class ProductTabsManager {
  constructor(main) {
    this.main = main;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    const overviewSection = this.main.querySelector('.section.tabs[data-tab-id="overview"]');
    if (!overviewSection) {
      return;
    }

    await this.createAllDynamicTabs(overviewSection);
    this.isInitialized = true;
  }

  /**
   * Create all dynamic tabs and initialize the tabs UI
   */
  async createAllDynamicTabs(overviewSection) {
    const {
      buildQuotesTab,
      buildSettlementsTab,
      buildVolumeTab,
      buildSpecsTab,
      buildMarginsTab,
      buildCalendarTab,
    } = await import('./tabs/index.js');

    const tabDefinitions = [
      { id: 'quotes', title: 'Quotes', builder: buildQuotesTab },
      { id: 'settlements', title: 'Settlements', builder: buildSettlementsTab },
      { id: 'volume', title: 'Volume', builder: buildVolumeTab },
      { id: 'specs', title: 'Specs', builder: buildSpecsTab },
      { id: 'margins', title: 'Margins', builder: buildMarginsTab },
      { id: 'calendar', title: 'Calendar', builder: buildCalendarTab },
    ];

    // Create empty tab sections immediately (progressive loading pattern)
    let insertAfter = overviewSection;
    tabDefinitions.forEach(({ id, title }) => {
      const emptySection = this.createEmptyTabSection(id, title);
      if (emptySection && insertAfter && insertAfter.parentNode) {
        insertAfter.parentNode.insertBefore(emptySection, insertAfter.nextSibling);
        insertAfter = emptySection;
      }
    });

    // Setup toggle configurations
    await this.setupToggleConfigurations();

    // Populate each tab independently (resilient approach)
    const populatePromises = tabDefinitions.map(async ({ id, builder }) => {
      const tabSection = this.main.querySelector(`[data-tab-id="${id}"]`);
      if (tabSection) {
        await this.populateTabContent(tabSection, builder);
      }
    });

    // Wait for all content to be populated before initializing UI
    await Promise.all(populatePromises);

    // Initialize the tabs UI system after all content is loaded
    await this.initializeTabsUI();
  }

  /**
   * Create empty tab section immediately (progressive loading)
   */
  createEmptyTabSection(tabId, tabTitle) {
    const section = document.createElement('div');
    section.className = 'section tabs';
    section.dataset.tabId = tabId;
    section.dataset.tabTitle = tabTitle;
    section.dataset.sectionStatus = 'initialized';
    section.style.display = 'none';
    section.textContent = '';
    return section;
  }

  /**
   * Populate tab content independently
   */
  async populateTabContent(tabSection, builder) {
    try {
      const tabContent = await builder();

      if (tabContent) {
        tabSection.textContent = '';
        const contentElements = Array.from(tabContent.children);
        contentElements.forEach((element) => {
          tabSection.appendChild(element);
        });

        // Let AEM handle decoration automatically - just call loadSection
        await this.loadTabSection(tabSection);

        try {
          const { setupTabToggleIntegration } = await import('./tabs/utils.js');
          setupTabToggleIntegration();
        } catch (toggleError) {
          // Toggle setup failed - non-critical
        }
      }
    } catch (error) {
      tabSection.textContent = '';
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'padding: 2rem; text-align: center; color: var(--gray3);';
      errorDiv.innerHTML = '<p>Failed to load content</p>';
      tabSection.appendChild(errorDiv);
    }
  }

  /**
   * Load a tab section using standard AEM approach
   * (Dynamic blocks self-decorate immediately upon creation)
   */
  async loadTabSection(section) {
    try {
      // Import AEM functions
      const { decorateBlock, loadBlock } = await import('../../../scripts/aem.js');

      // Only manually decorate API-backed blocks (don't call loadSection to avoid interference)
      const apiBackedBlocks = section.querySelectorAll('.api-backed[data-block-name]');
      for (const block of apiBackedBlocks) {
        try {
          // Only decorate if not already decorated
          if (!block.classList.contains('block-loaded')) {
            decorateBlock(block);
            await loadBlock(block);
          }
        } catch (blockError) {
          // Silent error handling for individual blocks
        }
      }
    } catch (error) {
      // Silent error handling
    }
  }

  /**
   * Setup toggle configurations for tabs that need them
   */
  async setupToggleConfigurations() {
    try {
      const { setToggleConfig, setupTabToggleIntegration } = await import('./tabs/utils.js');
      const { TOGGLE_CONSTANTS } = await import('./constants.js');

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

  /**
   * Initialize the tabs UI system using the existing TabsManager
   */
  async initializeTabsUI() {
    try {
      // Import and load tabs CSS
      loadCSS(`${window.hlx.codeBasePath}/blocks/dynamic/tabs/tabs.css`);

      // Import the existing TabsManager
      const { default: createTabs } = await import('../tabs/tabs.js');

      // Let the existing tabs system process our created sections
      await createTabs(this.main);

      // Tabs UI initialized successfully
    } catch (error) {
      // Failed to initialize tabs UI - silent error handling
    }
  }
}

/**
 * Main entry point for Product Tabs dynamic block
 * @param {HTMLElement} main - The main element
 */
export default async function createProductTabs(main) {
  // Prevent double execution
  if (isProductTabsInitialized) {
    return;
  }

  try {
    isProductTabsInitialized = true;
    const manager = new ProductTabsManager(main);
    await manager.initialize();
  } catch (error) {
    // Failed to initialize - reset flag for retry
    isProductTabsInitialized = false;
  }
}

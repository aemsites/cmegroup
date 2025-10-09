/* eslint-disable import/no-cycle */
/**
 * Product Tabs Dynamic Block
 * Creates dynamic tabs for product template pages
 */

import { loadCSS, getMetadata } from '../../../scripts/aem.js';

// Prevent multiple initialization
let isInitialized = false;

/**
 * Get tab order from metadata
 */
function getTabOrder() {
  const orderMeta = getMetadata('product-tabs-order');
  if (!orderMeta) return null;
  return orderMeta.split(',').map((tab) => tab.trim());
}

/**
 * Load all tab builders
 */
async function loadTabBuilders() {
  const [
    { default: buildQuotesTab },
    { default: buildSettlementsTab },
    { default: buildVolumeTab },
    { default: buildSpecsTab },
    { default: buildMarginsTab },
    { default: buildCalendarTab },
  ] = await Promise.all([
    import('./tabs/quotes.js'),
    import('./tabs/settlements.js'),
    import('./tabs/volume.js'),
    import('./tabs/specs.js'),
    import('./tabs/margins.js'),
    import('./tabs/calendar.js'),
  ]);

  return [
    { id: 'quotes', title: 'Quotes', builder: buildQuotesTab },
    { id: 'settlements', title: 'Settlements', builder: buildSettlementsTab },
    { id: 'volume', title: 'Volume', builder: buildVolumeTab },
    { id: 'specs', title: 'Specs', builder: buildSpecsTab },
    { id: 'margins', title: 'Margins', builder: buildMarginsTab },
    { id: 'calendar', title: 'Calendar', builder: buildCalendarTab },
  ];
}

/**
 * Reorder tabs based on metadata
 */
function reorderTabs(tabs) {
  const desiredOrder = getTabOrder();
  if (!desiredOrder) return tabs;

  const ordered = [];
  const remaining = [...tabs];

  // Add tabs in desired order
  desiredOrder.forEach((tabName) => {
    const index = remaining.findIndex((tab) => tab.title === tabName);
    if (index !== -1) {
      ordered.push(remaining[index]);
      remaining.splice(index, 1);
    }
  });

  // Add remaining tabs
  return [...ordered, ...remaining];
}

/**
 * Populate a single tab with content
 */
async function populateTab(tabSection, builder) {
  const tabContent = await builder();
  if (!tabContent) return;

  // Find tabs-content marker for dynamic content
  const marker = tabSection.querySelector('.tabs-content');
  if (marker) {
    const container = marker.querySelector('div > div');
    if (container) {
      // Clear marker and add ONLY dynamic content
      container.innerHTML = '';
      container.append(...tabContent.children);

      // Decorate and load the dynamic blocks we just added
      const { decorateBlock, loadBlock } = await import('../../../scripts/aem.js');
      const dynamicBlocks = container.querySelectorAll('.dynamic[data-block-name]');
      dynamicBlocks.forEach((block) => {
        if (!block.dataset.blockStatus) {
          decorateBlock(block);
        }
      });
      await Promise.all([...dynamicBlocks].map((block) => loadBlock(block)));
    }
  }

  // Load the entire tab section (manually curated blocks + dynamic blocks)
  // This triggers AEM's normal loadSection flow for all blocks in this section
  const { loadSection } = await import('../../../scripts/aem.js');
  await loadSection(tabSection);
}

/**
 * Setup toggle system for tabs
 */
async function setupToggles(tabDefinitions) {
  try {
    const { setToggleConfig, setupTabToggleIntegration } = await import('./tabs/utils.js');
    const { TOGGLE_CONSTANTS } = await import('./constants.js');

    // Check each tab for toggle support
    await Promise.all(tabDefinitions.map(async (tab) => {
      try {
        const tabModule = await import(`./tabs/${tab.id}.js`);
        if (tabModule.HAS_FUTURES_OPTIONS_TOGGLE === true) {
          setToggleConfig(tab.id, {
            showFutures: true,
            showOptions: true,
            defaultActive: TOGGLE_CONSTANTS.toggleTypes.futures,
            tabId: tab.id,
          });
        }
      } catch (error) {
        // Skip if module doesn't exist
      }
    }));

    setupTabToggleIntegration();
  } catch (error) {
    // Toggle setup failed - non-critical
  }
}

/**
 * Initialize tabs UI
 */
async function initializeTabsUI() {
  try {
    loadCSS(`${window.hlx.codeBasePath}/blocks/dynamic/tabs/tabs.css`);
    const { default: createTabs } = await import('../tabs/tabs.js');
    await createTabs(document.querySelector('main'));
  } catch (error) {
    // Failed to initialize - silent error handling
  }
}

/**
 * Main function - create all dynamic tabs
 */
export default async function createProductTabs(main) {
  if (isInitialized) return;
  isInitialized = true;

  try {
    // Check if dynamic tabs exist
    const hasDynamicTabs = main.querySelectorAll('.tabs-content').length > 0;
    if (!hasDynamicTabs) return;

    // Load all tab builders
    const allTabs = await loadTabBuilders();
    const orderedTabs = reorderTabs(allTabs);

    // Populate each tab
    const populatePromises = orderedTabs.map(async ({ id, builder }) => {
      const tabSection = main.querySelector(`[data-tab-id="${id}"]`);
      if (tabSection) {
        await populateTab(tabSection, builder);
      }
    });

    await Promise.all(populatePromises);

    // Setup toggles and UI
    await setupToggles(orderedTabs);
    await initializeTabsUI();
  } catch (error) {
    isInitialized = false; // Allow retry
  }
}

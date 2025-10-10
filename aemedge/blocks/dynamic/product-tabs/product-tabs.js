/* eslint-disable import/no-cycle */
/**
 * Product Tabs Dynamic Block
 * Populates dynamic content into tab sections markers in the source document
 */

import { loadCSS } from '../../../scripts/aem.js';

// Prevent multiple initialization
let isInitialized = false;

/**
 * Load the appropriate tab builder module based on tab ID
 * Uses convention: data-tab-id="quotes" → tabs/quotes.js
 */
async function loadTabBuilder(tabId) {
  if (!tabId) return null;

  try {
    const module = await import(`./tabs/${tabId}.js`);
    return module.default;
  } catch (error) {
    // No module exists for this tab - it might be static content only
    return null;
  }
}

/**
 * Populate a single tab section with dynamic content
 */
async function populateTabSection(tabSection, tabId) {
  try {
    // Find tabs-content marker
    const marker = tabSection.querySelector('.tabs-content');
    if (!marker) return;

    // Load the tab builder
    const builder = await loadTabBuilder(tabId);
    if (!builder) return;

    // Build dynamic content with metadata from source doc
    const tabTitle = tabSection.dataset.tabTitle || tabId;
    const tabContent = await builder({ tabId, tabTitle });
    if (!tabContent) return;

    // Insert dynamic content into marker
    const container = marker.querySelector('div > div');
    if (container) {
      container.innerHTML = '';
      container.append(...tabContent.children);

      // Decorate and load dynamic blocks
      const { decorateBlock, loadBlock } = await import('../../../scripts/aem.js');
      const dynamicBlocks = container.querySelectorAll('.dynamic[data-block-name]');
      dynamicBlocks.forEach((block) => {
        if (!block.dataset.blockStatus) {
          decorateBlock(block);
        }
      });
      await Promise.all([...dynamicBlocks].map((block) => loadBlock(block)));
    }

    // Load manually curated blocks
    const { loadBlock } = await import('../../../scripts/aem.js');
    const blocksToLoad = tabSection.querySelectorAll('.block[data-block-status="initialized"]');
    await Promise.all([...blocksToLoad].map((block) => loadBlock(block)));
  } catch (error) {
    // Tab failed to load - non-critical
  }
}

/**
 * Setup toggle system for a specific tab
 */
async function setupToggleForTab(tabId) {
  if (!tabId) return;

  try {
    const tabModule = await import(`./tabs/${tabId}.js`);
    if (tabModule.HAS_FUTURES_OPTIONS_TOGGLE !== true) return;

    const { setToggleConfig, setupTabToggleIntegration } = await import('./helpers/utils.js');
    const { TOGGLE_CONSTANTS } = await import('./helpers/constants.js');

    setToggleConfig(tabId, {
      showFutures: true,
      showOptions: true,
      defaultActive: TOGGLE_CONSTANTS.toggleTypes.futures,
      tabId,
    });

    setupTabToggleIntegration();
  } catch (error) {
    // Toggle setup failed - non-critical
  }
}

/**
 * Main function - populate dynamic content in tab sections
 */
export default async function createProductTabs(main) {
  if (isInitialized) {
    return;
  }
  isInitialized = true;

  try {
    // Find all tab sections (with or without tabs-content markers)
    const allTabSections = main.querySelectorAll('.section.tabs');
    if (allTabSections.length === 0) return;

    // Load product-tabs CSS
    loadCSS(`${window.hlx.codeBasePath}/blocks/dynamic/product-tabs/product-tabs.css`);

    // Load tabs UI CSS
    loadCSS(`${window.hlx.codeBasePath}/blocks/dynamic/tabs/tabs.css`);

    // Populate each tab independently (only tabs with dynamic content markers)
    const populatePromises = [...allTabSections].map(async (tabSection) => {
      const tabId = tabSection.dataset.tabId || tabSection.dataset.normalizedTabId;
      if (!tabId) return;

      // Check if tab has dynamic content marker
      const hasMarker = tabSection.querySelector('.tabs-content');
      if (!hasMarker) return; // Skip static-only tabs

      // Populate tab content
      await populateTabSection(tabSection, tabId);

      // Setup toggle if needed
      await setupToggleForTab(tabId);
    });

    // Wait for all tabs to finish (independently)
    await Promise.allSettled(populatePromises);

    // Initialize tabs UI
    const { default: createTabs } = await import('../tabs/tabs.js');
    await createTabs(main);
  } catch (error) {
    // Silent error handling
  }
}

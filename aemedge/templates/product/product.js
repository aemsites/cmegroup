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

/**
 * Creates all dynamic tabs for the product template
 * @param {Element} main - The main content element
 */
async function createDynamicTabs(main) {
  // Find the overview section (should have tabs class and overview tab-id)
  const overviewSection = main.querySelector('.section.tabs[data-tab-id="overview"]');

  if (!overviewSection) {
    return;
  }

  // Create all dynamic tab sections
  let dynamicTabs = [];

  try {
    dynamicTabs = await Promise.all([
      buildQuotesTab(),
      buildSettlementsTab(),
      buildVolumeTab(),
      buildSpecsTab(),
      buildMarginsTab(),
      buildCalendarTab(),
    ]);
  } catch (error) {
    return;
  }

  // Insert dynamic tabs after the overview section
  let insertAfter = overviewSection;
  dynamicTabs.forEach((tabSection) => {
    if (!tabSection) {
      return;
    }
    if (!insertAfter.parentNode) {
      return;
    }
    insertAfter.parentNode.insertBefore(tabSection, insertAfter.nextSibling);
    insertAfter = tabSection;
  });
}

/**
 * Initialize data loading for dynamic tabs
 * This function can be extended to preload data or set up real-time updates
 */
function initializeDataLoading() {
  // Placeholder for future enhancements:
  // - Preload data for visible tabs
  // - Set up WebSocket connections for real-time updates
  // - Initialize data refresh intervals
  // - Set up tab visibility tracking for lazy loading
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

  await createDynamicTabs(main);
  initializeDataLoading();
}

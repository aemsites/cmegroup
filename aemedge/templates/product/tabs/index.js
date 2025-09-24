/*
 * Product Tabs - Module Index
 *
 * Central export point for all tab modules.
 * Makes imports cleaner and provides a single place to manage tab registration.
 */

export { default as buildQuotesTab } from './quotes.js';
export { buildSettlementsTab } from './settlements.js';
export { buildVolumeTab } from './volume.js';
export { buildSpecsTab } from './specs.js';
export { buildMarginsTab } from './margins.js';
export { buildCalendarTab } from './calendar.js';

// Export utilities for external use if needed
export {
  createTabSection,
  createTabFragment,
  createBasicTabContent,
  PRODUCT_TABS_FRAGMENT_URL,
} from './utils.js';

// Tab registry for dynamic discovery
export const TAB_MODULES = [
  'quotes',
  'settlements',
  'volume',
  'specs',
  'margins',
  'calendar',
];

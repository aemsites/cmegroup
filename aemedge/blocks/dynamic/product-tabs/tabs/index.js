/*
 * Product Tabs - Module Index
 *
 * Central export point for all tab modules.
 * Makes imports cleaner and provides a single place to manage tab registration.
 */

export { default as buildQuotesTab } from './quotes.js';
export { default as buildSettlementsTab } from './settlements.js';
export { default as buildVolumeTab } from './volume.js';
export { default as buildSpecsTab } from './specs.js';
export { default as buildMarginsTab } from './margins.js';
export { default as buildCalendarTab } from './calendar.js';

// Export utilities for external use if needed
export {
  createTabSection,
  createTabFragment,
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

import { getMetadata } from '../../../../scripts/aem.js';
import { 
  createTabSection, 
  createTabFragment, 
  organizeToggleContent,
} from './utils.js';
import { TOGGLE_CONSTANTS } from '../constants.js';

// Enable futures/options toggle for this tab
export const HAS_FUTURES_OPTIONS_TOGGLE = true;

/**
 * Create futures content for calendar
 */
async function createFuturesContent() {
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Futures - Calendar</h2>`;
  
  const futuresContent = `
    <p><strong>Futures Trading Calendar:</strong> Key dates and events for futures contracts.</p>
    <p>View contract expiration dates, first notice days, last trading days, and trading holidays.</p>
  `;

  return [titleContent, futuresContent];
}

/**
 * Create options content for calendar
 */
async function createOptionsContent() {
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Options - Calendar</h2>`;
  
  const optionsContent = `
    <p>Options calendar data</p>
  `;

  return [titleContent, optionsContent];
}

/**
 * Create calendar content with independent, resilient blocks
 */
async function createCalendarContent() {
  const allBlocks = [];

  // Create each block independently - if one fails, others still load
  const blockCreators = [
    // Toggle content (futures/options)
    async () => {
      try {
        const futuresBlocks = await createFuturesContent();
        const optionsBlocks = await createOptionsContent();
        return organizeToggleContent({
          futuresBlocks,
          optionsBlocks,
          defaultActive: TOGGLE_CONSTANTS.toggleTypes.futures,
          tabId: 'calendar',
        });
      } catch (error) {
        return '<div class="no-results"><h4>Unable to load calendar toggle</h4></div>';
      }
    },

    // Fragment
    async () => {
      try {
        return await createTabFragment();
      } catch (error) {
        return null; // Silent fail
      }
    },
  ];

  // Load all blocks independently using resilient pattern
  const results = await Promise.allSettled(blockCreators.map(creator => creator()));
  
  // Add only successful blocks to the tab
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      allBlocks.push(result.value);
    }
  });

  return allBlocks;
}

/**
 * Builds the Calendar tab content
 * @returns {Element} Section element for calendar tab
 */
export default async function buildCalendarTab() {
  let blocks = [];
  try {
    blocks = await createCalendarContent();
  } catch (error) {
    blocks = ['<div class="no-results"><h4>Unable to load calendar data</h4></div>'];
  }
  return createTabSection('calendar', 'Calendar', blocks);
}

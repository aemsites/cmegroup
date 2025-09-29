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
 * Create futures content for settlements
 */
async function createFuturesContent() {
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Futures - Settlements</h2>`;

  const futuresContent = `
    <p><strong>Daily Settlement Prices:</strong> View final settlement prices for futures contracts across all expiration months.</p>
    <p>Settlement data includes previous day close, settlement price, and daily change for each contract month.</p>
  `;

  return [titleContent, futuresContent];
}

/**
 * Create options content for settlements
 */
async function createOptionsContent() {
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Options - Settlements</h2>`;

  const optionsContent = `
    <p>Options settlements data</p>
  `;

  return [titleContent, optionsContent];
}

/**
 * Create settlements content with independent, resilient blocks
 */
async function createSettlementsContent() {
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
          tabId: 'settlements',
        });
      } catch (error) {
        return '<div class="cards"><div class="no-results"><h4>Unable to load settlements toggle</h4></div></div>';
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
 * Builds the Settlements tab content
 * @returns {Element} Section element for settlements tab
 */
export default async function buildSettlementsTab() {
  let blocks = [];
  try {
    blocks = await createSettlementsContent();
  } catch (error) {
    blocks = ['<div class="cards"><div class="no-results"><h4>Unable to load settlements data</h4></div></div>'];
  }
  return createTabSection('settlements', 'Settlements', blocks);
}

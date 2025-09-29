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
 * Create futures content for volume
 */
async function createFuturesContent() {
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Futures - Volume</h2>`;

  const futuresContent = `
    <p><strong>Trading Volume & Open Interest:</strong> Daily trading volume and open interest statistics for futures contracts.</p>
    <p>Track market activity across all contract months with historical volume trends and market participation data.</p>
  `;

  return [titleContent, futuresContent];
}

/**
 * Create options content for volume
 */
async function createOptionsContent() {
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Options - Volume</h2>`;

  const optionsContent = `
    <p>Options volume data</p>
  `;

  return [titleContent, optionsContent];
}

/**
 * Create volume content with independent, resilient blocks
 */
async function createVolumeContent() {
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
          tabId: 'volume',
        });
      } catch (error) {
        return '<div class="cards"><div class="no-results"><h4>Unable to load volume toggle</h4></div></div>';
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
  const results = await Promise.allSettled(blockCreators.map((creator) => creator()));

  // Add only successful blocks to the tab
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      allBlocks.push(result.value);
    }
  });

  return allBlocks;
}

/**
 * Builds the Volume tab content
 * @returns {Element} Section element for volume tab
 */
export default async function buildVolumeTab() {
  let blocks = [];
  try {
    blocks = await createVolumeContent();
  } catch (error) {
    blocks = ['<div class="cards"><div class="no-results"><h4>Unable to load volume data</h4></div></div>'];
  }
  return createTabSection('volume', 'Volume', blocks);
}

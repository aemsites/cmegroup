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
 * Create futures content for specs
 */
async function createFuturesContent() {
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Futures - Specs</h2>`;
  
  const futuresContent = `
    <p><strong>Contract Specifications:</strong> Complete technical specifications for futures contracts.</p>
    <p>Includes contract size, tick size, trading hours, delivery specifications, and position limits.</p>
  `;

  return [titleContent, futuresContent];
}

/**
 * Create options content for specs
 */
async function createOptionsContent() {
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Options - Specs</h2>`;
  
  const optionsContent = `
    <p>Options specifications data</p>
  `;

  return [titleContent, optionsContent];
}

/**
 * Create specs content with independent, resilient blocks
 */
async function createSpecsContent() {
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
          tabId: 'specs',
        });
      } catch (error) {
        return '<div class="cards"><div class="no-results"><h4>Unable to load specs toggle</h4></div></div>';
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
 * Builds the Specs tab content
 * @returns {Element} Section element for specs tab
 */
export default async function buildSpecsTab() {
  let blocks = [];
  try {
    blocks = await createSpecsContent();
  } catch (error) {
    blocks = ['<div class="cards"><div class="no-results"><h4>Unable to load specs data</h4></div></div>'];
  }
  return createTabSection('specs', 'Specs', blocks);
}

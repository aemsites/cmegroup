import { 
  createTabSection, 
  createTabFragment, 
  organizeToggleContent,
  TOGGLE_CONSTANTS,
} from './utils.js';
import { getMetadata } from '../../../scripts/aem.js';

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

  const fragmentBlock = await createTabFragment();
  const blocks = [titleContent, futuresContent];
  
  if (fragmentBlock) {
    blocks.push(fragmentBlock);
  }
  
  return blocks;
}

/**
 * Create options content for volume
 */
async function createOptionsContent() {
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Options - Volume</h2>`;
  
  const optionsContent = `
    <p>Options volume and open interest data will be displayed here based on the selected expiration from the dropdown above.</p>
  `;

  const fragmentBlock = await createTabFragment();
  const blocks = [titleContent, optionsContent];
  
  if (fragmentBlock) {
    blocks.push(fragmentBlock);
  }
  
  return blocks;
}

/**
 * Create volume content with futures/options toggle
 */
async function createVolumeContent() {
  const futuresBlocks = await createFuturesContent();
  const optionsBlocks = await createOptionsContent();

  const toggleContent = organizeToggleContent({
    futuresBlocks,
    optionsBlocks,
    defaultActive: TOGGLE_CONSTANTS.toggleTypes.futures,
    tabId: 'volume',
  });

  return toggleContent;
}

/**
 * Builds the Volume tab content
 * @returns {Element} Section element for volume tab
 */
export async function buildVolumeTab() {
  const blocks = await createVolumeContent();
  return createTabSection('volume', 'Volume', blocks);
}

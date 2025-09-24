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
 * Create futures content for specs
 */
async function createFuturesContent() {
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Futures - Specs</h2>`;
  
  const futuresContent = `
    <p><strong>Contract Specifications:</strong> Complete technical specifications for futures contracts.</p>
    <p>Includes contract size, tick size, trading hours, delivery specifications, and position limits.</p>
  `;

  const fragmentBlock = await createTabFragment();
  const blocks = [titleContent, futuresContent];
  
  if (fragmentBlock) {
    blocks.push(fragmentBlock);
  }
  
  return blocks;
}

/**
 * Create options content for specs
 */
async function createOptionsContent() {
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Options - Specs</h2>`;
  
  const optionsContent = `
    <p>Options contract specifications will be displayed here based on the selected expiration from the dropdown above.</p>
  `;

  const fragmentBlock = await createTabFragment();
  const blocks = [titleContent, optionsContent];
  
  if (fragmentBlock) {
    blocks.push(fragmentBlock);
  }
  
  return blocks;
}

/**
 * Create specs content with futures/options toggle
 */
async function createSpecsContent() {
  const futuresBlocks = await createFuturesContent();
  const optionsBlocks = await createOptionsContent();

  const toggleContent = organizeToggleContent({
    futuresBlocks,
    optionsBlocks,
    defaultActive: TOGGLE_CONSTANTS.toggleTypes.futures,
    tabId: 'specs',
  });

  return toggleContent;
}

/**
 * Builds the Specs tab content
 * @returns {Element} Section element for specs tab
 */
export async function buildSpecsTab() {
  const blocks = await createSpecsContent();
  return createTabSection('specs', 'Specs', blocks);
}

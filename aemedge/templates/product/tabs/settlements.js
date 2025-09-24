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
 * Create futures content for settlements
 */
async function createFuturesContent() {
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Futures - Settlements</h2>`;

  const futuresContent = `
    <p><strong>Daily Settlement Prices:</strong> View final settlement prices for futures contracts across all expiration months.</p>
    <p>Settlement data includes previous day close, settlement price, and daily change for each contract month.</p>
  `;

  const fragmentBlock = await createTabFragment();
  const blocks = [titleContent, futuresContent];

  if (fragmentBlock) {
    blocks.push(fragmentBlock);
  }

  return blocks;
}

/**
 * Create options content for settlements
 */
async function createOptionsContent() {
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Options - Settlements</h2>`;

  const optionsContent = `
    <p>Options settlement data will be displayed here based on the selected expiration from the dropdown above.</p>
  `;

  const fragmentBlock = await createTabFragment();
  const blocks = [titleContent, optionsContent];

  if (fragmentBlock) {
    blocks.push(fragmentBlock);
  }

  return blocks;
}

/**
 * Create settlements content with futures/options toggle
 */
async function createSettlementsContent() {
  const futuresBlocks = await createFuturesContent();
  const optionsBlocks = await createOptionsContent();

  const toggleContent = organizeToggleContent({
    futuresBlocks,
    optionsBlocks,
    defaultActive: TOGGLE_CONSTANTS.toggleTypes.futures,
    tabId: 'settlements',
  });

  return toggleContent;
}

/**
 * Builds the Settlements tab content
 * @returns {Element} Section element for settlements tab
 */
export async function buildSettlementsTab() {
  const blocks = await createSettlementsContent();
  return createTabSection('settlements', 'Settlements', blocks);
}

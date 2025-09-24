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
 * Create futures content for calendar
 */
async function createFuturesContent() {
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Futures - Calendar</h2>`;
  
  const futuresContent = `
    <p><strong>Futures Trading Calendar:</strong> Key dates and events for futures contracts.</p>
    <p>View contract expiration dates, first notice days, last trading days, and trading holidays.</p>
  `;

  const fragmentBlock = await createTabFragment();
  const blocks = [titleContent, futuresContent];
  
  if (fragmentBlock) {
    blocks.push(fragmentBlock);
  }
  
  return blocks;
}

/**
 * Create options content for calendar
 */
async function createOptionsContent() {
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} Options - Calendar</h2>`;
  
  const optionsContent = `
    <p>Options calendar and expiration dates will be displayed here based on the selected expiration from the dropdown above.</p>
  `;

  const fragmentBlock = await createTabFragment();
  const blocks = [titleContent, optionsContent];
  
  if (fragmentBlock) {
    blocks.push(fragmentBlock);
  }
  
  return blocks;
}

/**
 * Create calendar content with futures/options toggle
 */
async function createCalendarContent() {
  const futuresBlocks = await createFuturesContent();
  const optionsBlocks = await createOptionsContent();

  const toggleContent = organizeToggleContent({
    futuresBlocks,
    optionsBlocks,
    defaultActive: TOGGLE_CONSTANTS.toggleTypes.futures,
    tabId: 'calendar',
  });

  return toggleContent;
}

/**
 * Builds the Calendar tab content
 * @returns {Element} Section element for calendar tab
 */
export async function buildCalendarTab() {
  const blocks = await createCalendarContent();
  return createTabSection('calendar', 'Calendar', blocks);
}

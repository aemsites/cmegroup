import {
  createTabSection,
  createTabFragment,
} from './utils.js';
import { getMetadata } from '../../../../scripts/aem.js';

// Disable futures/options toggle for this tab (can be enabled later if needed)
export const HAS_FUTURES_OPTIONS_TOGGLE = false;

/**
 * Create margins content with independent, resilient blocks
 */
async function createMarginsContent() {
  const allBlocks = [];

  // Create each block independently - if one fails, others still load
  const blockCreators = [
    // Title
    async () => {
      const productName = getMetadata('product') || 'Product';
      return `<h2>${productName} - Margins</h2>`;
    },

    // Margin Requirements Overview
    async () => `
      <h3>Margin Requirements</h3>
      <p><strong>Initial and Maintenance Margins:</strong> Performance bond requirements for trading positions.</p>
      <p>Margin requirements are set by the exchange and may change based on market volatility and risk assessments.</p>
    `,

    // Current Margin Rates
    async () => `
      <h3>Current Margin Rates</h3>
      <p><strong>Futures Contracts:</strong> View current initial and maintenance margin requirements for all contract months.</p>
      <p><strong>Options Contracts:</strong> Margin requirements for selling options and spread strategies.</p>
    `,

    // Margin Calculator
    async () => `
      <h3>Margin Calculator</h3>
      <p><strong>Position Sizing Tool:</strong> Calculate total margin requirements for your trading positions.</p>
      <p>Estimate margin impact for different contract quantities and portfolio combinations.</p>
    `,

    // Risk Management
    async () => `
      <h3>Risk Management</h3>
      <p><strong>Performance Bonds:</strong> Understand how margins work as performance bonds to ensure contract fulfillment.</p>
      <p>Learn about margin calls, variation margin, and daily settlement procedures.</p>
    `,

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
 * Builds the Margins tab content
 * @returns {Element} Section element for margins tab
 */
export default async function buildMarginsTab() {
  let blocks = [];
  try {
    blocks = await createMarginsContent();
  } catch (error) {
    blocks = ['<div class="cards"><div class="no-results"><h4>Unable to load margins data</h4></div></div>'];
  }
  return createTabSection('margins', 'Margins', blocks);
}

import {
  createTabSection,
  createTabFragment,
} from './utils.js';
import { getMetadata } from '../../../scripts/aem.js';

// Disable futures/options toggle for this tab (can be enabled later if needed)
export const HAS_FUTURES_OPTIONS_TOGGLE = false;

/**
 * Create margins content sections
 */
async function createMarginsContent() {
  const productName = getMetadata('product') || 'Product';
  const titleContent = `<h2>${productName} - Margins</h2>`;

  // Section 1: Margin Requirements Overview
  const marginOverview = `
    <h3>Margin Requirements</h3>
    <p><strong>Initial and Maintenance Margins:</strong> Performance bond requirements for trading positions.</p>
    <p>Margin requirements are set by the exchange and may change based on market volatility and risk assessments.</p>
  `;

  // Section 2: Current Margin Rates
  const currentRates = `
    <h3>Current Margin Rates</h3>
    <p><strong>Futures Contracts:</strong> View current initial and maintenance margin requirements for all contract months.</p>
    <p><strong>Options Contracts:</strong> Margin requirements for selling options and spread strategies.</p>
  `;

  // Section 3: Margin Calculator
  const marginCalculator = `
    <h3>Margin Calculator</h3>
    <p><strong>Position Sizing Tool:</strong> Calculate total margin requirements for your trading positions.</p>
    <p>Estimate margin impact for different contract quantities and portfolio combinations.</p>
  `;

  // Section 4: Risk Management
  const riskManagement = `
    <h3>Risk Management</h3>
    <p><strong>Performance Bonds:</strong> Understand how margins work as performance bonds to ensure contract fulfillment.</p>
    <p>Learn about margin calls, variation margin, and daily settlement procedures.</p>
  `;

  const fragmentBlock = await createTabFragment();
  const blocks = [
    titleContent,
    marginOverview,
    currentRates,
    marginCalculator,
    riskManagement,
  ];

  if (fragmentBlock) {
    blocks.push(fragmentBlock);
  }

  return blocks;
}

/**
 * Builds the Margins tab content
 * @returns {Element} Section element for margins tab
 */
export async function buildMarginsTab() {
  const blocks = await createMarginsContent();
  return createTabSection('margins', 'Margins', blocks);
}

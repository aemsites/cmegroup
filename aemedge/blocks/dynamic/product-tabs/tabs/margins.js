// Margins Tab - Single View (No Toggle)

import {
  createTabSection,
} from './utils.js';

export const HAS_FUTURES_OPTIONS_TOGGLE = false;

// Main Content Functions
async function createMarginsContent() {
  const allBlocks = [];

  // Authors can add content in source document
  // This tab has a single view without futures/options toggle
  return allBlocks;
}

export default async function buildMarginsTab() {
  let blocks = [];
  try {
    blocks = await createMarginsContent();
  } catch (error) {
    blocks = ['<div class="cards"><div class="no-results"><h4>Unable to load margins data</h4></div></div>'];
  }
  return createTabSection('margins', 'Margins', blocks);
}

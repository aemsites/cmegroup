// Margins Tab - Single View (No Toggle)

import {
  createTabSection,
  createErrorMessage,
} from '../helpers/utils.js';

export const HAS_FUTURES_OPTIONS_TOGGLE = false;

// Main Content Functions
async function createMarginsContent() {
  const allBlocks = [];

  // Authors can add content in source document
  // This tab has a single view without futures/options toggle
  return allBlocks;
}

export default async function buildMarginsTab(metadata = {}) {
  const { tabId, tabTitle } = metadata;

  let blocks = [];
  try {
    blocks = await createMarginsContent();
  } catch (error) {
    blocks = [createErrorMessage(tabTitle)];
  }
  return createTabSection(tabId, tabTitle, blocks);
}

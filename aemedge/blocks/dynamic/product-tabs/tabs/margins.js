// Margins Tab - Single View (No Toggle)

import {
  createTabSection,
  createErrorMessage,
} from '../helpers/utils.js';

// Main Content Functions
async function createMarginsContent() {
  const allBlocks = [];

  return allBlocks;
}

export default async function buildMarginsTab(metadata = {}) {
  const { tabId, tabTitle } = metadata;

  let blocks = [];
  try {
    blocks = await createMarginsContent(tabId, tabTitle);
  } catch (error) {
    blocks = [createErrorMessage(tabTitle)];
  }
  return createTabSection(tabId, tabTitle, blocks);
}

// Volume Tab - Futures and Options with Toggle System

/* eslint-disable import/no-cycle */
import {
  createTabSection,
  organizeToggleContent,
  createErrorMessage,
} from '../helpers/utils.js';
import { TOGGLE_CONSTANTS } from '../helpers/constants.js';

export const HAS_FUTURES_OPTIONS_TOGGLE = true;

// Content Functions
async function createFuturesContent() {
  // Authors can add content in source document
  return [];
}

async function createOptionsContent() {
  // Authors can add content in source document
  return [];
}

// Main Content Functions
async function createVolumeContent(tabId, tabTitle) {
  const allBlocks = [];

  // Create each block independently - if one fails, others still load
  const blockCreators = [
    // Toggle content (futures/options)
    async () => {
      try {
        return await organizeToggleContent({
          futuresBlocks: await createFuturesContent(),
          optionsBlocks: await createOptionsContent(),
          defaultActive: TOGGLE_CONSTANTS.toggleTypes.futures,
          tabId,
        });
      } catch (error) {
        return createErrorMessage(tabTitle);
      }
    },
  ];

  // Load all blocks independently using resilient pattern
  const results = await Promise.allSettled(blockCreators.map((creator) => creator()));

  // Add only successful blocks to the tab
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      allBlocks.push(result.value);
    }
  });

  return allBlocks;
}

export default async function buildVolumeTab(metadata = {}) {
  const { tabId, tabTitle } = metadata;

  let blocks = [];
  try {
    blocks = await createVolumeContent(tabId, tabTitle);
  } catch (error) {
    blocks = [createErrorMessage(tabTitle)];
  }
  return createTabSection(tabId, tabTitle, blocks);
}

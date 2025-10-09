// Settlements Tab - Futures and Options with Toggle System

/* eslint-disable import/no-cycle */
import {
  createTabSection,
  organizeToggleContent,
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
async function createSettlementsContent() {
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
          tabId: 'settlements',
        });
      } catch (error) {
        return '<div class="cards"><div class="no-results"><h4>Unable to load settlements toggle</h4></div></div>';
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

export default async function buildSettlementsTab() {
  let blocks = [];
  try {
    blocks = await createSettlementsContent();
  } catch (error) {
    blocks = ['<div class="cards"><div class="no-results"><h4>Unable to load settlements data</h4></div></div>'];
  }
  return createTabSection('settlements', 'Settlements', blocks);
}

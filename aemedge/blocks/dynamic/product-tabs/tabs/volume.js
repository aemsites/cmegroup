// Volume Tab - Futures and Options with Toggle System

/* eslint-disable import/no-cycle */
import {
  createTabSection,
  organizeToggleContent,
  createErrorMessage,
} from '../helpers/utils.js';
import { TOGGLE_CONSTANTS } from '../helpers/constants.js';

// Content Creation Functions
async function createFuturesContent() {
  const blocks = [];
  blocks.push('<p>Futures volume content</p>');
  return blocks;
}

async function createOptionsContent() {
  const blocks = [];
  blocks.push('<p>Options volume content</p>');
  return blocks;
}

// Main Content Functions
async function createVolumeContent(tabId, tabTitle, hasFuturesOptionsToggle) {
  const allBlocks = [];

  if (hasFuturesOptionsToggle) {
    // With toggle: show both futures and options with toggle UI
    try {
      const toggleContent = await organizeToggleContent({
        futuresBlocks: await createFuturesContent(),
        optionsBlocks: await createOptionsContent(),
        defaultActive: TOGGLE_CONSTANTS.toggleTypes.futures,
        tabId,
      });
      if (toggleContent) {
        allBlocks.push(toggleContent);
      }
    } catch (error) {
      allBlocks.push(createErrorMessage(tabTitle));
    }
  } else {
    // Without toggle: show default futures content only
    try {
      const futuresContent = await createFuturesContent();
      allBlocks.push(...futuresContent);
    } catch (error) {
      allBlocks.push(createErrorMessage(tabTitle));
    }
  }

  return allBlocks;
}

export default async function buildVolumeTab(metadata = {}) {
  const { tabId, tabTitle, hasFuturesOptionsToggle } = metadata;

  let blocks = [];
  try {
    blocks = await createVolumeContent(tabId, tabTitle, hasFuturesOptionsToggle);
  } catch (error) {
    blocks = [createErrorMessage(tabTitle)];
  }
  return createTabSection(tabId, tabTitle, blocks);
}

// Volume Tab - Futures and Options with Toggle System

/* eslint-disable import/no-cycle */
import {
  createTabSection,
  organizeToggleContent,
  createErrorMessage,
} from '../helpers/utils.js';
import { TOGGLE_CONSTANTS } from '../helpers/constants.js';

// Main Content Functions
async function createVolumeContent(tabId, tabTitle, hasFuturesOptionsToggle) {
  const allBlocks = [];

  if (hasFuturesOptionsToggle) {
    try {
      const futuresBlocks = ['<p>Futures volume content</p>'];
      const optionsBlocks = ['<p>Options volume content</p>'];

      const toggleContent = await organizeToggleContent({
        futuresBlocks,
        optionsBlocks,
        defaultActive: TOGGLE_CONSTANTS.toggleTypes.futures,
        tabId,
      });
      if (toggleContent) {
        allBlocks.push(toggleContent);
      }
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

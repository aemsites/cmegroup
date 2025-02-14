/* eslint-disable no-console */
/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { createElement } from '../../../library-utils.js';

// Format icon name to display text (e.g., "icon-name" -> "Icon Name")
function formatIconName(name) {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Create icon card element
function createIconCard(icon, container) {
  const card = createElement('sp-card', '', {
    variant: 'quiet',
    heading: icon.label,
    size: 's',
  });

  const cardIcon = createElement('div', 'icon', {
    size: 's',
    slot: 'preview',
  });

  cardIcon.innerHTML = icon.svg;
  card.append(cardIcon);

  // Add click handler for copying
  card.addEventListener('click', () => {
    navigator.clipboard.writeText(`:${icon.name}:`);
    container.dispatchEvent(new CustomEvent('Toast', {
      detail: { message: 'Copied Icon' },
    }));
  });

  return card;
}

// Process icons from a block
async function processIcons(pageBlock, path) {
  const icons = {};
  const { host } = new URL(path);
  const iconElements = [...pageBlock.querySelectorAll('span.icon')];

  await Promise.all(iconElements.map(async (icon) => {
    const iconClass = Array.from(icon.classList).find((c) => c.startsWith('icon-'));
    if (!iconClass) return;

    const iconName = iconClass.substring(5);
    const iconText = icon?.parentElement?.nextElementSibling?.textContent?.trim()
      || formatIconName(iconName);

    try {
      const response = await fetch(`https://${host}/icons/${iconName}.svg`);
      const svg = await response.text();
      icons[iconText] = { label: iconText, name: iconName, svg };
    } catch (error) {
      console.warn(`Failed to fetch icon: ${iconName}`, error);
    }
  }));

  return icons;
}

// Fetch and process block content
async function fetchBlock(path) {
  if (!window.blocks) window.blocks = {};
  if (!window.icons) window.icons = [];

  if (!window.blocks[path]) {
    const resp = await fetch(`${path}.plain.html`);
    if (!resp.ok) return null;

    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const icons = await processIcons(doc, path);

    window.blocks[path] = { doc, icons };
  }

  return window.blocks[path];
}

/**
 * Called when a user tries to load the plugin.
 * This takes all icons from all sheets and puts in 1 gridContainer
 * @param {HTMLElement} container The container to render the plugin in
 * @param {Object} data The data contained in the plugin sheet
 * @param {String} query If search is active, the current search query
 */
export async function decorate(container, data, query) {
  container.dispatchEvent(new CustomEvent('ShowLoader'));

  const gridContainer = createElement('div', 'grid-container');
  const iconGrid = createElement('div', 'icon-grid');
  gridContainer.append(iconGrid);

  try {
    await Promise.all(data.map(async ({ path }) => {
      const block = await fetchBlock(path);
      if (!block) return;

      // Filter and sort icons based on query
      const filteredIcons = Object.keys(block.icons)
        .filter((key) => !query || key.toLowerCase().includes(query.toLowerCase()))
        .sort();

      // Create cards for matching icons
      filteredIcons.forEach((iconText) => {
        const icon = block.icons[iconText];
        const card = createIconCard(icon, container);
        iconGrid.append(card);
      });
    }));

    container.append(gridContainer);
  } catch (error) {
    console.error('Error loading icons:', error);
    container.dispatchEvent(new CustomEvent('Toast', {
      detail: {
        message: 'Failed to load icons',
        variant: 'negative',
      },
    }));
  }

  container.dispatchEvent(new CustomEvent('HideLoader'));
}

export default {
  title: 'Icons',
  searchEnabled: true,
};

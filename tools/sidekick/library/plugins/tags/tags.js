/* eslint-disable no-unused-vars */
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

import { PLUGIN_EVENTS } from '../../events/events.js';
import { getTaxonomy } from '../../../../../scripts/taxonomy.js';

function buildHierarchicalMenu(taxonomy) {
  const menuItems = [];

  Object.entries(taxonomy).forEach(([type, category], catId) => {
    if (category.hide) return;

    // Add main category
    menuItems.push(`
      <div class="category-group collapsed" data-category="${catId}">
        <div class="category-header">
          <span class="expand-icon">+</span>
          <span class="category-title">${category.title}</span>
        </div>
        <div class="category-content">
    `);

    const processLevel = (items, level = 0) => {
      Object.entries(items).forEach(([key, item]) => {
        if (['title', 'name', 'path', 'hide'].includes(key) || item.hide) return;

        const hasChildren = Object.keys(item).some((k) => !['title', 'name', 'path', 'hide'].includes(k));

        if (hasChildren) {
          // Add subcategory
          menuItems.push(`
            <div class="subcategory-group collapsed">
              <div class="category-header">
                <span class="expand-icon">+</span>
                <span class="category-title">${item.title}</span>
              </div>
              <div class="category-content">
          `);
          processLevel(item, level + 1);
          menuItems.push('</div></div>');
        } else {
          // Add leaf tag item
          const pathParts = item.path.split('/');
          const displayPath = pathParts.length > 3
            ? `.../${pathParts.slice(-2).join('/')}`
            : pathParts.slice(0, -1).join('/');

          menuItems.push(`
            <div class="path-wrapper">
              <span class="path" data-full-path="${item.path}">
                <span class="path-hierarchy" title="${item.path}"/>
                </span>
                <span class="tag cat-${catId % 4}" data-title="${item.title}" data-path="${item.path}">
                  ${item.title}
                </span>
              </span>
            </div>
          `);
        }
      });
    };

    processLevel(category);
    menuItems.push('</div></div>');
  });

  return menuItems.join('');
}

function displaySelected(container) {
  const selectedPaths = Array.from(container.querySelectorAll('.path.selected'))
    .map((path) => {
      const { fullPath } = path.dataset;
      // Split the path and remove the first segment (tags/ or template/)
      const pathParts = fullPath.split('/');
      const processedPath = pathParts.slice(1).join('/');

      return {
        fullPath: processedPath,
        label: path.querySelector('.tag').dataset.title,
      };
    });

  const selectedEl = container.querySelector('#selected');
  const selectedTagsEl = selectedEl.querySelector('.selected-tags');
  selectedTagsEl.innerHTML = '';

  if (selectedPaths.length) {
    selectedPaths.forEach((tag) => {
      const div = document.createElement('div');
      div.className = 'selected-tag';
      div.textContent = tag.label;
      div.title = tag.fullPath;
      selectedTagsEl.appendChild(div);
    });

    container.querySelector('#copybuffer').value = selectedPaths
      .map((tag) => tag.fullPath)
      .join(', ');
    selectedEl.classList.remove('hidden');
  } else {
    selectedEl.classList.add('hidden');
  }
}

export async function decorate(container) {
  const taxonomy = await getTaxonomy();

  // Create container structure with selected section below filter
  container.innerHTML = `
    <div class="filter">
      <input type="text" id="search" placeholder="Type to filter tags..." autocomplete="off" />
    </div>
    <div id="selected" class="hidden">
      <div class="selected-header">Currently Selected Tags</div>
      <div class="selected-tags"></div>
      <div class="button-group">
        <button class="copy">Copy</button>
        <button class="clear">Clear</button>
      </div>
      <textarea id="copybuffer" class="hidden"></textarea>
    </div>
    <div id="results">
      ${buildHierarchicalMenu(taxonomy)}
    </div>
  `;

  // Event Handlers
  container.addEventListener('click', (e) => {
    // Category expand/collapse
    const categoryHeader = e.target.closest('.category-header');
    if (categoryHeader) {
      const group = categoryHeader.closest('.category-group, .subcategory-group');
      const icon = categoryHeader.querySelector('.expand-icon');
      group.classList.toggle('collapsed');
      icon.textContent = group.classList.contains('collapsed') ? '+' : '−';
      return;
    }

    // Tag selection
    const pathEl = e.target.closest('.path');
    if (pathEl) {
      pathEl.classList.toggle('selected');
      displaySelected(container);
    }
  });

  // Copy button handler
  container.querySelector('button.copy').addEventListener('click', async () => {
    const copyButton = container.querySelector('button.copy');
    const originalText = copyButton.textContent;

    try {
      await navigator.clipboard.writeText(container.querySelector('#copybuffer').value);
      copyButton.textContent = 'Copied!';
      container.dispatchEvent(
        new CustomEvent(PLUGIN_EVENTS.TOAST, {
          detail: { message: 'Tags Copied' },
        }),
      );
    } catch (err) {
      copyButton.textContent = 'Failed to copy';
    }

    setTimeout(() => {
      copyButton.textContent = originalText;
    }, 2000);
  });

  // Clear button handler
  container.querySelector('button.clear').addEventListener('click', () => {
    container.querySelectorAll('.path.selected').forEach((path) => {
      path.classList.remove('selected');
    });
    displaySelected(container);
  });

  // Search functionality
  container.querySelector('#search').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();

    if (!searchTerm) {
      container.querySelectorAll('.path').forEach((path) => {
        path.classList.remove('filtered');
      });
      container.querySelectorAll('.category-group, .subcategory-group').forEach((group) => {
        group.classList.add('collapsed');
        const icon = group.querySelector('.expand-icon');
        if (icon) icon.textContent = '+';
        group.style.display = 'block';
      });
      return;
    }

    container.querySelectorAll('.path').forEach((path) => {
      const tag = path.querySelector('.tag');
      const title = tag.dataset.title.toLowerCase();
      const fullPath = path.dataset.fullPath.toLowerCase();

      if (title.includes(searchTerm) || fullPath.includes(searchTerm)) {
        path.classList.remove('filtered');
        let parent = path.closest('.category-group, .subcategory-group');
        while (parent) {
          parent.classList.remove('collapsed');
          const icon = parent.querySelector('.expand-icon');
          if (icon) icon.textContent = '−';
          parent.style.display = 'block';
          parent = parent.parentElement.closest('.category-group, .subcategory-group');
        }
      } else {
        path.classList.add('filtered');
      }
    });

    container.querySelectorAll('.category-group, .subcategory-group').forEach((category) => {
      const hasVisiblePaths = category.querySelectorAll('.path:not(.filtered)').length > 0;
      category.style.display = hasVisiblePaths ? 'block' : 'none';
    });
  });
}

export default {
  title: 'Tags',
};

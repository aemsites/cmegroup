/* eslint-disable no-console */
import { getTaxonomy } from '../../../scripts/taxonomy.js';

function renderItem(item, catId) {
  const pathParts = item.path.split('/');
  const pathStr = pathParts.slice(0, -1).join('/');

  // Truncate long paths with ellipsis
  const displayPath = pathParts.length > 3
    ? `.../${pathParts.slice(-2).join('/')}`
    : pathStr;

  return `
    <span class="path" data-full-path="${item.path}">
      <span class="path-hierarchy" title="${pathStr}">
        ${displayPath}
      </span>
      <span data-title="${item.title}" data-path="${item.path}" class="tag cat-${catId % 4}">
        ${item.title}
      </span>
    </span>
  `;
}

function renderItems(item, catId, level = 0) {
  let html = '';
  if (!item.hide) {
    if (level === 0) {
      html += `<div class="category-group collapsed">
                <div class="category-header">
                  <span class="expand-icon">+</span>
                  <span class="category-title">${item.title}</span>
                </div>
                <div class="category-content">`;
    } else if (Object.keys(item).some((key) => !['title', 'name', 'path', 'hide'].includes(key))) {
      html += `<div class="subcategory-group collapsed">
                <div class="category-header">
                  <span class="expand-icon">+</span>
                  <span class="category-title">${item.title}</span>
                </div>
                <div class="category-content">`;
    } else {
      html += '<div class="path-wrapper">';
      html += renderItem(item, catId);
      html += '</div>';
    }
  }

  Object.keys(item).forEach((key) => {
    if (!['title', 'name', 'path', 'hide'].includes(key)) {
      html += renderItems(item[key], catId, level + 1);
    }
  });

  if (!item.hide && (level === 0 || Object.keys(item).some((key) => !['title', 'name', 'path', 'hide'].includes(key)))) {
    html += '</div></div>';
  }

  return html;
}

function displaySelected() {
  const selectedTags = Array.from(document.querySelectorAll('#results .path.selected'))
    .map((path) => {
      const { fullPath } = path.dataset;
      const pathParts = fullPath.split('/');
      const valuePath = pathParts.slice(1).join('/');

      return {
        fullPath: valuePath,
        label: path.querySelector('.tag').dataset.title,
      };
    });

  const selEl = document.getElementById('selected');
  const selTagsEl = selEl.querySelector('.selected-tags');
  selTagsEl.innerHTML = '';

  if (selectedTags.length) {
    selectedTags.forEach((tag) => {
      const div = document.createElement('div');
      div.className = 'selected-tag';
      div.textContent = tag.label;
      div.title = tag.fullPath;
      selTagsEl.appendChild(div);
    });

    document.getElementById('copybuffer').value = selectedTags.map((tag) => tag.fullPath).join(', ');
    selEl.classList.remove('hidden');
  } else {
    selEl.classList.add('hidden');
  }
}

function filter() {
  const searchTerm = document.getElementById('search').value.toLowerCase().trim();

  if (!searchTerm) {
    document.querySelectorAll('#results .path').forEach((path) => {
      path.classList.remove('filtered');
    });
    document.querySelectorAll('.category-group, .subcategory-group').forEach((group) => {
      group.classList.add('collapsed');
      const icon = group.querySelector('.expand-icon');
      if (icon) icon.textContent = '+';
      group.style.display = 'block';
    });
    return;
  }

  document.querySelectorAll('#results .path').forEach((path) => {
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

  document.querySelectorAll('.category-group, .subcategory-group').forEach((category) => {
    const hasVisiblePaths = category.querySelectorAll('.path:not(.filtered)').length > 0;
    category.style.display = hasVisiblePaths ? 'block' : 'none';
  });
}

async function init() {
  try {
    const tax = await getTaxonomy();
    const results = document.getElementById('results');
    results.innerHTML = Object.values(tax).map((cat, idx) => renderItems(cat, idx)).join('');

    document.querySelectorAll('.category-header').forEach((header) => {
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const group = header.closest('.category-group, .subcategory-group');
        const icon = header.querySelector('.expand-icon');
        group.classList.toggle('collapsed');
        icon.textContent = group.classList.contains('collapsed') ? '+' : '−';
      });
    });

    document.addEventListener('click', (e) => {
      const pathEl = e.target.closest('.path');
      if (pathEl) {
        pathEl.classList.toggle('selected');
        displaySelected();
      }
    });

    document.querySelector('button.copy').addEventListener('click', async () => {
      const copyButton = document.querySelector('button.copy');
      const originalText = copyButton.textContent;

      try {
        await navigator.clipboard.writeText(document.getElementById('copybuffer').value);
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
          copyButton.textContent = originalText;
        }, 2000);
      } catch (err) {
        copyButton.textContent = 'Failed to copy';
        setTimeout(() => {
          copyButton.textContent = originalText;
        }, 2000);
      }
    });

    document.querySelector('button.clear').addEventListener('click', () => {
      document.querySelectorAll('.path.selected').forEach((path) => {
        path.classList.remove('selected');
      });
      displaySelected();
    });

    document.querySelector('#search').addEventListener('input', filter);
  } catch (error) {
    console.error('Failed to initialize tagger:', error);
    document.getElementById('results').innerHTML = `
      <div class="error">Failed to load taxonomy data. Please try refreshing the page.</div>
    `;
  }
}

// Make sure all event listeners are set up after DOM is loaded
document.addEventListener('DOMContentLoaded', init);

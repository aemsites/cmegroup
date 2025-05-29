import { getTaxonomy } from '../../../aemedge/scripts/taxonomy.js';

class FilterConfig {
  constructor() {
    // Wait for DOM to be loaded before initializing
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  initialize() {
    // Initialize form elements first to ensure they exist
    this.initializeFormElements();
    this.initializeTabs();
    this.initializeTagManager();
    this.initializeCopyButtons();
    this.initializeTagger();
  }

  initializeTabs() {
    this.tabButtons = document.querySelectorAll('.tab-button');
    this.tabContents = document.querySelectorAll('.tab-content');

    this.tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons and contents
        this.tabButtons.forEach((btn) => btn.classList.remove('active'));
        this.tabContents.forEach((content) => content.classList.remove('active'));

        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        const tabId = button.dataset.tab;
        document.getElementById(tabId).classList.add('active');
      });
    });
  }

  initializeTagManager() {
    this.tagInput = document.getElementById('tag-input');
    this.addTagButton = document.getElementById('add-tag');
    this.tagsList = document.getElementById('tags-list');
    this.tags = new Set();

    // this.addTagButton.addEventListener('click', () => this.addTag());
    // this.tagInput.addEventListener('keypress', (e) => {
    //   if (e.key === 'Enter') {
    //     e.preventDefault();
    //     this.addTag();
    //   }
    // });
  }

  addTag() {
    const tagValue = this.tagInput.value.trim();
    if (tagValue && !this.tags.has(tagValue)) {
      this.tags.add(tagValue);
      this.createTagElement(tagValue);
      this.tagInput.value = '';
    }
  }

  createTagElement(tagValue) {
    const tagElement = document.createElement('div');
    tagElement.className = 'tag';
    tagElement.innerHTML = `
      <span>${tagValue}</span>
      <button class="tag-remove" aria-label="Remove tag">×</button>
    `;

    tagElement.querySelector('.tag-remove').addEventListener('click', () => {
      this.tags.delete(tagValue);
      tagElement.remove();
    });

    this.tagsList.appendChild(tagElement);
  }

  initializeFormElements() {
    // Initialize template checkboxes
    this.templateCheckboxes = document.querySelectorAll('.template-checkbox');
    this.pathInput = document.getElementById('path-input');
    this.cardTypeSelect = document.getElementById('card-type-select');

    // Add event listeners for form changes
    this.templateCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => this.handleFormChange());
    });

    [this.pathInput, this.cardTypeSelect].forEach((element) => {
      element.addEventListener('change', () => this.handleFormChange());
    });
  }

  getSelectedTemplates() {
    if (!this.templateCheckboxes) return [];
    return Array.from(this.templateCheckboxes)
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value)
      .filter(Boolean);
  }

  initializeCopyButtons() {
    // Store copy buttons as instance property
    this.copyButtons = document.querySelectorAll('.copy-button');
    
    this.copyButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleCopy(button);
      });
    });
  }

  async handleCopy(button) {
    const type = button.dataset.copy;
    let textToCopy = '';

    switch (type) {
      case 'template': {
        const selectedTemplates = this.getSelectedTemplates();
        textToCopy = selectedTemplates.join(',');
        break;
      }
      case 'path': {
        textToCopy = this.pathInput?.value || '';
        break;
      }
      case 'card': {
        textToCopy = this.cardTypeSelect?.value || '';
        break;
      }
      default:
        console.warn('Unknown copy type:', type);
        return;
    }

    if (!textToCopy) {
      console.warn('Nothing to copy for type:', type);
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      this.updateCopyButtonState(button, 'copied', 'Copied!');
    } catch (err) {
      console.error('Failed to copy:', err);
      this.updateCopyButtonState(button, 'error', 'Failed to copy');
    }
  }

  updateCopyButtonState(button, className, message) {
    const tooltip = button.querySelector('.copy-tooltip');
    if (!tooltip) return;
    
    const originalText = tooltip.textContent;
    button.classList.add(className);
    tooltip.textContent = message;
    
    setTimeout(() => {
      button.classList.remove(className);
      tooltip.textContent = originalText;
    }, 2000);
  }

  logWarning(...args) {
    console.warn(...args);
  }

  logError(...args) {
    console.error(...args);
  }

  handleFormChange() {
    // Get current values
    const config = {
      template: this.getSelectedTemplates(),
      path: this.pathInput.value,
      cardType: this.cardTypeSelect.value,
      tags: Array.from(this.tags),
    };

    // Emit change event with current configuration
    const event = new CustomEvent('filterconfig:change', {
      detail: config,
    });
    document.dispatchEvent(event);
  }

  // Public method to get current configuration
  getConfiguration() {
    return {
      template: this.getSelectedTemplates(),
      path: this.pathInput.value,
      cardType: this.cardTypeSelect.value,
      tags: Array.from(this.tags),
    };
  }

  async initializeTagger() {
    const taxonomy = await getTaxonomy('tags');
    const results = document.getElementById('tag-results');
    results.innerHTML = this.buildHierarchicalMenu(taxonomy);

    // Add click handlers for expand/collapse and tag selection
    document.addEventListener('click', (e) => {
      // Category selector handling
      const categorySelector = e.target.closest('.category-selector');
      if (categorySelector) {
        categorySelector.classList.toggle('selected');
        this.displaySelected();
        return;
      }

      // Category expand/collapse
      const categoryHeader = e.target.closest('.category-header');
      if (categoryHeader) {
        const group = categoryHeader.closest('.category-group, .subcategory-group');
        const icon = categoryHeader.querySelector('.expand-icon');
        group.classList.toggle('collapsed');
        icon.textContent = group.classList.contains('collapsed') ? '+' : '−';
        return;
      }

      // Individual tag selection
      const pathEl = e.target.closest('.path');
      if (pathEl && !pathEl.classList.contains('category-selector')) {
        pathEl.classList.toggle('selected');
        this.displaySelected();
      }
    });

    // Copy button handler
    const copyButton = document.querySelector('#tag-selected button.copy');
    copyButton.addEventListener('click', async () => {
      const originalText = copyButton.textContent;
      try {
        await navigator.clipboard.writeText(document.getElementById('tag-copybuffer').value);
        copyButton.textContent = 'Copied!';
      } catch (err) {
        copyButton.textContent = 'Failed to copy';
      }
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 2000);
    });

    // Clear button handler
    document.querySelector('#tag-selected button.clear').addEventListener('click', () => {
      document.querySelectorAll('.path.selected').forEach((path) => {
        path.classList.remove('selected');
      });
      this.displaySelected();
    });

    // Search functionality
    document.getElementById('tag-search').addEventListener('input', (e) => this.filterTags(e));
  }

  buildHierarchicalMenu(taxonomy) {
    const menuItems = [];

    Object.entries(taxonomy).forEach(([type, category], catId) => {
      if (category.hide) return;

      // Add main category
      const hasSubcategories = Object.keys(category).some((k) => !['title', 'name', 'path', 'hide'].includes(k));
      if (hasSubcategories) {
        menuItems.push(`
          <div class="category-group" data-category="${catId}">
            <div class="category-header">
              <span class="expand-icon">+</span>
              <span class="category-title">${category.title}</span>
            </div>
            <div class="category-content">
        `);
      } else {
        menuItems.push(`
          <div class="path-wrapper">
            <span class="path" data-full-path="${category.path}" data-title="${category.title}">
              <span class="path-hierarchy" title="${category.path}"/>
              </span>
              <span class="tag tag-data cat-${catId % 4}" data-title="${category.title}" data-path="${category.path}">
                ${category.title}
              </span>
            </span>
          </div>
        `);
      }

      const processLevel = (items, level = 0) => {
        Object.entries(items).forEach(([key, item]) => {
          if (['title', 'name', 'path', 'hide'].includes(key) || item.hide) return;

          const hasChildren = Object.keys(item).some((k) => !['title', 'name', 'path', 'hide'].includes(k));

          if (hasChildren) {
            menuItems.push(`
              <div class="subcategory-group collapsed">
                <div class="category-header">
                  <span class="expand-icon">+</span>
                  <span class="category-title">${item.title}</span>
                  <span class="category-selector path cat-${catId % 4} tag-data" data-title="${item.title}" data-full-path="${item.path}">
                    <img src="/icons/check.svg"/>
                  </span>
                </div>
                <div class="category-content">
            `);
            processLevel(item, level + 1);
            menuItems.push('</div></div>');
          } else {
            menuItems.push(`
              <div class="path-wrapper">
                <span class="path" data-full-path="${item.path}" data-title="${item.title}">
                  <span class="path-hierarchy" title="${item.path}"/>
                  </span>
                  <span class="tag cat-${catId % 4} tag-data" data-title="${item.title}" data-path="${item.path}">
                    ${item.title}
                  </span>
                </span>
              </div>
            `);
          }
        });
      };

      if (hasSubcategories) {
        processLevel(category);
        menuItems.push('</div></div>');
      }
    });

    return menuItems.join('');
  }

  displaySelected() {
    const selectedPaths = Array.from(document.querySelectorAll('.path.selected'))
      .map((path) => {
        const { fullPath, title } = path.dataset;
        return {
          fullPath,
          label: title,
        };
      });

    const selectedEl = document.getElementById('tag-selected');
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

      document.getElementById('tag-copybuffer').value = selectedPaths
        .map((tag) => tag.fullPath)
        .join(', ');
      selectedEl.classList.remove('hidden');
    } else {
      selectedEl.classList.add('hidden');
    }
  }

  filterTags(e) {
    const searchTerm = e.target.value.toLowerCase().trim();

    if (!searchTerm) {
      document.querySelectorAll('.path').forEach((path) => {
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

    document.querySelectorAll('.path').forEach((path) => {
      const title = path.dataset.title.toLowerCase();
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
}

// Initialize the filter configuration and expose it globally
window.addEventListener('DOMContentLoaded', () => {
  window.filterConfig = new FilterConfig();
});

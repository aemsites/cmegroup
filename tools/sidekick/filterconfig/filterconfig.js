import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { DA_ORIGIN } from 'https://da.live/nx/public/utils/constants.js';
import { getTaxonomy } from '../../../aemedge/scripts/taxonomy.js';

class FilterConfig {
  constructor() {
    this.selectedPaths = new Set();
    this.directoryStructure = {
      type: 'folder',
      children: {},
    };

    // Initialize SDK
    DA_SDK.then(({ context, token, actions }) => {
      this.context = context;
      this.token = token;
      this.daFetch = actions.daFetch;
      this.initialize();
    });
  }

  initialize() {
    // Initialize form elements first to ensure they exist
    this.initializeFormElements();
    this.initializeTabs();
    this.initializeTagManager();
    this.initializeCopyButtons();
    // this.initializeTagger();

    // Load education directory structure
    if (this.daFetch) {
      this.updateDirectoryStructure('/education');
    }
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

    // how i can add onclick listerner to template-option
    // and from there call oncahnge of template-checkbox
    this.templateOptions = document.querySelectorAll('.template-option');
    this.templateOptions.forEach((option) => {
      option.addEventListener('click', () => {
        const checkbox = option.querySelector('.template-checkbox');
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      });
    });

    [this.pathInput, this.cardTypeSelect].forEach((element) => {
      element.addEventListener('change', () => this.handleFormChange());
    });

    // Initialize path selection
    this.pathDropdown = document.querySelector('.path-dropdown');
    this.pathTree = document.querySelector('.path-tree');
    this.selectedPathsContainer = document.querySelector('.selected-paths');

    // Build initial directory tree
    this.renderDirectoryTree();

    // Add event listeners for path selection
    this.pathInput.addEventListener('input', () => this.handlePathSearch());
    this.pathInput.addEventListener('focus', () => this.showPathDropdown());
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.path-multiselect-container')) {
        this.hidePathDropdown();
      }
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
        textToCopy = Array.from(this.selectedPaths).join(',');
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
    
    // Store reference to avoid closure issues
    const self = this;
    setTimeout(() => {
      button.classList.remove(className);
      tooltip.textContent = originalText;
      self.handleFormChange();
    }, 2000);
  }

  logWarning(...args) {
    this.lastWarning = args;
    console.warn(...args);
  }

  logError(...args) {
    this.lastError = args;
    console.error(...args);
  }

  handleFormChange() {
    // Get current values
    const config = {
      template: this.getSelectedTemplates(),
      paths: Array.from(this.selectedPaths),
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
      paths: Array.from(this.selectedPaths),
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
    this.currentTaxonomy = taxonomy;
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
    this.lastSearchTerm = e.target.value;
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

  renderDirectoryTree(searchTerm = '') {
    if (!this.pathTree) {
      this.pathTree = document.querySelector('.path-tree');
      if (!this.pathTree) return;
    }

    // Render the tree HTML
    this.pathTree.innerHTML = this.buildDirectoryTree(this.directoryStructure, searchTerm);
    
    // Add click handlers for directory items
    this.pathTree.querySelectorAll('.path-tree-item').forEach((item) => {
      const parentLi = item.closest('.directory-item');
      if (!parentLi) return;

      // Handle folder toggle click
      const folderToggle = item.querySelector('.folder-toggle');
      if (folderToggle) {
        folderToggle.addEventListener('click', (e) => {
          e.stopPropagation();
          const ul = parentLi.querySelector('ul');
          if (ul) {
            const isExpanded = ul.style.display !== 'none';
            ul.style.display = isExpanded ? 'none' : 'block';
            folderToggle.textContent = isExpanded ? '▶' : '▼';
            parentLi.classList.toggle('expanded', !isExpanded);
          }
        });
      }

      // Handle folder name click for selection
      const itemName = item.querySelector('.item-name');
      if (itemName) {
        itemName.addEventListener('click', (e) => {
          e.stopPropagation();
          const path = parentLi.dataset.path;
          this.togglePathSelection(path);
        });
      }
    });
  }

  /**
   * Gets item icon based on type
   * @param {string} type - Item type (file or folder)
   * @returns {string} - Icon emoji to display
   */
  getItemIcon(type) {
    return type === 'folder' ? '📁' : '📄';
  }

  buildDirectoryTree(structure, searchTerm = '', currentPath = '', level = 0) {
    if (!structure || !structure.children) return '';
    
    let html = `<ul class="directory-list"${level > 0 ? ' style="display: none;"' : ''}>`;
    
    Object.entries(structure.children)
      .filter(([_, item]) => item.type === 'folder') // Only show folders
      .forEach(([name, item]) => {
        const fullPath = currentPath ? `${currentPath}/${name}` : `/${name}`;
        const isSelected = this.selectedPaths.has(fullPath);
        // Check if folder has actual subfolders, not just empty children object
        const hasSubfolders = item.children && 
          Object.values(item.children).some(child => child.type === 'folder');
        
        // Check if item matches search term
        if (searchTerm && !name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return;
        }

        const indentClass = level > 0 ? 'indented' : '';

        html += `
          <li class="directory-item ${isSelected ? 'selected' : ''} ${indentClass}" data-path="${fullPath}" data-type="folder">
            <div class="path-tree-item directory-item-content">
              <span class="item-icon">${hasSubfolders ? '📁' : '📂'}</span>
              <span class="item-name" data-selectable="true">${this.highlightMatch(name, searchTerm)}</span>
              ${isSelected ? '<span class="selected-indicator">✓</span>' : ''}
              ${hasSubfolders ? '<span class="folder-toggle">▶</span>' : ''}
            </div>
        `;

        if (hasSubfolders) {
          html += this.buildDirectoryTree(item, searchTerm, fullPath, level + 1);
        }

        html += '</li>';
      });

    html += '</ul>';
    return html;
  }

  highlightMatch(text, searchTerm) {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<span class="highlight-match">$1</span>');
  }

  handlePathSearch() {
    const searchTerm = this.pathInput.value.trim();
    this.renderDirectoryTree(searchTerm);
    this.showPathDropdown();
  }

  showPathDropdown() {
    this.pathDropdown.style.display = 'block';
  }

  hidePathDropdown() {
    this.pathDropdown.style.display = 'none';
  }

  togglePathSelection(path) {
    if (this.selectedPaths.has(path)) {
      this.selectedPaths.delete(path);
    } else {
      this.selectedPaths.add(path);
    }
    
    this.updateSelectedPathsDisplay();
    this.handleFormChange();
  }

  updateSelectedPathsDisplay() {
    if (!this.selectedPathsContainer) return;
    
    this.selectedPathsContainer.innerHTML = '';
    
    if (this.selectedPaths.size === 0) {
      this.selectedPathsContainer.innerHTML = '<div class="no-paths-selected">No paths selected</div>';
      return;
    }
    
    Array.from(this.selectedPaths).forEach(path => {
      const pathElement = document.createElement('div');
      pathElement.className = 'selected-path-item';
      
      const icon = this.getItemIcon(path.endsWith('/') ? 'folder' : 'file');
      
      pathElement.innerHTML = `
        <span class="item-icon">${icon}</span>
        <span class="path-text">${path}</span>
        <button class="remove-path" onclick="window.filterConfig.togglePathSelection('${path}')" aria-label="Remove path">×</button>
      `;
      
      this.selectedPathsContainer.appendChild(pathElement);
    });
  }

  /**
   * Gets direct children (files and folders) for a path
   * @param {string} path - Path to get children for
   * @returns {Promise<Object>} - Files and folders at the path
   */
  async getChildren(path) {
    const files = [];
    const folders = [];
  
    try {
      const resp = await this.daFetch(`${DA_ORIGIN}/list${path}`);
      if (resp.ok) {
        const json = await resp.json();
        json.forEach((child) => {
          if (child.ext) {
            files.push(child);
          } else {
            folders.push(child.path);
          }
        });
      }
    } catch (error) {
      console.error('Error getting children:', error);
    }
    
    return { files, folders };
  }

  /**
   * Updates directory structure with actual children from the server
   * @param {string} path - Path to update children for
   */
  async updateDirectoryStructure(path = '/education') {
    try {
      const basePath = `/${this.context.org}/${this.context.repo}`;
      const fullPath = `${basePath}${path}`;

      const { files, folders } = await this.getChildren(fullPath);

      // Format files and folders for display
      const filesArray = files
        .map((file) => ({
          type: 'file',
          name: file.name,
          path: file.path,
        }))
        .filter((file) => file.name !== 'index');

      const foldersArray = folders.map((folder) => ({
        name: folder.split('/').pop(),
        type: 'folder',
        path: folder,
        children: {},
      }));

      // Get the path parts excluding empty strings
      const pathParts = path.split('/').filter(Boolean);
      
      // Initialize root structure if it doesn't exist
      if (!this.directoryStructure) {
        this.directoryStructure = {
          type: 'folder',
          children: {},
        };
      }

      // Navigate to the correct node in the structure
      let currentNode = this.directoryStructure;
      
      // Navigate through the path parts and create structure as needed
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        if (!currentNode.children[part]) {
          currentNode.children[part] = {
            type: 'folder',
            children: {},
          };
        }
        currentNode = currentNode.children[part];
      }

      // Update current node with files and folders
      [...filesArray, ...foldersArray].forEach((item) => {
        currentNode.children[item.name] = {
          type: item.type,
          children: item.type === 'folder' ? {} : undefined,
          path: item.path,
        };
      }); 

      // Recursively update child folders
      await Promise.all(foldersArray.map(folder => 
        this.updateDirectoryStructure(`${path}/${folder.name}`)
      ));

      // Re-render the directory tree
      this.renderDirectoryTree();
    } catch (error) {
      console.error('Error updating directory structure:', error);
    }
  }
}

// Initialize the filter configuration and expose it globally
window.addEventListener('DOMContentLoaded', () => {
  window.filterConfig = new FilterConfig();
});

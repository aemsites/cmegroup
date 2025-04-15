/**
 * File Organiser Plugin for AEM Sidekick
 * This file contains utility functions for the organiser plugin
 */

// Import the DA SDK
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

class FileOrganiser {
  constructor(sidekick, context, token) {
    this.sk = sidekick;
    this.context = context;
    this.token = token;
    this.currentPath = '';
    this.fileItems = [];
    this.currentCrawl = null;
  }

  /**
   * Gets the current path from the sidekick
   * @returns {string} The current path
   */
  getCurrentPath() {
    if (this.sk && this.sk.location) {
      this.currentPath = this.sk.location.pathname;
      return this.currentPath;
    }
    return '';
  }

  /**
   * Navigates to a specified path and loads files
   * @param {string} path - The path to navigate to
   * @returns {Promise<Array>} - Promise that resolves to an array of file and folder objects
   */
  navigateToPath(path) {
    this.currentPath = path;
    document.getElementById('current-path').textContent = path;
    return this.fetchFilesAndFolders(path);
  }

  /**
   * Fetches files and folders from the current path using the crawl function
   * @param {string} path - The path to fetch files and folders from
   * @returns {Promise<Array>} - Promise that resolves to an array of file and folder objects
   */
  async fetchFilesAndFolders(path) {
    try {
      // Try to import the crawl function from DA SDK
      let crawlFunction;
      try {
        const { crawl } = await import('https://da.live/nx/public/utils/tree.js');
        crawlFunction = crawl;
      } catch (e) {
        console.warn('Could not import crawl function, using mock data', e);
        return this.fetchMockData();
      }
      
      // Show loading indicator
      const fileList = document.getElementById('file-list');
      fileList.innerHTML = '<div class="organiser-loading">Loading files and folders...<span id="progress-count">0</span> items found</div>';
      
      // Show cancel button
      const cancelButton = document.getElementById('cancel-button');
      if (cancelButton) {
        cancelButton.style.display = 'inline-block';
      }
      
      return new Promise((resolve) => {
        const files = [];
        let count = 0;
        const progressEl = document.getElementById('progress-count');
        
        const path = path || this.currentPath;
        const basePath = `/${this.context.org}/${this.context.repo}`;
        const fullPath = path.startsWith('/') ? path : `${basePath}${path}`;
        
        const opts = {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        };
        
        const { results, cancelCrawl, getDuration } = crawlFunction({
          path: fullPath,
          callback: (file) => {
            // Transform the file data to match our expected format
            files.push({
              name: file.name || file.path.split('/').pop(),
              type: file.type === 'directory' ? 'folder' : 'file',
              path: file.path
            });
            count++;
            if (progressEl) {
              progressEl.textContent = count;
            }
          },
          throttle: 10,
          ...opts
        });
        
        // Store the cancel function
        this.currentCrawl = { cancelCrawl };
        
        // Set up cancel button
        if (cancelButton) {
          cancelButton.addEventListener('click', () => {
            if (this.currentCrawl && this.currentCrawl.cancelCrawl) {
              this.currentCrawl.cancelCrawl();
            }
            cancelButton.style.display = 'none';
          }, { once: true });
        }
        
        // When all results are ready
        results.then(() => {
          if (cancelButton) {
            cancelButton.style.display = 'none';
          }
          console.log(`Crawl completed in ${getDuration()}`);
          resolve(files);
        });
      });
    } catch (error) {
      console.error('Error fetching files and folders:', error);
      return this.fetchMockData();
    }
  }

  /**
   * Fallback function to return mock data when the API fails
   * @returns {Promise<Array>} - Promise that resolves to an array of mock file and folder objects
   */
  fetchMockData() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { name: 'images', type: 'folder', path: `${this.currentPath}/images` },
          { name: 'styles', type: 'folder', path: `${this.currentPath}/styles` },
          { name: 'scripts', type: 'folder', path: `${this.currentPath}/scripts` },
          { name: 'index.html', type: 'file', path: `${this.currentPath}/index.html` },
          { name: 'about.html', type: 'file', path: `${this.currentPath}/about.html` },
          { name: 'contact.html', type: 'file', path: `${this.currentPath}/contact.html` },
        ]);
      }, 500);
    });
  }

  /**
   * Cancels the current crawl operation if one is in progress
   */
  cancelCurrentCrawl() {
    if (this.currentCrawl && this.currentCrawl.cancelCrawl) {
      this.currentCrawl.cancelCrawl();
      this.currentCrawl = null;
      
      const cancelButton = document.getElementById('cancel-button');
      if (cancelButton) {
        cancelButton.style.display = 'none';
      }
    }
  }

  /**
   * Sorts files and folders by name
   * @param {Array} items - The items to sort
   * @returns {Array} - The sorted items
   */
  sortItems(items) {
    return [...items].sort((a, b) => {
      // Folders first, then files
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Gets the file icon based on file type and extension
   * @param {Object} item - The file or folder item
   * @returns {string} - The icon to use
   */
  getItemIcon(item) {
    if (item.type === 'folder') {
      return '📁';
    }
    
    // Determine icon based on file extension
    const extension = item.name.split('.').pop().toLowerCase();
    switch (extension) {
      case 'html':
      case 'htm':
        return '📄';
      case 'css':
        return '🎨';
      case 'js':
        return '📜';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return '🖼️';
      case 'md':
        return '📝';
      case 'json':
        return '📋';
      default:
        return '📄';
    }
  }

  /**
   * Creates a formatted order list for copying
   * @param {Array} items - The items to format
   * @param {string} format - The format to use (comma, list, or path)
   * @returns {string} - The formatted list
   */
  createFormattedList(items, format = 'comma') {
    if (!items || items.length === 0) {
      return '';
    }
    
    // Filter to only selected items if there are any
    const selectedItems = items.filter(item => item.selected);
    const itemsToFormat = selectedItems.length > 0 ? selectedItems : items;
    
    switch (format) {
      case 'comma':
        return itemsToFormat.map(item => item.name).join(',');
      case 'list':
        return itemsToFormat.map(item => item.name).join('\n');
      case 'path':
        return itemsToFormat.map(item => item.path || `${this.currentPath}/${item.name}`).join('\n');
      default:
        return itemsToFormat.map(item => item.name).join(',');
    }
  }

  /**
   * Gets selected items based on checkboxes
   * @returns {Array} - Array of selected items
   */
  getSelectedItems() {
    const checkboxes = document.querySelectorAll('.organiser-item-checkbox:checked');
    const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));
    
    return this.fileItems.filter((_, index) => selectedIndices.includes(index));
  }
}

/**
 * Initializes the organiser interface and sets up event handlers
 */
(async function init() {
  try {
    // Import DA SDK components
    const { context, token, actions } = await DA_SDK;
    
    // Get UI elements
    const container = document.querySelector('.organiser-container');
    const fileList = document.getElementById('file-list');
    const searchInput = document.getElementById('search-input');
    const refreshBtn = document.getElementById('refresh-button');
    const cancelBtn = document.getElementById('cancel-button');
    const copyBtn = document.getElementById('copy-button');
    const formatSelect = document.getElementById('format-select');
    const pathDisplay = document.getElementById('current-path');
    
    // Create organiser instance with SDK context
    const organiser = new FileOrganiser(null, context, token);
    
    // Show initial loading state
    if (fileList) {
      fileList.innerHTML = '<div class="organiser-loading">Loading files and folders...</div>';
    }
    
    // Set up event listeners
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterFiles(e.target.value);
      });
    }
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadFiles();
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (organiser.currentCrawl && organiser.currentCrawl.cancelCrawl) {
          organiser.currentCrawl.cancelCrawl();
          cancelBtn.style.display = 'none';
        }
      });
    }
    
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        copyOrderToClipboard();
      });
    }
    
    // Function to filter files based on search input
    function filterFiles(searchTerm) {
      const items = document.querySelectorAll('.organiser-item');
      searchTerm = searchTerm.toLowerCase();
      
      items.forEach(item => {
        // Skip parent folder from search
        if (item.classList.contains('parent')) return;
        
        const name = item.querySelector('.organiser-item-name').textContent.toLowerCase();
        if (name.includes(searchTerm) || searchTerm === '') {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    }
    
    // Function to load files from current path
    async function loadFiles() {
      if (searchInput) {
        searchInput.value = '';
      }
      
      try {
        // Get current path from URL or use default
        const pathname = window.location.pathname;
        const currentPath = pathname.startsWith('/edit') ? 
          window.location.hash.substring(1) : pathname;
        
        if (pathDisplay) {
          pathDisplay.textContent = currentPath;
        }
        
        organiser.currentPath = currentPath;
        
        // Fetch and display files
        const files = await organiser.fetchFilesAndFolders(currentPath);
        organiser.fileItems = organiser.sortItems(files);
        renderFileList();
        
        // Set up drag and drop
        setupDragAndDrop();
      } catch (error) {
        console.error('Error loading files:', error);
        if (fileList) {
          fileList.innerHTML = `<div class="organiser-error">Error loading files: ${error.message}</div>`;
        }
      }
    }
    
    // Function to render file list
    function renderFileList() {
      if (!fileList) return;
      
      fileList.innerHTML = '';
      
      // Add parent directory option if not at root
      if (organiser.currentPath && organiser.currentPath !== '/') {
        const parentPath = organiser.currentPath.split('/').slice(0, -1).join('/') || '/';
        const parentEl = document.createElement('div');
        parentEl.className = 'organiser-item folder parent';
        parentEl.innerHTML = `
          <span class="organiser-item-icon">📂</span>
          <span class="organiser-item-name">..</span>
        `;
        parentEl.addEventListener('click', () => {
          organiser.navigateToPath(parentPath).then(() => renderFileList());
        });
        fileList.appendChild(parentEl);
      }
      
      if (organiser.fileItems.length === 0) {
        fileList.innerHTML += '<div class="organiser-empty">No files or folders found</div>';
        return;
      }
      
      organiser.fileItems.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = `organiser-item ${item.type}`;
        itemEl.draggable = true;
        itemEl.dataset.index = index;
        
        const icon = organiser.getItemIcon(item);
        itemEl.innerHTML = `
          <input type="checkbox" class="organiser-item-checkbox" data-index="${index}">
          <span class="organiser-item-icon">${icon}</span>
          <span class="organiser-item-name">${item.name}</span>
        `;
        
        // Add checkbox event listener
        const checkbox = itemEl.querySelector('.organiser-item-checkbox');
        checkbox.addEventListener('change', (e) => {
          e.stopPropagation();
          if (checkbox.checked) {
            itemEl.classList.add('selected');
            item.selected = true;
          } else {
            itemEl.classList.remove('selected');
            item.selected = false;
          }
        });
        
        // Add double-click for navigation into folders
        if (item.type === 'folder') {
          itemEl.addEventListener('dblclick', () => {
            const newPath = `${organiser.currentPath === '/' ? '' : organiser.currentPath}/${item.name}`;
            organiser.navigateToPath(newPath).then(() => renderFileList());
          });
        }
        
        fileList.appendChild(itemEl);
      });
    }
    
    // Function to set up drag and drop
    function setupDragAndDrop() {
      if (!fileList) return;
      
      let draggedItem = null;
      
      fileList.addEventListener('dragstart', (e) => {
        const target = e.target.closest('.organiser-item');
        if (!target) return;
        
        draggedItem = target;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', draggedItem.innerHTML);
        draggedItem.classList.add('dragging');
      });
      
      fileList.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const target = e.target.closest('.organiser-item');
        if (!target || target === draggedItem) return;
        
        // Clear previous borders
        document.querySelectorAll('.organiser-item').forEach(item => {
          item.style.borderTop = '';
          item.style.borderBottom = '';
        });
        
        const boundingRect = target.getBoundingClientRect();
        const offset = boundingRect.y + (boundingRect.height / 2);
        
        if (e.clientY - offset > 0) {
          target.style.borderBottom = '2px solid #1473e6';
        } else {
          target.style.borderTop = '2px solid #1473e6';
        }
      });
      
      fileList.addEventListener('drop', (e) => {
        e.preventDefault();
        
        // Clear all borders
        document.querySelectorAll('.organiser-item').forEach(item => {
          item.style.borderTop = '';
          item.style.borderBottom = '';
        });
        
        const target = e.target.closest('.organiser-item');
        if (!target || target === draggedItem) return;
        
        // Get indices
        const draggedIndex = parseInt(draggedItem.dataset.index);
        const targetIndex = parseInt(target.dataset.index);
        
        // Make a copy of the dragged item
        const draggedItemData = organiser.fileItems[draggedIndex];
        
        // Remember selection state
        const wasSelected = draggedItemData.selected;
        
        // Remove from original position
        organiser.fileItems.splice(draggedIndex, 1);
        
        // Determine insert position
        const boundingRect = target.getBoundingClientRect();
        const offset = boundingRect.y + (boundingRect.height / 2);
        
        if (e.clientY - offset > 0) {
          // Insert after target
          const insertIndex = targetIndex + (targetIndex > draggedIndex ? 0 : 1);
          organiser.fileItems.splice(insertIndex, 0, draggedItemData);
        } else {
          // Insert before target
          const insertIndex = targetIndex - (targetIndex > draggedIndex ? 1 : 0);
          organiser.fileItems.splice(insertIndex, 0, draggedItemData);
        }
        
        // Re-render
        renderFileList();
        
        // Restore selection state if needed
        if (wasSelected) {
          const newIndex = organiser.fileItems.indexOf(draggedItemData);
          const checkbox = document.querySelector(`.organiser-item-checkbox[data-index="${newIndex}"]`);
          if (checkbox) {
            checkbox.checked = true;
            checkbox.closest('.organiser-item').classList.add('selected');
          }
        }
      });
      
      fileList.addEventListener('dragend', () => {
        if (draggedItem) {
          draggedItem.classList.remove('dragging');
          draggedItem = null;
        }
        
        document.querySelectorAll('.organiser-item').forEach(item => {
          item.style.borderTop = '';
          item.style.borderBottom = '';
        });
      });
    }
    
    // Function to copy order to clipboard
    function copyOrderToClipboard() {
      if (!formatSelect) return;
      
      const format = formatSelect.value;
      const orderedList = organiser.createFormattedList(organiser.fileItems, format);
      
      navigator.clipboard.writeText(orderedList).then(() => {
        const copySuccess = document.getElementById('copy-success');
        if (copySuccess) {
          copySuccess.classList.add('show');
          setTimeout(() => {
            copySuccess.classList.remove('show');
          }, 2000);
        }
      }).catch(err => {
        console.error('Could not copy text: ', err);
        alert('Failed to copy to clipboard: ' + err);
      });
    }
    
    // Load files initially
    await loadFiles();
    
  } catch (error) {
    console.error('Error initializing organiser:', error);
    const container = document.querySelector('.organiser-container');
    if (container) {
      container.innerHTML = `
        <div class="organiser-error">
          <h2>Error initializing organiser</h2>
          <p>${error.message}</p>
          <p>Please try refreshing the page.</p>
        </div>
      `;
    }
  }
}());
// External dependencies
import { createElement } from '../../../../scripts/utils.js';
import { getMetadata } from '../../../../scripts/aem.js';

// Internal constants
import {
  TOGGLE_CONSTANTS,
  API_CONFIG,
} from './constants.js';

/**
 * Generic fetch utility for JSON data following project patterns
 * @param {string} url - The endpoint URL
 * @param {Object} options - Fetch options (headers, etc.)
 * @returns {Promise<Object|null>} JSON data or null if fetch fails
 */
export async function fetchJsonData(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

/**
 * Fetch expirations data for options dropdown
 * @returns {Promise<Array|null>} Array of expiration options or null if fetch fails
 */
export async function fetchExpirationsData() {
  return fetchJsonData(API_CONFIG.expirations);
}

/**
 * Create options dropdown with data from API
 * @param {Array} expirationsData - Array of expiration options from API
 * @returns {Element} Dropdown element
 */
export function createOptionsDropdown(expirationsData = []) {
  // Create dropdown container
  const dropdown = createElement('div', {
    class: TOGGLE_CONSTANTS.toggleClasses.dropdown,
  });

  // Create dropdown button
  const dropdownButton = createElement('button', {
    class: `${TOGGLE_CONSTANTS.toggleClasses.dropdownButton} ${TOGGLE_CONSTANTS.toggleClasses.button}`,
    'data-toggle': TOGGLE_CONSTANTS.toggleTypes.options,
  });
  dropdownButton.textContent = 'OPTIONS';

  // Create dropdown arrow icon
  const arrow = createElement('span', { class: 'dropdown-arrow' });
  arrow.innerHTML = '▼';
  dropdownButton.appendChild(arrow);

  // Create dropdown menu
  const dropdownMenu = createElement('div', {
    class: TOGGLE_CONSTANTS.toggleClasses.dropdownMenu,
  });

  // Populate dropdown with API data
  if (expirationsData && expirationsData.length > 0) {
    expirationsData.forEach((option) => {
      const menuItem = createElement('a', {
        role: 'menuitem',
        'data-value': option.productId,
        tabindex: '0',
        class: TOGGLE_CONSTANTS.toggleClasses.dropdownItem,
      });

      const linkSpan = createElement('span', { class: 'link' });
      linkSpan.textContent = option.label;
      menuItem.appendChild(linkSpan);

      dropdownMenu.appendChild(menuItem);
    });
  } else {
    // No fallback - return empty dropdown if no data
    const noDataItem = createElement('a', {
      role: 'menuitem',
      'data-value': '',
      tabindex: '0',
      class: TOGGLE_CONSTANTS.toggleClasses.dropdownItem,
    });
    const linkSpan = createElement('span', { class: 'link' });
    linkSpan.textContent = 'No options available';
    noDataItem.appendChild(linkSpan);
    dropdownMenu.appendChild(noDataItem);
  }

  dropdown.appendChild(dropdownButton);
  dropdown.appendChild(dropdownMenu);

  // Add event listener to toggle dropdown visibility
  dropdownButton.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent document click from closing immediately
    dropdown.classList.toggle(TOGGLE_CONSTANTS.toggleClasses.dropdownOpen);
  });

  // Handle option selection - keep button text as "OPTIONS" but process the selection
  dropdownMenu.addEventListener('click', (event) => {
    const menuItem = event.target.closest(`.${TOGGLE_CONSTANTS.toggleClasses.dropdownItem}`);
    if (menuItem) {
      const selectedText = menuItem.querySelector('.link').textContent;
      // Keep button text as "OPTIONS" - don't change it
      dropdown.classList.remove(TOGGLE_CONSTANTS.toggleClasses.dropdownOpen);

      // Trigger custom event for other components to listen to
      const customEvent = new CustomEvent('optionSelected', {
        detail: {
          productId: menuItem.dataset.value,
          label: selectedText,
        },
      });
      document.dispatchEvent(customEvent);
    }
  });

  // Close dropdown if clicked outside
  document.addEventListener('click', (event) => {
    if (!dropdown.contains(event.target)) {
      dropdown.classList.remove(TOGGLE_CONSTANTS.toggleClasses.dropdownOpen);
    }
  });

  return dropdown;
}

/**
 * Creates a section with tab metadata for the tabs system
 * @param {string} tabId - The tab identifier
 * @param {string} tabTitle - The display title for the tab
 * @param {Array} blocks - Array of block elements to include in the tab
 * @returns {Element} The section element with proper tab configuration
 */
export function createTabSection(tabId, tabTitle, blocks = []) {
  const section = createElement('div', { class: 'section tabs' });
  section.dataset.tabId = tabId;
  section.dataset.tabTitle = tabTitle;
  section.dataset.sectionStatus = 'initialized';
  section.style.display = 'none';

  // Create content structure that matches manual sections
  if (blocks.length > 0) {
    blocks.forEach((block) => {
      if (typeof block === 'string') {
        // Create a wrapper div for HTML content
        const contentDiv = createElement('div', { class: 'default-content-wrapper' });
        contentDiv.innerHTML = block;
        section.appendChild(contentDiv);
      } else {
        // Create a wrapper div for block elements
        const blockWrapper = createElement('div');
        const blockName = block?.dataset?.blockName || 'block';
        blockWrapper.classList.add(`${blockName}-wrapper`);
        blockWrapper.appendChild(block);
        section.appendChild(blockWrapper);
      }
    });
  }

  return section;
}

// Track initialized toggles to prevent duplicates
const initializedToggles = new Set();

// Store toggle configurations for different tabs
const toggleConfigs = new Map();

/**
 * Integrates Futures/Options toggle into the existing tabs navigation
 * This function should be called after the tabs system is initialized
 * @param {Object} config - Configuration object
 * @param {boolean} config.showFutures - Whether to show Futures toggle
 * @param {boolean} config.showOptions - Whether to show Options toggle
 * @param {string} config.defaultActive - Default active toggle ('futures' or 'options')
 * @param {string} config.tabId - Unique identifier for this tab's toggle
 */
export function integrateTabToggle(config = {}) {
  const {
    showFutures = true,
    showOptions = true,
  } = config;

  if (!showFutures && !showOptions) {
    return;
  }

  // Use MutationObserver to watch for tabs system initialization
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.classList?.contains('tabs-list')) {
          addToggleToTabsList(node, config);
          observer.disconnect(); // Stop observing once we find the tabs list
        }
      });
    });
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also check if tabs list already exists
  setTimeout(() => {
    const existingTabsList = document.querySelector('.tabs-list.desktop-tabs');
    if (existingTabsList) {
      addToggleToTabsList(existingTabsList, config);
      observer.disconnect();
    }
  }, 100);
}

/**
 * Adds toggle buttons to the existing tabs list with options dropdown
 * @param {Element} tabsList - The tabs-list element
 * @param {Object} config - Toggle configuration
 */
async function addToggleToTabsList(tabsList, config) {
  const {
    showFutures = true,
    showOptions = true,
    tabId = 'default',
    defaultActive = TOGGLE_CONSTANTS.toggleTypes.futures,
  } = config;

  // Check if this tab is currently active
  const activeTab = tabsList.querySelector('button[aria-selected="true"]');
  if (!activeTab || !activeTab.id.includes(tabId)) {
    // Remove toggle if different tab is active
    const existingToggle = tabsList.querySelector('.futures-options-toggle');
    if (existingToggle) {
      existingToggle.remove();
      tabsList.classList.remove('has-toggle');
      // Also remove from tabs-wrapper
      const tabsWrapper = tabsList.closest('.tabs-wrapper');
      if (tabsWrapper) {
        tabsWrapper.classList.remove('has-toggle');
      }
    }
    return;
  }

  // Remove existing toggle if it exists
  const existingToggle = tabsList.querySelector('.futures-options-toggle');
  if (existingToggle) {
    existingToggle.remove();
  }

  // Create toggle container
  const toggleContainer = createElement('div', {
    class: TOGGLE_CONSTANTS.toggleClasses.container,
    'data-tab-toggle': tabId,
  });

  if (showFutures) {
    const futuresBtn = createElement('button', {
      class: `${TOGGLE_CONSTANTS.toggleClasses.button} ${defaultActive === TOGGLE_CONSTANTS.toggleTypes.futures ? TOGGLE_CONSTANTS.toggleClasses.active : ''}`,
      'data-toggle': TOGGLE_CONSTANTS.toggleTypes.futures,
      'data-tab': tabId,
    });
    futuresBtn.textContent = 'FUTURES';
    toggleContainer.appendChild(futuresBtn);
  }

  if (showOptions) {
    // Fetch expirations data for dropdown
    const expirationsData = await fetchExpirationsData();

    // Create options dropdown instead of simple button
    const optionsDropdown = createOptionsDropdown(expirationsData);
    optionsDropdown.dataset.tab = tabId;
    toggleContainer.appendChild(optionsDropdown);
  }

  // Add toggle to the tabs list (positioned absolutely via CSS)
  tabsList.appendChild(toggleContainer);

  // Add class to indicate toggle is present
  tabsList.classList.add('has-toggle');

  // Also add class to tabs-wrapper
  const tabsWrapper = tabsList.closest('.tabs-wrapper');
  if (tabsWrapper) {
    tabsWrapper.classList.add('has-toggle');
  }

  // Initialize toggle functionality for this tab
  initializeToggle(tabId);
}

/**
 * Checks current tab state and shows/hides toggle accordingly
 */
function checkAndUpdateToggle() {
  const tabsList = document.querySelector('.tabs-list.desktop-tabs');
  const activeTab = tabsList?.querySelector('button[aria-selected="true"]');

  if (!tabsList || !activeTab) {
    return;
  }

  // Check if the active tab has toggle configuration
  let foundConfig = null;
  let foundTabId = null;

  // Check all stored toggle configs to see which one matches the active tab
  const configEntries = Array.from(toggleConfigs.entries());
  configEntries.forEach(([tabId, config]) => {
    if (activeTab.id.includes(tabId) && !foundConfig) {
      foundConfig = config;
      foundTabId = tabId;
    }
  });

  if (foundConfig && foundTabId) {
    // This tab has toggle functionality, show its toggle
    addToggleToTabsList(tabsList, foundConfig);
  } else {
    // No toggle needed for this tab, remove any existing toggle
    const existingToggle = tabsList.querySelector('.futures-options-toggle');
    if (existingToggle) {
      existingToggle.remove();
      tabsList.classList.remove('has-toggle');
      // Also remove from tabs-wrapper
      const tabsWrapper = tabsList.closest('.tabs-wrapper');
      if (tabsWrapper) {
        tabsWrapper.classList.remove('has-toggle');
      }
    }
  }
}

/**
 * Listens for tab changes and shows/hides toggles accordingly
 * Also handles initial page load with hash navigation
 * This should be called once globally, not per tab
 */
export function setupTabToggleIntegration() {
  // Prevent duplicate initialization
  if (setupTabToggleIntegration.initialized) {
    return;
  }
  setupTabToggleIntegration.initialized = true;

  // Listen for tab state changes (clicks)
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('tabs-tab')) {
      setTimeout(checkAndUpdateToggle, 50);
    }
  });

  // Listen for hash changes (browser navigation)
  window.addEventListener('hashchange', () => {
    setTimeout(checkAndUpdateToggle, 100);
  });

  // Check for initial toggle state when tabs system is ready
  // Use MutationObserver to detect when tabs are fully initialized
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.classList?.contains('tabs-list')) {
          // Tabs system is now ready, check if we need to show toggle
          setTimeout(checkAndUpdateToggle, 100);
          observer.disconnect();
        }
      });
    });
  });

  // Start observing for tabs initialization
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also check if tabs already exist (in case they loaded before this script)
  setTimeout(() => {
    const existingTabsList = document.querySelector('.tabs-list.desktop-tabs');
    if (existingTabsList) {
      checkAndUpdateToggle();
      observer.disconnect();
    }
  }, 500);
}

/**
 * Updates the tab title dynamically based on the active toggle
 * @param {string} tabId - The tab identifier
 * @param {string} toggleType - The active toggle type ('futures' or 'options')
 */
function updateTabTitle(tabId, toggleType) {
  // Get product name from metadata
  const productName = getMetadata('product');

  // Determine the title based on toggle type
  const titleType = toggleType === TOGGLE_CONSTANTS.toggleTypes.options ? 'Options' : 'Futures';
  const tabDisplayName = tabId.charAt(0).toUpperCase() + tabId.slice(1);
  const newTitle = `${productName} ${titleType} - ${tabDisplayName}`;

  // Find and update the title element in the active content
  const activeContent = document.querySelector(`[data-tab="${tabId}"][data-toggle-content].${TOGGLE_CONSTANTS.toggleClasses.active}`);
  if (activeContent) {
    const titleElement = activeContent.querySelector('h2');
    if (titleElement) {
      titleElement.textContent = newTitle;
    }
  }
}

/**
 * Stores toggle configuration for a specific tab
 * @param {string} tabId - Tab identifier
 * @param {Object} config - Toggle configuration
 */
export function setToggleConfig(tabId, config) {
  toggleConfigs.set(tabId, config);
}

/**
 * Organizes content blocks into futures and options sections
 * @param {Object} contentConfig - Configuration object
 * @param {Array} contentConfig.futuresBlocks - Blocks for futures content
 * @param {Array} contentConfig.optionsBlocks - Blocks for options content
 * @param {string} contentConfig.defaultActive - Default active content
 * @param {string} contentConfig.tabId - Tab identifier
 * @returns {Element} Container element with organized content sections
 */
export function organizeToggleContent(contentConfig = {}) {
  const {
    futuresBlocks = [],
    optionsBlocks = [],
    defaultActive = TOGGLE_CONSTANTS.toggleTypes.futures,
    tabId = 'default',
  } = contentConfig;

  // Create a container for the toggle content
  const toggleContainer = createElement('div', {
    class: 'toggle-container',
    'data-tab': tabId,
  });

  // NOTE: Toggle navigation is handled separately by the existing toggle system
  // organizeToggleContent only organizes the content sections, not the navigation

  // Create futures content section
  if (futuresBlocks.length > 0) {
    const futuresSection = createElement('div', {
      class: `${TOGGLE_CONSTANTS.toggleClasses.content} ${TOGGLE_CONSTANTS.toggleClasses.futuresContent} ${defaultActive === TOGGLE_CONSTANTS.toggleTypes.futures ? TOGGLE_CONSTANTS.toggleClasses.active : ''}`,
      'data-toggle-content': TOGGLE_CONSTANTS.toggleTypes.futures,
      'data-tab': tabId,
    });

    futuresBlocks.forEach((block) => {
      if (typeof block === 'string') {
        const contentDiv = createElement('div', { class: 'default-content-wrapper' });
        contentDiv.innerHTML = block;
        futuresSection.appendChild(contentDiv);
      } else {
        const blockWrapper = createElement('div');
        blockWrapper.classList.add(`${block.dataset.blockName || 'block'}-wrapper`);
        blockWrapper.appendChild(block);
        futuresSection.appendChild(blockWrapper);
      }
    });

    toggleContainer.appendChild(futuresSection);
  }

  // Create options content section
  if (optionsBlocks.length > 0) {
    const optionsSection = createElement('div', {
      class: `${TOGGLE_CONSTANTS.toggleClasses.content} ${TOGGLE_CONSTANTS.toggleClasses.optionsContent} ${defaultActive === TOGGLE_CONSTANTS.toggleTypes.options ? TOGGLE_CONSTANTS.toggleClasses.active : ''}`,
      'data-toggle-content': TOGGLE_CONSTANTS.toggleTypes.options,
      'data-tab': tabId,
    });

    optionsBlocks.forEach((block) => {
      if (typeof block === 'string') {
        const contentDiv = createElement('div', { class: 'default-content-wrapper' });
        contentDiv.innerHTML = block;
        optionsSection.appendChild(contentDiv);
      } else {
        const blockWrapper = createElement('div');
        blockWrapper.classList.add(`${block.dataset.blockName || 'block'}-wrapper`);
        blockWrapper.appendChild(block);
        optionsSection.appendChild(blockWrapper);
      }
    });

    toggleContainer.appendChild(optionsSection);
  }

  return toggleContainer;
}
/**
 * Initialize toggle functionality for a specific tab
 * @param {string} tabId - The tab identifier
 */
export function initializeToggle(tabId) {
  // Prevent duplicate initialization
  if (initializedToggles.has(tabId)) {
    return;
  }
  initializedToggles.add(tabId);

  // Handle futures button clicks
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains(TOGGLE_CONSTANTS.toggleClasses.button)
        && e.target.dataset.tab === tabId
        && e.target.dataset.toggle === TOGGLE_CONSTANTS.toggleTypes.futures) {
      e.preventDefault();
      switchToToggleContent(tabId, TOGGLE_CONSTANTS.toggleTypes.futures);
    }
  });

  // Handle options dropdown button clicks
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains(TOGGLE_CONSTANTS.toggleClasses.dropdownButton)
        && e.target.closest(`[data-tab="${tabId}"]`)) {
      e.preventDefault();
      toggleDropdownMenu(tabId);
    }
  });

  // Handle dropdown item selections
  document.addEventListener('click', (e) => {
    if (e.target.closest(`.${TOGGLE_CONSTANTS.toggleClasses.dropdownItem}`)
        && e.target.closest(`[data-tab="${tabId}"]`)) {
      e.preventDefault();

      const item = e.target.closest(`.${TOGGLE_CONSTANTS.toggleClasses.dropdownItem}`);
      const productId = item.dataset.value;
      const label = item.querySelector('.link')?.textContent || 'Options';

      handleOptionSelection(tabId, productId, label);
      closeDropdownMenu(tabId);
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest(`.${TOGGLE_CONSTANTS.toggleClasses.dropdown}[data-tab="${tabId}"]`)) {
      closeDropdownMenu(tabId);
    }
  });
}

/**
 * Switch to specific toggle content type (reusable across all tabs)
 * @param {string} tabId - The tab identifier
 * @param {string} toggleType - The toggle type ('futures' or 'options')
 */
function switchToToggleContent(tabId, toggleType) {
  // Update content visibility first
  const allContent = document.querySelectorAll(`[data-tab="${tabId}"][data-toggle-content]`);
  allContent.forEach((content) => {
    content.classList.remove(TOGGLE_CONSTANTS.toggleClasses.active);
  });

  const targetContent = document.querySelector(`[data-tab="${tabId}"][data-toggle-content="${toggleType}"]`);
  if (targetContent) {
    targetContent.classList.add(TOGGLE_CONSTANTS.toggleClasses.active);
  }

  // Update button styling - remove active from all toggle buttons
  const toggleContainer = document.querySelector(`[data-tab-toggle="${tabId}"]`);
  if (toggleContainer) {
    const allButtons = toggleContainer.querySelectorAll(`.${TOGGLE_CONSTANTS.toggleClasses.button}`);
    allButtons.forEach((button) => {
      button.classList.remove(TOGGLE_CONSTANTS.toggleClasses.active);
    });

    // Activate the appropriate button
    if (toggleType === TOGGLE_CONSTANTS.toggleTypes.futures) {
      const futuresBtn = toggleContainer.querySelector(`[data-toggle="${TOGGLE_CONSTANTS.toggleTypes.futures}"]`);
      if (futuresBtn) {
        futuresBtn.classList.add(TOGGLE_CONSTANTS.toggleClasses.active);
      }
    } else if (toggleType === TOGGLE_CONSTANTS.toggleTypes.options) {
      const optionsBtn = toggleContainer.querySelector(`.${TOGGLE_CONSTANTS.toggleClasses.dropdownButton}`);
      if (optionsBtn) {
        optionsBtn.classList.add(TOGGLE_CONSTANTS.toggleClasses.active);
      }
    }
  }

  // Update the dynamic title after content is switched
  updateTabTitle(tabId, toggleType);
}

/**
 * Toggle dropdown menu visibility (reusable across all tabs)
 * @param {string} tabId - The tab identifier
 */
function toggleDropdownMenu(tabId) {
  const dropdown = document.querySelector(`.${TOGGLE_CONSTANTS.toggleClasses.dropdown}[data-tab="${tabId}"]`);
  if (dropdown) {
    dropdown.classList.toggle(TOGGLE_CONSTANTS.toggleClasses.dropdownOpen);
  }
}

/**
 * Close dropdown menu (reusable across all tabs)
 * @param {string} tabId - The tab identifier
 */
function closeDropdownMenu(tabId) {
  const dropdown = document.querySelector(`.${TOGGLE_CONSTANTS.toggleClasses.dropdown}[data-tab="${tabId}"]`);
  if (dropdown) {
    dropdown.classList.remove(TOGGLE_CONSTANTS.toggleClasses.dropdownOpen);
  }
}

/**
 * Handle option selection from dropdown (reusable across all tabs)
 * This function can be extended per tab to handle different behaviors
 * @param {string} tabId - The tab identifier
 * @param {string} productId - Selected product ID
 * @param {string} label - Selected option label
 */
function handleOptionSelection(tabId, productId, label) {
  // Switch to options content
  switchToToggleContent(tabId, TOGGLE_CONSTANTS.toggleTypes.options);

  // Keep button text as "OPTIONS" - don't change it
  // (Button text should always remain "OPTIONS" regardless of selection)

  // Trigger custom event for tab-specific handling
  const customEvent = new CustomEvent('optionSelected', {
    detail: { tabId, productId, label },
  });
  document.dispatchEvent(customEvent);
}

// ===== BLOCK CREATION UTILITIES =====

/**
 * Creates a block with proper error handling
 * @param {Function} blockCreator - Function that creates the block
 * @param {string} blockName - Name of the block for error message
 * @returns {Promise<Element|string>} Block element or error message HTML
 */
export async function createBlockWithErrorHandling(blockCreator, blockName = 'content') {
  try {
    const block = await blockCreator();
    if (block) {
      return block;
    }
    return `<div class="no-results"><h4>Unable to load ${blockName}</h4></div>`;
  } catch (error) {
    return `<div class="no-results"><h4>Unable to load ${blockName}</h4></div>`;
  }
}

// ===== TABLE UTILITIES =====

/**
 * Unified table builder - one function for all table creation needs
 * Uses buildBlock as foundation with optional custom cell overrides
 * @param {Array} headers - Array of header strings
 * @param {Array} data - Array of data rows (each row is an array of cell values)
 * @param {Object} options - Configuration options
 * @returns {Promise<HTMLElement|null>} - The created table block
 */
export async function buildTable(headers, data, options = {}) {
  try {
    const {
      variant = '',
      tableId = '',
      className = '',
      customCells = new Map(), // Map of cellKey -> custom element (e.g., '0-1' for row 0, cell 1)
    } = options;

    // Create table block using manual DOM approach (works with table decorator)
    const tableBlock = document.createElement('div');
    tableBlock.classList.add('table', 'dynamic'); // Add dynamic class for dynamic blocks
    tableBlock.dataset.blockName = 'table';

    // Add variant classes and ID
    if (variant) {
      tableBlock.classList.add(variant);
    }
    if (className) {
      tableBlock.classList.add(className);
    }
    if (tableId) {
      tableBlock.id = tableId;
    }

    // Create HTML table structure
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    // Add header row
    const headerRow = document.createElement('tr');
    headers.forEach((header) => {
      const th = document.createElement('th');
      th.innerHTML = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Add data rows
    data.forEach((rowData, rowIndex) => {
      const tr = document.createElement('tr');

      rowData.forEach((cellData, cellIndex) => {
        const td = document.createElement('td');
        const cellKey = `${rowIndex}-${cellIndex}`;

        // Check if there's a custom cell for this position
        if (customCells.has(cellKey)) {
          td.appendChild(customCells.get(cellKey));
        } else {
          td.innerHTML = cellData;
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableBlock.appendChild(table);

    return tableBlock;
  } catch (error) {
    return null;
  }
}

/**
 * Update a specific table row with new data
 * @param {string} tableId - ID of the table to update
 * @param {number} rowIndex - Index of the row to update (0-based, within tbody)
 * @param {Array} newData - Array of new cell values
 * @param {Object} options - Update options
 */
export function updateTableRow(tableId, rowIndex, newData, options = {}) {
  try {
    const { skipCells = [], formatters = new Map() } = options;

    const table = document.getElementById(tableId);
    if (!table) {
      return false;
    }

    const dataRow = table.querySelector(`tbody tr:nth-child(${rowIndex + 1})`);
    if (!dataRow) {
      return false;
    }

    const cells = dataRow.querySelectorAll('td');

    newData.forEach((cellData, cellIndex) => {
      if (skipCells.includes(cellIndex) || !cells[cellIndex]) {
        return;
      }

      // Apply formatter if available
      let formattedData = cellData;
      if (formatters.has(cellIndex)) {
        formattedData = formatters.get(cellIndex)(cellData);
      }

      cells[cellIndex].innerHTML = formattedData;
    });

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Update a specific table cell
 * @param {string} tableId - ID of the table to update
 * @param {number} rowIndex - Index of the row (0-based, within tbody)
 * @param {number} cellIndex - Index of the cell (0-based)
 * @param {string} newValue - New cell value
 * @param {Function} formatter - Optional formatter function
 */
export function updateTableCell(tableId, rowIndex, cellIndex, newValue, formatter = null) {
  try {
    const table = document.getElementById(tableId);
    if (!table) {
      return false;
    }

    const dataRow = table.querySelector(`tbody tr:nth-child(${rowIndex + 1})`);
    if (!dataRow) {
      return false;
    }

    const cell = dataRow.querySelector(`td:nth-child(${cellIndex + 1})`);
    if (!cell) {
      return false;
    }

    const formattedValue = formatter ? formatter(newValue) : newValue;
    cell.innerHTML = formattedValue;

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Common cell formatters for financial data
 */
export const TABLE_FORMATTERS = {
  // Format volume numbers with thousands separators
  volume: (value) => {
    const num = parseInt(value || '0', 10);
    return num.toLocaleString();
  },

  // Format price change with color classes
  change: (change, percentageChange) => {
    const changeValue = change || '-';
    const percentValue = percentageChange || '-';
    const isNegative = changeValue.startsWith('-');
    const className = isNegative ? 'change-negative' : 'change-positive';
    return `<span class="${className}">${changeValue} (${percentValue})</span>`;
  },

  // Format timestamp
  timestamp: (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const timeString = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
    const dateString = date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `${timeString}<br>${dateString}`;
  },

  // Format simple time (for same-day updates)
  simpleTime: (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  },

  // Default formatter (no change)
  default: (value) => value || '-',
};

/**
 * Create a dropdown for table cells
 * @param {Array} options - Array of option objects with { value, label }
 * @param {string} selectedValue - Currently selected value
 * @param {string} className - CSS class for the dropdown
 * @param {Function} onChange - Callback function for value changes
 * @returns {HTMLElement} - The dropdown element
 */
export function createTableDropdown(options, selectedValue, className = '', onChange = null) {
  const dropdownContainer = createElement('div', {
    class: `table-dropdown ${className}`,
  });

  const dropdownButton = createElement('button', {
    class: 'table-dropdown-btn',
    'data-selected': selectedValue,
  });

  const selectedOption = options.find((opt) => opt.value === selectedValue);
  const displayText = selectedOption ? selectedOption.label : (options[0]?.label || 'Select');
  dropdownButton.textContent = displayText;

  const arrow = createElement('span', { class: 'dropdown-arrow' });
  arrow.innerHTML = '▼';
  dropdownButton.appendChild(arrow);

  const dropdownMenu = createElement('div', {
    class: 'table-dropdown-menu',
  });

  options.forEach((option) => {
    const menuItem = createElement('a', {
      role: 'menuitem',
      'data-value': option.value,
      tabindex: '0',
      class: 'table-dropdown-item',
    });

    const linkSpan = createElement('span', { class: 'link' });
    linkSpan.textContent = option.label;
    menuItem.appendChild(linkSpan);

    dropdownMenu.appendChild(menuItem);
  });

  dropdownContainer.appendChild(dropdownButton);
  dropdownContainer.appendChild(dropdownMenu);

  // Add event listeners if onChange callback is provided
  if (onChange) {
    dropdownContainer.addEventListener('click', (e) => {
      if (e.target.closest('.table-dropdown-btn')) {
        e.preventDefault();
        dropdownContainer.classList.toggle('open');
      }

      if (e.target.closest('.table-dropdown-item')) {
        e.preventDefault();
        const item = e.target.closest('.table-dropdown-item');
        const { value } = item.dataset;
        const label = item.querySelector('.link')?.textContent || '';

        dropdownButton.childNodes[0].textContent = label;
        dropdownButton.dataset.selected = value;
        dropdownContainer.classList.remove('open');

        onChange(value, label);
      }
    });
  }

  return dropdownContainer;
}

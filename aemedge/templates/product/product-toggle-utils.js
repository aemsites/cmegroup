/**
 * Product Toggle Utilities
 * Extracted from product-tabs block for use in product template
 * Handles Futures/Options dropdown and contract selection
 */

import { createElement } from '../../scripts/utils.js';
import { apiGet, getResponseData } from '../../scripts/utils/index.js';
import { getMetadata } from '../../scripts/aem.js';
import { getProductMetadata } from '../../scripts/utils/product.js';

// Toggle Constants - CSS classes and configuration
export const TOGGLE_CONSTANTS = {
  toggleClasses: {
    container: 'futures-options-toggle',
    button: 'toggle-btn',
    active: 'active',
    dropdown: 'options-dropdown',
    dropdownButton: 'dropdown-btn',
    dropdownMenu: 'dropdown-menu',
    dropdownItem: 'dropdown-item',
    dropdownOpen: 'dropdown-open',
  },
  toggleTypes: {
    futures: 'futures',
    options: 'options',
  },
};

// API Configuration
const API_CONFIG = {
  // Old mock endpoint
  mockExpirations: '/aemedge/blocks/dynamic/product-tabs/mock-api/expirations.json',
  // New real endpoint - requires productId parameter
  realExpirationsEndpoint: 'https://www.cmegroup.com/CmeWS/md/Product/V2/FullProductWithOptions/ProductId/',
  // Local fallback for testing (avoids CORS)
  localFallbackEndpoint: '/aemedge/templates/product/',
};

/**
 * Get product ID from metadata (using product utilities)
 * @returns {Promise<string|null>} Product ID
 */
async function getProductIdFromMetadata() {
  try {
    // Use the same utility that hero-baseball and other blocks use
    const productMetadata = await getProductMetadata();
    if (productMetadata && productMetadata.productId) {
      return productMetadata.productId;
    }

    // Fallback to direct metadata
    const productId = getMetadata('product-id');
    if (productId) return productId;
    
    // Last fallback to meta tag
    const meta = document.querySelector('meta[name="product-id"]');
    return meta ? meta.content : null;
  } catch (error) {
    console.error('Error getting product ID:', error);
    return null;
  }
}

/**
 * Fetch expirations data from CME API
 * @param {string} productId - Optional product ID override
 * @returns {Promise<Array>} Array of expiration options
 */
export async function fetchExpirationsData(productId = null) {
  const pid = productId || await getProductIdFromMetadata();
  if (!pid) return [];

  // Try real API first, fallback to local JSON if CORS error
  try {
    const endpoint = `${API_CONFIG.realExpirationsEndpoint}${pid}`;
    const response = await apiGet(endpoint, {}, {}, { withCredentials: false });
    const data = getResponseData(response) || response.data;

    if (data && data.optionsLabels && Array.isArray(data.optionsLabels)) {
      return data.optionsLabels.map((option) => ({
        productId: option.productId,
        label: option.label,
        name: option.name,
        optionType: option.optionType,
        productIds: option.productIds,
        weekly: option.weekly === 'true' || option.weekly === true,
        daily: option.daily === 'true' || option.daily === true,
      }));
    }

    throw new Error('No optionsLabels in response');
  } catch (error) {
    // Fallback to local JSON file
    try {
      const localEndpoint = `${API_CONFIG.localFallbackEndpoint}${pid}.json`;
      const response = await fetch(localEndpoint);
      if (!response.ok) throw new Error('Local file not found');
      
      const data = await response.json();

      if (data && data.optionsLabels && Array.isArray(data.optionsLabels)) {
        return data.optionsLabels.map((option) => ({
          productId: option.productId,
          label: option.label,
          name: option.name,
          optionType: option.optionType,
          productIds: option.productIds,
          weekly: option.weekly === 'true' || option.weekly === true,
          daily: option.daily === 'true' || option.daily === true,
        }));
      }

      return [];
    } catch (fallbackError) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch expirations data:', fallbackError);
      return [];
    }
  }
}

/**
 * Create options dropdown with data from API
 * @param {Array} expirationsData - Array of expiration options from API
 * @param {string} selectedValue - Currently selected contract ID
 * @returns {Element} Dropdown element
 */
export function createOptionsDropdown(expirationsData = [], selectedValue = null) {
  // Create dropdown container
  const dropdown = createElement('div', {
    class: TOGGLE_CONSTANTS.toggleClasses.dropdown,
  });

  // Create dropdown button
  const dropdownButton = createElement('button', {
    class: `${TOGGLE_CONSTANTS.toggleClasses.dropdownButton} ${TOGGLE_CONSTANTS.toggleClasses.button}`,
    'data-toggle': TOGGLE_CONSTANTS.toggleTypes.options,
    type: 'button',
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
        'data-product-id': option.productId,
        'data-option-type': option.optionType || '',
        tabindex: '0',
        class: TOGGLE_CONSTANTS.toggleClasses.dropdownItem,
      });

      // Mark as selected if it matches
      if (selectedValue && option.productId === selectedValue) {
        menuItem.classList.add('selected');
      }

      const linkSpan = createElement('span', { class: 'link' });
      linkSpan.textContent = option.label;
      menuItem.appendChild(linkSpan);

      dropdownMenu.appendChild(menuItem);
    });
  } else {
    // Fallback when no data
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
    event.preventDefault();
    event.stopPropagation();
    dropdown.classList.toggle(TOGGLE_CONSTANTS.toggleClasses.dropdownOpen);
  });

  // Handle option selection
  dropdownMenu.addEventListener('click', (event) => {
    event.preventDefault();
    const menuItem = event.target.closest(`.${TOGGLE_CONSTANTS.toggleClasses.dropdownItem}`);
    if (menuItem && menuItem.dataset.productId) {
      const selectedProductId = menuItem.dataset.productId;
      const selectedLabel = menuItem.querySelector('.link').textContent;
      const selectedOptionType = menuItem.dataset.optionType;

      dropdown.classList.remove(TOGGLE_CONSTANTS.toggleClasses.dropdownOpen);

      // Dispatch custom event for navigation
      const customEvent = new CustomEvent('optionContractSelected', {
        detail: {
          productId: selectedProductId,
          label: selectedLabel,
          optionType: selectedOptionType,
          contract: selectedProductId, // Use productId as contract identifier
        },
        bubbles: true,
      });
      dropdown.dispatchEvent(customEvent);
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
 * Get selected contract from URL query params
 * @returns {string|null} Contract ID from URL or null
 */
export function getSelectedContractFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('contract');
}

/**
 * Build URL with contract query parameter
 * @param {string} baseUrl - Base URL (e.g., /corn/quotes/options)
 * @param {string} contract - Contract ID
 * @returns {string} Full URL with query param
 */
export function buildContractURL(baseUrl, contract) {
  if (!contract) return baseUrl;
  const url = new URL(baseUrl, window.location.origin);
  url.searchParams.set('contract', contract);
  return url.pathname + url.search;
}


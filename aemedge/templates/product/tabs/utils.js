import { createElement } from '../../../scripts/utils.js';
import { getMetadata } from '../../../scripts/aem.js';
import { loadFragment } from '../../../blocks/fragment/fragment.js';

// Fragment URL for product tabs - adjust as needed
export const PRODUCT_TABS_FRAGMENT_URL = '/drafts/kunwar/corn/fragments/product/tabs';

// Constants for modal functionality - shared across all tabs
export const MODAL_CONSTANTS = {
  linkClasses: {
    aboutReport: 'about-report-link',
    modalClass: 'about-report-modal',
  },
};

/**
 * Get product name from metadata and format tab title
 * @param {string} tabName - The tab name (e.g., 'Quotes', 'Settlements')
 * @returns {string} Formatted title like 'Corn Futures - Quotes'
 */
export function getProductTabTitle(tabName) {
  const product = getMetadata('product') || 'Product';
  return `${product} Futures - ${tabName}`;
}

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
        blockWrapper.classList.add(`${block.dataset.blockName || 'block'}-wrapper`);
        blockWrapper.appendChild(block);
        section.appendChild(blockWrapper);
      }
    });
  }

  return section;
}

/**
 * Creates fragment content using the project's loadFragment pattern
 * @returns {Element|null} Fragment content element or null if loading fails
 */
export async function createTabFragment() {
  try {
    const fragmentMain = await loadFragment(PRODUCT_TABS_FRAGMENT_URL);
    if (fragmentMain) {
      // Create a wrapper div and move all fragment content into it
      const fragmentWrapper = createElement('div', { class: 'fragment-content' });
      fragmentWrapper.append(...fragmentMain.childNodes);
      return fragmentWrapper;
    }
  } catch (error) {
    // Silent fallback
  }
  return null;
}

/**
 * Creates simple lorem ipsum content for tab placeholders with fragment
 * @param {string} title - The tab title
 * @returns {Array} Array containing HTML content string and optional fragment block
 */
export async function createBasicTabContent(title) {
  const htmlContent = `
    <h2>${title}</h2>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
    <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
    <h3>Section for ${title}</h3>
    <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
  `;

  const fragmentBlock = await createTabFragment();

  return fragmentBlock ? [htmlContent, fragmentBlock] : [htmlContent];
}

/**
 * Create a modal trigger link and initialize its modal functionality
 * @param {string} linkText - Text to display in the link
 * @param {string} linkClass - CSS class for the link
 * @param {string} fragmentUrl - URL of the fragment to load in the modal
 * @param {string} modalClass - CSS class to add to the modal for custom styling
 * @returns {Element} DOM element for the link
 */
export function createModalLink(linkText, linkClass, fragmentUrl, modalClass = '') {
  // Initialize the modal functionality for this link
  initializeTabModal(linkClass, fragmentUrl, modalClass);

  // Create DOM elements using createElement utility
  const paragraph = createElement('p');
  const link = createElement('a', {
    href: '#',
    class: linkClass,
  });
  link.textContent = linkText;
  paragraph.appendChild(link);

  return paragraph;
}

// Track initialized modals to prevent duplicates
const initializedModals = new Set();

/**
 * Initialize modal functionality for any tab with configurable fragment URL
 * @param {string} linkClass - CSS class of the link that triggers the modal
 * @param {string} fragmentUrl - URL of the fragment to load in the modal
 * @param {string} modalClass - CSS class to add to the modal for custom styling
 */
export function initializeTabModal(linkClass, fragmentUrl, modalClass = '') {
  // Prevent duplicate initialization
  if (initializedModals.has(linkClass)) {
    return;
  }
  initializedModals.add(linkClass);

  // Use event delegation to handle clicks
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains(linkClass)) {
      e.preventDefault();
      try {
        const { createModal } = await import('../../../blocks/modal/modal.js');

        // Load fragment content
        const fragment = await loadFragment(fragmentUrl);

        // Create modal with custom styling
        const { block, showModal } = await createModal(fragment.childNodes);

        // Add custom class for modal styling if provided
        if (modalClass) {
          block.classList.add(modalClass);
        }

        // Show the modal
        showModal();
      } catch (error) {
        // Modal failed to open - silent fallback
      }
    }
  });
}

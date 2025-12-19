/* eslint-disable no-console */
import {
  createElement,
  readBlockConfig,
  i18n,
  setupDayjsLibs,
  getCdtDate,
  hyphenToCamelCase,
} from '../../scripts/utils.js';
import {
  getProductMetadata,
  computeProductRoot,
  normalizePath,
  getContractSpecs,
} from '../../scripts/utils/product.js';

// Fields that should have two-column layout for children (configurable via array)
const TWO_COLUMN_FIELDS = ['ProductCode'];

/**
 * Format field value from API data
 * Handles complex fields like ProductCode, TradingHours, etc.
 * @param {string} fieldName - The field name from API
 * @param {Object} apiData - The API response data
 * @param {Object} labels - Optional i18n labels for ProductCode fields
 * @returns {string} Formatted field value for display
 */
function formatFieldValue(fieldName, apiData, labels = {}) {
  const value = apiData[fieldName];
  if (!value) return '';

  if (typeof value === 'string') {
    return value.trim() || '';
  }

  // Handle ProductCode object
  if (fieldName === 'ProductCode' && typeof value === 'object') {
    const parts = [];
    const {
      globexLabel,
      clearPortLabel,
      clearingLabel,
      tasLabel,
    } = labels;
    if (value.CmeGlobex) parts.push(`${globexLabel}: ${value.CmeGlobex}`);
    if (value.ClearPort) parts.push(`${clearPortLabel}: ${value.ClearPort}`);
    if (value.ClearingCode) parts.push(`${clearingLabel}: ${value.ClearingCode}`);
    if (value.TAS) parts.push(`${tasLabel}: ${value.TAS}`);
    return parts.join('<br />');
  }

  // Handle TradingHours object
  if (fieldName === 'TradingHours' && typeof value === 'object' && value.vandhr) {
    return value.vandhr.map((item) => {
      const hours = item.hours || '';
      const venue = item.venue || '';
      return venue ? `${venue} ${hours}` : hours;
    }).join('<br /><br />');
  }

  // Handle arrays
  if (Array.isArray(value) && value.length > 0) {
    if (value[0].type && value[0].termsOfTrading) {
      // TerminationOfTrading format
      return value.map((item) => item.termsOfTrading).join('<br />');
    }
    if (value[0].mintk) {
      // MinimumPriceFluctuation format
      return value.map((item) => item.mintk).join('<br />');
    }
    if (value[0].contrMonth) {
      // ListedContracts format
      return value.map((item) => item.contrMonth).join('<br />');
    }
    return value.join('<br />');
  }

  // Handle objects with nested structure
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Format field name for display (convert camelCase to Title Case)
 * @param {string} fieldName - The camelCase field name from API
 * @returns {string} Formatted field name (e.g., "Contract Unit")
 */
function formatFieldName(fieldName) {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Fetch contract specs from API
 * @param {string|number} productId - The product ID to fetch specs for
 * @returns {Promise<Object|null>} Contract specs data or null on error
 */
async function fetchContractSpecs(productId) {
  try {
    const data = await getContractSpecs(productId);
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Parse static data from block config
 * Handles key-value pairs where keys match API field names
 * For ProductCode, uses colon and comma as separator: "CmeGlobex: ZC, ClearPort: C"
 * @param {Object} config - The block config object from readBlockConfig
 * @returns {Object} Parsed static data object
 */
function parseStaticData(config) {
  const staticData = {};

  Object.keys(config).forEach((key) => {
    // Skip override keys, config keys, and widget settings
    if (key.startsWith('override-') || key === 'two-column-fields' || key === 'show-last-updated' || key === 'show-regulatory-review' || key === 'regulatory-review-text') {
      return;
    }

    let value = config[key];
    if (!value) {
      return;
    }

    // Handle arrays (from multiple paragraphs/links) - join them
    if (Array.isArray(value)) {
      value = value.join(' ');
    }

    if (typeof value !== 'string') {
      value = String(value);
    }

    const camelKey = hyphenToCamelCase(key);

    // Handle ProductCode with colon/comma separator
    if (camelKey === 'ProductCode') {
      const parts = value.split(',').map((part) => part.trim());
      staticData[camelKey] = {};
      parts.forEach((part) => {
        const colonIndex = part.indexOf(':');
        if (colonIndex > -1) {
          const fieldName = part.substring(0, colonIndex).trim();
          const fieldValue = part.substring(colonIndex + 1).trim();
          staticData[camelKey][fieldName] = fieldValue;
        }
      });
    } else {
      staticData[camelKey] = value;
    }
  });

  return staticData;
}

/**
 * Create spinner element
 * @returns {HTMLElement} Spinner element
 */
function createSpinner() {
  const spinner = createElement('div', { class: 'spinner-contract-spec' });
  spinner.innerHTML = `
    <div></div>
    <div></div>
    <div></div>
    <div></div>
  `;
  return spinner;
}

/**
 * Create header section with title and regulatory review text
 * @param {string} headerTitle - The header title text
 * @param {string} regulatoryReviewText - The regulatory review text (optional)
 * @param {Object} widgetSettings - Widget configuration settings
 * @returns {HTMLElement} Header element
 */
function createHeader(headerTitle, regulatoryReviewText, widgetSettings) {
  const header = createElement('div', { class: 'contract-spec-header' });
  const headerHeading = createElement('h3', { class: 'main-title' });
  headerHeading.textContent = headerTitle;
  header.appendChild(headerHeading);

  // Add regulatory review text for static variant
  if (widgetSettings['show-regulatory-review'] === 'true' || widgetSettings['regulatory-review-text']) {
    const regulatoryText = widgetSettings['regulatory-review-text'] || regulatoryReviewText;
    const regulatoryHeading = createElement('h4', { class: 'regulatory-review-text' });
    regulatoryHeading.textContent = regulatoryText;
    header.appendChild(regulatoryHeading);
  }

  return header;
}

/**
 * Create tooltip element with info icon
 * @param {string} tooltipText - The tooltip text to display
 * @param {HTMLElement} block - The block element for event handling
 * @returns {HTMLElement} Tooltip container element
 */
/**
 * Check if device supports touch (checked dynamically)
 * @returns {boolean} True if device supports touch
 */
function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function createTooltip(tooltipText, block) {
  const tooltipContainer = createElement('div', { class: 'tooltip-container' });
  const infoIcon = createElement('span', { class: 'info-icon' });
  const tooltip = createElement('div', { class: 'tooltip' });
  const tooltipInner = createElement('div', { class: 'tooltip-inner' });
  const tooltipContent = createElement('div', { class: 'info-tooltip-content' });
  const tooltipTextEl = createElement('p');
  tooltipTextEl.textContent = tooltipText;
  tooltipContent.appendChild(tooltipTextEl);
  tooltipInner.appendChild(tooltipContent);
  tooltip.appendChild(tooltipInner);
  tooltipContainer.appendChild(infoIcon);
  tooltipContainer.appendChild(tooltip);

  let hideTimeout = null;
  let showTimeout = null;

  infoIcon.addEventListener('click', (e) => {
    // eslint-disable-next-line no-console
    console.log('[Tooltip Debug] Info icon clicked');
    e.stopPropagation();
    e.preventDefault();
    
    // Clear any pending timeouts
    if (hideTimeout) {
      // eslint-disable-next-line no-console
      console.log('[Tooltip Debug] Clearing hide timeout on click');
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    if (showTimeout) {
      // eslint-disable-next-line no-console
      console.log('[Tooltip Debug] Clearing show timeout on click');
      clearTimeout(showTimeout);
      showTimeout = null;
    }
    
    const isVisible = tooltip.classList.contains('show');
    // eslint-disable-next-line no-console
    console.log('[Tooltip Debug] Tooltip currently visible:', isVisible);

    // Always close all visible tooltips first
    block.querySelectorAll('.tooltip.show').forEach((t) => {
      if (t !== tooltip) {
        // eslint-disable-next-line no-console
        console.log('[Tooltip Debug] Closing other visible tooltip');
        t.classList.remove('show');
      }
    });

    if (!isVisible) {
      // eslint-disable-next-line no-console
      console.log('[Tooltip Debug] Showing tooltip');
      tooltip.classList.add('show');
    } else {
      // eslint-disable-next-line no-console
      console.log('[Tooltip Debug] Hiding tooltip');
      tooltip.classList.remove('show');
    }
  });

  // Show tooltip on hover (disabled on touch devices to prevent interference with click)
  tooltipContainer.addEventListener('mouseenter', (e) => {
    const touchDevice = isTouchDevice();
    // eslint-disable-next-line no-console
    console.log('[Tooltip Debug] Tooltip container mouseenter, isTouchDevice:', touchDevice);
    
    // Skip hover behavior on touch devices - let click handle it
    if (touchDevice) {
      // eslint-disable-next-line no-console
      console.log('[Tooltip Debug] Skipping hover on touch device');
      return;
    }
    
    e.stopPropagation();
    // Clear any pending hide timeout
    if (hideTimeout) {
      // eslint-disable-next-line no-console
      console.log('[Tooltip Debug] Clearing pending hide timeout');
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    // Always close all visible tooltips first
    block.querySelectorAll('.tooltip.show').forEach((t) => {
      if (t !== tooltip) {
        // eslint-disable-next-line no-console
        console.log('[Tooltip Debug] Closing other visible tooltip on hover');
        t.classList.remove('show');
      }
    });
    // eslint-disable-next-line no-console
    console.log('[Tooltip Debug] Showing tooltip on hover');
    tooltip.classList.add('show');
  });

  // Hide tooltip when mouse leaves (with small delay to allow moving to tooltip)
  tooltipContainer.addEventListener('mouseleave', (e) => {
    const touchDevice = isTouchDevice();
    // eslint-disable-next-line no-console
    console.log('[Tooltip Debug] Tooltip container mouseleave, isTouchDevice:', touchDevice);
    
    // Skip hover behavior on touch devices
    if (touchDevice) {
      // eslint-disable-next-line no-console
      console.log('[Tooltip Debug] Skipping mouseleave on touch device');
      return;
    }
    
    e.stopPropagation();
    // Small delay to allow mouse to move from icon to tooltip
    hideTimeout = setTimeout(() => {
      // eslint-disable-next-line no-console
      console.log('[Tooltip Debug] Hide timeout fired - hiding tooltip');
      tooltip.classList.remove('show');
      hideTimeout = null;
    }, 100);
  });

  // Keep tooltip visible when hovering over the tooltip itself (disabled on touch devices)
  tooltip.addEventListener('mouseenter', () => {
    const touchDevice = isTouchDevice();
    // eslint-disable-next-line no-console
    console.log('[Tooltip Debug] Tooltip itself mouseenter, isTouchDevice:', touchDevice);
    
    // Skip hover behavior on touch devices
    if (touchDevice) {
      // eslint-disable-next-line no-console
      console.log('[Tooltip Debug] Skipping tooltip hover on touch device');
      return;
    }
    
    if (hideTimeout) {
      // eslint-disable-next-line no-console
      console.log('[Tooltip Debug] Clearing hide timeout on tooltip hover');
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    // eslint-disable-next-line no-console
    console.log('[Tooltip Debug] Keeping tooltip visible');
    tooltip.classList.add('show');
  });

  tooltip.addEventListener('mouseleave', () => {
    const touchDevice = isTouchDevice();
    // eslint-disable-next-line no-console
    console.log('[Tooltip Debug] Tooltip itself mouseleave, isTouchDevice:', touchDevice);
    
    // Skip hover behavior on touch devices
    if (touchDevice) {
      // eslint-disable-next-line no-console
      console.log('[Tooltip Debug] Skipping tooltip mouseleave on touch device');
      return;
    }
    
    // eslint-disable-next-line no-console
    console.log('[Tooltip Debug] Hiding tooltip');
    tooltip.classList.remove('show');
  });

  return tooltipContainer;
}

/**
 * Create a single field item (list item)
 * @param {string} fieldName - The field name
 * @param {string} displayValue - The formatted display value
 * @param {string} specItemClass - CSS class for the spec item
 * @param {string} tooltipText - Tooltip text for the field
 * @param {HTMLElement} block - The block element for event handling
 * @returns {HTMLElement} List item element
 */
function createFieldItem(fieldName, displayValue, specItemClass, tooltipText, block) {
  const li = createElement('li');

  const fieldHeading = createElement('h5', { class: 'list-title' });
  const fieldNameText = document.createTextNode(formatFieldName(fieldName));
  fieldHeading.appendChild(fieldNameText);

  if (tooltipText) {
    const tooltipContainer = createTooltip(tooltipText, block);
    fieldHeading.appendChild(tooltipContainer);
  }

  li.appendChild(fieldHeading);

  const specItem = createElement('div', { class: `spec-item ${specItemClass}` });

  // For object/multi types, parse and structure the HTML
  if (specItemClass.includes('object') || specItemClass === 'multi') {
    if (specItemClass.includes('object')) {
      const lines = displayValue.split('<br />').filter((line) => line.trim());
      lines.forEach((line) => {
        const itemContainer = createElement('div', { class: 'item-container' });
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
          const title = createElement('span', { class: 'title' });
          title.textContent = line.substring(0, colonIndex + 1);
          const value = createElement('span');
          value.textContent = line.substring(colonIndex + 1).trim();
          itemContainer.appendChild(title);
          itemContainer.appendChild(value);
        } else {
          itemContainer.textContent = line;
        }
        specItem.appendChild(itemContainer);
      });
    } else {
      // For multi (TradingHours), parse venue/hours pairs
      const lines = displayValue.split('<br /><br />').filter((line) => line.trim());
      lines.forEach((line) => {
        const itemContainer = createElement('div', { class: 'item-container' });
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
          const title = createElement('div', { class: 'title' });
          title.textContent = line.substring(0, colonIndex + 1).trim();
          const hours = createElement('div');
          hours.innerHTML = line.substring(colonIndex + 1).trim().replace(/<br \/>/g, '<br>');
          itemContainer.appendChild(title);
          itemContainer.appendChild(hours);
        } else {
          itemContainer.innerHTML = line;
        }
        specItem.appendChild(itemContainer);
      });
    }
  } else {
    specItem.innerHTML = displayValue;
  }

  li.appendChild(specItem);
  return li;
}

/**
 * Build specs URL from current page path
 * @returns {string} Specs URL path
 */
function buildSpecsUrl() {
  const currentPath = window.location.pathname;
  const productRoot = computeProductRoot(currentPath);
  const specsPath = `${productRoot}/specs`;
  return normalizePath(specsPath);
}

/**
 * Create footer with last updated timestamp and view full specs link
 * @param {string} lastUpdatedText - The "Last Updated" label text
 * @param {string} viewFullSpecsText - The "View full contract specs" link text
 * @param {boolean} showLink - Whether to show the view full specs link
 * @returns {Promise<HTMLElement>} Footer element
 */
async function createFooter(lastUpdatedText, viewFullSpecsText, showLink = true) {
  await setupDayjsLibs();
  const footer = createElement('div', { class: 'contract-spec-footer' });

  if (showLink) {
    const viewFullLink = createElement('div', { class: 'full-contract-link-large' });
    const link = createElement('a', { href: buildSpecsUrl() });
    const linkText = createElement('span', { class: 'link-text' });
    linkText.textContent = viewFullSpecsText;
    link.appendChild(linkText);
    viewFullLink.appendChild(link);
    footer.appendChild(viewFullLink);
  }

  const lastUpdated = createElement('p', { class: 'last-updated' });
  const updateDate = getCdtDate(Date.now()).format('DD MMM YYYY hh:mm:ss A');
  lastUpdated.textContent = `${lastUpdatedText} ${updateDate} CT.`;
  footer.appendChild(lastUpdated);

  return footer;
}

/**
 * Create contract specs display
 * Works for both API-fetched data (futures/options) and static data
 * @param {HTMLElement} block - The block element to render into
 * @param {Object} data - The contract specs data (from API or static)
 * @param {Array} fieldOrder - Ordered array of field names to display
 * @param {Object} widgetSettings - Widget configuration settings
 * @param {Array} twoColumnFields - Array of field names that should have two-column layout
 */
async function createContractSpecsDisplay(
  block,
  data,
  fieldOrder,
  widgetSettings,
  twoColumnFields = TWO_COLUMN_FIELDS,
) {
  const [
    defaultTitle,
    noResultsText,
    lastUpdatedText,
    regulatoryReviewText,
    viewFullSpecsText,
    tooltipContractUnit,
    tooltipPriceQuotation,
    tooltipProductCode,
    tooltipTradingHours,
    tooltipFallback,
    globexLabel,
    clearPortLabel,
    clearingLabel,
    tasLabel,
  ] = await Promise.all([
    i18n('Review contract highlights'),
    i18n('No contract specs found'),
    i18n('Last Updated'),
    i18n('Pending all relevant regulatory reviews'),
    i18n('View full contract specs'),
    i18n('The contract unit is the quantity of the product delivered for a single contract.'),
    i18n('The price quotation is the contract amount expressed in currency (e.g. dollars and cents) per unit of the product (e.g. per pound, per bushel, etc.).'),
    i18n('The product code is a one- to three-letter code identifying the product, followed by additional characters indicating the month and year of expiration.'),
    i18n('The trading hours are the hours of operation for trading a product.'),
    i18n('Information about'),
    i18n('CME Globex'),
    i18n('CME ClearPort'),
    i18n('Clearing'),
    i18n('TAS'),
  ]);

  const productCodeLabels = {
    globexLabel,
    clearPortLabel,
    clearingLabel,
    tasLabel,
  };

  const tooltipMap = {
    ContractUnit: tooltipContractUnit,
    PriceQuotation: tooltipPriceQuotation,
    ProductCode: tooltipProductCode,
    TradingHours: tooltipTradingHours,
  };

  const widgetContainer = createElement('div');

  const headerTitle = widgetSettings['override-main-title'] || defaultTitle;
  const header = createHeader(headerTitle, regulatoryReviewText, widgetSettings);
  widgetContainer.appendChild(header);

  const specDataContainer = createElement('div', { class: 'spec-data-container' });
  const ul = createElement('ul');
  const cardElements = [];

  // Add document-level click handler for closing tooltips (only once per block)
  if (!block.hasAttribute('data-tooltip-listener')) {
    block.setAttribute('data-tooltip-listener', 'true');
    document.addEventListener('click', (e) => {
      // eslint-disable-next-line no-console
      console.log('[Tooltip Debug] Document click detected');
      // If clicking outside this block or outside any tooltip container/tooltip, close all tooltips
      const clickedTooltipContainer = e.target.closest('.tooltip-container');
      const clickedTooltip = e.target.closest('.tooltip');
      const clickedInfoIcon = e.target.closest('.info-icon');
      const clickedInsideBlock = block.contains(e.target);

      // eslint-disable-next-line no-console
      console.log('[Tooltip Debug] Click details:', {
        clickedTooltipContainer: !!clickedTooltipContainer,
        clickedTooltip: !!clickedTooltip,
        clickedInfoIcon: !!clickedInfoIcon,
        clickedInsideBlock,
        target: e.target,
      });

      // Don't close if clicking on tooltip container, tooltip, or info icon
      if (!clickedInsideBlock || (!clickedTooltipContainer && !clickedTooltip && !clickedInfoIcon)) {
        // eslint-disable-next-line no-console
        console.log('[Tooltip Debug] Closing tooltips (clicked outside)');
        block.querySelectorAll('.tooltip.show').forEach((t) => {
          t.classList.remove('show');
        });
      } else {
        // eslint-disable-next-line no-console
        console.log('[Tooltip Debug] Not closing tooltips (clicked on tooltip element)');
      }
    });

    // Add resize listener to handle viewport changes (close tooltips on significant viewport change)
    let resizeTimeout = null;
    window.addEventListener('resize', () => {
      // Debounce resize events
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        const touchDevice = isTouchDevice();
        // eslint-disable-next-line no-console
        console.log('[Tooltip Debug] Viewport resized, isTouchDevice:', touchDevice);
        // Close all tooltips on viewport change to ensure clean state
        block.querySelectorAll('.tooltip.show').forEach((t) => {
          // eslint-disable-next-line no-console
          console.log('[Tooltip Debug] Closing tooltip due to viewport change');
          t.classList.remove('show');
        });
        resizeTimeout = null;
      }, 150);
    });
  }

  fieldOrder.forEach((fieldName) => {
    if (!fieldName || fieldName.trim() === '') {
      return;
    }

    const apiValue = data[fieldName];
    if (!apiValue && apiValue !== '') {
      return;
    }

    let displayValue = '';
    let specItemClass = 'single';
    const isTwoColumn = twoColumnFields.includes(fieldName);

    if (fieldName === 'ProductCode' && typeof apiValue === 'object') {
      specItemClass = isTwoColumn ? 'object two-column' : 'object';
      displayValue = formatFieldValue(fieldName, data, productCodeLabels);
    } else if (fieldName === 'TradingHours' && typeof apiValue === 'object') {
      specItemClass = 'multi';
      displayValue = formatFieldValue(fieldName, data);
    } else {
      displayValue = formatFieldValue(fieldName, data);
    }

    if (!displayValue || displayValue.trim() === '') {
      return;
    }

    const tooltipText = tooltipMap[fieldName] || `${tooltipFallback} ${formatFieldName(fieldName).toLowerCase()}.`;

    const fieldItem = createFieldItem(fieldName, displayValue, specItemClass, tooltipText, block);
    cardElements.push(fieldItem);
  });

  if (cardElements.length === 0) {
    const noResults = createElement('div', { class: 'no-results' });
    const noResultsLabel = createElement('h4');
    noResultsLabel.textContent = noResultsText;
    noResults.appendChild(noResultsLabel);
    block.textContent = '';
    block.appendChild(noResults);
    return;
  }

  cardElements.forEach((card) => ul.appendChild(card));
  specDataContainer.appendChild(ul);
  widgetContainer.appendChild(specDataContainer);

  if (widgetSettings['show-last-updated'] !== 'false') {
    const showLink = widgetSettings['show-view-full-link'] !== 'false';
    const footer = await createFooter(lastUpdatedText, viewFullSpecsText, showLink);
    widgetContainer.appendChild(footer);
  }

  block.textContent = '';
  block.appendChild(widgetContainer);
}

/**
 * Create contract specs for futures variant
 * Fetches data from API
 * @param {HTMLElement} block - The block element to render into
 */
async function createFuturesContractSpec(block) {
  block.textContent = '';
  block.appendChild(createSpinner());

  try {
    const config = readBlockConfig(block);
    const widgetSettings = {};
    const fieldOrder = [];

    Object.keys(config).forEach((key) => {
      if (!key || key.trim() === '') {
        return;
      }
      if (key.startsWith('override-') || key === 'two-column-fields' || key === 'show-last-updated') {
        widgetSettings[key] = config[key];
      } else if (key.trim() !== '') {
        fieldOrder.push(key);
      }
    });

    let twoColumnFields = TWO_COLUMN_FIELDS;
    if (widgetSettings['two-column-fields']) {
      try {
        twoColumnFields = JSON.parse(widgetSettings['two-column-fields']);
      } catch (e) {
        twoColumnFields = widgetSettings['two-column-fields'].split(',').map((f) => f.trim());
      }
    }

    let productId = widgetSettings['override-product'];
    if (!productId) {
      const metadata = await getProductMetadata();
      productId = metadata?.productId;
    }

    if (!productId) {
      throw new Error('Product ID not found');
    }

    const apiData = await fetchContractSpecs(productId);
    if (!apiData) {
      throw new Error('Failed to fetch contract specs');
    }

    let finalFieldOrder = fieldOrder;
    if (fieldOrder.length === 0) {
      finalFieldOrder = ['ContractUnit', 'PriceQuotation', 'ProductCode', 'TradingHours'];
    }

    await createContractSpecsDisplay(
      block,
      apiData,
      finalFieldOrder,
      widgetSettings,
      twoColumnFields,
    );
  } catch (error) {
    // Load i18n error message
    const errorMessage = await i18n('Unable to load contract specifications');
    // eslint-disable-next-line no-console
    console.error('Error creating futures contract spec:', error);
    block.textContent = '';
    const errorDiv = createElement('div', { class: 'error-message' });
    const errorHeading = createElement('h4');
    errorHeading.textContent = errorMessage;
    errorDiv.appendChild(errorHeading);
    block.appendChild(errorDiv);
  }
}

/**
 * Create contract specs for options variant
 * Fetches data from API (same endpoint as futures for now)
 * @param {HTMLElement} block - The block element to render into
 */
async function createOptionsContractSpec(block) {
  await createFuturesContractSpec(block);
}

/**
 * Create contract specs for static variant
 * Uses data provided by author via HTML block options
 * @param {HTMLElement} block - The block element to render into
 */
async function createStaticContractSpec(block) {
  const config = readBlockConfig(block);
  const staticData = parseStaticData(config);

  block.textContent = '';
  block.appendChild(createSpinner());

  try {
    const widgetSettings = {};
    const fieldOrder = [];

    Object.keys(config).forEach((key) => {
      if (!key || key.trim() === '') {
        return;
      }
      if (key.startsWith('override-') || key === 'two-column-fields' || key === 'show-last-updated' || key === 'show-regulatory-review' || key === 'regulatory-review-text') {
        widgetSettings[key] = config[key];
      } else if (key.trim() !== '') {
        const camelKey = hyphenToCamelCase(key);
        fieldOrder.push(camelKey);
      }
    });

    let twoColumnFields = TWO_COLUMN_FIELDS;
    if (widgetSettings['two-column-fields']) {
      try {
        const parsed = JSON.parse(widgetSettings['two-column-fields']);
        twoColumnFields = Array.isArray(parsed)
          ? parsed.map((f) => hyphenToCamelCase(f.trim()))
          : parsed;
      } catch (e) {
        twoColumnFields = widgetSettings['two-column-fields']
          .split(',')
          .map((f) => hyphenToCamelCase(f.trim()));
      }
    }

    if (Object.keys(staticData).length === 0) {
      throw new Error('No static data provided');
    }

    const finalFieldOrder = fieldOrder.length > 0 ? fieldOrder : Object.keys(staticData);

    await createContractSpecsDisplay(
      block,
      staticData,
      finalFieldOrder,
      widgetSettings,
      twoColumnFields,
    );
  } catch (error) {
    // Load i18n error message
    const errorMessage = await i18n('Unable to load contract specifications');
    // eslint-disable-next-line no-console
    console.error('Error creating static contract spec:', error);
    block.textContent = '';
    const errorDiv = createElement('div', { class: 'error-message' });
    const errorHeading = createElement('h4');
    errorHeading.textContent = errorMessage;
    errorDiv.appendChild(errorHeading);
    block.appendChild(errorDiv);
  }
}

export default async function decorate(block) {
  if (block.classList.contains('futures')) {
    await createFuturesContractSpec(block);
  } else if (block.classList.contains('options')) {
    await createOptionsContractSpec(block);
  } else if (block.classList.contains('static')) {
    await createStaticContractSpec(block);
  } else {
    await createFuturesContractSpec(block);
  }
}


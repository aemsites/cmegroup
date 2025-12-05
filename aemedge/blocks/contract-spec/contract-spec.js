/* eslint-disable no-console */
import { createElement, readBlockConfig, i18n } from '../../scripts/utils.js';
import { urlByEnvType } from '../../scripts/utils/index.js';
import { apiGet, getResponseData } from '../../scripts/utils/fetch.js';
import { getProductMetadata } from '../../scripts/utils/product.js';

// Contract Specs Constants
const IS_LOCALHOST = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

// Configurable API endpoint - can be updated via block config
const DEFAULT_API_ENDPOINT = '/CmeWS/mvc/ContractSpecs/List/productId';

// Fields that should have two-column layout for children (configurable via array)
const TWO_COLUMN_FIELDS = ['ProductCode'];

/**
 * Development logging utility - only logs in localhost environment
 * @param {...any} args - Arguments to log
 */
function devLog(...args) {
  if (IS_LOCALHOST) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

/**
 * Format field value from API data
 * Handles complex fields like ProductCode, TradingHours, etc.
 * @param {string} fieldName - The field name from API
 * @param {Object} apiData - The API response data
 * @returns {string} Formatted field value for display
 */
function formatFieldValue(fieldName, apiData) {
  const value = apiData[fieldName];
  if (!value) return '';

  // Handle string values
  if (typeof value === 'string') {
    return value.trim() || '';
  }

  // Handle ProductCode object
  if (fieldName === 'ProductCode' && typeof value === 'object') {
    const parts = [];
    if (value.CmeGlobex) parts.push(`CME Globex: ${value.CmeGlobex}`);
    if (value.ClearPort) parts.push(`CME ClearPort: ${value.ClearPort}`);
    if (value.ClearingCode) parts.push(`Clearing: ${value.ClearingCode}`);
    if (value.TAS) parts.push(`TAS: ${value.TAS}`);
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
 * Get tooltip text for a given field name
 * Returns the tooltip key for i18n translation
 * @param {string} fieldName - The field name to get tooltip for
 * @returns {string} Tooltip text key for i18n
 */
function getTooltipText(fieldName) {
  const tooltips = {
    ContractUnit: 'The contract unit is the quantity of the product delivered for a single contract.',
    PriceQuotation: 'The price quotation is the contract amount expressed in currency (e.g. dollars and cents) per unit of the product (e.g. per pound, per bushel, etc.).',
    ProductCode: 'The product code is a one- to three-letter code identifying the product, followed by additional characters indicating the month and year of expiration.',
    TradingHours: 'The trading hours are the hours of operation for trading a product.',
  };
  return tooltips[fieldName] || `Information about ${formatFieldName(fieldName).toLowerCase()}.`;
}

/**
 * LOCAL DEV FALLBACK - TODO: Remove this function before production
 * Fetches mock contract specs data from local JSON file for localhost development
 * @returns {Promise<Object|null>} Mock contract specs data or null
 */
async function fetchContractSpecsLocalDev() {
  try {
    const response = await fetch('/aemedge/blocks/contract-spec/300.json');
    if (response.ok) {
      const data = await response.json();
      devLog('Using local dev contract specs data from 300.json');
      return data;
    }
    if (IS_LOCALHOST) {
      // eslint-disable-next-line no-console
      console.warn('Local dev file not found, falling back to API');
    }
  } catch (e) {
    if (IS_LOCALHOST) {
      // eslint-disable-next-line no-console
      console.error('Error fetching local dev contract specs:', e);
    }
  }
  return null;
}

/**
 * Fetch contract specs from API or use local dev fallback
 * @param {string|number} productId - The product ID to fetch specs for
 * @param {string} apiEndpoint - The API endpoint path (configurable)
 * @returns {Promise<Object|null>} Contract specs data or null on error
 */
async function fetchContractSpecs(productId, apiEndpoint = DEFAULT_API_ENDPOINT) {
  // LOCAL DEV FALLBACK - TODO: Remove this block before production
  if (IS_LOCALHOST) {
    const localData = await fetchContractSpecsLocalDev();
    if (localData) {
      return localData;
    }
  }

  // Production API call
  try {
    const endpoint = `${urlByEnvType()}${apiEndpoint}/${productId}`;
    const response = await apiGet(endpoint, {}, {}, { withCredentials: false });
    const data = getResponseData(response) || response.data;
    return data;
  } catch (e) {
    if (IS_LOCALHOST) {
      // eslint-disable-next-line no-console
      console.error('Error fetching contract specs:', e);
    }
    return null;
  }
}

/**
 * Parse static data from HTML block options
 * Handles key-value pairs where keys match API field names
 * For ProductCode, uses colon and comma as separator: "CmeGlobex: ZC, ClearPort: C"
 * @param {HTMLElement} block - The block element containing HTML options
 * @returns {Object} Parsed static data object
 */
function parseStaticData(block) {
  const config = readBlockConfig(block);
  const staticData = {};

  Object.keys(config).forEach((key) => {
    // Skip override keys and config keys
    if (key.startsWith('override-') || key === 'api-endpoint' || key === 'two-column-fields') {
      return;
    }

    const value = config[key];
    if (!value || typeof value !== 'string') {
      return;
    }

    // Handle ProductCode with colon/comma separator
    if (key === 'ProductCode') {
      const parts = value.split(',').map((part) => part.trim());
      staticData[key] = {};
      parts.forEach((part) => {
        const colonIndex = part.indexOf(':');
        if (colonIndex > -1) {
          const fieldName = part.substring(0, colonIndex).trim();
          const fieldValue = part.substring(colonIndex + 1).trim();
          staticData[key][fieldName] = fieldValue;
        }
      });
    } else {
      // Regular field - store as string
      staticData[key] = value;
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

  // Add click handler to toggle tooltip
  infoIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const isVisible = tooltip.classList.contains('show');

    // Always close all visible tooltips first
    block.querySelectorAll('.tooltip.show').forEach((t) => {
      t.classList.remove('show');
    });

    // If this tooltip wasn't visible, show it now
    if (!isVisible) {
      tooltip.classList.add('show');
    }
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

  // Field name with info icon
  const fieldHeading = createElement('h5', { class: 'list-title' });
  const fieldNameText = document.createTextNode(formatFieldName(fieldName));
  fieldHeading.appendChild(fieldNameText);

  // Add tooltip if text is available
  if (tooltipText) {
    const tooltipContainer = createTooltip(tooltipText, block);
    fieldHeading.appendChild(tooltipContainer);
  }

  li.appendChild(fieldHeading);

  // Field value container
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
    // Simple single value
    specItem.innerHTML = displayValue;
  }

  li.appendChild(specItem);
  return li;
}

/**
 * Create footer with last updated timestamp
 * @param {string} lastUpdatedText - The "Last Updated" label text
 * @returns {HTMLElement} Footer element
 */
function createFooter(lastUpdatedText) {
  const footer = createElement('div', { class: 'contract-spec-footer' });
  const lastUpdated = createElement('p', { class: 'last-updated' });
  const updateDate = new Date().toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
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
  // Load i18n strings
  const [
    defaultTitle,
    noResultsText,
    lastUpdatedText,
    regulatoryReviewText,
    tooltipContractUnit,
    tooltipPriceQuotation,
    tooltipProductCode,
    tooltipTradingHours,
  ] = await Promise.all([
    i18n('Review contract highlights'),
    i18n('No contract specs found'),
    i18n('Last Updated'),
    i18n('Pending all relevant regulatory reviews'),
    i18n('The contract unit is the quantity of the product delivered for a single contract.'),
    i18n('The price quotation is the contract amount expressed in currency (e.g. dollars and cents) per unit of the product (e.g. per pound, per bushel, etc.).'),
    i18n('The product code is a one- to three-letter code identifying the product, followed by additional characters indicating the month and year of expiration.'),
    i18n('The trading hours are the hours of operation for trading a product.'),
  ]);

  // Build tooltip map with translated text
  const tooltipMap = {
    ContractUnit: tooltipContractUnit,
    PriceQuotation: tooltipPriceQuotation,
    ProductCode: tooltipProductCode,
    TradingHours: tooltipTradingHours,
  };

  // Build widget container
  const widgetContainer = createElement('div');

  // Add header with title
  const headerTitle = widgetSettings['override-main-title'] || defaultTitle;
  const header = createHeader(headerTitle, regulatoryReviewText, widgetSettings);
  widgetContainer.appendChild(header);

  // Build spec data container
  const specDataContainer = createElement('div', { class: 'spec-data-container' });
  const ul = createElement('ul');
  const cardElements = [];

  // Add document-level click handler for closing tooltips (only once per block)
  if (!block.hasAttribute('data-tooltip-listener')) {
    block.setAttribute('data-tooltip-listener', 'true');
    document.addEventListener('click', (e) => {
      // If clicking outside this block or outside any tooltip container, close all tooltips
      const clickedTooltipContainer = e.target.closest('.tooltip-container');
      const clickedInsideBlock = block.contains(e.target);

      if (!clickedInsideBlock || !clickedTooltipContainer) {
        block.querySelectorAll('.tooltip.show').forEach((t) => {
          t.classList.remove('show');
        });
      }
    });
  }

  // Process fields in order
  fieldOrder.forEach((fieldName) => {
    // Skip items with empty field names
    if (!fieldName || fieldName.trim() === '') {
      return;
    }

    // Get value from data
    const apiValue = data[fieldName];
    if (!apiValue && apiValue !== '') {
      // Field doesn't exist in data, skip it
      return;
    }

    // Format value
    let displayValue = '';
    let specItemClass = 'single';
    const isTwoColumn = twoColumnFields.includes(fieldName);

    if (fieldName === 'ProductCode' && typeof apiValue === 'object') {
      specItemClass = isTwoColumn ? 'object two-column' : 'object';
      displayValue = formatFieldValue(fieldName, data);
    } else if (fieldName === 'TradingHours' && typeof apiValue === 'object') {
      specItemClass = 'multi';
      displayValue = formatFieldValue(fieldName, data);
    } else {
      displayValue = formatFieldValue(fieldName, data);
    }

    // Skip if no value
    if (!displayValue || displayValue.trim() === '') {
      return;
    }

    // Get tooltip text
    const tooltipKey = getTooltipText(fieldName);
    const tooltipText = tooltipMap[fieldName] || tooltipKey;

    // Create field item
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

  // Add list items to ul
  cardElements.forEach((card) => ul.appendChild(card));
  specDataContainer.appendChild(ul);
  widgetContainer.appendChild(specDataContainer);

  // Add footer with last updated (only for API-fetched data)
  if (widgetSettings['show-last-updated'] !== 'false') {
    const footer = createFooter(lastUpdatedText);
    widgetContainer.appendChild(footer);
  }

  // Render to block
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
    // Parse block config
    const config = readBlockConfig(block);
    const widgetSettings = {};
    const fieldOrder = [];

    // Separate widget settings from field names
    Object.keys(config).forEach((key) => {
      // Skip empty keys
      if (!key || key.trim() === '') {
        return;
      }
      if (key.startsWith('override-') || key === 'api-endpoint' || key === 'two-column-fields' || key === 'show-last-updated') {
        widgetSettings[key] = config[key];
      } else if (key.trim() !== '') {
        // This is a field name - preserve order
        fieldOrder.push(key);
      }
    });

    // Get API endpoint (configurable)
    const apiEndpoint = widgetSettings['api-endpoint'] || DEFAULT_API_ENDPOINT;

    // Get two-column fields (configurable)
    let twoColumnFields = TWO_COLUMN_FIELDS;
    if (widgetSettings['two-column-fields']) {
      try {
        twoColumnFields = JSON.parse(widgetSettings['two-column-fields']);
      } catch (e) {
        // If not valid JSON, treat as comma-separated string
        twoColumnFields = widgetSettings['two-column-fields'].split(',').map((f) => f.trim());
      }
    }

    // Get product ID
    let productId = widgetSettings['override-product'];
    if (!productId) {
      const metadata = await getProductMetadata();
      productId = metadata?.productId;
    }

    // LOCAL DEV FALLBACK - TODO: Remove this block before production
    // For localhost, allow proceeding without productId since we use mock data
    if (!productId && !IS_LOCALHOST) {
      throw new Error('Product ID not found');
    }

    // Fetch contract specs from API (or local dev fallback)
    const apiData = await fetchContractSpecs(productId || '300', apiEndpoint);
    if (!apiData) {
      throw new Error('Failed to fetch contract specs');
    }

    // If no fields authored, use default fields
    let finalFieldOrder = fieldOrder;
    if (fieldOrder.length === 0) {
      finalFieldOrder = ['ContractUnit', 'PriceQuotation', 'ProductCode', 'TradingHours'];
      devLog('No fields authored, using default fields:', finalFieldOrder);
    }

    // LOCAL DEV DEBUG - TODO: Remove before production
    if (IS_LOCALHOST) {
      devLog('Contract specs API data:', apiData);
      devLog('Field order:', finalFieldOrder);
    }

    // Create display
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
    // Log error for debugging (always log, not just localhost)
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
  // For now, options uses the same API endpoint as futures
  // This can be updated later when a different endpoint is available
  await createFuturesContractSpec(block);
}

/**
 * Create contract specs for static variant
 * Uses data provided by author via HTML block options
 * @param {HTMLElement} block - The block element to render into
 */
async function createStaticContractSpec(block) {
  block.textContent = '';
  block.appendChild(createSpinner());

  try {
    // Parse block config
    const config = readBlockConfig(block);
    const widgetSettings = {};
    const fieldOrder = [];

    // Separate widget settings from field names
    Object.keys(config).forEach((key) => {
      // Skip empty keys
      if (!key || key.trim() === '') {
        return;
      }
      if (key.startsWith('override-') || key === 'two-column-fields' || key === 'show-last-updated' || key === 'show-regulatory-review' || key === 'regulatory-review-text') {
        widgetSettings[key] = config[key];
      } else if (key.trim() !== '') {
        // This is a field name - preserve order
        fieldOrder.push(key);
      }
    });

    // Get two-column fields (configurable)
    let twoColumnFields = TWO_COLUMN_FIELDS;
    if (widgetSettings['two-column-fields']) {
      try {
        twoColumnFields = JSON.parse(widgetSettings['two-column-fields']);
      } catch (e) {
        // If not valid JSON, treat as comma-separated string
        twoColumnFields = widgetSettings['two-column-fields'].split(',').map((f) => f.trim());
      }
    }

    // Parse static data from HTML block options
    const staticData = parseStaticData(block);

    if (Object.keys(staticData).length === 0) {
      throw new Error('No static data provided');
    }

    // Use field order from config, or all fields if none specified
    const finalFieldOrder = fieldOrder.length > 0 ? fieldOrder : Object.keys(staticData);

    // LOCAL DEV DEBUG - TODO: Remove before production
    if (IS_LOCALHOST) {
      devLog('Static contract specs data:', staticData);
      devLog('Field order:', finalFieldOrder);
    }

    // Create display (hide last updated for static, show regulatory review)
    widgetSettings['show-last-updated'] = 'false';
    widgetSettings['show-regulatory-review'] = 'true';
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
    // Log error for debugging (always log, not just localhost)
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
  // Determine variant: futures, options, or static
  if (block.classList.contains('futures')) {
    await createFuturesContractSpec(block);
  } else if (block.classList.contains('options')) {
    await createOptionsContractSpec(block);
  } else if (block.classList.contains('static')) {
    await createStaticContractSpec(block);
  } else {
    // Default to futures if no variant specified
    await createFuturesContractSpec(block);
  }
}


/* eslint-disable no-console */
import {
  buildIndexFilter,
  getIndexedContent,
} from '../../scripts/indexing.js';
import {
  createElement,
  parseTime,
  getReadTimeLabel,
  getReadTimeIcon,
  decodeHtmlEntities,
  buildSlider,
  readBlockConfig,
  setupDayjsLibs,
  getCdtDate,
  getTag,
  i18n,
  convertMMSSToHHMM,
} from '../../scripts/utils.js';
import {
  legacyArticleTemplates,
  mapLegacyArticleData,
  isLegacyContent,
  legacyOpenMarketsTemplates,
  legacyNewsTemplates,
} from '../../scripts/legacyContentMapping.js';
import { wrapImgsInLinks } from '../../scripts/utils/dom.js';
import {
  urlByEnvType,
} from '../../scripts/utils/index.js';
import createOptimizedPicture from '../../scripts/utils/picture.js';
import { getEconomicReleaseEvents } from '../../scripts/services/EconomicReleaseService.js';
import { getProductMetadata } from '../../scripts/utils/product.js';
import { apiGet, getResponseData } from '../../scripts/utils/fetch.js';

const fallbackImage = `url(${urlByEnvType()}/content/dam/cmegroup/images/common/default/article-940x600.jpg)`;

// Contract Specs Constants
const IS_LOCALHOST = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

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
 * @param {string} fieldName - The field name to get tooltip for
 * @returns {string} Tooltip text explaining the field
 */
function getTooltipText(fieldName) {
  const tooltips = {
    ContractUnit: 'The contract unit is the quantity of the product delivered for a single contract.',
    PriceQuotation: 'The price quotation specifies how the contract price is expressed.',
    ProductCode: 'Product codes are used to identify the product across different trading platforms.',
    TradingHours: 'Trading hours specify when the contract can be traded on each platform.',
    MinimumPriceFluctuation: 'The minimum price fluctuation is the smallest price movement allowed for the contract.',
    SettlementMethod: 'The settlement method describes how the contract is settled at expiration.',
    DeliveryProcedure: 'The delivery procedure outlines how physical delivery is handled.',
    LastDeliveryDate: 'The last delivery date is the final date on which delivery can be made.',
    TerminationOfTrading: 'Termination of trading specifies when trading in the contract ends.',
    PositionLimits: 'Position limits define the maximum number of contracts a trader can hold.',
    PriceLimitOrCircuit: 'Price limits or circuit breakers restrict the maximum price movement allowed.',
    SettlementProcedures: 'Settlement procedures describe the process for settling the contract.',
    ExchangeRulebook: 'The exchange rulebook contains the official rules governing the contract.',
    BlockMinimum: 'Block minimum specifies the minimum size for block trades.',
    ListedContracts: 'Listed contracts specify which contract months are available for trading.',
    GradeAndQuality: 'Grade and quality standards define the acceptable specifications for delivery.',
    TradeAtMarkerOrTradeAtSettlementRules: 'TAS/TAM rules describe trading at settlement or marker procedures.',
    VendorCodes: 'Vendor codes are symbols used by data vendors to identify the contract.',
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
    const response = await fetch('/aemedge/blocks/cards/300.json');
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
 * @returns {Promise<Object|null>} Contract specs data or null on error
 */
async function fetchContractSpecs(productId) {
  // LOCAL DEV FALLBACK - TODO: Remove this block before production
  if (IS_LOCALHOST) {
    const localData = await fetchContractSpecsLocalDev();
    if (localData) {
      return localData;
    }
  }

  // Production API call
  try {
    const endpoint = `${urlByEnvType()}/CmeWS/mvc/ContractSpecs/List/productId/${productId}`;
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
 * Create contract specs cards
 * Fetches data from API and merges with authored overrides
 * @param {HTMLElement} block - The block element to render into
 */
async function createContractSpecsCards(block) {
  block.textContent = '';
  block.appendChild(createSpinner());

  try {
    // Parse block config
    const config = readBlockConfig(block);
    const widgetSettings = {};
    const specItems = [];

    // Debug: Log config to help diagnose configuration issues
    if (IS_LOCALHOST) {
      devLog('Block config parsed:', config);
    }

    // Separate widget settings from spec items
    Object.keys(config).forEach((key) => {
      // Skip empty keys
      if (!key || key.trim() === '') {
        return;
      }
      if (key.startsWith('override-') || key === 'contract-spec-type' || key === 'data-source') {
        widgetSettings[key] = config[key];
      } else {
        // This is a spec field name - only add if field name is not empty
        if (key.trim() !== '') {
          specItems.push({
            fieldName: key,
            overrideValue: config[key],
          });
        }
      }
    });

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
    const apiData = await fetchContractSpecs(productId || '300');
    if (!apiData) {
      throw new Error('Failed to fetch contract specs');
    }

    // Filter out items with empty field names
    const validSpecItems = specItems.filter((item) => item.fieldName && item.fieldName.trim() !== '');

    // If no valid spec items authored, use default fields
    let finalSpecItems = validSpecItems;
    if (validSpecItems.length === 0) {
      const defaultFields = ['ContractUnit', 'PriceQuotation', 'ProductCode', 'TradingHours'];
      finalSpecItems = defaultFields.map((fieldName) => ({
        fieldName,
        overrideValue: '',
      }));
      devLog('No spec items authored, using default fields:', defaultFields);
    }

    // LOCAL DEV DEBUG - TODO: Remove before production
    if (IS_LOCALHOST) {
      devLog('Contract specs API data:', apiData);
      devLog('Spec items to render:', finalSpecItems);
    }

    // Build widget container
    const widgetContainer = createElement('div');

    // Add header with title
    const headerTitle = widgetSettings['override-main-title'] || 'Review contract highlights';
    const header = createElement('div', { class: 'contract-specs-header' });
    const headerHeading = createElement('h3', { class: 'main-title' });
    headerHeading.textContent = headerTitle;
    header.appendChild(headerHeading);
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

    finalSpecItems.forEach((item) => {
      const { fieldName, overrideValue } = item;

      // Skip items with empty field names
      if (!fieldName || fieldName.trim() === '') {
        return;
      }

      // Get value: override if provided, otherwise format from API
      let displayValue = '';
      let specItemClass = 'single';
      if (overrideValue && overrideValue.trim()) {
        // Use authored override (can contain HTML)
        displayValue = overrideValue;
        // Determine class from content
        if (displayValue.includes('<p>') || displayValue.includes('<div>')) {
          specItemClass = 'multi';
        }
      } else {
        // Format from API
        const apiValue = apiData[fieldName];
        if (!apiValue && apiValue !== '') {
          // Field doesn't exist in API data, skip it
          return;
        }
        if (fieldName === 'ProductCode' && typeof apiValue === 'object') {
          specItemClass = 'object';
          displayValue = formatFieldValue(fieldName, apiData);
        } else if (fieldName === 'TradingHours' && typeof apiValue === 'object') {
          specItemClass = 'multi';
          displayValue = formatFieldValue(fieldName, apiData);
        } else {
          displayValue = formatFieldValue(fieldName, apiData);
        }
      }

      // Skip if no value
      if (!displayValue || displayValue.trim() === '') {
        return;
      }

      // Create list item
      const li = createElement('li');

      // Field name with info icon
      const fieldHeading = createElement('h5', { class: 'list-title' });
      const fieldNameText = document.createTextNode(formatFieldName(fieldName));
      fieldHeading.appendChild(fieldNameText);

      // Info tooltip with icon
      const tooltipContainer = createElement('div', { class: 'tooltip-container' });
      const infoIcon = createElement('span', { class: 'info-icon' });
      const tooltip = createElement('div', { class: 'tooltip' });
      const tooltipInner = createElement('div', { class: 'tooltip-inner' });
      const tooltipContent = createElement('div', { class: 'info-tooltip-content' });
      const tooltipText = createElement('p');
      tooltipText.textContent = getTooltipText(fieldName);
      tooltipContent.appendChild(tooltipText);
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
      
      fieldHeading.appendChild(tooltipContainer);

      li.appendChild(fieldHeading);

      // Field value container
      const specItem = createElement('div', { class: `spec-item ${specItemClass}` });

      // For object/multi types, parse and structure the HTML
      if (specItemClass === 'object' || specItemClass === 'multi') {
        // Parse HTML and wrap in item-container divs
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = displayValue;

        // If it's ProductCode object format
        if (specItemClass === 'object') {
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
      cardElements.push(li);
    });

    if (cardElements.length === 0) {
      const noResults = createElement('div', { class: 'no-results' });
      const noResultsLabel = createElement('h4');
      noResultsLabel.textContent = 'No contract specs found';
      noResults.appendChild(noResultsLabel);
      block.textContent = '';
      block.appendChild(noResults);
      return;
    }

    // Add list items to ul
    cardElements.forEach((card) => ul.appendChild(card));
    specDataContainer.appendChild(ul);
    widgetContainer.appendChild(specDataContainer);

    // Add footer with last updated
    const footer = createElement('div', { class: 'contract-specs-footer' });
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
    lastUpdated.textContent = `Last Updated ${updateDate} CT.`;
    footer.appendChild(lastUpdated);
    widgetContainer.appendChild(footer);

    // Render to block
    block.textContent = '';
    block.appendChild(widgetContainer);
  } catch (error) {
    // Log error for debugging (always log, not just localhost)
    // eslint-disable-next-line no-console
    console.error('Error creating contract specs cards:', error);
    block.textContent = '';
    const errorDiv = createElement('div', { class: 'error-message' });
    const errorHeading = createElement('h4');
    errorHeading.textContent = 'Unable to load contract specifications';
    errorDiv.appendChild(errorHeading);
    block.appendChild(errorDiv);
  }
}


async function createStaticCards(block) {
  const size = block.children.length;
  block.classList.add(`size-${size}`);
  const cardsContainer = document.createElement('div');
  if (block.classList.contains('links')) {
    const titleWrapper = block.querySelector('h6').closest('div');
    const cardTitle = document.createElement('h6');
    cardTitle.textContent = block.querySelector('h6').textContent;
    titleWrapper.remove();
    const container = document.createElement('div');
    container.className = 'main-list-container';
    [...block.children].forEach((row) => {
      const columns = row.children.length;
      [...row.children].forEach((div) => {
        div.className = 'cards-card-body';
        div.style.setProperty('--cols', columns);
        container.append(div);
      });
    });
    cardsContainer.append(cardTitle);
    cardsContainer.append(container);
  } else if (block.classList.contains('event')) {
    const backgroundUrl = block.querySelector('picture img').src;
    const title = block.querySelector('h3');
    const text = title.nextElementSibling;
    const btn = block.querySelector('.button-container');
    const mainContainer = title.parentElement;
    const titleContainer = document.createElement('div');
    const mainTextContainer = document.createElement('div');

    titleContainer.classList.add('title-container');
    mainTextContainer.classList.add('text-container');
    title.parentNode.insertBefore(mainTextContainer, title.nextSibling);
    mainTextContainer.appendChild(text);
    mainTextContainer.appendChild(btn);

    title.parentNode.insertBefore(titleContainer, title);
    titleContainer.appendChild(title);

    mainContainer.className = 'cards-body-container';
    mainContainer.style.backgroundImage = `url('${backgroundUrl}')`;
    cardsContainer.append(mainContainer);
  } else if (block.classList.contains('promo-link')) {
    const title = block.querySelector('h3');
    const text = title.nextElementSibling;
    const linkSrc = block.querySelector('p a').href;
    const linkEl = document.createElement('a');
    linkEl.href = linkSrc;
    linkEl.append(title);
    linkEl.append(text);
    const mainContainer = document.createElement('div');
    mainContainer.className = 'cards-body-container';
    mainContainer.append(linkEl);
    const backgroundUrl = block.querySelector('picture img');
    if (backgroundUrl) {
      mainContainer.style.backgroundImage = `url('${backgroundUrl.src}')`;
    }
    cardsContainer.append(mainContainer);
  } else if (block.classList.contains('static')) {
    const cardElements = [];
    let sliderConfig = null;
    const disabledOnDesktop = false;
    const inverse = false;
    const hasClickableImages = block.classList.contains('clickable-image');

    [...block.children].forEach((row) => {
      if (hasClickableImages) {
        wrapImgsInLinks(row);
      }
      const li = createElement('li');
      const courseQty = row.querySelector('em');
      const title = row.querySelector('h3');
      const text = title.nextElementSibling;
      const linkEl = createElement('a');
      const linkSrc = row.querySelector('a').href;
      linkEl.innerText = row.querySelector('a').innerText;
      linkEl.href = linkSrc;

      const mainContainer = createElement('div', { class: 'cards-body-container' });
      const cardBody = createElement('div', { class: 'cards-body' });
      const cardTitleContainer = createElement('div', { class: 'cards-title-container' });
      const cardTextContainer = createElement('div', { class: 'cards-text-container' });

      cardTitleContainer.append(courseQty);
      cardTitleContainer.append(title);

      if (
        text
        && text.tagName.toLowerCase() === 'p'
        && !text.classList.contains('button-container')
      ) {
        cardTextContainer.append(text);
      }

      cardBody.append(cardTitleContainer);
      cardBody.append(cardTextContainer);
      cardBody.append(linkEl);
      mainContainer.append(cardBody);
      li.append(mainContainer);
      cardElements.push(li);
    });

    sliderConfig = {
      slidesToShow: 'auto',
      slidesToScroll: 1,
      scrollLock: false,
      itemWidth: 270,
      exactWidth: true,
      draggable: true,
      duration: 2,
      responsive: [
        {
          breakpoint: 481,
          settings: {
            itemWidth: 434,
          },
        },
      ],
    };

    if (cardElements && cardElements.length) {
      const ul = createElement('ul', null, ...cardElements);
      cardsContainer.append(ul);
      block.textContent = '';
      block.appendChild(cardsContainer);
      buildSlider(ul, sliderConfig, true, disabledOnDesktop, inverse, true);
    }
  } else if (block.classList.contains('promo')) {
    const ul = document.createElement('ul');
    const textClass = Array.from(block.classList).find((className) => className.startsWith('text-'));
    [...block.children].forEach((row) => {
      const li = document.createElement('li');
      if (row.querySelector('div').hasChildNodes()) {
        const link = document.createElement('a');
        const linkSrc = row.firstElementChild.querySelector('p a')?.href;
        link.href = linkSrc;
        li.append(link);
        while (row.firstElementChild) link.append(row.firstElementChild);
        [...li.children].forEach((anchor) => {
          const div = anchor.querySelector('div');
          if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
          else div.className = 'cards-card-body';
          if (textClass) {
            const paragraphs = div.querySelectorAll('p');
            paragraphs.forEach((p) => {
              p.classList.add(textClass);
            });
          }
          if (!div.hasChildNodes()) {
            div.parentElement.classList.add('empty-card');
          }
        });
      } else {
        li.classList.add('empty-card');
      }
      ul.append(li);
    });
    ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
    cardsContainer.append(ul);
  } else {
    const ul = document.createElement('ul');
    const textClass = Array.from(block.classList).find((className) => className.startsWith('text-'));
    [...block.children].forEach((row) => {
      const li = document.createElement('li');
      while (row.firstElementChild) li.append(row.firstElementChild);
      [...li.children].forEach((div) => {
        if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
        else div.className = 'cards-card-body';
        if (textClass) {
          const paragraphs = div.querySelectorAll('p');
          paragraphs.forEach((p) => {
            p.classList.add(textClass);
          });
        }
        if (!div.hasChildNodes()) {
          div.parentElement.classList.add('empty-card');
        }
      });
      ul.append(li);
    });
    ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
    cardsContainer.append(ul);
  }

  block.textContent = '';
  block.append(cardsContainer);
}

export async function createDynamicCardCourse(contentData) {
  const {
    metadata: {
      'og:image': ogimage,
      image,
    },
    title,
    description,
    path,
    readTime,
  } = contentData;
  const imageWrapper = createElement('div', { class: 'cards-card-image' });
  const link = createElement('a', { href: path });
  imageWrapper.style.backgroundImage = `url('${ogimage || image || fallbackImage}')`;

  const bodyWrapper = createElement('div', { class: 'cards-card-body' });
  bodyWrapper.innerHTML = `
    <div class="card-subtitle">
    course
    <span>${await parseTime(readTime)}</span>
    </div>
    <div class="cards-card-title">
      <h3>${title}</h3>
    </div>
    <div class="cards-card-description">
      <p>${description}</p>
    </div>
  `;
  link.append(bodyWrapper);

  const li = createElement('li', { class: 'cards-card' }, imageWrapper, link);
  return li;
}

export async function createDynamicCardArticle(content, showPrimaryTopic = false) {
  const curatedContent = isLegacyContent(content) ? mapLegacyArticleData(content) : content;
  const {
    path,
    readTime,
    date,
    title,
    metadata: {
      'sub-template': subTemplates,
      image,
      'primary-topic': primaryTopic,
    },
  } = curatedContent;
  const [
    readLabel,
    durationStr,
    primaryTopicStr,
  ] = await Promise.all([
    getReadTimeLabel(subTemplates),
    parseTime(readTime),
    showPrimaryTopic ? getTag(primaryTopic) : '',
  ]);
  const cardTime = createElement('span', { class: 'cards-time' }, `${durationStr} ${readLabel}`);
  cardTime.prepend(getReadTimeIcon(subTemplates));
  const cardDate = createElement('span', { class: 'cards-date' }, getCdtDate(date).format('DD MMMM'));
  const cardTitle = createElement('h3');
  cardTitle.innerHTML = title;
  const mainContainer = createElement('div', { class: 'cards-body-container' }, cardTime, cardDate, cardTitle);
  const img = createElement('img', { src: image });
  const imageContainer = createElement('div', { class: 'cards-image-container' }, img);
  const linkEl = createElement('a', { href: path }, imageContainer, mainContainer);
  if (showPrimaryTopic && primaryTopicStr) {
    const cardPrimaryTopic = createElement('span', { class: 'cards-primary-topic' }, primaryTopicStr.title);
    const cardFooter = createElement('div', { class: 'cards-footer' }, cardPrimaryTopic);
    linkEl.append(cardFooter);
  }
  if (subTemplates.includes('video')) {
    linkEl.classList.add('video-card');
  }
  return createElement('li', null, linkEl);
}

async function createDynamicCardArticleMedium(content, index) {
  const curatedContent = isLegacyContent(content) ? mapLegacyArticleData(content) : content;
  const {
    path,
    readTime,
    date,
    title,
    description,
    author,
    metadata: {
      'sub-template': subTemplates,
      image,
    },
  } = curatedContent;
  const [
    readLabel,
    durationStr,
    authorTag,
    byLabel,
  ] = await Promise.all([
    getReadTimeLabel(subTemplates),
    parseTime(readTime),
    getTag(author || ''),
    i18n('By'),
  ]);
  const cardTime = createElement('span', { class: 'cards-time' }, `${durationStr} ${readLabel}`);
  cardTime.prepend(getReadTimeIcon(subTemplates));
  const cardTitle = createElement('h3');
  cardTitle.innerHTML = title;
  const cardDescription = createElement('span', { class: 'cards-description' }, description);
  const mainContainer = createElement('div', { class: 'cards-body-container' }, cardTime, cardTitle, cardDescription);
  const cardDate = createElement('div', { class: 'cards-date' }, getCdtDate(date).format('DD MMM YYYY'));
  let cardAuthor;
  if (authorTag?.title) {
    cardAuthor = createElement('div', { class: 'cards-author' }, `${byLabel} ${authorTag?.title}`);
  }
  const footerContainer = createElement('div', { class: 'cards-footer' }, cardDate, cardAuthor);
  const linkEl = createElement('a', { href: path }, mainContainer, footerContainer);
  const liAttrs = (index === 0) ? { 'data-image': image } : null;
  return createElement('li', liAttrs, linkEl);
}

function createDynamicCardThumbnailMedium(content) {
  const curatedContent = isLegacyContent(content) ? mapLegacyArticleData(content) : content;
  const {
    path,
    title,
    metadata: {
      image,
    },
  } = curatedContent;
  const cardImgTop = createOptimizedPicture(image);
  cardImgTop.className = 'card-img-top';
  const paragraph = createElement('p', { class: 'card-text' }, decodeHtmlEntities(title));
  const titletag = createElement('div', { class: 'card-title' }, paragraph);
  const cardBody = createElement('div', { class: 'card-body' }, titletag);
  const link = createElement('a', { href: path }, cardImgTop, cardBody);
  return createElement('li', null, link);
}

function createDynamicCardUpcomingEvent(content) {
  const {
    url,
    date,
    eventName,
  } = content;
  const paragraph = createElement('p', { class: 'card-text' }, decodeHtmlEntities(eventName));
  const titletag = createElement('div', { class: 'card-title' }, paragraph);
  const datetag = createElement('div', { class: 'card-date' }, getCdtDate(date).format('DD MMM YYYY'));
  const cardBody = createElement('div', { class: 'card-body' }, titletag, datetag);
  const link = createElement('a', { href: url }, cardBody);
  return createElement('li', null, link);
}

function simpleDynamicCard(content) {
  const curatedContent = isLegacyContent(content) ? mapLegacyArticleData(content) : content;
  const {
    path,
    title,
    metadata: {
      'sub-template': subTemplates,
      image,
    },
  } = curatedContent;
  const cardTitle = createElement('h3');
  cardTitle.innerHTML = title;
  const mainContainer = createElement('div', { class: 'cards-body-container' }, cardTitle);
  const img = createElement('img', { src: image });
  const imageContainer = createElement('div', { class: 'cards-image-container' }, img);
  const linkEl = createElement('a', { href: path }, imageContainer, mainContainer);
  if (subTemplates.includes('video')) {
    linkEl.classList.add('video-card');
  }
  return createElement('li', null, linkEl);
}

function getArticleTypeConfig(block) {
  if (block.classList.contains('list')) {
    return {
      type: 'list',
      limit: 3,
      mapFunction: (content) => createDynamicCardArticle(content, false),
      sliderConfig: null,
      disableSliderOnDesktop: true,
    };
  }
  if (block.classList.contains('thumbnail-medium')) {
    return {
      type: 'thumbnail-medium',
      limit: 3,
      mapFunction: createDynamicCardThumbnailMedium,
      sliderConfig: null,
      disableSliderOnDesktop: true,
    };
  }
  if (block.classList.contains('card-list')) {
    return {
      type: 'card-list',
      limit: 4,
      mapFunction: (content) => {
        const showPrimaryTopic = block.classList.contains('show-primary-topic');
        return createDynamicCardArticle(content, showPrimaryTopic);
      },
      disableSliderOnDesktop: true,
      sliderConfig: {
        slidesToShow: 'auto',
        slidesToScroll: 1,
        scrollLock: false,
        itemWidth: 255,
        exactWidth: true,
        draggable: true,
        duration: 2,
        responsive: [
          {
            breakpoint: 481,
            settings: {
              itemWidth: 292,
            },
          },
        ],
      },
    };
  }
  if (block.classList.contains('medium')) {
    return {
      type: 'medium',
      limit: 10,
      mapFunction: createDynamicCardArticleMedium,
      disableSliderOnDesktop: false,
      sliderConfig: {
        slidesToShow: 'auto',
        slidesToScroll: 1,
        scrollLock: false,
        itemWidth: 249,
        exactWidth: true,
        draggable: true,
        duration: 2,
        responsive: [
          {
            breakpoint: 993,
            settings: {
              itemWidth: 324,
            },
          },
        ],
      },
      refreshCallback: (el) => {
        if (block.classList.contains('featured')) {
          const windowWidth = window.innerWidth;
          const firstSlide = el.querySelector('.glider-slide');
          firstSlide.style.backgroundImage = `url('${firstSlide.dataset.image}')`;
          if (windowWidth >= 993) {
            firstSlide.style.width = '401px';
            const track = el.querySelector('.glider-track');
            track.style.width = `${track.offsetWidth + 77}px`;
          }
        }
      },
    };
  }
  return {};
}

function createSpinner() {
  const spinner = createElement('div', { class: 'spinner-cards' });
  spinner.innerHTML = `
    <div></div>
    <div></div>
    <div></div>
    <div></div>
  `;
  return spinner;
}

export async function createDynamicCards(block) {
  const config = readBlockConfig(block);
  block.textContent = '';
  block.append(createSpinner());
  let filteredData;
  let cardElements;
  let sliderConfig = null;
  let disableSliderOnDesktop = false;
  let inverse = false;
  let refreshCallback = null;
  if (block.classList.contains('course')) {
    const indexFilter = buildIndexFilter(config);
    indexFilter.templates = ['course'];
    indexFilter.orderBy = 'lastModified';
    indexFilter.sortDirection = 'desc';
    if (indexFilter.limit) {
      block.classList.add(`columns-grid-${indexFilter.limit}`);
    }
    filteredData = await getIndexedContent(indexFilter);
    sliderConfig = {
      slidesToShow: 'auto',
      slidesToScroll: 1,
      scrollLock: false,
      itemWidth: 270,
      exactWidth: true,
      draggable: true,
      duration: 2,
      responsive: [
        {
          breakpoint: 481,
          settings: {
            itemWidth: 434,
          },
        },
      ],
    };
    inverse = true;
    disableSliderOnDesktop = true;
    cardElements = await Promise.all(filteredData.map(createDynamicCardCourse));
  } else if (block.classList.contains('article')) {
    const articleTypeConfig = getArticleTypeConfig(block);
    const indexFilter = buildIndexFilter(config);
    if (!indexFilter.templates || indexFilter.templates.length === 0) {
      indexFilter.templates = ['article', ...legacyArticleTemplates];
    } else {
      if (indexFilter.templates.includes('article')) {
        indexFilter.templates = [...indexFilter.templates, ...legacyArticleTemplates];
      }
      if (indexFilter.templates.includes('news')) {
        indexFilter.templates = [...indexFilter.templates, ...legacyNewsTemplates];
      }
    }
    if (!indexFilter.basePaths || indexFilter.basePaths.length === 0) {
      indexFilter.basePaths = ['/education', '/content/cmegroup/en'];
    }
    if (!indexFilter.limit) {
      indexFilter.limit = articleTypeConfig.limit;
    }
    if (!indexFilter.orderBy) {
      indexFilter.orderBy = 'date';
    }
    if (!indexFilter.sortDirection) {
      indexFilter.sortDirection = 'desc';
    }
    [filteredData] = await Promise.all([
      getIndexedContent(indexFilter),
      setupDayjsLibs(),
    ]);
    cardElements = await Promise.all(filteredData.map(articleTypeConfig.mapFunction));
    sliderConfig = articleTypeConfig.sliderConfig;
    refreshCallback = articleTypeConfig.refreshCallback;
    disableSliderOnDesktop = articleTypeConfig.disableSliderOnDesktop;
  } else if (block.classList.contains('openmarkets')) {
    const indexFilter = buildIndexFilter(config);
    indexFilter.templates = legacyOpenMarketsTemplates;
    if (!indexFilter.basePaths || indexFilter.basePaths.length === 0) {
      indexFilter.basePaths = ['/content/openmarkets'];
    }
    if (!indexFilter.limit) {
      indexFilter.limit = 2;
    }
    indexFilter.orderBy = 'date';
    indexFilter.sortDirection = 'desc';
    [filteredData] = await Promise.all([
      getIndexedContent(indexFilter),
    ]);
    cardElements = await Promise.all(filteredData.map(simpleDynamicCard));
    sliderConfig = {
      slidesToShow: 'auto',
      slidesToScroll: 1,
      scrollLock: false,
      itemWidth: 255,
      exactWidth: true,
      draggable: true,
      duration: 2,
      responsive: [
        {
          breakpoint: 481,
          settings: {
            itemWidth: 426,
          },
        },
      ],
    };
    disableSliderOnDesktop = true;
    inverse = true;
  } else if (block.classList.contains('upcoming-events')) {
    if (block.classList.contains('econoday-events')) {
      [filteredData] = await Promise.all([
        getEconomicReleaseEvents(new Date().toISOString().slice(0, 10), null, null, null, 10),
        setupDayjsLibs(),
      ]);
    } else {
      const indexFilter = buildIndexFilter(config);
      indexFilter.templates = ['event'];
      indexFilter.relativeDateFrom = 0;
      indexFilter.relativeDateTo = 365;
      indexFilter.orderBy = 'date';
      indexFilter.sortDirection = 'asc';
      indexFilter.limit = 10;
      [filteredData] = await Promise.all([
        getIndexedContent(indexFilter),
        setupDayjsLibs(),
      ]);
      filteredData.forEach((obj) => {
        obj.eventName = obj.title;
        obj.url = obj.path;
      });
    }
    if (filteredData.length > 0) {
      cardElements = filteredData.map(createDynamicCardUpcomingEvent);
      sliderConfig = {
        slidesToShow: 'auto',
        slidesToScroll: 1,
        scrollLock: false,
        itemWidth: 249,
        exactWidth: true,
        draggable: true,
        duration: 2,
        responsive: [
          {
            breakpoint: 993,
            settings: {
              itemWidth: 324,
            },
          },
        ],
      };
    }
  } else {
    cardElements = [];
  }
  if (cardElements && cardElements.length) {
    const ul = createElement('ul', null, ...cardElements);
    const cardsContainer = createElement('div', null, ul);
    const paramsFallback = config['params-fallback'];
    block.textContent = '';
    if (config['params-fallback']) {
      cardElements.map((item) => {
        const childrenArray = Array.from(item.children || []);
        const anchor = childrenArray.find((child) => child.tagName === 'A');
        if (anchor) {
          anchor.href = `${anchor.href}?${paramsFallback}`;
        }
        return item;
      });
    }
    if (config.title) {
      const listCardTitle = document.createElement('h4');
      listCardTitle.textContent = config.title;
      block.appendChild(listCardTitle);
    }
    block.appendChild(cardsContainer);
    if (sliderConfig) {
      disableSliderOnDesktop = disableSliderOnDesktop && !block.classList.contains('always-slider');
      buildSlider(ul, sliderConfig, true, disableSliderOnDesktop, inverse, false, refreshCallback);
    }
  } else {
    const noResultsLabel = createElement('h4', null, 'No results found');
    const noResults = createElement('div', { class: 'no-results' }, noResultsLabel);
    block.textContent = '';
    block.append(noResults);
  }
}

async function createRecommendedFromService(data, block) {
  const { params } = readBlockConfig(block);
  const blockDiv = createElement('div', {
    class: 'cards recommended-ai block',
  });
  blockDiv.setAttribute('data-block-name', 'cards');
  const containerDiv = createElement('div');
  const ul = createElement('ul');
  ul.style.setProperty('--columns', Math.min(data.length, 4));

  const elements = await Promise.all(
    data.map(async (item) => {
      const imageDiv = createElement('div', {
        class: 'cards-card-image',
      });
      const imgSrc = item.image_uri;
      imageDiv.style.backgroundImage = imgSrc ? `url('https://www.cmegroup.com/${imgSrc}')` : fallbackImage;

      const link = createElement('a', { href: params ? `${item.uri}?${params}` : item.uri });

      const subtitleDiv = createElement('div', {
        class: 'card-subtitle',
      });
      subtitleDiv.textContent = `${item.image_name || ''} `;

      const span = createElement('span');
      parseTime(convertMMSSToHHMM(item.media_duration)).then((i) => {
        span.textContent = i;
        subtitleDiv.appendChild(span);
      });

      const titleDiv = createElement('div', {
        class: 'cards-card-title',
      });
      const h3 = createElement('h3');
      h3.textContent = item.title || '';
      titleDiv.appendChild(h3);

      const descDiv = createElement('div', {
        class: 'cards-card-description',
      });

      const p = createElement('p');
      p.textContent = item.description || '';
      descDiv.appendChild(p);

      const bodyDiv = createElement('div', {
        class: 'cards-card-body',
      }, subtitleDiv, titleDiv, descDiv);

      link.appendChild(bodyDiv);

      const li = createElement('li', {
        class: 'cards-card',
      }, imageDiv, link);

      ul.appendChild(li);
      return ul;
    }),
  );

  elements.forEach((li) => blockDiv.appendChild(li));

  const disableSliderOnDesktop = true;
  const inverse = true;
  const refreshCallback = null;
  const sliderConfig = {
    slidesToShow: 'auto',
    slidesToScroll: 1,
    scrollLock: false,
    itemWidth: 270,
    exactWidth: true,
    draggable: true,
    duration: 2,
    responsive: [
      {
        breakpoint: 481,
        settings: {
          itemWidth: 434,
        },
      },
    ],
  };
  buildSlider(ul, sliderConfig, true, disableSliderOnDesktop, inverse, false, refreshCallback);

  containerDiv.appendChild(ul);
  blockDiv.appendChild(containerDiv);
  return blockDiv;
}

async function createRecommendedCards(block) {
  const blockData = block.cloneNode(true);
  const { limit } = readBlockConfig(block);
  block.textContent = '';
  block.appendChild(createSpinner());
  let dataAi = [];
  let useAiData = false;

  try {
    const { getRecommendationAi } = await import('../../scripts/services/RecommendationAiService.js');
    dataAi = await getRecommendationAi();

    if (dataAi && dataAi.length > 0) {
      const result = limit ? dataAi.slice(0, limit) : dataAi;
      const cardsAi = await createRecommendedFromService(result, blockData);
      block.replaceWith(cardsAi);
      useAiData = true;
    }
  } catch (error) {
    console.log('Error fetching Recommendation AI service:', error);
  }

  if (!useAiData) {
    if (blockData) {
      blockData.classList.remove('recommended-ai');
      await createDynamicCards(blockData);
      block.replaceWith(blockData);
    } else {
      const noResultsLabel = createElement('h4', null, 'No results found');
      const noResults = createElement('div', { class: 'no-results' }, noResultsLabel);
      block.replaceWith(noResults);
    }
  }
}

export default async function decorate(block) {
  if (block.classList.contains('contract-specs')) {
    await createContractSpecsCards(block);
  } else if (block.classList.contains('dynamic')) {
    await createDynamicCards(block);
  } else if (block.classList.contains('recommended-ai')) {
    await createRecommendedCards(block);
  } else {
    createStaticCards(block);
  }
}

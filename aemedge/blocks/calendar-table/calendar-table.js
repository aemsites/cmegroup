import { getMetadata } from '../../scripts/aem.js';
import { getProductMetadata, applyAuthorOverride } from '../../scripts/utils/product.js';
import { apiGet, getResponseData, urlByEnvType } from '../../scripts/utils/index.js';
import { createElement, i18n } from '../../scripts/utils.js';

// Import store and actions from centralized store
import { store as productStore } from '../../scripts/store/store.js';
import { updateProductField } from '../../scripts/actions/product.js';

// API Configuration
// Uses urlByEnvType() to automatically select correct environment
const API_CONFIG = {
  calendarEndpoint: '/CmeWS/mvc/ProductCalendar/Future',
  optionsEndpoint: '/CmeWS/mvc/ProductCalendar/Options',
};

// Table Constants
const TABLE_CONSTANTS = {
  placeholders: {
    noData: '-',
  },
};

/* Get current mode from URL */
function getDisplayMode() {
  const isOptions = window.location.pathname.includes('/options');
  const urlParams = new URLSearchParams(window.location.search);
  const optionProductId = urlParams.get('optionProductId');

  return { isOptions, optionProductId };
}

/* Fetch calendar table data for futures */
async function fetchCalendarTableData(productId) {
  // Try productStore cache first (prefetched by product.js)
  const state = productStore.getState();
  const cachedData = state.productData?.calendarData?.table;

  if (cachedData) {
    return cachedData;
  }

  try {
    const url = `${urlByEnvType()}${API_CONFIG.calendarEndpoint}/${productId}`;
    const response = await apiGet(url);
    const data = getResponseData(response) || response.data;

    if (data) {
      const tableData = data;
      productStore.dispatch(updateProductField('calendarData.table', tableData));
      return data;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch calendar table data:', error);
    return null;
  }

  return null;
}

/* Fetch options labels for a specific product */
async function fetchOptionTableData(productId, optionProductId) {
  try {
    const url = `${urlByEnvType()}${API_CONFIG.optionsEndpoint}/${productId}`;
    const response = await apiGet(url);
    const data = getResponseData(response) || response.data;

    const optionData = data.filter((item) => item.productIds[0] === Number(optionProductId));

    if (optionData) {
      return optionData[0].calendarEntries;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch calendar option table data:', error);
    return null;
  }

  return null;
}

/* Build HTML table structure */
function buildTable(headers, data, tableId = '') {
  const table = createElement('table');
  if (tableId) table.id = tableId;

  const thead = createElement('thead');
  const headerRow = createElement('tr');

  headers.forEach((header) => {
    const th = createElement('th');
    th.innerHTML = header;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = createElement('tbody');
  data.forEach((rowData) => {
    const tr = createElement('tr');
    rowData.forEach((cellData) => {
      const td = createElement('td');
      if (typeof cellData === 'string') {
        td.innerHTML = cellData;
      } else if (cellData instanceof HTMLElement) {
        td.appendChild(cellData);
      } else {
        td.innerHTML = cellData;
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
}

/* Create futures calendar table */
async function createFuturesTable() {
  const productMetadata = await getProductMetadata();
  const productId = productMetadata.productId || getMetadata('product-id');

  if (!productId) return null;

  const calendarData = await fetchCalendarTableData(productId);

  if (!calendarData || calendarData.length === 0) {
    return null;
  }

  const [
    contractMonth,
    productCode,
    firstTrade,
    lastTrade,
    settlement,
    firstHolding,
    lastHolding,
    firstPosition,
    lastPosition,
    firstNotice,
    lastNotice,
    firstDelivery,
    lastDelivery,
  ] = await Promise.all([
    i18n('Contract Month'),
    i18n('Product Code'),
    i18n('First Trade'),
    i18n('Last Trade'),
    i18n('Settlement'),
    i18n('First Holding'),
    i18n('Last Holding'),
    i18n('First Position'),
    i18n('Last Position'),
    i18n('First Notice'),
    i18n('Last Notice'),
    i18n('First Delivery'),
    i18n('Last Delivery'),
  ]);

  const headers = [
    contractMonth,
    productCode,
    `${firstTrade}<br>${lastTrade}`,
    settlement,
    `${firstHolding}<br>${lastHolding}`,
    `${firstPosition}<br>${lastPosition}`,
    `${firstNotice}<br>${lastNotice}`,
    `${firstDelivery}<br>${lastDelivery}`,
  ];

  const tableData = calendarData.map((item) => [
    item.contractMonth || TABLE_CONSTANTS.placeholders.noData,
    item.productCode || TABLE_CONSTANTS.placeholders.noData,
    `${item.firstTrade || TABLE_CONSTANTS.placeholders.noData}<br>${item.lastTrade || TABLE_CONSTANTS.placeholders.noData}`,
    item.settlement || TABLE_CONSTANTS.placeholders.noData,
    `${item.firstHolding || TABLE_CONSTANTS.placeholders.noData}<br>${item.lastHolding || TABLE_CONSTANTS.placeholders.noData}`,
    `${item.firstPosition || TABLE_CONSTANTS.placeholders.noData}<br>${item.lastPosition || TABLE_CONSTANTS.placeholders.noData}`,
    `${item.firstNotice || TABLE_CONSTANTS.placeholders.noData}<br>${item.lastNotice || TABLE_CONSTANTS.placeholders.noData}`,
    `${item.firstDelivery || TABLE_CONSTANTS.placeholders.noData}<br>${item.lastDelivery || TABLE_CONSTANTS.placeholders.noData}`,
  ]);

  return buildTable(headers, tableData, 'futures-calendar-table');
}

/* Create option calendar table */
async function createOptionsTable(optionProductId) {
  const productMetadata = await getProductMetadata();
  const productId = productMetadata.productId || getMetadata('product-id');

  if (!productId) return null;

  const optionsData = await fetchOptionTableData(productId, optionProductId);

  if (!optionsData || optionsData.length === 0) {
    return null;
  }

  const [
    contractMonth,
    productCode,
    firstTrade,
    lastTrade,
    settlement,
  ] = await Promise.all([
    i18n('Contract Month'),
    i18n('Product Code'),
    i18n('First Trade'),
    i18n('Last Trade'),
    i18n('Settlement'),
  ]);

  const headers = [
    contractMonth,
    productCode,
    `${firstTrade}<br>${lastTrade}`,
    settlement,
  ];

  const tableData = optionsData.map((item) => [
    item.contractMonth || TABLE_CONSTANTS.placeholders.noData,
    item.productCode || TABLE_CONSTANTS.placeholders.noData,
    `${item.firstTrade || TABLE_CONSTANTS.placeholders.noData}<br>${item.lastTrade || TABLE_CONSTANTS.placeholders.noData}`,
    item.settlement || TABLE_CONSTANTS.placeholders.noData,
  ]);

  return buildTable(headers, tableData, 'option-calendar-table');
}

async function renderTable(block) {
  const { isOptions, optionProductId } = getDisplayMode();
  block.innerHTML = '<div class="loading">Loading Calendar...</div>';

  // Get productId for API calls
  const productMetadata = await getProductMetadata();
  const productId = productMetadata.productId || getMetadata('product-id');

  if (!productId) {
    block.innerHTML = `
      <div class="no-results">
        <h4>Unable to load calendar</h4>
        <p>Product ID not found.</p>
      </div>
    `;
    return;
  }

  try {
    let table = null;

    if (isOptions) {
      if (optionProductId && await applyAuthorOverride(block, 'options-product-id', optionProductId)) {
        return;
      }

      table = await createOptionsTable(optionProductId);

      if (table) {
        block.innerHTML = '';

        // Add option type header if optionProductId is specified
        if (optionProductId) {
          const header = createElement('div', { class: 'options-type-header' });
          header.innerHTML = `<p class="options-type-note">Showing options data (Product ID: ${optionProductId})</p>`;
          block.appendChild(header);
        }

        block.appendChild(table);
        // Add "About this Report" link
        const aboutLink = createElement('p', { class: 'about-report-wrapper' });
        aboutLink.innerHTML = '<a href="#" class="about-report-link">About this Report</a>';
        block.appendChild(aboutLink);
      } else {
        block.innerHTML = `
          <div class="no-results">
            <h4>Unable to load options calendar</h4>
            <p>Options data is currently unavailable.</p>
          </div>
        `;
      }
    } else {
      // Futures mode
      table = await createFuturesTable();

      if (table) {
        block.innerHTML = '';
        block.appendChild(table);

        // Add "About this Report" link
        const aboutLink = createElement('p', { class: 'about-report-wrapper' });
        aboutLink.innerHTML = '<a href="#" class="about-report-link">About this Report</a>';
        block.appendChild(aboutLink);
      } else {
        block.innerHTML = `
          <div class="no-results">
            <h4>Unable to load futures calendar</h4>
            <p>Calendar data is currently unavailable.</p>
          </div>
        `;
      }
    }
  } catch (error) {
    block.innerHTML = `
      <div class="no-results">
        <h4>Error loading calendar data</h4>
        <p>${error.message}</p>
      </div>
    `;
  }
}

/* Handle "About this Report" modal */
function handleAboutReportModal(block) {
  block.addEventListener('click', async (e) => {
    if (e.target.classList.contains('about-report-link')) {
      e.preventDefault();
      try {
        const { openModal } = await import('../modal/modal.js');
        const fragmentUrl = '/drafts/kunwar/corn/fragments/product/about-quotes';
        await openModal(fragmentUrl);
      } catch (error) {
        // Silent fail
      }
    }
  });
}

export default async function decorate(block) {
  // Add 'table' class to inherit table.css styles
  block.classList.add('table');

  // Add 'fixed-row-header' for sticky header (can be removed via author if not needed)
  if (!block.classList.contains('no-fixed-header')) {
    block.classList.add('fixed-row-header');
  }

  // Show loading state immediately (non-blocking)
  block.innerHTML = '<div class="loading">Loading Calendar...</div>';

  // Load table data in background (non-blocking)
  renderTable(block).catch((error) => {
    block.innerHTML = `
      <div class="no-results">
        <h4>Error loading calendar data</h4>
        <p>${error.message}</p>
      </div>
    `;
  });

  handleAboutReportModal(block);
}

import { getMetadata, loadCSS } from '../../scripts/aem.js';
import { getProductMetadata, applyAuthorOverride } from '../../scripts/utils/product.js';
import { apiGet, getResponseData, urlByEnvType } from '../../scripts/utils/index.js';
import { createElement, i18n } from '../../scripts/utils.js';

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

let needShowAll = false;
const maxRows = 12;

/* Get current mode from URL */
function getDisplayMode() {
  const isOptions = window.location.pathname.includes('/options');
  const urlParams = new URLSearchParams(window.location.search);
  const optionProductId = urlParams.get('optionProductId');

  return { isOptions, optionProductId };
}

/* Fetch calendar table data for futures */
async function fetchCalendarTableData(productId) {
  try {
    const url = `${urlByEnvType()}${API_CONFIG.calendarEndpoint}/${productId}`;
    const response = await apiGet(url);
    const data = getResponseData(response) || response.data;

    if (data) {
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

/* Build HTML collapsible structure */
function buildCollapsible(headers, data, collapsibleId = '') {
  const collapsible = createElement('div', { class: 'collapsible-calendar' });
  if (collapsibleId) collapsible.id = collapsibleId;

  headers.forEach((header, index) => {
    const collapsibleItem = createElement('div', { class: 'collapsible-item' });
    const collapsibleButton = createElement('button', { class: 'collapsible-button' });
    collapsibleButton.innerHTML = header;
    collapsibleItem.appendChild(collapsibleButton);
    const collapse = createElement('div', { class: 'collapse' });
    const collapseBody = createElement('div', { class: 'collapse-body' });
    collapseBody.innerHTML = data[index];
    collapse.appendChild(collapseBody);
    collapsibleItem.appendChild(collapse);
    collapsible.appendChild(collapsibleItem);
  });

  return collapsible;
}

/* Build HTML table structure */
function buildTable(headers, data, tableId = '') {
  const table = createElement('table', { class: 'table-calendar' });
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
  data.forEach((rowData, index) => {
    const tr = createElement('tr');
    if (index >= maxRows) {
      tr.classList.add('hidden-row');
    }
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

  needShowAll = data.length > maxRows;
  if (needShowAll) table.classList.add('table-fade');

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
    `<span>${firstTrade}</span><span>${lastTrade}</span>`,
    settlement,
    `<span>${firstHolding}</span><span>${lastHolding}</span>`,
    `<span>${firstPosition}</span><span>${lastPosition}</span>`,
    `<span>${firstNotice}</span><span>${lastNotice}</span>`,
    `<span>${firstDelivery}</span><span>${lastDelivery}</span>`,
  ];

  const tableData = calendarData.map((item) => [
    item.contractMonth || TABLE_CONSTANTS.placeholders.noData,
    item.productCode || TABLE_CONSTANTS.placeholders.noData,
    `<span>${item.firstTrade || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastTrade || TABLE_CONSTANTS.placeholders.noData}</span>`,
    item.settlement || TABLE_CONSTANTS.placeholders.noData,
    `<span>${item.firstHolding || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastHolding || TABLE_CONSTANTS.placeholders.noData}</span>`,
    `<span>${item.firstPosition || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastPosition || TABLE_CONSTANTS.placeholders.noData}</span>`,
    `<span>${item.firstNotice || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastNotice || TABLE_CONSTANTS.placeholders.noData}</span>`,
    `<span>${item.firstDelivery || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastDelivery || TABLE_CONSTANTS.placeholders.noData}</span>`,
  ]);

  const collapsibleHeaders = calendarData.map((item) => [
    item.contractMonth || TABLE_CONSTANTS.placeholders.noData,
  ]);

  const collapsibleData = calendarData.map((item) => [
    `<span>${productCode}</span><span>${item.productCode || TABLE_CONSTANTS.placeholders.noData}</span>
    <div><span>${firstTrade}</span><span>${lastTrade}</div><div><span>${item.firstTrade || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastTrade || TABLE_CONSTANTS.placeholders.noData}</span></div>
    <span>${settlement}</span><span>${item.settlement || TABLE_CONSTANTS.placeholders.noData}</span>
    <div><span>${firstHolding}</span><span>${lastHolding}</span></div><div><span>${item.firstHolding || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastHolding || TABLE_CONSTANTS.placeholders.noData}</span></div>
    <div><span>${firstPosition}</span><span>${lastPosition}</span></div><div><span>${item.firstPosition || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastPosition || TABLE_CONSTANTS.placeholders.noData}</span></div>
    <div><span>${firstNotice}</span><span>${lastNotice}</span></div><div><span>${item.firstNotice || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastNotice || TABLE_CONSTANTS.placeholders.noData}</span></div>
    <div><span>${firstDelivery}</span><span>${lastDelivery}</span></div><div><span>${item.firstDelivery || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastDelivery || TABLE_CONSTANTS.placeholders.noData}</span></div>
    `,
  ]);

  const calendarWrapper = createElement('div', { class: 'calendar-wrapper' });
  const buildedTable = buildTable(headers, tableData, 'futures-calendar-table');
  const buildedCollapsible = buildCollapsible(collapsibleHeaders, collapsibleData, 'futures-calendar-collapsible');
  calendarWrapper.appendChild(buildedTable);
  calendarWrapper.appendChild(buildedCollapsible);

  return calendarWrapper;
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
    `<span>${firstTrade}</span><span>${lastTrade}</span>`,
    settlement,
  ];

  const tableData = optionsData.map((item) => [
    item.contractMonth || TABLE_CONSTANTS.placeholders.noData,
    item.productCode || TABLE_CONSTANTS.placeholders.noData,
    `<span>${item.firstTrade || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastTrade || TABLE_CONSTANTS.placeholders.noData}</span>`,
    item.settlement || TABLE_CONSTANTS.placeholders.noData,
  ]);

  const collapsibleHeaders = optionsData.map((item) => [
    item.contractMonth || TABLE_CONSTANTS.placeholders.noData,
  ]);

  const collapsibleData = optionsData.map((item) => [
    `<span>${productCode}</span><span>${item.productCode || TABLE_CONSTANTS.placeholders.noData}</span>
    <div><span>${firstTrade}</span><span>${lastTrade}</span></div><div><span>${item.firstTrade || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastTrade || TABLE_CONSTANTS.placeholders.noData}</span></div>
    <span>${settlement}</span><span>${item.settlement || TABLE_CONSTANTS.placeholders.noData}</span>`,
  ]);

  const calendarWrapper = createElement('div', { class: 'calendar-wrapper' });
  const buildedTable = buildTable(headers, tableData, 'option-calendar-table');
  const buildedCollapsible = buildCollapsible(collapsibleHeaders, collapsibleData, 'option-calendar-collapsible');
  calendarWrapper.appendChild(buildedTable);
  calendarWrapper.appendChild(buildedCollapsible);

  return calendarWrapper;
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
    let loadAll;

    if (isOptions) {
      if (optionProductId && await applyAuthorOverride(block, 'options-product-id', optionProductId)) {
        return;
      }

      table = await createOptionsTable(optionProductId);

      if (table) {
        block.innerHTML = '';
        block.appendChild(table);
        loadAll = await createLoadAllWrapper(block);
        block.append(loadAll);
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
        loadAll = await createLoadAllWrapper(block);
        block.append(loadAll);
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

async function createLoadAllWrapper(block) {
  const loadAllWrapper = createElement('div', { class: 'load-all-wrapper' });
  if (needShowAll) {
    const loadAllButtonWrapper = createElement('div', { class: 'load-all-button-wrapper' });
    const loadAllButton = createElement('button', { class: 'load-all-button primary' });
    const [
      loadAll,
    ] = await Promise.all([
      i18n('Load All'),
    ]);
    loadAllButton.innerHTML = loadAll;
    loadAllButtonWrapper.append(loadAllButton);
    loadAllWrapper.append(loadAllButtonWrapper);

    loadAllButton.addEventListener('click', async (e) => {
      e.preventDefault();
      const hiddenRows = block.querySelectorAll('.hidden-row');
      hiddenRows.forEach((row) => {
        row.classList.remove('hidden-row');
      });
      const fadeTable = block.querySelector('.table-fade');
      fadeTable.classList.remove('table-fade');
      e.target.remove();
    });
  }

  // Add "About this Report" link
  const aboutLink = createElement('p', { class: 'about-report-wrapper' });
  aboutLink.innerHTML = '<a href="#" class="about-report-link">About this Report</a>';
  loadAllWrapper.append(aboutLink);

  return loadAllWrapper;
}

export default async function decorate(block) {
  // Add 'table' class to inherit table.css styles
  await loadCSS(`${window.hlx.codeBasePath}/blocks/table/table.css`);
  block.classList.add('table');

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

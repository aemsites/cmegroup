import { getMetadata, loadCSS } from '../../scripts/aem.js';
import {
  getProductMetadata,
  applyAuthorOverride,
  getProductTitle,
  getDisplayMode,
  getCalendarFutures,
  getCalendarOptions,
  handleAboutReportModal,
  buildCollapsible,
  buildLoadAllButton,
  getTradeDateAndExpirations,
  createProductsDropdown,
} from '../../scripts/utils/product.js';
import { createElement, i18n } from '../../scripts/utils.js';

// Table Constants
const TABLE_CONSTANTS = {
  placeholders: {
    noData: '-',
  },
};

let needShowAll = false;
const maxRows = 12;
const titleWrapper = createElement('div', { class: 'title-wrapper' });
const tradeWrapper = createElement('div', { class: 'trades-wrapper' });
let expirationDate;
let tradeDate;

async function createTradeDateDropdown(expirationsOptions, expiration) {
  // 1. Find the specific expiration object that matches the selected expirationDate
  const selectedExpirationGroup = expirationsOptions[0].expirations.find(
    (option) => option.text === expiration,
  );

  // 2. Safety check: ensure the group exists before mapping
  const tradeDateOptions = selectedExpirationGroup
    ? selectedExpirationGroup.tradeDates.map((item) => ({
      label: item.label,
      text: item.text,
    }))
    : [];

  const handleTradeDateChange = (selectedTradeDate) => {
    tradeDate = selectedTradeDate.text;
    console.log(tradeDate);
  };

  // 3. Prevent rendering if no options are found
  if (tradeDateOptions.length > 0) {
    const tradeDateDropdown = createProductsDropdown(
      tradeDateOptions,
      tradeDateOptions[0].text,
      handleTradeDateChange,
    );

    tradeWrapper.append(tradeDateDropdown);
  }
}

/* create Trades wrapper */
async function createTradesWrapper(productId) {
  const tradeDateAndExpirations = await getTradeDateAndExpirations(productId);
  const expirationsOptions = tradeDateAndExpirations[0].expirations.map((item) => ({
    label: item.label,
    text: item.text,
  }));

  const handleExpirationChange = (selectedExpiration) => {
    expirationDate = selectedExpiration.text;
    createTradeDateDropdown(tradeDateAndExpirations, expirationDate);
  };

  const expirationDropdown = createProductsDropdown(
    expirationsOptions,
    expirationsOptions[0].text,
    handleExpirationChange,
  );

  tradeWrapper.append(expirationDropdown);

  createTradeDateDropdown(tradeDateAndExpirations, expirationsOptions[0].text);
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

  const calendarData = await getCalendarFutures(productId);

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
    `<div class="row-data"><span>${productCode}</span><span>${item.productCode || TABLE_CONSTANTS.placeholders.noData}</span></div>
    <div class="row-data"><div><span>${firstTrade}</span><span>${lastTrade}</div><div><span>${item.firstTrade || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastTrade || TABLE_CONSTANTS.placeholders.noData}</span></div></div>
    <div class="row-data"><span>${settlement}</span><span>${item.settlement || TABLE_CONSTANTS.placeholders.noData}</span></div>
    <div class="row-data"><div><span>${firstHolding}</span><span>${lastHolding}</span></div><div><span>${item.firstHolding || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastHolding || TABLE_CONSTANTS.placeholders.noData}</span></div></div>
    <div class="row-data"><div><span>${firstPosition}</span><span>${lastPosition}</span></div><div><span>${item.firstPosition || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastPosition || TABLE_CONSTANTS.placeholders.noData}</span></div></div>
    <div class="row-data"><div><span>${firstNotice}</span><span>${lastNotice}</span></div><div><span>${item.firstNotice || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastNotice || TABLE_CONSTANTS.placeholders.noData}</span></div></div>
    <div class="row-data"><div><span>${firstDelivery}</span><span>${lastDelivery}</span></div><div><span>${item.firstDelivery || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastDelivery || TABLE_CONSTANTS.placeholders.noData}</span></div></div>
    `,
  ]);

  const calendarWrapper = createElement('div', { class: 'calendar-wrapper' });
  const buildedTable = buildTable(headers, tableData, 'futures-calendar-table');
  const buildedCollapsible = buildCollapsible(collapsibleHeaders, collapsibleData, 'collapsible-calendar', maxRows, 'futures-calendar-collapsible');
  calendarWrapper.appendChild(buildedTable);
  calendarWrapper.appendChild(buildedCollapsible);

  return calendarWrapper;
}

/* Create option calendar table */
async function createOptionsTable(optionProductId) {
  const productMetadata = await getProductMetadata();
  const productId = productMetadata.productId || getMetadata('product-id');

  if (!productId) return null;

  const optionsData = await getCalendarOptions(productId, optionProductId);

  if (!optionsData || optionsData.length === 0) {
    return null;
  }

  // here create totals-info-row
  // here create view-selector-row

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
    `<div class="row-data"><span>${productCode}</span><span>${item.productCode || TABLE_CONSTANTS.placeholders.noData}</span></div>
    <div class="row-data"><div><span>${firstTrade}</span><span>${lastTrade}</span></div><div><span>${item.firstTrade || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastTrade || TABLE_CONSTANTS.placeholders.noData}</span></div></div>
    <div class="row-data"><span>${settlement}</span><span>${item.settlement || TABLE_CONSTANTS.placeholders.noData}</span></div>`,
  ]);

  const calendarWrapper = createElement('div', { class: 'calendar-wrapper' });
  const buildedTable = buildTable(headers, tableData, 'option-calendar-table');
  const buildedCollapsible = buildCollapsible(collapsibleHeaders, collapsibleData, 'collapsible-calendar', 'option-calendar-collapsible');
  calendarWrapper.appendChild(buildedTable);
  calendarWrapper.appendChild(buildedCollapsible);

  return calendarWrapper;
}

async function renderTable(block) {
  const { isOptions, optionProductId } = getDisplayMode();
  block.innerHTML = '<div class="spinner-calendar"><div></div><div></div><div></div><div></div></div>';

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
      // here create trades-wrapper
      await createTradesWrapper(optionProductId);

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

async function createLoadAllWrapper(block) {
  const loadAllWrapper = createElement('div', { class: 'load-all-wrapper' });
  if (needShowAll) {
    const [
      loadAll,
    ] = await Promise.all([
      i18n('Load All'),
    ]);
    loadAllWrapper.append(buildLoadAllButton(block, loadAll));
  }

  // Add "About this Report" link
  const aboutLink = createElement('p', { class: 'about-report-wrapper' });
  aboutLink.innerHTML = '<a href="#" class="about-report-link">About this Report</a>';
  loadAllWrapper.append(aboutLink);

  return loadAllWrapper;
}

export default function decorate(block) {
  block.classList.add('table');
  block.innerHTML = '<div class="spinner-settlements"><div></div><div></div><div></div><div></div></div>';
  titleWrapper.innerHTML = '';

  loadCSS(`${window.hlx.codeBasePath}/blocks/table/table.css`);

  Promise.all([i18n('Settlements')])
    .then(([settlementsLabel]) => {
      const { optionProductId } = getDisplayMode();
      return getProductTitle(optionProductId, settlementsLabel);
    })
    .then((title) => {
      const titleHtml = createElement('h2', { class: 'settlements-title' });
      titleHtml.innerHTML = title;
      titleWrapper.prepend(titleHtml);
      if (!titleWrapper.isConnected) {
        block.insertAdjacentElement('beforebegin', titleWrapper);
      }
      titleWrapper.after(tradeWrapper);
    })
    // eslint-disable-next-line no-console
    .catch((err) => console.error('load title error:', err));

  renderTable(block).catch((error) => {
    block.innerHTML = `
      <div class="no-results">
        <h4>Error loading calendar data</h4>
        <p>${error.message}</p>
      </div>
    `;
  });

  const fragmentUrl = '/fragments/disclaimers/markets/settlements';
  const modalItemClass = 'about-report-link';
  handleAboutReportModal(block, modalItemClass, fragmentUrl);
}

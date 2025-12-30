import { getMetadata, loadCSS } from '../../scripts/aem.js';
import {
  getProductMetadata,
  applyAuthorOverride,
  getProductTitle,
  getDisplayMode,
  handleAboutReportModal,
  buildCollapsible,
  buildLoadAllButton,
  getTradeDateAndExpirations,
  createProductsDropdown,
  getOptionSettlements,
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
const expirationWrapper = createElement('div', { class: 'expiration-wrapper' });
const tradeDateWrapper = createElement('div', { class: 'trade-date-wrapper' });
let optionExpiration;
let tradeDate;
let labels;
let contractId;

async function loadSettlements(block, productId) {
  let table = null;
  let loadAll;

  const tableDate = await getOptionSettlements(
    productId,
    optionExpiration,
    tradeDate,
    contractId,
  );

  table = await createOptionsTable(tableDate);
  if (table) {
    block.innerHTML = '';
    block.appendChild(table);
    loadAll = await createLoadAllWrapper(block);
    block.append(loadAll);
  } else {
    block.innerHTML = `
      <div class="no-results">
        <h4>Unable to load options settlement</h4>
        <p>Options data is currently unavailable.</p>
      </div>
    `;
  }
}

// async function loadSettlements(context) {
//   // 1. Destructure data from your context object (instead of this.state/props)
//   const { productId } = context.productData;
//   const {
//     optionProductId,
//     expirations,
//     selectedExpiration,
//     selectedTradeDate,
//     optionsListSelected,
//   } = context.data;

//   // 2. Manual "Loading" state (Update your UI/DOM here)
//   context.loadingSettlements = true;

//   // 3. Logic for contract and product IDs
//   const { contractId = '', expProductId = '' } = optionProductId
//     ? expirations.find(({ text }) => text === selectedExpiration) || {}
//     : {};

//   // 4. Fetching Data (Ternary remains the same)
//   const {
//     settlements = [],
//     settlementsStraddle = [],
//     totals = {},
//     updateTime = '',
//   } = optionProductId
//     ? await getOptionSettlements(
//       expProductId,
//       selectedExpiration,
//       selectedTradeDate,
//       contractId,
//     )
//     : await getFutureSettlements(productId, selectedTradeDate);

//   // 5. Data Processing Logic
//   let tableData = (optionProductId && !optionsListSelected)
//     ? settlementsStraddle
//     : settlements;

//   // const lastUpdated = dayjs(updateTime).format('DD MMM YYYY hh:mm:ss A') + ' CT';
//   lastUpdated = updateTime;
// }

/* create trade date dropdown */
async function createTradeDateDropdown(block, expirationsOptions, expiration, optionProductId) {
  tradeDateWrapper.innerHTML = '';
  const selectedExpirationGroup = expirationsOptions.expirations.find(
    (option) => option.text === expiration,
  );

  const tradeDateOptions = selectedExpirationGroup
    ? selectedExpirationGroup.tradeDates.map((item) => ({
      label: item.label,
      text: item.text,
    }))
    : [];

  const handleTradeDateChange = (selectedTradeDate) => {
    tradeDate = selectedTradeDate.text;
    loadSettlements(block, optionProductId);
  };

  if (tradeDateOptions.length > 0) {
    const tradeDateDropdown = createProductsDropdown(
      tradeDateOptions,
      tradeDateOptions[0].text,
      handleTradeDateChange,
    );

    tradeDate = tradeDateOptions[0].text;

    const tradeDateLabelP = createElement('p', { class: 'trade-date-label' });
    tradeDateLabelP.textContent = labels.tradeDateLabel;
    tradeDateWrapper.append(tradeDateLabelP);
    tradeDateWrapper.append(tradeDateDropdown);
    tradeWrapper.append(tradeDateWrapper);
    loadSettlements(block, optionProductId);
  }
}

/* create Trades wrapper and expiration dropdown */
async function createTradesWrapper(block, productId, optionProductId) {
  expirationWrapper.innerHTML = '';
  const tradeDateAndExpirations = await getTradeDateAndExpirations(productId);
  const targetTradeDate = tradeDateAndExpirations.find(
    (item) => item.productId === optionProductId,
  );
  const expirationsOptions = targetTradeDate.expirations.map((item) => ({
    label: item.label,
    text: item.text,
    contract: item.contractId,
  }));

  const handleExpirationChange = (selectedExpiration) => {
    optionExpiration = selectedExpiration.text;
    contractId = selectedExpiration.contract;
    createTradeDateDropdown(block, targetTradeDate, optionExpiration, optionProductId);
  };

  const expirationDropdown = createProductsDropdown(
    expirationsOptions,
    expirationsOptions[0].text,
    handleExpirationChange,
  );

  optionExpiration = expirationsOptions[0].text;
  contractId = expirationsOptions[0].contract;

  const expirationLabelP = createElement('p', { class: 'expiration-label' });
  expirationLabelP.textContent = labels.expirationLabel;
  expirationWrapper.append(expirationLabelP);
  expirationWrapper.append(expirationDropdown);
  tradeWrapper.append(expirationWrapper);

  createTradeDateDropdown(block, targetTradeDate, expirationsOptions[0].text, optionProductId);
}

/* Build HTML table structure */
function buildTable(headers, data, tableId = '') {
  const table = createElement('table', { class: 'table-settlement' });
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

/* Create futures settlement table */
async function createFuturesTable() {
  const productMetadata = await getProductMetadata();
  const productId = productMetadata.productId || getMetadata('product-id');

  if (!productId) return null;

  const settlementData = {};

  if (!settlementData || settlementData.length === 0) {
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

  const tableData = settlementData.map((item) => [
    item.contractMonth || TABLE_CONSTANTS.placeholders.noData,
    item.productCode || TABLE_CONSTANTS.placeholders.noData,
    `<span>${item.firstTrade || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastTrade || TABLE_CONSTANTS.placeholders.noData}</span>`,
    item.settlement || TABLE_CONSTANTS.placeholders.noData,
    `<span>${item.firstHolding || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastHolding || TABLE_CONSTANTS.placeholders.noData}</span>`,
    `<span>${item.firstPosition || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastPosition || TABLE_CONSTANTS.placeholders.noData}</span>`,
    `<span>${item.firstNotice || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastNotice || TABLE_CONSTANTS.placeholders.noData}</span>`,
    `<span>${item.firstDelivery || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastDelivery || TABLE_CONSTANTS.placeholders.noData}</span>`,
  ]);

  const collapsibleHeaders = settlementData.map((item) => [
    item.contractMonth || TABLE_CONSTANTS.placeholders.noData,
  ]);

  const collapsibleData = settlementData.map((item) => [
    `<div class="row-data"><span>${productCode}</span><span>${item.productCode || TABLE_CONSTANTS.placeholders.noData}</span></div>
    <div class="row-data"><div><span>${firstTrade}</span><span>${lastTrade}</div><div><span>${item.firstTrade || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastTrade || TABLE_CONSTANTS.placeholders.noData}</span></div></div>
    <div class="row-data"><span>${settlement}</span><span>${item.settlement || TABLE_CONSTANTS.placeholders.noData}</span></div>
    <div class="row-data"><div><span>${firstHolding}</span><span>${lastHolding}</span></div><div><span>${item.firstHolding || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastHolding || TABLE_CONSTANTS.placeholders.noData}</span></div></div>
    <div class="row-data"><div><span>${firstPosition}</span><span>${lastPosition}</span></div><div><span>${item.firstPosition || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastPosition || TABLE_CONSTANTS.placeholders.noData}</span></div></div>
    <div class="row-data"><div><span>${firstNotice}</span><span>${lastNotice}</span></div><div><span>${item.firstNotice || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastNotice || TABLE_CONSTANTS.placeholders.noData}</span></div></div>
    <div class="row-data"><div><span>${firstDelivery}</span><span>${lastDelivery}</span></div><div><span>${item.firstDelivery || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastDelivery || TABLE_CONSTANTS.placeholders.noData}</span></div></div>
    `,
  ]);

  const settlementWrapper = createElement('div', { class: 'settlement-wrapper' });
  const buildedTable = buildTable(headers, tableData, 'futures-settlement-table');
  const buildedCollapsible = buildCollapsible(collapsibleHeaders, collapsibleData, 'collapsible-settlement', maxRows, 'futures-settlement-collapsible');
  settlementWrapper.appendChild(buildedTable);
  settlementWrapper.appendChild(buildedCollapsible);

  return settlementWrapper;
}

/* Create option settlement table */
async function createOptionsTable(tableDate) {
  const productMetadata = await getProductMetadata();
  const productId = productMetadata.productId || getMetadata('product-id');

  if (!productId) return null;

  const optionsData = tableDate;

  if (!optionsData || optionsData.length === 0) {
    return null;
  }
  const settlementWrapper = createElement('div', { class: 'settlement-wrapper' });
  // totals-info-row
  const dataInformation = createElement('div', { class: 'data-information' });
  // timestamp
  settlementWrapper.appendChild(dataInformation);

  // here create totals-info-row
  const totalsInfoRow = createElement('div', { class: 'totals-info-row' });
  // totals row
  settlementWrapper.appendChild(totalsInfoRow);

  // here create view-selector-row
  const viewSelectorRow = createElement('div', { class: 'view-selector-row' });
  // option-switcher
  settlementWrapper.appendChild(viewSelectorRow);

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

  const buildedTable = buildTable(headers, tableData, 'option-settlement-table');
  settlementWrapper.appendChild(buildedTable);

  return settlementWrapper;
}

async function renderTable(block) {
  const { isOptions, optionProductId } = getDisplayMode();
  block.innerHTML = '<div class="spinner-settlement"><div></div><div></div><div></div><div></div></div>';

  // Get productId for API calls
  const productMetadata = await getProductMetadata();
  const productId = productMetadata.productId || getMetadata('product-id');

  if (!productId) {
    block.innerHTML = `
      <div class="no-results">
        <h4>Unable to load settlement</h4>
        <p>Product ID not found.</p>
      </div>
    `;
    return;
  }

  try {
    if (isOptions) {
      if (optionProductId && await applyAuthorOverride(block, 'options-product-id', optionProductId)) {
        return;
      }

      tradeWrapper.innerHTML = '';
      await createTradesWrapper(block, productId, optionProductId);
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
            <h4>Unable to load futures settlement</h4>
            <p>settlement data is currently unavailable.</p>
          </div>
        `;
      }
    }
  } catch (error) {
    block.innerHTML = `
      <div class="no-results">
        <h4>Error loading settlement data</h4>
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

  Promise.all([
    i18n('Settlements'),
  ])
    .then(([
      settlementsLabel,
    ]) => {
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

  Promise.all([
    i18n('Expiration'),
    i18n('Trade date'),
  ])
    .then(([
      expirationLabel,
      tradeDateLabel,
    ]) => {
      labels = { expirationLabel, tradeDateLabel };
    })
    // eslint-disable-next-line no-console
    .catch((err) => console.error('load title error:', err));

  renderTable(block).catch((error) => {
    block.innerHTML = `
      <div class="no-results">
        <h4>Error loading settlement data</h4>
        <p>${error.message}</p>
      </div>
    `;
  });

  const fragmentUrl = '/fragments/disclaimers/markets/settlements';
  const modalItemClass = 'about-report-link';
  handleAboutReportModal(block, modalItemClass, fragmentUrl);
}

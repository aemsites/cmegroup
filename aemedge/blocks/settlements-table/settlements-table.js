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
  scrollToTop,
} from '../../scripts/utils/product.js';
import { createElement, i18n, setupDayjsLibs } from '../../scripts/utils.js';

// Table Constants
const TABLE_CONSTANTS = {
  placeholders: {
    noData: '-',
  },
};

let needShowAll = false;
let loadAllAlreadyClicked = false;
const maxRows = 12;
const titleWrapper = createElement('div', { class: 'title-wrapper' });
const tradeWrapper = createElement('div', { class: 'trades-wrapper' });
const expirationWrapper = createElement('div', { class: 'expiration-wrapper' });
const tradeDateWrapper = createElement('div', { class: 'trade-date-wrapper' });
const tableStraddle = createElement('table', { class: 'table-straddle-settlement' });
const tableList = createElement('table', { class: 'table-list-settlement' });
const tableContainer = createElement('div', { class: 'table-settlement-container straddle' });
const windowWidth = window.innerWidth;
let isMobile = windowWidth <= 992;
let isMid = windowWidth > 992 && windowWidth <= 1600;
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

  // if option or future goes here

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

function buildOptionStraddleTableDesktop(header, data, isMiddlePoint) {
  tableStraddle.innerHTML = '';
  let subHeaders;
  let cells;

  const {
    calls, puts, strikePrice, estVol, priorDayOi, high, low, open, last, settle, change,
  } = header;

  const thead = createElement('thead');
  const row1 = createElement('tr');
  if (isMiddlePoint) {
    row1.innerHTML = `
      <th colspan="6" class="side-column half-width secondary-header">${calls}</th>
      <th rowspan="2" class="primary-column tertiary-header">${strikePrice}</th>
      <th colspan="6" class="side-column half-width secondary-header">${puts}</th>
    `;
    subHeaders = [
      estVol, priorDayOi, `${high}<br>${low}`, `${open}<br>${last}`, settle, change, // Calls side
      change, settle, `${open}<br>${last}`, `${high}<br>${low}`, priorDayOi, estVol, // Puts side
    ];
  } else {
    row1.innerHTML = `
      <th colspan="8" class="side-column half-width secondary-header">${calls}</th>
      <th rowspan="2" class="primary-column tertiary-header">${strikePrice}</th>
      <th colspan="8" class="side-column half-width secondary-header">${puts}</th>
    `;
    subHeaders = [
      estVol, priorDayOi, high, low, open, last, settle, change, // Calls side
      change, settle, last, open, low, high, priorDayOi, estVol, // Puts side
    ];
  }
  const row2 = createElement('tr');
  subHeaders.forEach((text) => {
    const th = createElement('th', { class: 'primary-header' });
    th.innerHTML = text;
    row2.appendChild(th);
  });

  thead.append(row1, row2);
  tableStraddle.appendChild(thead);

  const tbody = createElement('tbody');
  data.forEach((item, index) => {
    const tr = createElement('tr');
    if (index >= maxRows && !loadAllAlreadyClicked) tr.classList.add('hidden-row');
    // cell order
    if (isMiddlePoint) {
      cells = [
        item.call.volume,
        item.call.openInterest,
        `${item.call.high}<br>${item.call.low}`,
        `${item.call.open}<br>${item.call.last}`,
        item.call.settle,
        item.call.change,
        item.strike,
        item.put.change,
        item.put.settle,
        `${item.put.open}<br>${item.put.last}`,
        `${item.put.high}<br>${item.put.low}`,
        item.put.openInterest,
        item.put.volume,
      ];
    } else {
      cells = [
        item.call.volume,
        item.call.openInterest,
        item.call.high,
        item.call.low,
        item.call.open,
        item.call.last,
        item.call.settle,
        item.call.change,
        item.strike,
        item.put.change,
        item.put.settle,
        item.put.last,
        item.put.open,
        item.put.low,
        item.put.high,
        item.put.openInterest,
        item.put.volume,
      ];
    }

    cells.forEach((content, i) => {
      const td = createElement('td');
      if (isMiddlePoint) {
        if (i === 6) td.className = 'table-header-td primary-header';
      } else if (i === 8) td.className = 'table-header-td primary-header';
      td.innerHTML = content;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  tableStraddle.appendChild(tbody);
  needShowAll = data.length > maxRows;
  if (needShowAll && !loadAllAlreadyClicked) tableStraddle.classList.add('table-fade');

  return tableStraddle;
}

function buildOptionStraddleTableMobile(header, data) {
  tableStraddle.innerHTML = '';
  const {
    calls, puts, strikePrice, estVol, priorDayOi, high, low, open, last, settle, change,
  } = header;

  const thead = createElement('thead');
  const row1 = createElement('tr');
  row1.innerHTML = `
    <th rowspan="2" class="primary-column tertiary-header">${strikePrice}</th>
    <th colspan="4" class="side-column half-width secondary-header">${calls}</th>
    <th colspan="4" class="side-column half-width secondary-header">${puts}</th>
  `;
  const row2 = createElement('tr');
  const subHeaders = [
    `${estVol}<br>${priorDayOi}`, `${high}<br>${low}`, `${open}<br>${last}`, `${settle}<br>${change}`, // Calls
    `${estVol}<br>${priorDayOi}`, `${high}<br>${low}`, `${open}<br>${last}`, `${settle}<br>${change}`  // Puts
  ];

  subHeaders.forEach((text) => {
    const th = createElement('th', { class: 'primary-header' });
    th.innerHTML = text;
    row2.appendChild(th);
  });

  thead.append(row1, row2);
  tableStraddle.appendChild(thead);

  const tbody = createElement('tbody');
  data.forEach((item, index) => {
    const tr = createElement('tr');
    if (index >= maxRows && !loadAllAlreadyClicked) tr.classList.add('hidden-row');

    // Define cell data mapping based on the combined UI requirement
    const cells = [
      item.strike,
      `${item.call.volume}<br>${item.call.openInterest}`,
      `${item.call.high}<br>${item.call.low}`,
      `${item.call.open}<br>${item.call.last}`,
      `${item.call.settle}<br>${item.call.change}`,
      `${item.put.volume}<br>${item.put.openInterest}`,
      `${item.put.high}<br>${item.put.low}`,
      `${item.put.open}<br>${item.put.last}`,
      `${item.put.settle}<br>${item.put.change}`,
    ];

    cells.forEach((content, i) => {
      const td = createElement('td');
      if (i === 0) {
        td.className = 'table-header-td primary-header';
      }
      td.innerHTML = content;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  tableStraddle.appendChild(tbody);
  needShowAll = data.length > maxRows;
  if (needShowAll && !loadAllAlreadyClicked) tableStraddle.classList.add('table-fade');

  return tableStraddle;
}

function buildOptionStraddleTable(header, data) {
  let straddleTable;

  if (isMobile) {
    straddleTable = buildOptionStraddleTableMobile(header, data);
  } else if (isMid) {
    straddleTable = buildOptionStraddleTableDesktop(header, data, true);
  } else {
    straddleTable = buildOptionStraddleTableDesktop(header, data);
  }

  tableContainer.appendChild(straddleTable);

  window.addEventListener('resize', () => {
    const newWidth = window.innerWidth;
    isMobile = newWidth <= 992;
    isMid = newWidth > 992 && newWidth <= 1600;

    const refreshedTable = buildOptionStraddleTable(header, data);

    if (tableContainer.parentNode) {
      tableContainer.parentNode.replaceChild(refreshedTable, tableContainer);
    }
  }, { once: true });

  return tableContainer;
}

function buildOptionListTable(header, data) {
  tableList.innerHTML = '';

  const {
    strikePrice, open, high, low, last, change, settle, estVol, priorDayOi,
  } = header;

  const thead = createElement('thead');
  const headerRow = createElement('tr');

  const headers = [
    strikePrice, open, high, low, last, change, settle, estVol, priorDayOi,
  ];

  headers.forEach((text, index) => {
    const th = createElement('th');
    if (index === 0) {
      th.className = 'tertiary-header';
    } else {
      th.className = 'primary-header';
    }
    th.innerHTML = text;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  tableList.appendChild(thead);

  const tbody = createElement('tbody');

  data.forEach((item, index) => {
    const rowTypes = ['call', 'put'];

    rowTypes.forEach((type) => {
      const tr = createElement('tr');
      if (index >= maxRows && !loadAllAlreadyClicked) tr.classList.add('hidden-row');
      const optionData = item[type];

      const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
      const strikeDisplay = `${item.strike} ${typeLabel}`;

      const cells = [
        strikeDisplay,
        optionData.open || '-',
        optionData.high || '-',
        optionData.low || '-',
        optionData.last || '-',
        optionData.change || '0',
        optionData.settle || '-',
        optionData.volume || '0',
        optionData.openInterest || '0',
      ];

      cells.forEach((content, i) => {
        const td = createElement('td');
        if (i === 0) td.className = 'table-header-td';
        td.innerHTML = content;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  });

  tableList.appendChild(tbody);

  if (data.length > maxRows && !loadAllAlreadyClicked) {
    tableList.classList.add('table-fade');
  }

  tableContainer.appendChild(tableList);
  return tableContainer;
}

function handleViewChange(activeBtn, inactiveBtn, viewType) {
  activeBtn.classList.add('selected');
  inactiveBtn.classList.remove('selected');
  const otherView = viewType === 'list' ? 'straddle' : 'list';
  tableContainer.classList.remove(otherView);
  tableContainer.classList.add(viewType);
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
  const [
    lastUpdated,
    estimatedVolumeTotals,
    priorDayOpenInterestTotals,
    viewLabel,
    listLabel,
    straddleLabel,
  ] = await Promise.all([
    i18n('Last Updated'),
    i18n('Estimated volume totals'),
    i18n('Prior day open interest totals'),
    i18n('View'),
    i18n('List'),
    i18n('Straddle'),
  ]);

  const { updateTime, totals, settlementsStraddle } = optionsData;

  const settlementWrapper = createElement('div', { class: 'settlement-wrapper' });
  // timestamp
  const dataInformation = createElement('div', { class: 'data-information' });
  const timestamp = createElement('div', { class: 'timestamp' });
  const timestampText = createElement('span', { class: 'text' });
  timestampText.textContent = lastUpdated;
  const timestampDate = createElement('span', { class: 'date' });
  await setupDayjsLibs();
  timestampDate.textContent = `${dayjs(updateTime).format('DD MMM YYYY hh:mm:ss A')} CT`;
  timestamp.appendChild(timestampText);
  timestamp.appendChild(timestampDate);
  dataInformation.appendChild(timestamp);
  settlementWrapper.appendChild(dataInformation);

  // totals-info-row
  // Estimated volume totals
  const totalsInfoRow = createElement('div', { class: 'totals-info-row' });
  const totalsInfoVolume = createElement('div', { class: 'totals-info' });
  const totalsInfoLabelVolume = createElement('span', { class: 'totals-info-label' });
  const totalsInfoValueVolume = createElement('span', { class: 'totals-info-value' });
  totalsInfoLabelVolume.textContent = estimatedVolumeTotals;
  totalsInfoValueVolume.textContent = totals.volume || 0;
  totalsInfoVolume.appendChild(totalsInfoLabelVolume);
  totalsInfoVolume.appendChild(totalsInfoValueVolume);
  totalsInfoRow.appendChild(totalsInfoVolume);
  // Prior day open interest totals
  const totalsInfoOpenInterest = createElement('div', { class: 'totals-info' });
  const totalsInfoLabelOpenInterest = createElement('span', { class: 'totals-info-label' });
  const totalsInfoValueOpenInterest = createElement('span', { class: 'totals-info-value' });
  totalsInfoLabelOpenInterest.textContent = priorDayOpenInterestTotals;
  totalsInfoValueOpenInterest.textContent = totals.openInterest || 0;
  totalsInfoOpenInterest.appendChild(totalsInfoLabelOpenInterest);
  totalsInfoOpenInterest.appendChild(totalsInfoValueOpenInterest);
  totalsInfoRow.appendChild(totalsInfoOpenInterest);
  settlementWrapper.appendChild(totalsInfoRow);

  // view-selector-row
  const viewSelectorRow = createElement('div', { class: 'view-selector-row' });
  const optionSwitcher = createElement('div', { class: 'option-switcher' });
  const label = createElement('span');
  label.textContent = `${viewLabel}: `;
  const ul = createElement('ul');
  const li1 = createElement('li');
  const btn1 = createElement('button', { type: 'button' });
  btn1.textContent = `${listLabel}`;
  li1.appendChild(btn1);
  const li2 = createElement('li');
  const btn2 = createElement('button', { type: 'button', class: 'selected' });
  btn2.textContent = `${straddleLabel}`;
  li2.appendChild(btn2);
  ul.appendChild(li1);
  ul.appendChild(li2);
  optionSwitcher.appendChild(label);
  optionSwitcher.appendChild(ul);
  viewSelectorRow.appendChild(optionSwitcher);
  settlementWrapper.appendChild(viewSelectorRow);
  btn1.addEventListener('click', () => handleViewChange(btn1, btn2, 'list'));
  btn2.addEventListener('click', () => handleViewChange(btn2, btn1, 'straddle'));

  const [
    calls,
    puts,
    strikePrice,
    estVol,
    priorDayOi,
    high,
    low,
    open,
    last,
    settle,
    change,
  ] = await Promise.all([
    i18n('Calls'),
    i18n('Puts'),
    i18n('Strike Price'),
    i18n('Est. Vol'),
    i18n('Prior day OI'),
    i18n('High'),
    i18n('Low'),
    i18n('Open'),
    i18n('Last'),
    i18n('Settle'),
    i18n('Change'),
  ]);

  const header = {
    calls,
    puts,
    strikePrice,
    estVol,
    priorDayOi,
    high,
    low,
    open,
    last,
    settle,
    change,
  };

  const buildedOptionStraddleTable = buildOptionStraddleTable(header, settlementsStraddle);
  settlementWrapper.appendChild(buildedOptionStraddleTable);
  const buildedOptionListTable = buildOptionListTable(header, settlementsStraddle);
  settlementWrapper.appendChild(buildedOptionListTable);

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
  const [
    loadAll,
    AboutThisReport,
    ReturnToTop,
  ] = await Promise.all([
    i18n('Load All'),
    i18n('About this Report'),
    i18n('Return to top'),
  ]);

  if (needShowAll) {
    const loadAllButton = buildLoadAllButton(block, loadAll, (data) => {
      loadAllAlreadyClicked = data;
    });
    loadAllWrapper.append(loadAllButton);
  }

  // Add "About this Report" link
  const aboutLink = createElement('p', { class: 'about-report-wrapper' });
  aboutLink.innerHTML = `<a href="#" class="about-report-link">${AboutThisReport}</a>`;
  loadAllWrapper.append(aboutLink);

  // Add scroll to top link
  const scrollToTopLink = createElement('p', { class: 'scroll-to-top-wrapper' });
  scrollToTopLink.innerHTML = `<a href="#" class="scroll-to-top-link">${ReturnToTop}</a>`;
  loadAllWrapper.append(scrollToTopLink);

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

  const returnToTopClass = 'scroll-to-top-link';
  scrollToTop(block, returnToTopClass);
}

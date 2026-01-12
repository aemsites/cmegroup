import { getMetadata, loadCSS } from '../../scripts/aem.js';
import {
  getProductMetadata,
  applyAuthorOverride,
  getDisplayMode,
  handleAboutReportModal,
  buildLoadAllButton,
  getTradeDateAndExpirations,
  createProductsDropdown,
  getOptionSettlements,
  handleScrollTop,
  buildNoResultErrorAlert,
} from '../../scripts/utils/product.js';
import { createElement, i18n, setupDayjsLibs } from '../../scripts/utils.js';
import { store } from '../../scripts/store/store.js';

let needShowAll = false;
let loadAllAlreadyClicked = false;
const maxRows = 12;
const settlementWrapper = createElement('div', { class: 'settlement-wrapper' });
const tradeWrapper = createElement('div', { class: 'trades-wrapper' });
const expirationWrapper = createElement('div', { class: 'expiration-wrapper' });
const tradeDateWrapper = createElement('div', { class: 'trade-date-wrapper' });
const tableStraddle = createElement('table', { class: 'table-settlement table-straddle-settlement' });
const tableList = createElement('table', { class: 'table-settlement table-list-settlement' });
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

  table = await createOptionsTable(tableDate);
  if (table) {
    block.innerHTML = '';
    block.appendChild(table);
    loadAll = await createLoadAllWrapper(block);
    block.append(loadAll);
  } else {
    block.replaceChildren(buildNoResultErrorAlert('settlements'));
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
    `${estVol}<br>${priorDayOi}`, `${high}<br>${low}`, `${open}<br>${last}`, `${settle}<br>${change}`, // Puts
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

  // timestamp
  const existingDataInformation = settlementWrapper?.querySelector('.data-information');
  if (existingDataInformation) {
    existingDataInformation.remove();
  }
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
  const existingTotalsInfoRow = settlementWrapper?.querySelector('.totals-info-row');
  if (existingTotalsInfoRow) {
    existingTotalsInfoRow.remove();
  }
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
  const existingTotalsInfo = settlementWrapper?.querySelector('.totals-info');
  if (existingTotalsInfo) {
    existingTotalsInfo.remove();
  }
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
  const existingViewSelectorRow = settlementWrapper?.querySelector('.view-selector-row');
  if (existingViewSelectorRow) {
    existingViewSelectorRow.remove();
  }
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
    block.replaceChildren(buildNoResultErrorAlert('settlements'));
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
      block.innerHTML = `
        <div>
          <h4>Future settlements table WIP</h4>
        </div>
      `;
    }
  } catch (error) {
    block.replaceChildren(buildNoResultErrorAlert('settlements', error.message));
  }
}

async function createLoadAllWrapper(block) {
  const loadAllWrapper = createElement('div', { class: 'load-all-wrapper' });
  const [
    loadAll,
    aboutThisReport,
    returnToTop,
    disclaimer,
  ] = await Promise.all([
    i18n('Load All'),
    i18n('About this Report'),
    i18n('Return to top'),
    i18n('All market data contained within the CME Group website should be considered as a reference only and should not be used as validation against, nor as a complement to, real-time market data feeds. Settlement prices on instruments without open interest or volume are provided for web users only and are not published on Market Data Platform (MDP). These prices are not based on market activity.'),
  ]);

  if (needShowAll) {
    const loadAllButton = buildLoadAllButton(block, loadAll, (data) => {
      loadAllAlreadyClicked = data;
    });
    loadAllWrapper.append(loadAllButton);
  }

  // Add "About this Report" link
  const aboutLink = createElement('p', { class: 'about-report-wrapper' });
  aboutLink.innerHTML = `<a href="#" class="about-report-link">${aboutThisReport}</a>`;
  loadAllWrapper.append(aboutLink);

  // Add scroll to top link
  const topLink = createElement('a', { class: 'scroll-to-top-link', href: '#' }, returnToTop);
  const scrollToTopLink = createElement('p', { class: 'scroll-to-top-wrapper' }, topLink);
  handleScrollTop(topLink);
  loadAllWrapper.append(scrollToTopLink);

  // Add disclaimer
  const disclaimerWrapper = createElement('p', { class: 'disclaimer-wrapper' });
  disclaimerWrapper.textContent = disclaimer;
  loadAllWrapper.append(disclaimerWrapper);

  return loadAllWrapper;
}

export default function decorate(block) {
  block.classList.add('table');
  block.innerHTML = '<div class="spinner-settlements"><div></div><div></div><div></div><div></div></div>';

  loadCSS(`${window.hlx.codeBasePath}/blocks/table/table.css`);
  settlementWrapper.innerHTML = '';
  settlementWrapper.append(tradeWrapper);

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
    block.replaceChildren(buildNoResultErrorAlert('settlements', error.message));
  });

  const fragmentUrl = '/fragments/disclaimers/markets/settlements';
  const modalItemClass = 'about-report-link';
  handleAboutReportModal(block, modalItemClass, fragmentUrl);

  store.subscribe(({ floatingElements }) => floatingElements, ({ height }) => {
    const productTabs = document.querySelector('.product-tabs');
    const productTabsHeight = productTabs ? productTabs.getBoundingClientRect().height : 0;
    document.querySelectorAll('table.table-settlement thead').forEach((headerSection) => {
      if (getComputedStyle(headerSection.closest('table')).overflow === 'auto') {
        headerSection.style.top = '0';
      } else {
        headerSection.style.top = `${height + productTabsHeight}px`;
      }
    });
  });
}

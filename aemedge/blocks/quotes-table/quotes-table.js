/* eslint-disable max-len */
import { getMetadata, loadCSS } from '../../scripts/aem.js';
import {
  getProductMetadata,
  applyAuthorOverride,
  getDisplayMode,
  getQuotesFutures,
  handleAboutReportModal,
  buildLoadAllButton,
  handleScrollTop,
  buildNoResultErrorAlert,
  getQuotesOptionsExpirationMonth,
  getQuotesOptionExpirations,
  createProductsDropdown,
  getQuotesUnderlyingFutures,
  getQuotesOptionsData,
} from '../../scripts/utils/product.js';
import {
  createElement,
  i18n,
  setupDayjsLibs,
  getCdtDate,
} from '../../scripts/utils.js';
import { createAuthSwitch } from '../../scripts/utils/authSwitch.js';
import { store } from '../../scripts/store/store.js';

const maxRows = 18;
const spinnerHtml = '<div class="spinner-quotes"><div></div><div></div><div></div><div></div></div>';

// Futures section
function buildTable(block, headers, data, tableId = '') {
  const table = createElement('table', { class: 'table-quotes' });
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
  const loadAllWrapper = block.closest('.quotes-table-wrapper').querySelector('.load-all-wrapper');
  if (data.length > maxRows) {
    if (!loadAllWrapper.dataset.loadAll) {
      table.classList.add('table-fade');
      loadAllWrapper.dataset.loadAll = 'true';
      i18n('Load All').then((loadAll) => loadAllWrapper.append(buildLoadAllButton(block, loadAll)));
    } else {
      const button = loadAllWrapper.querySelector('.load-all-button');
      if (button) {
        table.classList.add('table-fade');
      }
    }
  }
  return table;
}

function createMonthCell(expirationMonth, quoteCode) {
  const briefcaseIcon = createElement('img', { src: '/aemedge/icons/briefcase.svg' });
  const briefcaseIconSpan = createElement('span', { class: 'icon' }, briefcaseIcon);
  const expirationMonthSpan = createElement('span', { class: 'expiration' }, expirationMonth);
  const quoteCodeSpan = createElement('span', { class: 'quoteCode' }, quoteCode);
  const monthSpan = createElement('span', { class: 'month-text' }, expirationMonthSpan, quoteCodeSpan);
  return createElement('span', { class: 'month' }, briefcaseIconSpan, monthSpan);
}

function createOptionButton(productData, item) {
  const optionProductId = productData.optionsLabels.length > 0
    && productData.optionsLabels[0].productId;
  const year = item.priceChart?.year;
  const expiration = item.expirationDate.slice(4, 6).replace(/^0+/, '') - 1;
  const param = (expiration === 0) ? `${year - 1}-12-${item.code}-12${year}` : `${year}-${expiration}-${item.code}-${expiration}${year}`;
  const button = createElement('a', { class: 'option', href: `${window.location.pathname}/options?optionProductId=${optionProductId}&expiration=${param}` }, 'opt');
  button.addEventListener('click', (event) => {
    event.preventDefault();
    const customEvent = new CustomEvent('optionContractSelected', {
      detail: {
        productId: optionProductId,
        expiration: param,
      },
      bubbles: true,
    });
    document.querySelector('.options-dropdown').dispatchEvent(customEvent);
  });
  return button;
}

function createChartButton(item) {
  const {
    priceChart: {
      code,
      title,
      venue,
      monthYear,
      year,
    },
    exchangeCode,
    quoteCode,
  } = item;
  const href = '/apps/cmegroup/widgets/productLibs/esignal-charts.html?type=p'
    + `&code=${code}&title=${title}&venue=${venue}&monthYear=${monthYear}&year=${year}`
    + `&exchangeCode=${exchangeCode}&interval=1`;
  const chartIcon = createElement('img', { src: '/aemedge/icons/chart.svg' });
  const chartIconSpan = createElement('span', { class: 'icon' }, chartIcon);
  const button = createElement('a', { class: 'chart', href }, chartIconSpan);
  button.addEventListener('click', (event) => {
    event.preventDefault();
    window.open(href, `chart${quoteCode}`, 'width=780, height=640, popup=true');
  });
  return button;
}

function getChangeClass(change) {
  return (change.charAt(0) === '+' ? 'positive' : '')
    + (change.charAt(0) === '-' && change.length > 1 ? 'negative' : '');
}

function getChangeText(change, percentageChange) {
  return change.length > 1 ? `${change} (${percentageChange})` : '-';
}

function formatUpdated(updated) {
  if (updated === '-') {
    return updated;
  }
  const cdtUpdated = getCdtDate(updated);
  return `<span class="updated">${cdtUpdated.format('HH:mm:ss')} CT<br>${cdtUpdated.format('DD MMM YYYY')}</span>`;
}

function formatVolume(volume) {
  if (volume === '-') {
    return volume;
  }
  return volume.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

async function createFuturesTable(productData, block) {
  const quotesData = await getQuotesFutures(productData.productId);
  if (!quotesData || quotesData.length === 0) {
    block.replaceChildren(buildNoResultErrorAlert('quotes'));
    return;
  }
  const [
    monthLabel,
    optionsLabel,
    chartLabel,
    lastLabel,
    changeLabel,
    priorLabel,
    settleLabel,
    openLabel,
    highLabel,
    lowLabel,
    volumeLabel,
    updatedLabel,
    timestampLabel,
    delayedLabel,
  ] = await Promise.all([
    i18n('Month'),
    i18n('Options'),
    i18n('Chart'),
    i18n('Last'),
    i18n('Change'),
    i18n('Prior'),
    i18n('Settle'),
    i18n('Open'),
    i18n('High'),
    i18n('Low'),
    i18n('Volume'),
    i18n('Updated'),
    i18n('Last Updated'),
    i18n('Market data is delayed by at least'),
  ]);
  const headers = [
    monthLabel,
    optionsLabel,
    chartLabel,
    lastLabel,
    changeLabel,
    `<span>${priorLabel}</span><span>${settleLabel}</span>`,
    openLabel,
    highLabel,
    lowLabel,
    volumeLabel,
    updatedLabel,
  ];
  const tableData = quotesData.quotes.map((item) => [
    createMonthCell(item.expirationMonth, item.quoteCode),
    item.hasOption ? createOptionButton(productData, item) : '',
    createChartButton(item),
    item.last || '-',
    `<span class="change ${getChangeClass(item.change)}">${getChangeText(item.change, item.percentageChange)}</span>`,
    item.priorSettle || '-',
    item.open || '-',
    item.high || '-',
    item.low || '-',
    formatVolume(item.volume),
    formatUpdated(item.updated),
  ]);
  const buildedTable = buildTable(block, headers, tableData, 'futures-quotes-table');
  const quotesWrapper = createElement('div', { class: 'quotes-wrapper table' }, buildedTable);
  block.innerHTML = '';
  block.appendChild(quotesWrapper);
  const timestamp = block.parentElement.querySelector('.quotes-timestamp');
  timestamp.innerText = `${timestampLabel} ${getCdtDate(new Date()).format('DD MMM YYYY hh:mm:ss A')} CT.`;
  const delayed = block.parentElement.querySelector('.quotes-delayed');
  delayed.innerText = `${delayedLabel} ${quotesData.quoteDelay}.`;
}

// Options section
function decodeExpiration(exp) {
  const expInfo = exp.split('-', 3);
  return {
    year: expInfo[0],
    month: expInfo[1],
    contract: expInfo[2],
  };
}

async function buildUnderlyingFutureTable(block, productId, optionProductId, contract, expMonth) {
  const underlyingRow = block.querySelector('.underlying-row');
  underlyingRow.innerHTML = spinnerHtml;
  const underlying = await getQuotesUnderlyingFutures(productId, contract);
  if (!underlying || underlying.length === 0) {
    underlyingRow.replaceChildren(buildNoResultErrorAlert('quotes'));
    return;
  }
  const [
    underlyingLabel,
    chartLabel,
    lastLabel,
    changeLabel,
    priorLabel,
    settleLabel,
    highLabel,
    lowLabel,
    volumeLabel,
    updatedLabel,
    timestampLabel,
    delayedLabel,
  ] = await Promise.all([
    i18n('Underlying Future'),
    i18n('Chart'),
    i18n('Last'),
    i18n('Change'),
    i18n('Prior'),
    i18n('Settle'),
    i18n('High'),
    i18n('Low'),
    i18n('Volume'),
    i18n('Updated'),
    i18n('Last Updated'),
    i18n('Market data is delayed by at least'),
  ]);
  const headers = [
    underlyingLabel,
    chartLabel,
    lastLabel,
    changeLabel,
    `<span>${priorLabel}</span><span>${settleLabel}</span>`,
    highLabel,
    lowLabel,
    volumeLabel,
    updatedLabel,
  ];
  const callback = (selection) => {
    buildUnderlyingFutureTable(block, productId, optionProductId, selection.text, expMonth);
  };
  const tableData = underlying.quotes.map((item) => [
    createProductsDropdown(expMonth.map(({ quoteCode, expirationMonth }) => ({
      text: quoteCode,
      label: `${expirationMonth} ${quoteCode}`,
    })), contract, callback),
    createChartButton(item),
    item.last || '-',
    `<span class="change ${getChangeClass(item.change)}">${getChangeText(item.change, item.percentageChange)}</span>`,
    item.priorSettle || '-',
    item.high || '-',
    item.low || '-',
    formatVolume(item.volume),
    formatUpdated(item.updated),
  ]);
  const buildedTable = buildTable(block, headers, tableData, 'futures-quotes-table');
  const quotesWrapper = createElement('div', { class: 'quotes-wrapper table' }, buildedTable);
  underlyingRow.replaceChildren(quotesWrapper);
  const timestamp = block.parentElement.querySelector('.quotes-timestamp');
  timestamp.innerText = `${timestampLabel} ${getCdtDate(new Date()).format('DD MMM YYYY hh:mm:ss A')} CT.`;
  const delayed = block.parentElement.querySelector('.quotes-delayed');
  delayed.innerText = `${delayedLabel} ${underlying.quoteDelay}.`;
}

async function buildExpirationDropdown(
  block,
  productId,
  optionProductId,
  expirations,
  expMonth,
  onSelect,
) {
  const expirationDropdownTemp = [];
  const weeklyProductIdsTemp = [];
  const weeklyIds = [];
  // let isWeeklyTemp = false;
  expirations.contractExpirations.forEach((expirationElement, index) => {
    if (expirations.weekly || expirations.sto) {
      const contracts = expirations.contractExpirations;
      contracts?.forEach((info) => {
        const data = {
          productId: info.productId,
          exp: info.expirationMonth + info.displayExpirationYear,
          year: info.expirationYear,
          month: info.expirationMonth,
          underlyingFutureContract: info.underlyingFutureContract,
        };
        weeklyProductIdsTemp.push(data);
      });
      // isWeeklyTemp = true;
    }
    let obj;
    let code = '';
    if (expirations.weekly || expirations.sto) {
      obj = {
        exp: weeklyProductIdsTemp[index].exp,
        label: expirationElement.label,
        productId: weeklyProductIdsTemp[index].productId,
      };
      // code = weeklyProductIdsTemp[index].productId;
      weeklyIds.push(obj);
    } else {
      obj = {
        exp:
          expirationElement.expirationMonth + expirationElement.displayExpirationYear,
        label: expirationElement.label,
        productId: expirationElement.productId,
      };
    }
    code = `${expirationElement.expirationYear}-${expirationElement.expirationMonth}-${expirationElement.underlyingFutureContract}`;
    expirationDropdownTemp.push([code, obj]);
  });
  const isDailyOption = (expirations.daily && !expirations.sto) || false;
  if (!isDailyOption && expirationDropdownTemp.length > 1) {
    const expirationDropdownMap = expirationDropdownTemp.map(
      ([key, { label }]) => ({ text: key, label }),
    );
    const expirationTemp = expirationDropdownMap[0];
    const expirationLabel = await i18n('Expiration');
    const callback = (exp) => {
      const expiration = decodeExpiration(exp.text);
      buildUnderlyingFutureTable(block, productId, optionProductId, expiration.contract, expMonth);
      onSelect(expiration);
    };
    const dropdown = createProductsDropdown(expirationDropdownMap, expirationTemp, callback);
    const initialExpiration = decodeExpiration(expirationTemp.text);
    buildUnderlyingFutureTable(block, productId, optionProductId, initialExpiration.contract, expMonth);
    onSelect(initialExpiration);
    return createElement('div', { class: 'selection-item' }, createElement('span', null, expirationLabel), dropdown);
  }
  if (expirationDropdownTemp.length > 0) {
    const expirationDropdownMap = expirationDropdownTemp.map(
      ([key, { label }]) => ({ text: key, label }),
    );
    const expirationTemp = expirationDropdownMap[0];
    const initialExpiration = decodeExpiration(expirationTemp.text);
    onSelect(initialExpiration);
  }
  return null;
}

function handleViewChange(block, activeBtn, inactiveBtn, viewType) {
  activeBtn.classList.add('selected');
  inactiveBtn.classList.remove('selected');
  const otherView = viewType === 'list' ? 'straddle' : 'list';
  block.classList.add(otherView); // TODO: remove
  // tableContainer.classList.remove(otherView);
  // tableContainer.classList.add(viewType);
}

async function buildViewSelector(block) {
  const [
    viewLabel,
    listLabel,
    straddleLabel,
  ] = await Promise.all([
    i18n('View'),
    i18n('List'),
    i18n('Straddle'),
  ]);
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
  btn1.addEventListener('click', () => handleViewChange(block, btn1, btn2, 'list'));
  btn2.addEventListener('click', () => handleViewChange(block, btn2, btn1, 'straddle'));
  return viewSelectorRow;
}

async function buildOptionsList(listContainer, quotesData) {
  const [
    strikeLabel,
    priceLabel,
    callLabel,
    putLabel,
    lastLabel,
    changeLabel,
    priorLabel,
    settleLabel,
    highLabel,
    lowLabel,
    volumeLabel,
    updatedLabel,
  ] = await Promise.all([
    i18n('Strike'),
    i18n('Price'),
    i18n('Call'),
    i18n('Put'),
    i18n('Last'),
    i18n('Change'),
    i18n('Prior'),
    i18n('Settle'),
    i18n('High'),
    i18n('Low'),
    i18n('Volume'),
    i18n('Updated'),
  ]);
  const headers = [
    `<span>${strikeLabel}</span><span>${priceLabel}</span>`,
    lastLabel,
    changeLabel,
    `<span>${priorLabel}</span><span>${settleLabel}</span>`,
    highLabel,
    lowLabel,
    volumeLabel,
    updatedLabel,
  ];
  const tableData = [];
  quotesData.strikePrices.forEach((item) => {
    tableData.push([
      `<span>${item.strikePrice}</span><span>${callLabel}</span>`,
      item.call.last || '-',
      `<span class="change ${getChangeClass(item.call.change)}">${item.call.change}</span>`,
      item.call.priorSettle || '-',
      item.call.high || '-',
      item.call.low || '-',
      formatVolume(item.call.volume),
      formatUpdated(item.call.updated),
    ]);
    tableData.push([
      `<span>${item.strikePrice}</span><span>${putLabel}</span>`,
      item.put.last || '-',
      `<span class="change ${getChangeClass(item.put.change)}">${item.put.change}</span>`,
      item.put.priorSettle || '-',
      item.put.high || '-',
      item.put.low || '-',
      formatVolume(item.put.volume),
      formatUpdated(item.put.updated),
    ]);
  });
  const buildedTable = buildTable(listContainer, headers, tableData, 'futures-quotes-table');
  const quotesWrapper = createElement('div', { class: 'quotes-wrapper table' }, buildedTable);
  listContainer.innerHTML = '';
  listContainer.appendChild(quotesWrapper);
}

async function createOptionsTable(block, optionProductId, year, month, strikeRange) {
  const quotesRow = block.querySelector('.quotes-row');
  quotesRow.innerHTML = spinnerHtml;
  const quotesData = await getQuotesOptionsData(optionProductId, year, month, strikeRange);
  if (!quotesData || quotesData.length === 0) {
    quotesRow.replaceChildren(buildNoResultErrorAlert('quotes'));
    return;
  }
  const listContainer = createElement('div', { class: 'list-container' });
  buildOptionsList(listContainer, quotesData);
  quotesRow.innerHTML = '';
  quotesRow.appendChild(listContainer);
}

async function buildExpirationsSelector(block, productId, optionProductId, expirations, expMonth) {
  let currentStrike = 'ATM';
  let currentExpirationYear;
  let currentExpirationMonth;
  const onSelectExpiration = (expiration) => {
    currentExpirationYear = expiration.year;
    currentExpirationMonth = expiration.month;
    createOptionsTable(block, optionProductId, currentExpirationYear, currentExpirationMonth, currentStrike);
  };
  const onSelectStrike = (strike) => {
    currentStrike = strike.text;
    createOptionsTable(block, optionProductId, currentExpirationYear, currentExpirationMonth, currentStrike);
  };
  const [
    expiration,
    strikeLabel,
    atTheMoneyLabel,
    allLabel,
  ] = await Promise.all([
    buildExpirationDropdown(
      block,
      productId,
      optionProductId,
      expirations,
      expMonth,
      onSelectExpiration,
    ),
    i18n('Strike Range'),
    i18n('At The Money'),
    i18n('All'),
  ]);
  const strikeRangeOptions = [
    {
      text: 'ATM',
      label: atTheMoneyLabel,
    },
    {
      text: 'ALL',
      label: allLabel,
    },
  ];
  const strikeDropdown = createProductsDropdown(strikeRangeOptions, 'ATM', onSelectStrike);
  const strikeText = createElement('span', null, strikeLabel);
  const strike = createElement('div', { class: 'selection-item' }, strikeText, strikeDropdown);
  const selection = createElement('div', { class: 'selection-section' }, expiration, strike);
  const viewSelectorDiv = await buildViewSelector(block);
  const expirationsSelector = block.querySelector('.selection-row');
  expirationsSelector.innerHTML = '';
  expirationsSelector.appendChild(selection);
  expirationsSelector.appendChild(viewSelectorDiv);
}

async function createOptionsView(productId, block, optionProductId) {
  const [expMonth, expirations] = await Promise.all([
    getQuotesOptionsExpirationMonth(productId),
    getQuotesOptionExpirations(productId, optionProductId),
  ]);
  block.innerHTML = '';
  block.appendChild(createElement('div', { class: 'underlying-row' }));
  block.appendChild(createElement('div', { class: 'selection-row' }));
  block.appendChild(createElement('div', { class: 'quotes-row' }));
  await buildExpirationsSelector(block, productId, optionProductId, expirations, expMonth);
}

// General Section
async function renderTable(block) {
  const { isOptions, optionProductId } = getDisplayMode();
  block.innerHTML = spinnerHtml;

  // Get productId for API calls
  const [productMetadata] = await Promise.all([getProductMetadata(), setupDayjsLibs()]);
  const productId = productMetadata.productId || getMetadata('product-id');

  if (!productId) {
    block.replaceChildren(buildNoResultErrorAlert('quotes'));
    return;
  }

  try {
    if (isOptions) {
      if (optionProductId && await applyAuthorOverride(block, 'options-product-id', optionProductId)) {
        return;
      }
      createOptionsView(productId, block, optionProductId);
    } else {
      // Futures mode
      let rendered = false;
      store.subscribe(({ productData }) => productData, (productData) => {
        if (productData.loaded && !rendered) {
          rendered = true;
          createFuturesTable(productData, block);
        }
      });
    }
  } catch (error) {
    block.replaceChildren(buildNoResultErrorAlert('quotes', error.message));
  }
}

async function createFooterWrapper(block) {
  const [
    aboutThisReport,
    returnToTop,
    disclaimer,
  ] = await Promise.all([
    i18n('About this Report'),
    i18n('Return to top'),
    i18n('All market data contained within the CME Group website should be considered as a reference only and should not be used as validation against, nor as a complement to, real-time market data feeds. Settlement prices on instruments without open interest or volume are provided for web users only and are not published on Market Data Platform (MDP). These prices are not based on market activity.'),
  ]);
  const loadAllWrapper = createElement('div', { class: 'load-all-wrapper' });

  // Add "About this Report" link
  const aboutLink = createElement('a', { class: 'about-report-link', href: '#' }, aboutThisReport);
  const aboutLinkWrapper = createElement('p', { class: 'about-report-wrapper' }, aboutLink);
  const fragmentUrl = '/fragments/disclaimers/markets/quotes';
  const modalItemClass = 'about-report-link';
  handleAboutReportModal(aboutLinkWrapper, modalItemClass, fragmentUrl);

  // Add "Return to top" link
  const topLink = createElement('a', { class: 'return-top-link', href: '#' }, returnToTop);
  const topLinkWrapper = createElement('p', { class: 'return-top-wrapper' }, topLink);
  handleScrollTop(topLink);

  // Add "Disclaimer"
  const disclaimerWrapper = createElement('p', { class: 'disclaimer-wrapper' }, disclaimer);

  const quotesFooterWrapper = createElement('div', { class: 'quotes-footer-wrapper' }, aboutLinkWrapper, loadAllWrapper, topLinkWrapper, disclaimerWrapper);
  block.parentElement.append(quotesFooterWrapper);
}

async function createHeaderWrapper(block) {
  let interval;
  let timeout;
  const updateInterval = 60000; // 1 minute
  const updateTimeout = 43200000; // 12 hours
  const callback = (checked) => {
    if (checked) {
      interval = setInterval(() => renderTable(block), updateInterval);
      timeout = setTimeout(() => clearInterval(interval), updateTimeout);
      renderTable(block);
    } else {
      clearInterval(interval);
      clearInterval(timeout);
    }
  };
  const authSwitch = await createAuthSwitch(callback);
  const timestamp = createElement('span', { class: 'quotes-timestamp' });
  const delayed = createElement('span', { class: 'quotes-delayed' });
  const time = createElement('div', { class: 'quotes-time' }, timestamp, delayed);
  const headerRow = createElement('div', { class: 'quotes-header-wrapper' }, authSwitch, time);
  block.parentElement.prepend(headerRow);
}

export default function decorate(block) {
  block.innerHTML = spinnerHtml;
  loadCSS(`${window.hlx.codeBasePath}/blocks/table/table.css`);
  renderTable(block).catch((error) => {
    block.replaceChildren(buildNoResultErrorAlert('quotes', error.message));
  });
  createHeaderWrapper(block);
  createFooterWrapper(block);

  store.subscribe(({ floatingElements }) => floatingElements, ({ height }) => {
    const productTabs = document.querySelector('.product-tabs');
    const productTabsHeight = productTabs ? productTabs.getBoundingClientRect().height : 0;
    document.querySelectorAll('table.table-quotes thead').forEach((headerSection) => {
      if (getComputedStyle(headerSection.closest('table')).overflow === 'auto') {
        headerSection.style.top = '0';
      } else {
        headerSection.style.top = `${height + productTabsHeight}px`;
      }
    });
  });
}

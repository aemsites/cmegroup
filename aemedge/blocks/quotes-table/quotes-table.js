import { getMetadata, loadCSS } from '../../scripts/aem.js';
import {
  getProductMetadata,
  applyAuthorOverride,
  getDisplayMode,
  getQuotesFutures,
  handleAboutReportModal,
  buildLoadAllButton,
  handleScrollTop,
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

/* Build HTML table structure */
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
  const loadAllWrapper = block.parentElement.querySelector('.load-all-wrapper');
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

/* Create futures quotes table */
async function createFuturesTable(productData, block) {
  const quotesData = await getQuotesFutures(productData.productId);
  if (!quotesData || quotesData.length === 0) {
    block.innerHTML = `
      <div class="no-results">
        <h4>Unable to load futures quotes</h4>
        <p>quotes data is currently unavailable.</p>
      </div>
    `;
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
  const quotesWrapper = createElement('div', { class: 'quotes-wrapper' });
  const buildedTable = buildTable(block, headers, tableData, 'futures-quotes-table');
  quotesWrapper.appendChild(buildedTable);
  block.innerHTML = '';
  block.appendChild(quotesWrapper);
  const timestamp = block.parentElement.querySelector('.quotes-timestamp');
  timestamp.innerText = `${timestampLabel} ${getCdtDate(new Date()).format('DD MMM YYYY hh:mm:ss A')} CT.`;
  const delayed = block.parentElement.querySelector('.quotes-delayed');
  delayed.innerText = `${delayedLabel} ${quotesData.quoteDelay}.`;
}

async function renderTable(block) {
  const { isOptions, optionProductId } = getDisplayMode();
  block.innerHTML = '<div class="spinner-quotes"><div></div><div></div><div></div><div></div></div>';

  // Get productId for API calls
  const [productMetadata] = await Promise.all([getProductMetadata(), setupDayjsLibs()]);
  const productId = productMetadata.productId || getMetadata('product-id');

  if (!productId) {
    block.innerHTML = `
      <div class="no-results">
        <h4>Unable to load quotes</h4>
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
      // TODO: create options table
      block.innerHTML = `
        <div class="no-results">
          <h4>Options table not implemented yet</h4>
        </div>
      `;
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
    block.innerHTML = `
      <div class="no-results">
        <h4>Error loading quotes data</h4>
        <p>${error.message}</p>
      </div>
    `;
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
  block.classList.add('table');
  block.innerHTML = '<div class="spinner-quotes"><div></div><div></div><div></div><div></div></div>';
  loadCSS(`${window.hlx.codeBasePath}/blocks/table/table.css`);
  renderTable(block).catch((error) => {
    block.innerHTML = `
      <div class="no-results">
        <h4>Error loading quotes data</h4>
        <p>${error.message}</p>
      </div>
    `;
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

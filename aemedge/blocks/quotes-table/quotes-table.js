/* eslint-disable no-unused-vars */
import { getMetadata, loadCSS } from '../../scripts/aem.js';
import {
  getProductMetadata,
  applyAuthorOverride,
  getDisplayMode,
  getQuotesFutures,
  handleAboutReportModal,
  buildLoadAllButton,
} from '../../scripts/utils/product.js';
import { createAuthTooltip } from '../../scripts/utils/authTooltip.js';
import { createElement, i18n } from '../../scripts/utils.js';
import { authentication } from '../../scripts/modules/Authentication.js';
import { store } from '../../scripts/store/store.js';

let needShowAll = false;
const maxRows = 18;
let isLoggedIn = false;

/* Build HTML table structure */
function buildTable(headers, data, tableId = '') {
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

  needShowAll = data.length > maxRows;
  if (needShowAll) table.classList.add('table-fade');

  return table;
}

/* Create futures quotes table */
async function createFuturesTable() {
  const productMetadata = await getProductMetadata();
  const productId = productMetadata.productId || getMetadata('product-id');
  if (!productId) return null;
  const quotesData = await getQuotesFutures(productId);
  if (!quotesData || quotesData.length === 0) {
    return null;
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
    `<span>${item.expirationMonth || '-'}</span><span>${item.quoteCode || '-'}</span>`,
    'opt',
    'chart',
    item.last || '-',
    item.change || '-',
    item.priorSettle || '-',
    item.open || '-',
    item.high || '-',
    item.low || '-',
    item.volume || '-',
    item.updated || '-',
  ]);
  const quotesWrapper = createElement('div', { class: 'quotes-wrapper' });
  const buildedTable = buildTable(headers, tableData, 'futures-quotes-table');
  quotesWrapper.appendChild(buildedTable);
  return quotesWrapper;
}

async function renderTable(block) {
  const { isOptions, optionProductId } = getDisplayMode();
  block.innerHTML = '<div class="spinner-quotes"><div></div><div></div><div></div><div></div></div>';

  // Get productId for API calls
  const productMetadata = await getProductMetadata();
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
    let table = null;
    let loadAll;

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
      table = await createFuturesTable();
      if (table) {
        block.innerHTML = '';
        block.appendChild(table);
        loadAll = await createLoadAllWrapper(block);
        block.append(loadAll);
      } else {
        block.innerHTML = `
          <div class="no-results">
            <h4>Unable to load futures quotes</h4>
            <p>quotes data is currently unavailable.</p>
          </div>
        `;
      }
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
  const { authenticationData } = authentication;

  authenticationData.loginPromise.then(() => {
    if (authenticationData.isLoggedIn) {
      isLoggedIn = true;
    }
  });

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

  const fragmentUrl = '/fragments/disclaimers/markets/quotes';
  const modalItemClass = 'about-report-link';
  handleAboutReportModal(block, modalItemClass, fragmentUrl);

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

import { getMetadata, loadCSS } from '../../scripts/aem.js';
import {
  getProductMetadata,
  getProductTitle,
  getDisplayMode,
  getContractSpecs,
  getSpecItemView,
} from '../../scripts/utils/product.js';
import { createElement, i18n } from '../../scripts/utils.js';

// Table Constants
const TABLE_CONSTANTS = {
  placeholders: {
    noData: '-',
  },
};

const titleWrapper = createElement('div', { class: 'title-wrapper' });

/* Fetch specs table data  */
async function fetchSpecsTableData(productId) {
  try {
    const data = await getContractSpecs(productId);
    return data;
  } catch (e) {
    return null;
  }
}

/* Build HTML collapsible structure */
function buildCollapsible(headers, data, collapsibleId = '') {
  const collapsible = createElement('div', { class: 'collapsible-specs' });
  if (collapsibleId) collapsible.id = collapsibleId;

  headers.forEach((header, index) => {
    const collapsibleItem = createElement('div', { class: 'collapsible-item' });
    const collapsibleButton = createElement('button', { class: 'collapsible-button btn-secondary' });
    collapsibleButton.innerHTML = header;
    collapsibleItem.appendChild(collapsibleButton);
    const collapse = createElement('div', { class: 'collapse' });
    const collapseBody = createElement('div', { class: 'collapse-body' });
    collapseBody.innerHTML = data[index];
    collapse.appendChild(collapseBody);
    collapsibleItem.appendChild(collapse);
    collapsible.appendChild(collapsibleItem);

    collapsibleButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.currentTarget.classList.toggle('expand');
      const collapsePanel = e.currentTarget.nextElementSibling;
      if (collapsePanel && collapsePanel.classList.contains('collapse')) {
        collapsePanel.classList.toggle('show');
      }
    });
  });

  return collapsible;
}

/* Build HTML table structure */
function buildTable(headers, data, tableId = '') {
  const table = createElement('table', { class: 'table-specs' });
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

/* Create futures specs table */
async function createFuturesTable() {
  const productMetadata = await getProductMetadata();
  const productId = productMetadata.productId || getMetadata('product-id');

  if (!productId) return null;

  const specsData = await fetchSpecsTableData(productId);

  if (!specsData || specsData.length === 0) {
    return null;
  }

  const [
    contractUnit,
    priceQuotation,
    tradingHours,
    minimumPriceFluctuation,
    productCode,
    listedContracts,
    settlementMethod,
    terminationOfTrading,
    tamOrTasRules,
    settlementProcedures,
    positionLimits,
    exchangeRulebook,
    blockMinimum,
    priceLimitOrCircuit,
    vendorCodes,
    lastDeliveryDate,
    gradeAndQuality,
  ] = await Promise.all([
    i18n('Contract Unit'),
    i18n('Price Quotation'),
    i18n('Trading Hours'),
    i18n('Minimum Price Fluctuation'),
    i18n('Product Code'),
    i18n('Listed Contracts'),
    i18n('Settlement Method'),
    i18n('Termination of Trading'),
    i18n('TAM or TAS Rules'),
    i18n('Settlement Procedures'),
    i18n('Position Limits'),
    i18n('Exchange Rulebook'),
    i18n('Block Minimum'),
    i18n('Price Limit or Circuit'),
    i18n('Vendor Codes'),
    i18n('Last Delivery Date'),
    i18n('Grade and Quality'),
  ]);

  const headers = [
    contractUnit,
    priceQuotation,
    tradingHours,
    minimumPriceFluctuation,
    productCode,
    listedContracts,
    settlementMethod,
    terminationOfTrading,
    tamOrTasRules,
    settlementProcedures,
    positionLimits,
    exchangeRulebook,
    blockMinimum,
    priceLimitOrCircuit,
    vendorCodes,
    lastDeliveryDate,
    gradeAndQuality,
  ];

  const order = [
    'ContractUnit',
    'MinimumPriceFluctuation',
    'PriceQuotation',
    'TradingHours',
    'ProductCode',
    'ListedContracts',
    'TerminationOfTrading',
    'PositionLimits',
    'ExchangeRulebook',
    'BlockMinimum',
    'VendorCodes',
    'StrikePricesStrikePriceInterval',
    'SettlementMethod',
    'Underlying',
  ];

  const tableData = order
    .filter(key => Object.prototype.hasOwnProperty.call(specsData, key))
    .map((key) => {
      const value = specsData[key];
      return getSpecItemView(value, key);
  });

  const specsWrapper = createElement('div', { class: 'specs-wrapper' });
  const buildedTable = buildTable(headers, tableData, 'futures-specs-table');
  const buildedCollapsible = buildCollapsible(headers, tableData, 'futures-specs-collapsible');
  specsWrapper.appendChild(buildedTable);
  specsWrapper.appendChild(buildedCollapsible);

  return specsWrapper;
}

/* Create option specs table */
async function createOptionsTable(optionProductId) {
  const productMetadata = await getProductMetadata();
  const productId = productMetadata.productId || getMetadata('product-id');

  if (!productId) return null;

  const optionsData = await fetchSpecsTableData(optionProductId);

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
    `<div class="row-data"><span>${productCode}</span><span>${item.productCode || TABLE_CONSTANTS.placeholders.noData}</span></div>
    <div class="row-data"><div><span>${firstTrade}</span><span>${lastTrade}</span></div><div><span>${item.firstTrade || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastTrade || TABLE_CONSTANTS.placeholders.noData}</span></div></div>
    <div class="row-data"><span>${settlement}</span><span>${item.settlement || TABLE_CONSTANTS.placeholders.noData}</span></div>`,
  ]);

  const specsWrapper = createElement('div', { class: 'specs-wrapper' });
  const buildedTable = buildTable(headers, tableData, 'option-specs-table');
  const buildedCollapsible = buildCollapsible(collapsibleHeaders, collapsibleData, 'option-specs-collapsible');
  specsWrapper.appendChild(buildedTable);
  specsWrapper.appendChild(buildedCollapsible);

  return specsWrapper;
}

async function renderTable(block) {
  const { isOptions, optionProductId } = getDisplayMode();
  block.innerHTML = '<div class="spinner-specs"><div></div><div></div><div></div><div></div></div>';

  // Get productId for API calls
  const productMetadata = await getProductMetadata();
  const productId = productMetadata.productId || getMetadata('product-id');

  if (!productId) {
    block.innerHTML = `
      <div class="no-results">
        <h4>Unable to load specs</h4>
        <p>Product ID not found.</p>
      </div>
    `;
    return;
  }

  try {
    let table = null;

    if (isOptions) {
      table = await createOptionsTable(optionProductId);

      if (table) {
        block.innerHTML = '';
        block.appendChild(table);
      } else {
        block.innerHTML = `
          <div class="no-results">
            <h4>Unable to load options specs</h4>
            <p>specs data is currently unavailable.</p>
          </div>
        `;
      }
    } else {
      // Futures mode
      table = await createFuturesTable();

      if (table) {
        block.innerHTML = '';
        block.appendChild(table);
      } else {
        block.innerHTML = `
          <div class="no-results">
            <h4>Unable to load futures specs</h4>
            <p>specs data is currently unavailable.</p>
          </div>
        `;
      }
    }
  } catch (error) {
    block.innerHTML = `
      <div class="no-results">
        <h4>Error loading specs data</h4>
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
        const fragmentUrl = '/fragments/disclaimers/markets/specs';
        await openModal(fragmentUrl);
      } catch (error) {
        // Silent fail
      }
    }
  });
}

export default function decorate(block) {
  block.classList.add('table');
  block.innerHTML = '<div class="spinner-calendar"><div></div><div></div><div></div><div></div></div>';
  titleWrapper.innerHTML = '';

  loadCSS(`${window.hlx.codeBasePath}/blocks/table/table.css`);

  Promise.all([i18n('Contract Specs')])
    .then(([specsLabel]) => {
      const { optionProductId } = getDisplayMode();
      return getProductTitle(optionProductId, specsLabel);
    })
    .then((title) => {
      const titleHtml = createElement('h2', { class: 'specs-title' });
      titleHtml.innerHTML = title;
      titleWrapper.prepend(titleHtml);
      if (!titleWrapper.isConnected) {
        block.insertAdjacentElement('beforebegin', titleWrapper);
      }
    })
    // eslint-disable-next-line no-console
    .catch((err) => console.error('load title error:', err));

  renderTable(block).catch((error) => {
    block.innerHTML = `
      <div class="no-results">
        <h4>Error loading specs data</h4>
        <p>${error.message}</p>
      </div>
    `;
  });

  handleAboutReportModal(block);
}

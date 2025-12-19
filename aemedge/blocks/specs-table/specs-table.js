import { getMetadata, loadCSS } from '../../scripts/aem.js';
import {
  getProductMetadata,
  getProductTitle,
  getDisplayMode,
} from '../../scripts/utils/product.js';
import { apiGet, getResponseData, urlByEnvType } from '../../scripts/utils/index.js';
import { createElement, i18n } from '../../scripts/utils.js';

// API Configuration
const API_CONFIG = {
  specsEndpoint: '/CmeWS/mvc/ContractSpecs/List/productId',
};

// Table Constants
const TABLE_CONSTANTS = {
  placeholders: {
    noData: '-',
  },
};

const titleWrapper = createElement('div', { class: 'title-wrapper' });

/* Fetch specs table data for futures */
async function fetchSpecsTableData(productId) {
  try {
    const url = `${urlByEnvType()}${API_CONFIG.specsEndpoint}/${productId}`;
    const response = await apiGet(url);
    const data = getResponseData(response) || response.data;

    if (data) {
      return data;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch specs table data:', error);
    return null;
  }

  return null;
}

/* Fetch options labels for a specific product */
async function fetchOptionTableData(optionProductId) {
  try {
    const url = `${urlByEnvType()}${API_CONFIG.specsEndpoint}/${optionProductId}`;
    const response = await apiGet(url);
    const data = getResponseData(response) || response.data;

    if (data) {
      return data;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch specs option table data:', error);
    return null;
  }

  return null;
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

  const tableData = [
    specsData.ContractUnit || TABLE_CONSTANTS.placeholders.noData,
    specsData.MinimumPriceFluctuation || TABLE_CONSTANTS.placeholders.noData,
    specsData.PriceQuotation || TABLE_CONSTANTS.placeholders.noData,
    specsData.TradingHours || TABLE_CONSTANTS.placeholders.noData,
    specsData.ProductCode || TABLE_CONSTANTS.placeholders.noData,
    specsData.ListedContracts || TABLE_CONSTANTS.placeholders.noData,
    specsData.TerminationOfTrading || TABLE_CONSTANTS.placeholders.noData,
    specsData.PositionLimits || TABLE_CONSTANTS.placeholders.noData,
    specsData.ExchangeRulebook || TABLE_CONSTANTS.placeholders.noData,
    specsData.BlockMinimum || TABLE_CONSTANTS.placeholders.noData,
    specsData.VendorCodes || TABLE_CONSTANTS.placeholders.noData,
    specsData.StrikePricesStrikePriceInterval || TABLE_CONSTANTS.placeholders.noData,
    specsData.SettlementMethod || TABLE_CONSTANTS.placeholders.noData,
    specsData.Underlying || TABLE_CONSTANTS.placeholders.noData,
  ];

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

  const optionsData = await fetchOptionTableData(optionProductId);

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

export default async function decorate(block) {
  // Add 'table' class to inherit table.css styles
  await loadCSS(`${window.hlx.codeBasePath}/blocks/table/table.css`);
  block.classList.add('table');

  // Show loading state immediately (non-blocking)
  block.innerHTML = '<div class="spinner-specs"><div></div><div></div><div></div><div></div></div>';
  titleWrapper.innerHTML = '';

  const [
    specsLabel,
  ] = await Promise.all([
    i18n('Contract Specs'),
  ]);
  const { optionProductId } = getDisplayMode();
  const title = await getProductTitle(optionProductId, specsLabel);
  const titleHtml = createElement('h2', { class: 'specs-title' });
  titleHtml.innerHTML = title;
  titleWrapper.appendChild(titleHtml);

  block.insertAdjacentElement('beforebegin', titleWrapper);

  // Load table data in background (non-blocking)
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

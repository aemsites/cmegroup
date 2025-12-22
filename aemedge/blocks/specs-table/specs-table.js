import { getMetadata, loadCSS } from '../../scripts/aem.js';
import {
  getProductMetadata,
  getProductTitle,
  getDisplayMode,
  getContractSpecs,
  getSpecItemView,
} from '../../scripts/utils/product.js';
import { createElement, i18n } from '../../scripts/utils.js';

const titleWrapper = createElement('div', { class: 'title-wrapper' });

/* Build HTML collapsible structure */
function buildCollapsible(headers, data, collapsibleId = '') {
  const collapsible = createElement('div', { class: 'collapsible-specs' });
  if (collapsibleId) collapsible.id = collapsibleId;

  headers.forEach((header, index) => {
    const itemData = data[index];
    const collapsibleItem = createElement('div', { class: 'collapsible-item' });
    const isEmpty = itemData === null || itemData === undefined || itemData === '';
    if (isEmpty) {
      collapsibleItem.classList.add('hidden-collapsible');
    }
    const collapsibleButton = createElement('button', { class: 'collapsible-button btn-secondary' });
    collapsibleButton.innerHTML = header;
    collapsibleItem.appendChild(collapsibleButton);
    const collapse = createElement('div', { class: 'collapse' });
    const collapseBody = createElement('div', { class: 'collapse-body' });
    collapseBody.innerHTML = itemData ?? '';
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

  const tbody = createElement('tbody');

  headers.forEach((headerText, index) => {
    const tr = createElement('tr');

    const tdLabel = createElement('td', { class: 'primary-group' });
    tdLabel.innerHTML = headerText;
    tr.appendChild(tdLabel);

    const tdValue = createElement('td');
    const cellData = data[index];

    const isEmpty = cellData === null || cellData === undefined || cellData === '';

    if (isEmpty) {
      tr.classList.add('hidden-row');
    }

    if (typeof cellData === 'string') {
      tdValue.innerHTML = cellData;
    } else if (cellData instanceof HTMLElement) {
      tdValue.appendChild(cellData);
    } else {
      tdValue.innerHTML = cellData;
    }

    tr.appendChild(tdValue);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}

/* Create specs table */
async function createSpecsTable(optionProductId) {
  const productMetadata = await getProductMetadata();
  const productId = productMetadata.productId || getMetadata('product-id');
  let specsData;
  let headers;
  let order;

  if (!productId) return null;

  /* Fetch specs table data  */
  if (optionProductId) {
    specsData = await getContractSpecs(optionProductId);
  } else {
    specsData = await getContractSpecs(productId);
  }

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
    strikePricesStrikePriceInterval,
    underlying,
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
    i18n('Strike Prices Strike Price Interval'),
    i18n('Underlying'),
  ]);

  if (optionProductId) {
    headers = [
      contractUnit,
      minimumPriceFluctuation,
      priceQuotation,
      tradingHours,
      productCode,
      listedContracts,
      terminationOfTrading,
      exchangeRulebook,
      blockMinimum,
      priceLimitOrCircuit,
      vendorCodes,
      strikePricesStrikePriceInterval,
      settlementMethod,
      underlying,
    ];

    order = [
      'ContractUnit',
      'MinimumPriceFluctuation',
      'PriceQuotation',
      'TradingHours',
      'ProductCode',
      'ListedContracts',
      'TerminationOfTrading',
      'ExchangeRulebook',
      'BlockMinimum',
      'PriceLimitOrCircuit',
      'VendorCodes',
      'StrikePricesStrikePriceInterval',
      'SettlementMethod',
      'Underlying',
    ];
  } else {
    headers = [
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

    order = [
      'ContractUnit',
      'PriceQuotation',
      'TradingHours',
      'MinimumPriceFluctuation',
      'ProductCode',
      'ListedContracts',
      'SettlementMethod',
      'TerminationOfTrading',
      'TradeAtMarkerOrTradeAtSettlementRules',
      'SettlementProcedures',
      'PositionLimits',
      'ExchangeRulebook',
      'BlockMinimum',
      'PriceLimitOrCircuit',
      'VendorCodes',
      'LastDeliveryDate',
      'GradeAndQuality',
    ];
  }

  const tableData = order
    .filter((key) => Object.prototype.hasOwnProperty.call(specsData, key))
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
      table = await createSpecsTable(optionProductId);
    } else {
      table = await createSpecsTable();
    }

    if (table) {
      block.innerHTML = '';
      block.appendChild(table);
    } else {
      block.innerHTML = `
        <div class="no-results">
          <h4>Unable to load specs</h4>
          <p>specs data is currently unavailable.</p>
        </div>
      `;
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
}

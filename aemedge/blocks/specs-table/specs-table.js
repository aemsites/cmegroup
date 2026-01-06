import { getMetadata, loadCSS } from '../../scripts/aem.js';
import {
  getProductMetadata,
  getDisplayMode,
  getContractSpecs,
  getSpecItemView,
  applyAuthorOverride,
  buildCollapsible,
} from '../../scripts/utils/product.js';
import { createElement, i18n } from '../../scripts/utils.js';
import { urlByEnvType } from '../../scripts/utils/env.js';

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
      positionLimits,
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
      'PositionLimits',
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
  const buildedCollapsible = buildCollapsible(headers, tableData, 'collapsible-specs', 0, 'specs-collapsible');
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
      <div class="no-results" role="alert">
        <p>
          <span class="icon-attention-triangle"></span>
          <span class="primary">There is currently no contract specs data for this product.</span> 
          If you have any questions, please feel free to 
          <a class="contact-link" href='${urlByEnvType()}/tools-information/contacts-list.html'>contact us</a>.
        </p>
      </div>
    `;
    return;
  }

  try {
    let table = null;

    if (isOptions) {
      if (optionProductId && await applyAuthorOverride(block, 'options-product-id', optionProductId)) {
        return;
      }
      table = await createSpecsTable(optionProductId);
    } else {
      table = await createSpecsTable();
    }

    if (table) {
      block.innerHTML = '';
      block.appendChild(table);
    } else {
      block.innerHTML = `
        <div class="no-results" role="alert">
          <p>
            <span class="icon-attention-triangle"></span>
            <span class="primary">There is currently no contract specs data for this product.</span> 
            If you have any questions, please feel free to 
            <a class="contact-link" href='${urlByEnvType()}/tools-information/contacts-list.html'>contact us</a>.
          </p>
        </div>
      `;
    }
  } catch (error) {
    block.innerHTML = `
      <div class="no-results" role="alert" data-error="${error.message}">
        <p>
          <span class="icon-attention-triangle"></span>
          <span class="primary">There is currently no contract specs data for this product.</span> 
          If you have any questions, please feel free to 
          <a class="contact-link" href='${urlByEnvType()}/tools-information/contacts-list.html'>contact us</a>.
        </p>
      </div>
    `;
  }
}

export default function decorate(block) {
  block.classList.add('table');
  block.innerHTML = '<div class="spinner-calendar"><div></div><div></div><div></div><div></div></div>';
  loadCSS(`${window.hlx.codeBasePath}/blocks/table/table.css`);
  renderTable(block).catch((error) => {
    block.innerHTML = `
      <div class="no-results" role="alert" data-error="${error.message}">
        <p>
          <span class="icon-attention-triangle"></span>
          <span class="primary">There is currently no contract specs data for this product.</span> 
          If you have any questions, please feel free to 
          <a class="contact-link" href='${urlByEnvType()}/tools-information/contacts-list.html'>contact us</a>.
        </p>
      </div>
    `;
  });
}

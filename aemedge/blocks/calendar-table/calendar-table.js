import { getMetadata, loadCSS } from '../../scripts/aem.js';
import {
  getProductMetadata,
  applyAuthorOverride,
  getDisplayMode,
  getCalendarFutures,
  getCalendarOptions,
  handleAboutReportModal,
  buildCollapsible,
  buildLoadAllButton,
} from '../../scripts/utils/product.js';
import { createAuthTooltip } from '../../scripts/utils/authTooltip.js';
import { createElement, i18n } from '../../scripts/utils.js';
import { authentication } from '../../scripts/modules/Authentication.js';
import { urlByEnvType } from '../../scripts/utils/env.js';

// Table Constants
const TABLE_CONSTANTS = {
  placeholders: {
    noData: '-',
  },
};

let needShowAll = false;
const maxRows = 12;
let isLoggedIn = false;

/* Build HTML table structure */
function buildTable(headers, data, tableId = '') {
  const table = createElement('table', { class: 'table-calendar' });
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

/* Create futures calendar table */
async function createFuturesTable() {
  const productMetadata = await getProductMetadata();
  const productId = productMetadata.productId || getMetadata('product-id');

  if (!productId) return null;

  const calendarData = await getCalendarFutures(productId);

  if (!calendarData || calendarData.length === 0) {
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

  const tableData = calendarData.map((item) => [
    item.contractMonth || TABLE_CONSTANTS.placeholders.noData,
    item.productCode || TABLE_CONSTANTS.placeholders.noData,
    `<span>${item.firstTrade || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastTrade || TABLE_CONSTANTS.placeholders.noData}</span>`,
    item.settlement || TABLE_CONSTANTS.placeholders.noData,
    `<span>${item.firstHolding || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastHolding || TABLE_CONSTANTS.placeholders.noData}</span>`,
    `<span>${item.firstPosition || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastPosition || TABLE_CONSTANTS.placeholders.noData}</span>`,
    `<span>${item.firstNotice || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastNotice || TABLE_CONSTANTS.placeholders.noData}</span>`,
    `<span>${item.firstDelivery || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastDelivery || TABLE_CONSTANTS.placeholders.noData}</span>`,
  ]);

  const collapsibleHeaders = calendarData.map((item) => [
    item.contractMonth || TABLE_CONSTANTS.placeholders.noData,
  ]);

  const collapsibleData = calendarData.map((item) => [
    `<div class="row-data"><span>${productCode}</span><span>${item.productCode || TABLE_CONSTANTS.placeholders.noData}</span></div>
    <div class="row-data"><div><span>${firstTrade}</span><span>${lastTrade}</div><div><span>${item.firstTrade || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastTrade || TABLE_CONSTANTS.placeholders.noData}</span></div></div>
    <div class="row-data"><span>${settlement}</span><span>${item.settlement || TABLE_CONSTANTS.placeholders.noData}</span></div>
    <div class="row-data"><div><span>${firstHolding}</span><span>${lastHolding}</span></div><div><span>${item.firstHolding || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastHolding || TABLE_CONSTANTS.placeholders.noData}</span></div></div>
    <div class="row-data"><div><span>${firstPosition}</span><span>${lastPosition}</span></div><div><span>${item.firstPosition || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastPosition || TABLE_CONSTANTS.placeholders.noData}</span></div></div>
    <div class="row-data"><div><span>${firstNotice}</span><span>${lastNotice}</span></div><div><span>${item.firstNotice || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastNotice || TABLE_CONSTANTS.placeholders.noData}</span></div></div>
    <div class="row-data"><div><span>${firstDelivery}</span><span>${lastDelivery}</span></div><div><span>${item.firstDelivery || TABLE_CONSTANTS.placeholders.noData}</span><span>${item.lastDelivery || TABLE_CONSTANTS.placeholders.noData}</span></div></div>
    `,
  ]);

  const calendarWrapper = createElement('div', { class: 'calendar-wrapper' });
  const buildedTable = buildTable(headers, tableData, 'futures-calendar-table');
  const buildedCollapsible = buildCollapsible(collapsibleHeaders, collapsibleData, 'collapsible-calendar', maxRows, 'futures-calendar-collapsible');
  calendarWrapper.appendChild(buildedTable);
  calendarWrapper.appendChild(buildedCollapsible);

  return calendarWrapper;
}

/* Create option calendar table */
async function createOptionsTable(optionProductId) {
  const productMetadata = await getProductMetadata();
  const productId = productMetadata.productId || getMetadata('product-id');

  if (!productId) return null;

  const optionsData = await getCalendarOptions(productId, optionProductId);

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

  const calendarWrapper = createElement('div', { class: 'calendar-wrapper' });
  const buildedTable = buildTable(headers, tableData, 'option-calendar-table');
  const buildedCollapsible = buildCollapsible(collapsibleHeaders, collapsibleData, 'collapsible-calendar', 'option-calendar-collapsible');
  calendarWrapper.appendChild(buildedTable);
  calendarWrapper.appendChild(buildedCollapsible);

  return calendarWrapper;
}

async function createDownloadBtn(productId, isOptions, optionProductId) {
  const titleWrapper = document.querySelector('.product-tab-title');
  const downloadLink = productId && isLoggedIn
    ? `${urlByEnvType()}/CmeWS/mvc/ProductCalendar/Download.xls?productId=`
    + `${isOptions ? optionProductId : productId}`
    : null;

  const [
    downloadLabel,
    accountRequiredLabel,
  ] = await Promise.all([
    i18n('Download Data'),
    i18n('An account is required to download calendar file data'),
  ]);
  const authTooltipProps = {
    color: 'primary',
    className: !isLoggedIn && 'inactive',
    href: downloadLink,
    icon: !isLoggedIn && 'icon-lock',
    tooltipText: accountRequiredLabel,
    isLoggedIn,
  };

  const existingTooltip = titleWrapper?.querySelector('.auth-tooltip-container');
  if (existingTooltip) {
    existingTooltip.remove();
  }

  const authTooltipElement = createAuthTooltip(authTooltipProps, downloadLabel);
  if (titleWrapper) {
    titleWrapper.append(authTooltipElement);
  }
}

async function renderTable(block) {
  const { isOptions, optionProductId } = getDisplayMode();
  block.innerHTML = '<div class="spinner-calendar"><div></div><div></div><div></div><div></div></div>';

  // Get productId for API calls
  const productMetadata = await getProductMetadata();
  const productId = productMetadata.productId || getMetadata('product-id');

  if (!productId) {
    block.innerHTML = `
      <div class="no-results" role="alert">
        <p>
          <span class="icon-attention-triangle"></span>
          <span class="primary">There is currently no calendar data for this product.</span> 
          If you have any questions, please feel free to 
          <a class="contact-link" href='${urlByEnvType()}/tools-information/contacts-list.html'>contact us</a>.
        </p>
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

      table = await createOptionsTable(optionProductId);

      if (table) {
        block.innerHTML = '';
        block.appendChild(table);
        createDownloadBtn(productId, isOptions, optionProductId);
        loadAll = await createLoadAllWrapper(block);
        block.append(loadAll);
      } else {
        block.innerHTML = `
          <div class="no-results" role="alert">
            <p>
              <span class="icon-attention-triangle"></span>
              <span class="primary">There is currently no calendar data for this product.</span> 
              If you have any questions, please feel free to 
              <a class="contact-link" href='${urlByEnvType()}/tools-information/contacts-list.html'>contact us</a>.
            </p>
          </div>
        `;
      }
    } else {
      // Futures mode
      table = await createFuturesTable();

      if (table) {
        block.innerHTML = '';
        block.appendChild(table);
        createDownloadBtn(productId, isOptions, optionProductId);
        loadAll = await createLoadAllWrapper(block);
        block.append(loadAll);
      } else {
        block.innerHTML = `
          <div class="no-results" role="alert">
            <p>
              <span class="icon-attention-triangle"></span>
              <span class="primary">There is currently no calendar data for this product.</span> 
              If you have any questions, please feel free to 
              <a class="contact-link" href='${urlByEnvType()}/tools-information/contacts-list.html'>contact us</a>.
            </p>
          </div>
        `;
      }
    }
  } catch (error) {
    block.innerHTML = `
      <div class="no-results" role="alert" data-error="${error.message}">
        <p>
          <span class="icon-attention-triangle"></span>
          <span class="primary">There is currently no calendar data for this product.</span> 
          If you have any questions, please feel free to 
          <a class="contact-link" href='${urlByEnvType()}/tools-information/contacts-list.html'>contact us</a>.
        </p>
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
  const { isOptions, optionProductId } = getDisplayMode();

  getProductMetadata().then((productMetadata) => {
    const productId = productMetadata.productId || getMetadata('product-id');

    authenticationData.loginPromise.then(() => {
      if (authenticationData.isLoggedIn) {
        isLoggedIn = true;
        createDownloadBtn(productId, isOptions, optionProductId);
      }
    });
  });

  block.classList.add('table');
  block.innerHTML = '<div class="spinner-calendar"><div></div><div></div><div></div><div></div></div>';
  loadCSS(`${window.hlx.codeBasePath}/blocks/table/table.css`);
  renderTable(block).catch((error) => {
    block.innerHTML = `
      <div class="no-results" role="alert" data-error="${error.message}">
        <p>
          <span class="icon-attention-triangle"></span>
          <span class="primary">There is currently no calendar data for this product.</span> 
          If you have any questions, please feel free to 
          <a class="contact-link" href='${urlByEnvType()}/tools-information/contacts-list.html'>contact us</a>.
        </p>
      </div>
    `;
  });

  const fragmentUrl = '/fragments/disclaimers/markets/calendar';
  const modalItemClass = 'about-report-link';
  handleAboutReportModal(block, modalItemClass, fragmentUrl);
}

import {
  div,
  span,
  table,
  thead,
  tbody,
  tr,
  th,
  td,
} from '../../scripts/dom-helpers.js';
import {
  readBlockConfig,
  i18n,
  setupDayjsLibs,
  getCdtDate,
} from '../../scripts/utils.js';
import { getCvolIndexData } from '../../scripts/utils/product.js';

const DEFAULT_UPDATE_INTERVAL = 10;
const DEFAULT_UPDATE_TIMEOUT = 1;
const DESKTOP_BREAKPOINT = 769;

function isDesktop() {
  return window.innerWidth >= DESKTOP_BREAKPOINT;
}

function renderSingleView(container, data, productGroups, labels) {
  container.replaceChildren();

  data.forEach(({
    symbol,
    cvolPrice,
    cvolPriceChange,
    changeColor,
  }) => {
    const productGroup = productGroups.find((p) => p.productId === symbol);
    const productName = productGroup?.productName || '';

    const product = div(
      { class: 'product' },
      productName ? div({ class: 'product-name-single' }, productName) : '',
      div(
        { class: 'values-row' },
        div(
          { class: 'single-code' },
          span({ class: 'title' }, `${labels.code}:`),
          span({ class: 'symbol' }, symbol),
        ),
        div(
          { class: 'single-price' },
          span({ class: 'title' }, `${labels.cvol}:`),
          span({ class: 'price' }, cvolPrice),
        ),
        div(
          { class: 'single-change' },
          span({ class: 'title' }, `${labels.change}:`),
          span({ class: `price ${changeColor}` }, cvolPriceChange),
        ),
      ),
    );

    container.appendChild(product);
  });
}

function renderDesktopView(container, data, productGroups, labels) {
  container.replaceChildren();

  const tableEl = table(
    thead(
      tr(
        th(labels.product),
        th(labels.cvol),
        th(labels.change),
      ),
    ),
    tbody(
      ...data.map(({
        symbol,
        cvolPrice,
        cvolPriceChange,
        changeColor,
      }) => {
        const productGroup = productGroups.find((p) => p.productId === symbol);
        const productName = productGroup?.productName || '';

        return tr(
          td(
            div(
              { class: 'product-data' },
              div({ class: 'symbol' }, symbol),
              div({ class: 'product-name' }, productName),
            ),
          ),
          td({ class: 'cvol-price' }, cvolPrice),
          td({ class: `cvol-price-change ${changeColor}` }, cvolPriceChange),
        );
      }),
    ),
  );

  container.appendChild(tableEl);
}

function renderMobileView(container, data, productGroups, labels) {
  container.replaceChildren();

  data.forEach(({
    symbol,
    cvolPrice,
    cvolPriceChange,
    changeColor,
  }) => {
    const productGroup = productGroups.find((p) => p.productId === symbol);
    const productName = productGroup?.productName || '';

    const productRow = div(
      { class: 'product-row' },
      div({ class: 'product-name' }, productName),
      div(
        { class: 'multi-values-row' },
        div(
          { class: 'code-col' },
          div({ class: 'title' }, labels.sym),
          div({ class: 'symbol' }, symbol),
        ),
        div(
          { class: 'price-col' },
          div({ class: 'title' }, labels.cvol),
          div({ class: 'price' }, cvolPrice),
        ),
        div(
          { class: 'price-change-col' },
          div({ class: 'title' }, labels.change),
          div({ class: `price ${changeColor}` }, cvolPriceChange),
        ),
      ),
    );

    container.appendChild(productRow);
  });
}

async function renderTimestamp(container, insertTimes, labels) {
  const existingTimestamp = container.querySelector('.timestamp');
  if (existingTimestamp) {
    existingTimestamp.remove();
  }

  let formattedTime = '-';

  if (insertTimes && insertTimes.length > 0) {
    const validTimes = insertTimes.filter((t) => t && t !== '-');
    if (validTimes.length > 0) {
      const latestTime = validTimes.sort().pop();
      await setupDayjsLibs();
      const date = getCdtDate(latestTime).format('DD MMM YYYY hh:mm:ss A');
      formattedTime = `${labels.lastUpdated} ${date} CT`;
    }
  }

  container.appendChild(div({ class: 'timestamp' }, formattedTime));
}

function parseProductGroups(config) {
  const { productCode, productName = '' } = config;

  const codes = productCode
    ? productCode.split(',').map((code) => code.trim())
    : [];

  const names = productName
    ? productName.split(',').map((name) => name.trim())
    : [];

  return codes.map((code, index) => ({
    productId: code,
    productName: names[index] || '',
  }));
}

function renderView(wrapper, data, productGroups, labels) {
  const isSingleProduct = productGroups.length === 1;

  if (isSingleProduct) {
    renderSingleView(wrapper, data, productGroups, labels);
  } else if (isDesktop()) {
    renderDesktopView(wrapper, data, productGroups, labels);
  } else {
    renderMobileView(wrapper, data, productGroups, labels);
  }
}

async function getLabels() {
  const [
    codeLabel,
    cvolLabel,
    changeLabel,
    productLabel,
    symLabel,
    lastUpdatedLabel,
  ] = await Promise.all([
    i18n('Code'),
    i18n('Cvol'),
    i18n('Change'),
    i18n('Product'),
    i18n('Sym'),
    i18n('Last Updated'),
  ]);

  return {
    code: codeLabel,
    cvol: cvolLabel,
    change: changeLabel,
    product: productLabel,
    sym: symLabel,
    lastUpdated: lastUpdatedLabel,
  };
}

async function refreshData(wrapper, productCodes, productGroups, labels, state) {
  const data = await getCvolIndexData(productCodes);

  if (data && data.length > 0) {
    state.currentData = data;
    renderView(wrapper, data, productGroups, labels);
    const insertTimes = data.map((item) => item.insertTime);
    await renderTimestamp(wrapper, insertTimes, labels);
  }
}

async function handleResize(wrapper, productGroups, labels, state) {
  if (state.currentData && productGroups.length > 1) {
    renderView(wrapper, state.currentData, productGroups, labels);
    const insertTimes = state.currentData.map((item) => item.insertTime);
    await renderTimestamp(wrapper, insertTimes, labels);
  }
}

function setupAutoRefresh(wrapper, productCodes, productGroups, labels, state, config) {
  const updateInterval = config.autoRefreshInterval || DEFAULT_UPDATE_INTERVAL;
  const updateTimeout = config.autoRefreshTimeout || DEFAULT_UPDATE_TIMEOUT;

  const intervalMs = updateInterval * 1000;
  const timeoutMs = updateTimeout * 60000;

  const intervalId = setInterval(() => {
    refreshData(wrapper, productCodes, productGroups, labels, state);
  }, intervalMs);

  setTimeout(() => {
    clearInterval(intervalId);
  }, timeoutMs);
}

export default async function decorate(block) {
  const config = readBlockConfig(block, true);
  const productGroups = parseProductGroups(config);
  const productCodes = productGroups.map((p) => p.productId);
  block.replaceChildren();

  if (productCodes.length === 0) {
    return;
  }

  const labels = await getLabels();
  const state = { currentData: null };

  const wrapper = div({ class: 'cvol-wrapper' });
  block.appendChild(wrapper);

  window.addEventListener('resize', () => {
    handleResize(wrapper, productGroups, labels, state);
  });

  await refreshData(wrapper, productCodes, productGroups, labels, state);
  setupAutoRefresh(wrapper, productCodes, productGroups, labels, state, config);
}

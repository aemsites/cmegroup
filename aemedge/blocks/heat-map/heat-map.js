import {
  createElement,
  readBlockConfig,
  generateRandomId,
  loadExtraCss,
} from '../../scripts/utils.js';
import { addHeatMap, getAllQuotes } from '../../scripts/actions/heatMap.js';
import { store } from '../../scripts/store/store.js';

function formatNumber(num) {
  if (!num && num !== 0) return '-';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function createHeatMapStructure(items, block) {
  const isMicroSite = block.classList.contains('microsite');
  const container = createElement('div');
  if (block.classList.contains('medium-bar')) {
    items.forEach((item) => {
      Array.from({ length: item.numContracts ?? 1 }).forEach(() => {
        const cardContainer = createElement('div', { class: 'card-container', 'data-product-id': item.productId });
        container.append(cardContainer);
        const productCode = createElement('div', { class: 'product-code' }, '-');
        const productName = createElement('div', { class: 'product-name' }, item.overrideProductName || '');
        const productInfo = createElement('div', { class: 'product-info' }, productCode, productName);
        const rate = createElement('div', { class: 'rate' }, '-');
        const volume = createElement('div', { class: 'volume' }, '-');
        const change = createElement('div', { class: 'change' }, '-');
        const percentage = createElement('div', { class: 'percentage-change' }, '-');
        const productValues = createElement('div', { class: 'product-values' }, rate, volume, change, percentage);
        const linkEl = createElement('a', { class: 'heat-map-card' }, productInfo, productValues);
        cardContainer.append(linkEl);
        if (!isMicroSite) {
          const portfolio = createElement('div', { class: 'portfolio-icon' });
          cardContainer.append(portfolio);
        }
        const opt = createElement('a', {
          class: 'product-options',
          target: '_blank',
          rel: 'noopener noreferrer',
        }, 'OPT');
        cardContainer.append(opt);
        container.append(cardContainer);
      });
    });
  }
  return container;
}

function populateHeatMapData(data, block) {
  if (!data || !Array.isArray(data) || data.length === 0) return;
  if (block.classList.contains('medium-bar')) {
    data.forEach(({
      productId,
      quoteCode,
      uri,
      last,
      volume,
      change,
      percentageChange,
      heatColor,
      hasOption,
      optionUri,
      productName,
      overrideProductName,
    }) => {
      const productQuery = `.card-container[data-product-id="${productId}"]`;
      let heatMap = block.querySelector(`${productQuery}[data-quote-code="${quoteCode}"]`);
      if (!heatMap) {
        heatMap = block.querySelector(`${productQuery}:not([data-quote-code])`);
        if (heatMap) heatMap.dataset.quoteCode = quoteCode;
      }
      if (!heatMap) return;
      const card = heatMap.querySelector('.heat-map-card');
      card.href = uri;
      const oldColor = [...card.classList].find((cl) => cl.startsWith('heat-map-color_'));
      card.classList.remove(oldColor);
      card.classList.toggle(heatColor, true);
      const pCode = card.querySelector('.product-code');
      pCode.textContent = quoteCode || '-';
      const pName = card.querySelector('.product-name');
      pName.textContent = overrideProductName || productName || '';
      const pRate = card.querySelector('.rate');
      const pVolume = card.querySelector('.volume');
      const pChange = card.querySelector('.change');
      const pPercentage = card.querySelector('.percentage-change');
      pRate.textContent = last || '-';
      pVolume.textContent = formatNumber(volume) || '-';
      pChange.textContent = change || '-';
      pPercentage.textContent = percentageChange || '-';
      if (hasOption) {
        const opt = heatMap.querySelector('.product-options');
        if (opt) opt.href = optionUri;
      }
    });
  }
}

function getHeatIndexClass(options = {}) {
  const {
    str = '0',
    initStep = 0.25,
    step = 0.25,
    min = 8,
    offset = 0,
  } = options;
  const percentageChange = str.replace('%', '');
  const floatPercentageChange = parseFloat(percentageChange);
  const percentage = Number.isNaN(floatPercentageChange)
    ? 0
    : floatPercentageChange;
  const absolutePercentage = Math.abs(percentage);
  const index = initStep > absolutePercentage
    ? 0
    : Math.min(Math.floor(absolutePercentage / step) + offset, min);
  const value = percentage > 0 ? `positive-${index}` : `negative-${index}`;
  return `heat-map-color-${index > 0 ? value : 'zero'}`;
}

function mapQuote(componentId, quote) {
  return {
    ...quote,
    tooltipId: `heat-map-tooltip-${componentId || 0}-${quote.productId}`,
    heatColor: getHeatIndexClass({
      str: quote.percentageChange,
    }),
  };
}

function processQuotes(quotes, heatMapItems, componentId, isMidpoint = false) {
  if (isMidpoint) {
    return quotes.map((quote) => mapQuote(componentId, quote));
  }
  const filtered = heatMapItems.reduce((acc, item) => {
    quotes.filter(({ productId }) => item.productId === productId).forEach((quote) => {
      acc.push({
        ...item,
        ...quote,
      });
    });
    return acc;
  }, []);
  return filtered.map((quote) => mapQuote(componentId, quote));
}

function buildProductItems(config) {
  const numContracts = config.numberContracts || 1;
  const showQuarterly = config.showQuarterly === 'true';
  const products = [].concat(config.productId || []);
  const overrideNamesMap = new Map(
    [].concat(config.overrideName || [])
      .map((item) => {
        const [id, name] = item.split(': ');
        return [id, name];
      }),
  );
  return products.map((id) => ({
    productId: Number(id.trim()),
    numContracts,
    showQuarterly,
    overrideProductName: overrideNamesMap.get(id.trim()) || '',
  }));
}

async function getQuotes(items, componentId, isMidpoint) {
  if (componentId !== window.masterHeatMap && !isMidpoint) {
    return;
  }
  if (isMidpoint) {
    //  TODO: midpoint service call
  } else {
    store.dispatch(await getAllQuotes(
      items.map(({ productId }) => productId),
      items.map(({ numContracts }) => numContracts || 1),
      items.map(({ showQuarterly }) => (showQuarterly ? 1 : 0) || 0),
    ));
  }
}

export default async function decorate(block) {
  loadExtraCss(block);
  const config = readBlockConfig(block, true);
  const items = buildProductItems(config);
  const isMidpoint = block.classList.contains('sector-midpoint');
  block.textContent = '';
  block.append(createHeatMapStructure(items, block));
  store.dispatch(addHeatMap(items));
  const componentId = generateRandomId();
  if (!isMidpoint) {
    window.masterHeatMap = window.masterHeatMap || componentId;
  }
  setTimeout(() => {
    // wait for the call above to "addHeatmap" to impact
    let allHeatMapItems = items;
    store.subscribe(({ heatMap }) => heatMap, ({ items: heatMapItems }) => {
      if (heatMapItems) {
        allHeatMapItems = heatMapItems;
      }
    });
    const heatMapItems = isMidpoint ? items : allHeatMapItems;
    const autoUpdateTimer = setInterval(() => {
      getQuotes(heatMapItems, componentId, isMidpoint);
    }, 30000);
    setTimeout(() => {
      clearInterval(autoUpdateTimer);
    }, 3600000);
    getQuotes(heatMapItems, componentId, isMidpoint);
  }, 100);
  //  quotes data subscriber
  store.subscribe(({ heatMap }) => heatMap, ({ quotes }) => {
    if (quotes) {
      populateHeatMapData(processQuotes(quotes, items, componentId), block);
    }
  });
}

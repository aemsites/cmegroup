import { getMetadata } from '../../scripts/aem.js';
import { getProductMetadata } from '../../scripts/utils/product.js';
import { apiPost, getResponseData, urlByEnvType } from '../../scripts/utils/index.js';
import { createElement, i18n } from '../../scripts/utils.js';

const HERO_API_CONFIG = {
  endpoint: '/CmeWS/mvc/quotes/v2/contracts-by-number',
};

function formatNumber(num) {
  if (!num && num !== 0) return '-';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

async function createHeroStructure() {
  const [
    currentPriceLabel,
    changeLabel,
    volumeLabel,
    openLabel,
    highLabel,
    lowLabel,
    priorSettleLabel,
    updatedLabel,
    marketNoteLabel,
  ] = await Promise.all([
    i18n('Current Price'),
    i18n('Change'),
    i18n('Volume'),
    i18n('Open'),
    i18n('High'),
    i18n('Low'),
    i18n('Prior Settle'),
    i18n('Updated'),
    i18n('All times are local exchange time'),
  ]);

  const container = createElement('div', { class: 'container' });

  const h1 = createElement('h1', {}, getMetadata('product') || 'Product Name');
  const subtitle = createElement('div', { class: 'hero-subtitle' }, '\u00A0');

  const contractData = createElement('div', { class: 'contract-data' });

  const priceSection = createElement('div', { class: 'price-section' });

  const currentPrice = createElement('div', { class: 'current-price' }, [
    createElement('div', { class: 'label' }, currentPriceLabel),
    createElement('div', { class: 'value' }, '-'),
  ]);

  const priceChange = createElement('div', { class: 'price-change' }, [
    createElement('div', { class: 'label' }, changeLabel),
    createElement('div', { class: 'value' }, '-'),
  ]);

  const volumeInfo = createElement('div', { class: 'volume-info' }, [
    createElement('div', { class: 'label' }, volumeLabel),
    createElement('div', { class: 'value' }, '-'),
  ]);

  priceSection.append(currentPrice, priceChange, volumeInfo);

  const tradingData = createElement('div', { class: 'trading-data' });
  const tradingItems = [
    { field: 'open', label: openLabel },
    { field: 'high', label: highLabel },
    { field: 'low', label: lowLabel },
    { field: 'priorSettle', label: priorSettleLabel },
  ];

  tradingItems.forEach(({ field, label }) => {
    const item = createElement('div', { class: 'trading-item', 'data-field': field }, [
      createElement('span', { class: 'label' }, `${label}:`),
      createElement('span', { class: 'value' }, '-'),
    ]);
    tradingData.append(item);
  });

  const marketUpdate = createElement('div', { class: 'market-update' }, [
    createElement('div', { class: 'update-time' }, `${updatedLabel}: -`),
    createElement('div', { class: 'market-note' }, marketNoteLabel),
  ]);

  contractData.append(priceSection, tradingData, marketUpdate);
  container.append(h1, subtitle, contractData);

  return container;
}

async function populateHeroData(block) {
  try {
    const { productId, productName } = await getProductMetadata();
    if (!productId) return;

    const url = `${urlByEnvType()}${HERO_API_CONFIG.endpoint}`;
    const payload = {
      productIds: [productId],
      contractsNumber: [1],
      type: 'VOLUME',
      showQuarterly: [0],
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    const response = await apiPost(url, payload, headers);
    const data = getResponseData(response) || response.data;

    if (!data || !Array.isArray(data) || data.length === 0) return;

    const contractData = data[0];

    // Smooth update: fade out, update content, fade in
    const updateElement = (element, content, className) => {
      if (!element) return;
      element.style.opacity = '0.3';
      setTimeout(() => {
        if (className) {
          element.className = className;
        }
        element.textContent = content;
        element.style.opacity = '1';
      }, 150);
    };

    const h1 = block.querySelector('h1');
    const subtitle = block.querySelector('.hero-subtitle');
    updateElement(h1, contractData.productName || productName || '');
    updateElement(subtitle, contractData.expirationMonth || '');

    const currentPrice = block.querySelector('.current-price .value');
    const priceChange = block.querySelector('.price-change .value');
    const volume = block.querySelector('.volume-info .value');

    updateElement(currentPrice, contractData.last || '-');

    if (priceChange) {
      const change = contractData.change || '-';
      const changePercent = contractData.percentageChange || '-';
      const isNegative = change.toString().startsWith('-');
      const className = `value ${isNegative ? 'change-negative' : 'change-positive'}`;
      updateElement(priceChange, `${change} (${changePercent})`, className);
    }

    updateElement(volume, formatNumber(contractData.volume));

    const open = block.querySelector('[data-field="open"] .value');
    const high = block.querySelector('[data-field="high"] .value');
    const low = block.querySelector('[data-field="low"] .value');
    const priorSettle = block.querySelector('[data-field="priorSettle"] .value');

    updateElement(open, contractData.open || '-');
    updateElement(high, contractData.high || '-');
    updateElement(low, contractData.low || '-');
    updateElement(priorSettle, contractData.priorSettle || '-');

    const updateTime = block.querySelector('.update-time');
    if (updateTime && contractData.updated) {
      const updatedLabel = await i18n('Updated');
      const date = new Date(contractData.updated);
      updateElement(updateTime, `${updatedLabel}: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
    }
  } catch (e) {
    // Silent fail
  }
}

export default async function decorate(block) {
  const hasContainer = block.querySelector('.container');
  if (!hasContainer) {
    block.innerHTML = '';
    const container = await createHeroStructure();
    block.append(container);
  }

  // Non-blocking: Load data in background after render
  // This ensures the block appears immediately, then populates smoothly
  setTimeout(() => {
    populateHeroData(block);
  }, 0);
}

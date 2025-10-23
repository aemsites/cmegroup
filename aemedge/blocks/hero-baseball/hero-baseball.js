import { getMetadata } from '../../scripts/aem.js';
import { getProductMetadata } from '../../scripts/utils/product.js';
import { createElement } from '../../scripts/utils.js';

const HERO_API_CONFIG = {
  endpoint: '/aemedge/blocks/hero-baseball/mock-api/contracts-by-number.json',
};


function formatNumber(num) {
  if (!num && num !== 0) return '-';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function createHeroStructure() {
  const container = createElement('div', { class: 'container' });

  const h1 = createElement('h1', {}, getMetadata('product') || 'Product Name');
  const subtitle = createElement('div', { class: 'hero-subtitle' }, 'Loading...');

  const contractData = createElement('div', { class: 'contract-data' });

  const priceSection = createElement('div', { class: 'price-section' });

  const currentPrice = createElement('div', { class: 'current-price' }, [
    createElement('div', { class: 'label' }, 'Current Price'),
    createElement('div', { class: 'value' }, '-'),
  ]);

  const priceChange = createElement('div', { class: 'price-change' }, [
    createElement('div', { class: 'label' }, 'Change'),
    createElement('div', { class: 'value' }, '-'),
  ]);

  const volumeInfo = createElement('div', { class: 'volume-info' }, [
    createElement('div', { class: 'label' }, 'Volume'),
    createElement('div', { class: 'value' }, '-'),
  ]);

  priceSection.append(currentPrice, priceChange, volumeInfo);

  const tradingData = createElement('div', { class: 'trading-data' });
  const tradingItems = [
    { field: 'open', label: 'Open' },
    { field: 'high', label: 'High' },
    { field: 'low', label: 'Low' },
    { field: 'priorSettle', label: 'Prior Settle' },
  ];

  tradingItems.forEach(({ field, label }) => {
    const item = createElement('div', { class: 'trading-item', 'data-field': field }, [
      createElement('span', { class: 'label' }, `${label}:`),
      createElement('span', { class: 'value' }, '-'),
    ]);
    tradingData.append(item);
  });

  const marketUpdate = createElement('div', { class: 'market-update' }, [
    createElement('div', { class: 'update-time' }, 'Updated: -'),
    createElement('div', { class: 'market-note' }, 'All times are local exchange time'),
  ]);

  contractData.append(priceSection, tradingData, marketUpdate);
  container.append(h1, subtitle, contractData);

  return container;
}

async function populateHeroData(block) {
  try {
    const { productId, productName } = await getProductMetadata();
    if (!productId) return;

    const response = await fetch(HERO_API_CONFIG.endpoint);
    if (!response.ok) throw new Error('Failed to fetch hero data');

    const data = await response.json();
    const contractData = data.find((item) => item.productId === parseInt(productId, 10));
    if (!contractData) return;

    const h1 = block.querySelector('h1');
    const subtitle = block.querySelector('.hero-subtitle');
    if (h1) h1.textContent = contractData.productName || productName || '';
    if (subtitle) subtitle.textContent = contractData.expirationMonth || '';

    const currentPrice = block.querySelector('.current-price .value');
    const priceChange = block.querySelector('.price-change .value');
    const volume = block.querySelector('.volume-info .value');

    if (currentPrice) currentPrice.textContent = contractData.last || '-';
    if (priceChange) {
      const change = contractData.change || '-';
      const changePercent = contractData.percentageChange || '-';
      const isNegative = change.toString().startsWith('-');
      priceChange.textContent = `${change} (${changePercent})`;
      priceChange.className = `value ${isNegative ? 'change-negative' : 'change-positive'}`;
    }
    if (volume) volume.textContent = formatNumber(contractData.volume);

    const open = block.querySelector('[data-field="open"] .value');
    const high = block.querySelector('[data-field="high"] .value');
    const low = block.querySelector('[data-field="low"] .value');
    const priorSettle = block.querySelector('[data-field="priorSettle"] .value');

    if (open) open.textContent = contractData.open || '-';
    if (high) high.textContent = contractData.high || '-';
    if (low) low.textContent = contractData.low || '-';
    if (priorSettle) priorSettle.textContent = contractData.priorSettle || '-';

    const updateTime = block.querySelector('.update-time');
    if (updateTime && contractData.updated) {
      const date = new Date(contractData.updated);
      updateTime.textContent = `Updated: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
  } catch (e) {
    // Silent fail
  }
}

export default async function decorate(block) {
  const hasContainer = block.querySelector('.container');
  if (!hasContainer) {
    block.innerHTML = '';
    const container = createHeroStructure();
    block.append(container);
  }
  await populateHeroData(block);
}



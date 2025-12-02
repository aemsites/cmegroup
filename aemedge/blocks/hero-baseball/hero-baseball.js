import {
  getProductMetadata,
  getContractsByNumber,
  getViewAnotherProductDropdown,
  computeAssetClass,
  computeProductRoot,
} from '../../scripts/utils/product.js';
import {
  createElement,
  i18n,
  setupDayjsLibs,
  getCdtDate,
  showTooltip,
  readBlockConfig,
} from '../../scripts/utils.js';
import { store } from '../../scripts/store/store.js';

function formatNumber(num) {
  if (!num && num !== 0) return '-';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

async function buildGlobexInfoTooltip() {
  const globexInfo = createElement('img', { src: '/aemedge/icons/info-filled.svg' });
  const globexInfoSpan = createElement('span', { class: 'globex-info' }, globexInfo);
  const [
    line1Label,
    line2Label,
    line3Label,
  ] = await Promise.all([
    i18n('Format: Globex product code, Month, Year'),
    i18n('Front months are called out with FM indicator'),
    i18n('View all month codes'),
  ]);
  const line1 = createElement('p', null, line1Label);
  const line2 = createElement('p', null, line2Label);
  const line3 = createElement('a', { href: '/month-codes.html' }, line3Label);
  const tooltipContent = createElement('div', null, line1, line2, line3);
  let tooltip = null;
  globexInfo.addEventListener('mouseover', () => {
    tooltip = showTooltip(globexInfoSpan, tooltipContent);
  });
  globexInfo.addEventListener('mouseout', () => {
    setTimeout(() => {
      if (tooltip) {
        tooltip.remove();
      }
    }, 500);
  });
  return globexInfoSpan;
}

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

function buildBreadcrumbLink(items, config) {
  const breadcrumb = createElement('div', { class: 'hero-breadcrumb' }, '');
  const arrow = createElement('img', {
    src: '/aemedge/icons/arrow-left-bold.svg',
    alt: 'Current product',
  });
  if (config['breadcrumb-link'] && config['breadcrumb-label']) {
    const link = createElement('a', {
      href: config['breadcrumb-link'],
    }, config['breadcrumb-label']);
    link.prepend(arrow);
    breadcrumb.append(link);
    return breadcrumb;
  }
  const productRoot = computeProductRoot(window.location.pathname);
  let subgroup = null;
  items.forEach((sub) => {
    sub.products.forEach((prod) => {
      if (prod.linkUrl === productRoot) {
        subgroup = sub;
      }
    });
  });
  if (subgroup) {
    const link = createElement('a', { href: subgroup.linkUrl }, subgroup.text);
    link.prepend(arrow);
    breadcrumb.append(link);
    return breadcrumb;
  }
  return null;
}

function createHeroInitialStructure(config) {
  const container = createElement('div', { class: 'container' });
  const h1 = createElement('h1', {}, '');
  const subtitle = createElement('div', { class: 'hero-subtitle' }, '\u00A0');
  const navigationBar = createElement('div', { class: 'hero-navigation' }, '');
  const assetClassName = computeAssetClass(window.location.pathname);
  getViewAnotherProductDropdown(assetClassName).then((assetClass) => {
    const breadcrumb = buildBreadcrumbLink(assetClass.items || [], config);
    if (breadcrumb) {
      navigationBar.append(breadcrumb);
    }
    if (assetClass.items) {
      import('./product-selector.js').then((mod) => {
        const productSelector = mod.default(assetClass);
        navigationBar.append(productSelector);
      });
    }
  });
  container.append(navigationBar, h1, subtitle);
  return container;
}

async function createHeroStructure(productData, config, block) {
  if (block.querySelector('.contract-data')) return;
  const { productName, isActive, isTrading } = productData;
  const { productName: metaProductName } = await getProductMetadata();
  const container = block.querySelector('.container');
  const h1 = block.querySelector('h1');
  updateElement(h1, productName || metaProductName || '');
  if (config['launch-date-title'] && !isTrading) {
    const launchDateTitle = createElement('div', {
      class: 'launch-date-title',
    }, config['launch-date-title']);
    container.append(launchDateTitle);
  }
  const [
    globexLabel,
    lastLabel,
    changeLabel,
    volumeLabel,
    updatedLabel,
    marketNoteLabel,
    watchlistsLabel,
  ] = await Promise.all([
    i18n('Globex Code'),
    i18n('Last'),
    i18n('Change'),
    i18n('Volume'),
    i18n('Last Updated'),
    i18n('Market data is delayed by at least 10 minutes'),
    i18n('Watchlists'),
  ]);
  const contractData = createElement('div', { class: 'contract-data' });
  const globex = createElement('div', { class: 'label' }, globexLabel);
  const globexCode = createElement('div', { class: 'globex-code' }, [
    globex,
    createElement('div', { class: 'value' }, '-'),
  ]);
  buildGlobexInfoTooltip().then((infoTooltip) => {
    globex.append(infoTooltip);
  });
  const lastValue = createElement('div', { class: 'last-value' }, [
    createElement('div', { class: 'label' }, lastLabel),
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
  const briefcaseIcon = createElement('img', { src: '/aemedge/icons/briefcase.svg' });
  const briefcaseIconSpan = createElement('span', { class: 'icon' }, briefcaseIcon);
  const actions = createElement('div', { class: 'actions reverse' }, [
    createElement('a', { class: 'button primary' }, briefcaseIconSpan, watchlistsLabel),
  ]);
  contractData.append(globexCode, lastValue, priceChange, volumeInfo, actions);
  container.append(contractData);
  if (isActive) {
    const marketUpdate = createElement('div', { class: 'market-update' }, [
      createElement('div', { class: 'update-time' }, `${updatedLabel}: -`),
      createElement('div', { class: 'market-note' }, marketNoteLabel),
    ]);
    container.append(marketUpdate);
  }
}

async function populateHeroData(productData, block) {
  const { productId, isActive, productSubtitle } = productData;
  const data = await getContractsByNumber(productId);
  if (!data || !Array.isArray(data) || data.length === 0) return;
  const {
    quoteCode,
    last,
    change,
    percentageChange,
    volume,
    lastUpdated,
  } = data[0];
  const subtitle = block.querySelector('.hero-subtitle');
  updateElement(subtitle, productSubtitle || '');
  const globexColumn = block.querySelector('.globex-code');
  const globexCode = block.querySelector('.globex-code .value');
  const lastValue = block.querySelector('.last-value .value');
  const priceChange = block.querySelector('.price-change .value');
  const volumeData = block.querySelector('.volume-info .value');
  if (quoteCode) {
    globexColumn.classList.add('has-value');
  } else {
    globexColumn.classList.remove('has-value');
  }
  updateElement(globexCode, quoteCode || '-');
  updateElement(lastValue, last || '-');
  if (priceChange && change.toString() !== '-') {
    const changePercent = percentageChange || '-';
    const isNegative = change.toString().startsWith('-');
    const className = `value ${isNegative ? 'change-negative' : 'change-positive'}`;
    updateElement(priceChange, `${change} (${changePercent})`, className);
  }
  updateElement(volumeData, volume !== '0' ? formatNumber(volume) : '-');
  if (isActive) {
    Promise.all([i18n('Last Updated'), setupDayjsLibs()]).then((result) => {
      const updateTime = block.querySelector('.update-time');
      if (updateTime && lastUpdated) {
        const date = getCdtDate(lastUpdated).format('DD MMM YYYY hh:mm:ss A');
        updateElement(updateTime, `${result[0]} ${date} CT.`);
      }
    });
  }
}

async function createHeroNoProductId(block, config) {
  if (block.querySelector('.contract-data')) return;
  const container = block.querySelector('.container');
  const { productName } = await getProductMetadata();
  const h1 = block.querySelector('h1');
  updateElement(h1, productName || '');
  const subtitle = block.querySelector('.hero-subtitle');
  updateElement(subtitle, config['pre-launch-subtitle'] || '');
  if (config['launch-date-title']) {
    const launchDateTitle = createElement('div', {
      class: 'launch-date-title',
    }, config['launch-date-title']);
    container.append(launchDateTitle);
  }
  const contractData = createElement('div', { class: 'contract-data' });
  if (config['globex-code']) {
    const globexLabel = await i18n('Globex Code');
    const globex = createElement('div', { class: 'label' }, globexLabel);
    const globexCode = createElement('div', { class: 'globex-code has-value' }, [
      globex,
      createElement('div', { class: 'value' }, config['globex-code'] || '-'),
    ]);
    buildGlobexInfoTooltip().then((infoTooltip) => {
      globex.append(infoTooltip);
    });
    contractData.append(globexCode);
  }
  container.append(contractData);
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const hasContainer = block.querySelector('.container');
  if (!hasContainer) {
    block.innerHTML = '';
    const container = createHeroInitialStructure(config);
    block.append(container);
  }
  store.subscribe(({ productData }) => productData, (productData) => {
    if (productData.loaded) {
      const image = config['custom-background'];
      if (image && (!productData.productId || !productData.isTrading)) {
        block.classList.add('custom-background');
        block.style['background-image'] = `url(${image}`;
      }
      if (productData.productId) {
        createHeroStructure(productData, config, block).then(() => {
          const autoUpdateTimer = setInterval(() => {
            populateHeroData(productData, block);
          }, 30000);
          setTimeout(() => {
            clearInterval(autoUpdateTimer);
          }, 3600000);
          populateHeroData(productData, block);
        });
      } else {
        createHeroNoProductId(block, config);
      }
    }
  });
}

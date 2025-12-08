import { createElement } from '../../scripts/utils.js';
import { computeProductRoot } from '../../scripts/utils/product.js';

function toggleProductSelector(e) {
  const button = e.target.closest('button');
  const expanded = button.getAttribute('aria-expanded');
  button.setAttribute('aria-expanded', !(expanded === 'true'));
}

function togglePosition() {
  const isDesktop = window.innerWidth > 993;
  const button = document.querySelector('.product-selector-button');
  const dropdown = document.querySelector('.product-selector-dropdown');
  const isOpen = button.getAttribute('aria-expanded') === 'true';
  const buttonRect = button.getBoundingClientRect();
  const dropdownHeight = dropdown.offsetHeight;
  const spaceBelow = window.innerHeight - buttonRect.bottom;
  const spaceAbove = buttonRect.top;
  const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
  if (!button || !dropdown) return;
  if (!isDesktop && isOpen) {
    button.setAttribute('aria-expanded', false);
  }
  dropdown.style.setProperty('--height', `-${dropdownHeight}px`);
  dropdown.classList.toggle('open-up', shouldOpenUp);
  dropdown.classList.toggle('open-down', !shouldOpenUp);
}

function closeOnDocClick(e) {
  const button = document.querySelector('button.product-selector-button[aria-expanded=true]');
  if (button && !button.contains(e.target)) {
    button.setAttribute('aria-expanded', false);
  }
}

function buildProductItems(products, items) {
  const productRoot = computeProductRoot(window.location.pathname);
  items.forEach((sub) => {
    const subgroupItem = createElement('li', null, sub.subgroup);
    products.append(subgroupItem);
    sub.products.forEach((prod) => {
      const linkEl = createElement('a', { href: prod.linkUrl }, prod.text);
      const productItem = createElement('li', { class: 'product-item' }, linkEl);
      products.append(productItem);
      if (prod.linkUrl === productRoot) {
        const check = createElement('img', {
          src: '/aemedge/icons/check.svg',
          alt: 'Current product',
        });
        productItem.prepend(check);
      }
    });
  });
}

export default function buildProductSelector(assetClass) {
  const button = createElement('button', {
    class: 'product-selector-button',
    'aria-haspopup': true,
    'aria-expanded': false,
    type: 'button',
  }, assetClass.title);
  const products = createElement('ul', { class: 'product-selector-options' });
  buildProductItems(products, assetClass.items);
  const dropdown = createElement('div', {
    class: 'product-selector-dropdown',
    'aria-labelledby': 'product-selector-button',
    role: 'menu',
  }, products);
  button.id = 'product-selector-button';
  button.addEventListener('click', toggleProductSelector);
  document.addEventListener('click', closeOnDocClick);
  window.addEventListener('scroll', togglePosition);
  return createElement('div', { class: 'hero-products' }, button, dropdown);
}

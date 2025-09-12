import { createElement } from '../../scripts/utils.js';

function toggleLanguageSelector(e) {
  const button = e.target.closest('button');
  const expanded = button.getAttribute('aria-expanded');
  button.setAttribute('aria-expanded', !(expanded === 'true'));
}

function togglePosition() {
  const isDesktop = window.innerWidth > 993;
  const button = document.querySelector('.language-selector-button');
  const dropdown = document.querySelector('.language-selector-dropdown');
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
  const button = document.querySelector('button.language-selector-button[aria-expanded=true]');
  if (button && !button.contains(e.target)) {
    button.setAttribute('aria-expanded', false);
  }
}

function getCurrentLanguageOption(languages) {
  let curr;
  [...languages.children].forEach((elem) => {
    const href = elem.firstElementChild.getAttribute('href');
    if (window.location.href.startsWith(href) || window.location.pathname.startsWith(href)) {
      curr = elem;
    }
  });
  if (!curr) {
    curr = languages.firstElementChild;
  }
  return curr;
}

function decorateLanguageSelector(block) {
  const button = createElement('button', {
    class: 'language-selector-button',
    'aria-haspopup': true,
    'aria-expanded': false,
    type: 'button',
  });
  const languages = block.querySelector('ul');
  languages.remove();
  languages.classList.add('language-selector-options');
  const currentLang = getCurrentLanguageOption(languages);
  const dropdown = createElement('div', {
    class: 'language-selector-dropdown',
    'aria-labelledby': 'language-selector-button',
    role: 'menu',
  }, languages);
  button.id = 'language-selector-button';
  button.addEventListener('click', toggleLanguageSelector);
  document.addEventListener('click', closeOnDocClick);
  window.addEventListener('scroll', togglePosition);

  if (currentLang) {
    button.textContent = currentLang.innerText;
    const check = createElement('img', {
      src: '/aemedge/icons/check.svg',
      alt: 'Current language',
    });
    currentLang.querySelector('a').prepend(check);
  }
  block.append(button, dropdown);
}

/**
 * loads and decorates the language selector
 * @param {Element} block The language selector block element
 */
export default async function decorate(block) {
  block.classList.add('language-selector');
  decorateLanguageSelector(block);
}

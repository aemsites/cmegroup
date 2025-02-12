import { getMetadata, decorateIcons } from '../../scripts/aem.js';
import { createElement } from '../../scripts/utils.js';

// Footer Links collapsible - Start
function toggleCollapsible(e) {
  const collapsible = e.target.closest('.footer-collapsible');
  collapsible.classList.toggle('open');
  const collapsibleItems = collapsible.querySelector('ul');
  if (collapsible.classList.contains('open')) {
    const { scrollHeight } = collapsibleItems;
    collapsibleItems.style.height = `${scrollHeight}px`;
  } else {
    collapsibleItems.style.height = '0px';
  }
}

function decorateCollapsibles(footerLinks) {
  footerLinks.firstElementChild.querySelectorAll('div').forEach((elem) => {
    elem.classList.add('footer-collapsible');
    const button = elem.querySelector('p');
    button.addEventListener('click', toggleCollapsible);
    const arrowDown = createElement('img', {
      class: 'arrow-down',
      src: '/icons/chevron-down.svg',
    });
    button.append(arrowDown);
    const arrowUp = createElement('img', {
      class: 'arrow-up',
      src: '/icons/chevron-up.svg',
    });
    button.append(arrowUp);
  });
}
// Footer Links collapsible - End

// Language Dropdown - Start
function toggleLanguageSelector(e) {
  const button = e.target.closest('button');
  const expanded = button.getAttribute('aria-expanded');
  if (expanded === 'true') {
    button.setAttribute('aria-expanded', false);
  } else {
    button.setAttribute('aria-expanded', true);
  }
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
    if (window.location.href.startsWith(href)) {
      curr = elem;
    }
  });
  if (!curr) {
    curr = languages.firstElementChild.firstElementChild;
  }
  return curr;
}

function decorateLanguageSelector(footerLanguages) {
  const button = createElement('button', {
    class: 'language-selector-button',
    'aria-haspopup': true,
    'aria-expanded': false,
    type: 'button',
  });
  button.id = 'language-selector-button';
  button.addEventListener('click', toggleLanguageSelector);
  document.addEventListener('click', closeOnDocClick);

  const languages = footerLanguages.querySelector('ul');
  languages.remove();
  languages.classList.add('language-selector-options');
  const currentLang = getCurrentLanguageOption(languages);
  if (currentLang) {
    button.textContent = currentLang.innerText;
    const check = createElement('img', { src: '/icons/check.svg' });
    currentLang.prepend(check);
  }
  const dropdown = createElement('div', {
    class: 'language-selector-dropdown',
    'aria-labelledby': 'language-selector-button',
    role: 'menu',
  }, languages);
  footerLanguages.append(button, dropdown);
}
// Language Dropdown - End

function decorateFooter(footer) {
  const footerLinks = footer.querySelector('.footer-links');
  decorateCollapsibles(footerLinks);
  const footerSocial = footer.querySelector('.footer-social');
  const footerLanguages = footer.querySelector('.footer-languages');
  decorateLanguageSelector(footerLanguages);
  const footerContainer = createElement('div', { class: 'footer-container' }, footerLinks, footerSocial, footerLanguages);
  const footerSection = createElement('div', { class: 'footer-section' }, footerContainer);
  footer.append(footerSection);
}

function decorateFeedback(footer) {
  const footerFeedback = footer.querySelector('.footer-feedback');
  const feedbackButton = createElement('button', { class: 'primary' });
  feedbackButton.append(...footerFeedback.firstElementChild.firstElementChild.childNodes);
  footerFeedback.classList.add('footer-container');
  footerFeedback.innerText = '';
  footerFeedback.append(feedbackButton);
  footer.append(footerFeedback);
}

function decorateDisclaimer(footer) {
  const footerDisclaimer = footer.querySelector('.footer-disclaimer');
  footerDisclaimer.classList.add('footer-container');
  const footerDisclaimerSection = createElement('div', { class: 'footer-disclaimer-wrapper' }, footerDisclaimer);
  footer.append(footerDisclaimerSection);
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';

  const resp = await fetch(
    `${footerPath}.plain.html`,
    window.location.pathname.endsWith('/footer') ? { cache: 'reload' } : {},
  );

  if (resp.ok) {
    const html = await resp.text();
    const footer = createElement('div');
    footer.innerHTML = html;

    decorateIcons(footer);
    decorateFooter(footer);
    decorateFeedback(footer);
    decorateDisclaimer(footer);
    block.append(footer);
  }
}

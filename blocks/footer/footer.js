import { getMetadata, decorateIcons } from '../../scripts/aem.js';

// Footer Links collapsible - Start
function toggleCollapsible(e) {
  const collapsible = e.target.closest('.footer-collapsible');
  collapsible.classList.toggle('open');
  const collapsibleItems = collapsible.querySelector('ul');
  if (collapsible.classList.contains('open')) {
    const scrollHeight = collapsibleItems.scrollHeight;
    collapsibleItems.style.height = scrollHeight + 'px';
  } else {
    collapsibleItems.style.height = '0px';
  }
}

function decorateCollapsibles(footerLinks) {
  footerLinks.firstElementChild.querySelectorAll('div').forEach((elem) => {
    elem.classList.add('footer-collapsible');
    const button = elem.querySelector('p');
    button.addEventListener('click', toggleCollapsible);
    const arrowDown = document.createElement('img');
    arrowDown.classList.add('arrow-down');
    arrowDown.setAttribute('src', '/icons/chevron-down.svg');
    button.append(arrowDown);
    const arrowUp = document.createElement('img');
    arrowUp.classList.add('arrow-up');
    arrowUp.setAttribute('src', '/icons/chevron-up.svg');
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
  if (button && !button.contains(event.target)) {
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
  const button = document.createElement('button');
  button.classList.add('language-selector-button');
  button.id = 'language-selector-button';
  button.setAttribute('aria-haspopup', true);
  button.setAttribute('aria-expanded', false);
  button.setAttribute('type', 'button');
  button.addEventListener('click', toggleLanguageSelector);
  document.addEventListener('click', closeOnDocClick);

  const dropdown = document.createElement('div');
  dropdown.classList.add('language-selector-dropdown');
  dropdown.setAttribute('aria-labelledby', 'language-selector-button');
  dropdown.setAttribute('role', 'menu');

  const languages = footerLanguages.querySelector('ul');
  languages.remove();
  languages.classList.add('language-selector-options');
  const currentLang = getCurrentLanguageOption(languages);
  if (currentLang) {
    button.textContent = currentLang.innerText;
    const check = document.createElement('img');
    check.setAttribute('src', '/icons/check.svg');
    currentLang.prepend(check);
  }
  dropdown.append(languages);
  footerLanguages.append(button, dropdown);
}
// Language Dropdown - End

function decorateFooter(footer) {
  const footerSection = document.createElement('div');
  footerSection.classList.add('footer-section');

  const footerLinks = footer.querySelector('.footer-links');
  decorateCollapsibles(footerLinks);
  footerSection.append(footerLinks);

  const footerSocial = footer.querySelector('.footer-social');
  footerSection.append(footerSocial);

  const footerLanguages = footer.querySelector('.footer-languages');
  decorateLanguageSelector(footerLanguages);
  footerSection.append(footerLanguages);
  footer.append(footerSection);
}

function decorateFeedback(footer) {
  const feedbackButton = document.createElement('button');
  feedbackButton.classList.add('primary');

  const footerFeedback = footer.querySelector('.footer-feedback');
  feedbackButton.append(...footerFeedback.firstElementChild.firstElementChild.childNodes);
  footerFeedback.innerText = '';
  footerFeedback.append(feedbackButton);
  footer.append(footerFeedback);
}

function decorateDisclaimer(footer) {
  const footerDisclaimerSection = document.createElement('div');
  footerDisclaimerSection.classList.add('footer-disclaimer-wrapper');
  const footerDisclaimer = footer.querySelector('.footer-disclaimer');
  footerDisclaimerSection.append(footerDisclaimer);
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
    const footer = document.createElement('div');
    footer.innerHTML = html;

    decorateIcons(footer);
    decorateFooter(footer);
    decorateFeedback(footer);
    decorateDisclaimer(footer);
    block.append(footer);
  }
}

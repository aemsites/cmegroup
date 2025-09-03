import {
  loadHeader,
  loadFooter,
  loadCSS,
  loadSection,
  sampleRUM,
} from './aem.js';
import initFloatingElements from './alerts/alerts.js';
import { authentication, dataLayer, authRedirectionHandler } from './modules/index.js';
import dynamicBlocks from '../blocks/dynamic/index.js';
import { CookieUtil, LocalStorageUtil, SessionStorageUtil } from './utils/index.js';
import { isFeatureToggled } from './utils.js';

/**
 * Initialize parallax sections with background images from data attributes
 * @param {Element} main The main container element
 */
function initParallaxSections(main) {
  const parallaxSections = main.querySelectorAll('.section.parallax[data-background-image]');

  parallaxSections.forEach((section) => {
    const { backgroundImage } = section.dataset;
    if (backgroundImage) {
      section.style.backgroundImage = `url('${backgroundImage}')`;
      delete section.dataset.backgroundImage;
    }
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Applies accessibility enhancements to icon links (addition to decorateIcons from aem.js)
 * @param {Element} element The element to enhance
 */
function enhanceIconAccessibility(element = document) {
  const iconLinks = element.querySelectorAll('a span.icon');
  iconLinks.forEach((span) => {
    const parentLink = span.closest('a');
    if (parentLink && !parentLink.hasAttribute('aria-label')) {
      const iconClass = [...span.classList].find((c) => c.startsWith('icon-'));
      if (iconClass) {
        const platformName = iconClass.substring(5)
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join('');
        parentLink.setAttribute('aria-label', `Visit ${platformName}`);
      }
    }
  });
}

function autolinkModals(element) {
  element.addEventListener('click', async (e) => {
    const origin = e.target.closest('a');

    if (origin && origin.href && origin.href.includes('/modals/')) {
      e.preventDefault();
      const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
      openModal(origin.href);
    }
  });
}

/**
 * Loads all sections.
 * @param {Element} element The parent element of sections to load
 */
async function loadSections(element) {
  return new Promise((resolve) => {
    (async () => {
      const sections = [...element.querySelectorAll('div.section')];
      for (let i = 0; i < sections.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await loadSection(sections[i]);
        if (i === 0 && sampleRUM.enhance) {
          sampleRUM.enhance();
        }
      }
      resolve();
    })();
  });
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  import('./dataLayerImport.js');
  dataLayer.handleLoad();
  autolinkModals(doc);

  // Add feature toggle checks for header and footer
  if (!isFeatureToggled('hideHeader')) {
    loadHeader(doc.querySelector('header')).then((header) => {
      initFloatingElements(doc, header);
      enhanceIconAccessibility(header);
    });
  } else {
    // Add class to body when header is hidden to remove top padding
    doc.body.classList.add('header-hidden');
  }
  const main = doc.querySelector('main');
  loadSections(main).then(() => {
    initParallaxSections(main);
    const { hash } = window.location;
    const element = hash ? doc.getElementById(hash.substring(1)) : false;
    if (hash && element) element.scrollIntoView();

    if (!isFeatureToggled('hideFooter')) {
      loadFooter(doc.querySelector('footer')).then((footer) => {
        enhanceIconAccessibility(footer);
      });
    }

    dynamicBlocks(main);
    loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
    loadFonts();
    window.CookieUtil = CookieUtil;
    window.LocalStorageUtil = LocalStorageUtil;
    window.SessionStorageUtil = SessionStorageUtil;
    authRedirectionHandler.handleLoad();
    authentication.handleLoad();
  });
}

await loadLazy(document);

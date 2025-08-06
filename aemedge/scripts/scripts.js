import {
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateBlock,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  toCamelCase,
  toClassName,
  getMetadata,
  buildBlock,
  updateTitleAndMetaTags,
} from './aem.js';
import initFloatingElements from './alerts/alerts.js';
import { authentication, dataLayer } from './modules/index.js';
import dynamicBlocks from '../blocks/dynamic/index.js';
import { CookieUtil, LocalStorageUtil, SessionStorageUtil } from './utils/index.js';
import {
  checkDomain,
  createElement,
  isFeatureToggled,
  readBlockConfig,
} from './utils.js';

import createOptimizedPicture from './utils/picture.js';
import { appendQueryParams } from './utils/uri.js';

/**
 * if present add custom ID to blocks in a container element. (Override from aem.js)
 * @param {Element} main The container element
 */
function customIdToBlocks(block) {
  // customId
  let customIdValue = null;
  // eslint-disable-next-line no-restricted-syntax
  for (const childDiv of block.children) {
    if (childDiv.tagName === 'DIV') {
      const keyDiv = childDiv.querySelector('div > p');
      if (keyDiv && keyDiv.textContent.trim() === 'customId') {
        const valueDiv = keyDiv.parentElement.nextElementSibling;
        if (valueDiv) {
          const pElement = valueDiv.querySelector('p');
          if (pElement) {
            customIdValue = pElement.textContent.trim();
            break;
          }
        }
      }
    }
  }

  if (customIdValue) {
    block.setAttribute('id', customIdValue);
  }
}

/**
 * Decorates all blocks in a container element. (Override from aem.js)
 * @param {Element} main The container element
 */
function decorateBlocks(main) {
  const elementsToDecorate = main.querySelectorAll(
    'div.section > div:not(.layout) > div, div.section > div.layout > div > div > div',
  );
  elementsToDecorate.forEach(decorateBlock);
  elementsToDecorate.forEach(customIdToBlocks);
}

/**
 * Decorates all sections in a container element. (Override from aem.js)
 * @param {Element} main The container element
 */
function decorateSections(main) {
  main.querySelectorAll(':scope > div').forEach((section) => {
    const wrappers = [];
    let defaultContent = false;
    [...section.children].forEach((e) => {
      if (e.tagName === 'DIV' || !defaultContent) {
        const wrapper = document.createElement('div');
        wrappers.push(wrapper);
        defaultContent = e.tagName !== 'DIV';
        if (defaultContent) wrapper.classList.add('default-content-wrapper');
      }
      wrappers[wrappers.length - 1].append(e);
    });
    wrappers.forEach((wrapper) => section.append(wrapper));
    section.classList.add('section');
    section.dataset.sectionStatus = 'initialized';
    section.style.display = 'none';

    // Process section metadata
    const sectionMeta = section.querySelector('div.section-metadata');
    if (sectionMeta) {
      const meta = readBlockConfig(sectionMeta);
      const columns = [];
      Object.keys(meta).forEach((key) => {
        if (key === 'style') {
          const styles = meta.style
            .split(',')
            .filter((style) => style)
            .map((style) => toClassName(style.trim()));
          styles.forEach((style) => section.classList.add(style));
        } else if (key === 'layout') {
          const columnWidths = meta.layout
            .split('-')
            .filter((width) => width)
            .map((width) => toClassName(`w-${width.trim()}`));
          columnWidths.forEach((columnWidth) => {
            const column = document.createElement('div');
            column.classList.add(columnWidth);
            columns.push(column);
          });
        } else if (key === 'arrange') {
          const blocks = meta.arrange
            .split('-')
            .filter((numberOfBlocks) => numberOfBlocks)
            .map((numberOfBlocks) => parseInt(numberOfBlocks, 10));
          blocks.forEach((numberOfBlocks, colIndex) => {
            for (let i = 0; i < numberOfBlocks; i += 1) {
              const child = section.children.item(0);
              if (child && colIndex < columns.length) {
                columns[colIndex].append(child);
              }
            }
          });
          const container = document.createElement('div');
          container.classList.add('layout');
          columns.forEach((column) => {
            container.append(column);
          });
          section.append(container);
        } else {
          section.dataset[toCamelCase(key)] = meta[key];
        }
      });
      sectionMeta.parentNode.remove();
    }
  });
}

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
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
// eslint-disable-next-line no-unused-vars
function buildAutoBlocks(main) {
  try {
    // buildHeroBlock(main); // To support multiple variants of hero block, removing this auto block
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Add list of fragment folder paths where we can decorate fragments from
 */
const FRAGMENT_PATHS = [
  '/fragments/', // Phase 1
];

/**
 * Checks if the link points to a fragment path
 * @param {Element} link the link element
 * @returns {boolean} true if the link points to a fragment
 */
export function isFragmentLink(link) {
  const href = link.getAttribute('href');
  return href && FRAGMENT_PATHS.some((path) => href.includes(path));
}

function handleLoginRedirection(event, element) {
  const { authenticationData } = authentication;
  if (!authenticationData.isLoggedIn) {
    event.preventDefault();
    event.stopImmediatePropagation();
    authenticationData.login(
      element.getAttribute('href') === '#'
        ? window.location.href
        : element.href,
      element.target,
      '',
    );
  }
}

function handleRegistrationRedirection(event, element) {
  const { authenticationData } = authentication;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (!authenticationData.isLoggedIn) {
    const noActivationPrompt = element.getAttribute(
      'data-no-activation-prompt',
    );
    const targetLocation = noActivationPrompt
      ? window.location.href
      : element.href;
    authenticationData.registration(
      targetLocation,
      element.target,
      '',
      noActivationPrompt,
    );
  }
}

/**
 * Builds fragment blocks from links to fragments
 * @param {Element} main The container element
 */
export function buildFragmentBlocks(main) {
  main.querySelectorAll('a[href]').forEach((a) => {
    const url = new URL(a.href);
    const domainCheck = checkDomain(url);
    if (domainCheck.isKnown && isFragmentLink(a)) {
      const block = buildBlock('fragment', url.pathname);
      a.replaceWith(block);
      decorateBlock(block);
    }

    const isLogin = a.title.includes('[login]');
    if (isLogin) {
      a.title = a.title.replaceAll('[login]', '').trim();
      a.addEventListener('click', (event) => {
        handleLoginRedirection(event, a);
      }, { capture: true });
    }
    const isRegistration = a.title.includes('[registration]');
    if (isRegistration) {
      a.title = a.title.replaceAll('[registration]', '').trim();
      a.addEventListener('click', (event) => {
        handleRegistrationRedirection(event, a);
      }, { capture: true });
    }
  });
}

/**
 * Decorates external links to open in a new tab.
 * @param {Element} main The main element
 */
export function decorateExternalLinks(main) {
  const linkConfig = {
    domain: 'cmegroup.com',
    subdomains: [],
  };

  const domainRegex = new RegExp(`^https?:\\/\\/([^/]+\\.)?${linkConfig.domain.replace('.', '\\.')}(\\/|$)`);

  main.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href');
    if (href) {
      const extension = href.split('.').pop().trim();
      const isExternal = !href.startsWith('/') && !href.startsWith('#');
      const isPDF = extension === 'pdf';
      const isCMEGroup = domainRegex.test(href);
      const hasLinkOverride = a.querySelector('code') !== null;

      const isConfiguredPage = linkConfig.subdomains.some((subdomain) => href.startsWith(`https://${subdomain}.${linkConfig.domain}`));

      if (
        isPDF
        || (isExternal && !isCMEGroup)
        || (isCMEGroup && hasLinkOverride)
        || isConfiguredPage
      ) {
        a.setAttribute('target', '_blank');
      }
    }
  });
}

/**
 * Checks if an element is an external image.
 * @param {Element} element The element
 * @returns {boolean} Whether the element is an external image
 * @private
 */
function isExternalImage(element) {
  // if the element is not an anchor, it's not an external image
  if (element.tagName !== 'A') return false;
  // IMPLICIT via CME Group Delivery URLs or OOTB DMOpenAPI Delivery URLs
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?.*)?$/.test(element.getAttribute('href'));
}

/**
  * Decorates external images with a picture element
  * @param {Element} ele The element
  * @private
  * @example
  * decorateExternalImages(main, '//External Image//');
  */
function decorateExternalImages(ele) {
  const extImages = ele.querySelectorAll('a');
  extImages.forEach((extImage) => {
    if (isExternalImage(extImage)) {
      const extImageSrc = extImage.href;
      const extTitle = extImage.getAttribute('title');
      const extPicture = createOptimizedPicture(extImageSrc, extTitle);

      /* copy query params from link to img */
      const extImageUrl = new URL(extImageSrc);
      const { searchParams } = extImageUrl;
      extPicture.querySelectorAll('source, img').forEach((child) => {
        if (child.tagName === 'SOURCE') {
          const srcset = child.getAttribute('srcset');
          if (srcset) {
            child.setAttribute('srcset', appendQueryParams(new URL(srcset, extImageSrc), searchParams));
          }
        } else if (child.tagName === 'IMG') {
          const src = child.getAttribute('src');
          if (src) {
            child.setAttribute('src', appendQueryParams(new URL(src, extImageSrc), searchParams));
          }
        }
      });
      extImage.parentNode.replaceChild(extPicture, extImage);
    }
  });
}

function decorateSidebars(main) {
  const sections = main.querySelectorAll('.section');
  sections.forEach((section) => {
    const hasSidebar = section.querySelector('.sidebar');
    if (!hasSidebar) return;
    section.setAttribute('has-sidebar', 'true');

    // Group sidebars by type (left/right)
    const leftSidebars = [];
    const rightSidebars = [];
    const contentElements = [];

    // Categorize all direct children of the section
    Array.from(section.children).forEach((child) => {
      if (child.querySelector('.sidebar')) {
        if (child.querySelector('.sidebar.left')) {
          leftSidebars.push(child);
        } else if (child.querySelector('.sidebar.right')) {
          if (!isFeatureToggled('hideRightRail')) {
            rightSidebars.push(child);
          } else {
            child.remove();
          }
        }
      } else {
        // This is content (not a sidebar)
        contentElements.push(child);
      }
    });

    // Create a content wrapper for all non-sidebar content
    if (contentElements.length > 0) {
      const contentWrapper = createElement('div', { class: 'content-wrapper' });
      section.insertBefore(contentWrapper, contentElements[0]);
      contentElements.forEach((element) => {
        contentWrapper.appendChild(element);
      });
    }

    // Create containers for multiple sidebars of the same type if needed
    // Also, handles left sidebars empty edge case
    const leftContainer = createElement('div', { class: 'sidebars-multi left' });
    if (leftSidebars.length === 0) {
      const placeholder = createElement('div', { class: 'sidebar-wrapper' });
      leftContainer.appendChild(placeholder);
      section.prepend(leftContainer);
    } else if (leftSidebars.length > 0) {
      section.insertBefore(leftContainer, leftSidebars[0]);
      leftSidebars.forEach((sidebar) => {
        leftContainer.appendChild(sidebar);
      });
    }

    const rightContainer = createElement('div', { class: 'sidebars-multi right' });
    if (rightSidebars.length === 0) {
      const placeholder = createElement('div', { class: 'sidebar-wrapper' });
      rightContainer.appendChild(placeholder);
      section.prepend(rightContainer);
    } else if (rightSidebars.length > 0) {
      section.insertBefore(rightContainer, rightSidebars[0]);
      rightSidebars.forEach((sidebar) => {
        rightContainer.appendChild(sidebar);
      });
    }
  });
}

/**
 * Decorates images with lightbox functionality.
 * Add click handler directly lightboxed images to open the lightbox modal.
 * @param {Element} main The main element
 */
function decorateLightboxImages(main) {
  const pictures = main.querySelectorAll('picture');

  pictures.forEach((picture) => {
    // Only process pictures that are wrapped in <strong> tags
    const strongParent = picture.closest('strong');
    if (!strongParent) return;

    const img = picture.querySelector('img');
    if (!img) return;

    const source = picture.querySelector('source') || img;
    const srcset = source.getAttribute('srcset') || source.getAttribute('src');
    if (!srcset) return;

    const imageUrl = srcset.split(',')[0].split(' ')[0];

    // Create lightbox structure
    const wrapper = document.createElement('div');
    wrapper.className = 'lightbox-container';

    img.setAttribute('data-lightbox', imageUrl);
    img.classList.add('lightbox-image');

    const icon = document.createElement('span');
    icon.className = 'lightbox-expand-icon';
    icon.setAttribute('aria-hidden', 'true');

    // Wrap the picture element
    picture.parentNode.insertBefore(wrapper, picture);
    wrapper.appendChild(picture);
    wrapper.appendChild(icon);

    // Add click handler directly to image if not already done
    if (!img.hasAttribute('data-lightbox-ready')) {
      img.addEventListener('click', async (e) => {
        e.preventDefault();

        // eslint-disable-next-line import/no-cycle
        const { createModal } = await import('../blocks/modal/modal.js');

        const imageElement = document.createElement('img');
        imageElement.src = img.dataset.lightbox;
        imageElement.alt = img.alt || '';
        imageElement.className = 'lightbox-image-display';

        try {
          const modal = await createModal([imageElement]);
          const dialog = modal.block.querySelector('dialog');
          if (dialog) {
            dialog.classList.add('lightbox-modal');
            modal.showModal();
          }
        } catch (error) {
          // Lightbox modal creation failed, continue without lightbox functionality
        }
      });

      // Add flag to help prevent multiple click handlers from being added
      img.setAttribute('data-lightbox-ready', 'true');
    }
  });
}

/**
 * Decorates author's text highlights in the main element.
 * Author can select text to highlight via "inline code".
 * Author can set the highlight color in the section metadata via "text-highlight" property.
 *
 * The highlight color is determined by the data-text-highlight attribute on the outer section div.
 * <div class="section" data-section-status="loaded" data-text-highlight="bg-green" style="">
 * If the attribute is not present no decoration will be applied.
 *
 * Before:
 * <p>
 *   ...other text
 *   <code>
 *     PLACEHOLDER -> Text the content author highlighted here.
 *   </code>
 *   ... other text
 * </p>
 *
 * After:
 * <p>
 *   ...other text
 *   <code class="bg-green highlighted-text">
 *     PLACEHOLDER -> Text the content author highlighted here.
 *   </code>
 *   ... other text
 * </p>
 *
 * @param {Element} main The main element
 */
function decorateTextHighlights(main) {
  // Find <code> elements inside <p> elements within main
  const codeElements = main.querySelectorAll('p code');
  codeElements.forEach((codeEl) => {
    // For each code element, find the closest section and its desired highlight color
    const sectionDiv = codeEl.closest('.section');
    const highlightColor = sectionDiv ? sectionDiv.getAttribute('data-text-highlight') : null;

    if (highlightColor) {
      codeEl.classList.add(highlightColor, 'highlighted-text');
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  enhanceIconAccessibility();
  buildAutoBlocks(main);
  buildFragmentBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateExternalLinks(main);
  decorateExternalImages(main);
  decorateSidebars(main);
  decorateLightboxImages(main); // decorate-lightbox the bolded pictures of decorateExternalImages
  decorateTextHighlights(main);
}

/**
 * Loads template specific CSS and CSS without placing all code in global styles/scripts.
 */
export async function loadTemplate(doc, templateName) {
  try {
    const templateNameLower = templateName.toLowerCase();
    const cssLoaded = new Promise((resolve) => {
      loadCSS(
        `${window.hlx.codeBasePath}/templates/${templateNameLower}/${templateNameLower}.css`,
      )
        .then(resolve)
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error(
            `failed to load css module for ${templateNameLower}`,
            err.target.href,
          );
          resolve();
        });
    });
    const decorationComplete = new Promise((resolve) => {
      (async () => {
        try {
          const mod = await import(
            `../templates/${templateNameLower}/${templateNameLower}.js`
          );
          if (mod.default) {
            await mod.default(doc);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.log(`failed to load module for ${templateNameLower}`, error);
        }
        resolve();
      })();
    });

    document.body.classList.add(`${templateNameLower}-template`);

    await Promise.all([cssLoaded, decorationComplete]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`failed to load block ${templateName}`, error);
  }
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const templateName = getMetadata('template');
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    updateTitleAndMetaTags(document.title);

    if (templateName) {
      await loadTemplate(doc, templateName);
    }
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  import('./dataLayerImport.js');
  dataLayer.handleLoad();
  autolinkModals(doc);

  const main = doc.querySelector('main');
  await loadSections(main);
  initParallaxSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

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
  authentication.handleLoad();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

// enable live preview in da.live
(async function loadDa() {
  if (!new URL(window.location.href).searchParams.get('dapreview')) return;
  // eslint-disable-next-line import/no-unresolved
  import('https://da.live/scripts/dapreview.js').then(({ default: daPreview }) => daPreview(loadPage));
}());

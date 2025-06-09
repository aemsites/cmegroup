import {
  loadHeader,
  loadFooter,
  createOptimizedPicture as libCreateOptimizedPicture,
  decorateButtons,
  decorateIcons,
  decorateBlock,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  readBlockConfig,
  toCamelCase,
  toClassName,
  getMetadata,
  buildBlock,
} from './aem.js';
import initFloatingElements from './alerts/alerts.js';
import { authentication, dataLayer } from './modules/index.js';
import dynamicBlocks from '../blocks/dynamic/index.js';
import { CookieUtil, LocalStorageUtil, SessionStorageUtil } from './utils/index.js';
import { checkDomain } from './utils.js';

/**
 * Decorates all blocks in a container element. (Override from aem.js)
 * @param {Element} main The container element
 */
function decorateBlocks(main) {
  main.querySelectorAll('div.section > div:not(.layout) > div').forEach(decorateBlock);
  main.querySelectorAll('div.section > div.layout > div > div > div').forEach(decorateBlock);
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
  });
}

/**
 * Decorates external links to open in a new tab.
 * @param {Element} main The main element
 */
export function decorateExternalLinks(main) {
  main.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href');
    if (href) {
      const extension = href.split('.').pop().trim();
      const isExternal = !href.startsWith('/') && !href.startsWith('#');
      const isPDF = extension === 'pdf';
      const isCMEGroup = href.includes('cmegroup.com');
      const hasLinkOverride = a.querySelector('code') !== null;

      if (isPDF || (isExternal && !isCMEGroup) || (isCMEGroup && hasLinkOverride)) {
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
  return /https:\/\/www\.cmegroup\.com\/content\/dam\/|delivery-p\d+-e\d+\.adobeaemcloud\.com/.test(element.getAttribute('href'));
}

/*
  * Appends query params to a URL
  * @param {string} url The URL to append query params to
  * @param {object} params The query params to append
  * @returns {string} The URL with query params appended
  * @private
  * @example
  * appendQueryParams('https://example.com', { foo: 'bar' });
  * // returns 'https://example.com?foo=bar'
*/
function appendQueryParams(url, params) {
  const { searchParams } = url;
  params.forEach((value, key) => {
    searchParams.set(key, value);
  });
  url.search = searchParams.toString();
  return url.toString();
}

/**
 * Creates an optimized picture element for an image.
 * If the image is not an absolute URL, it will be passed to libCreateOptimizedPicture.
 * @param {string} src The image source URL
 * @param {string} alt The image alt text
 * @param {boolean} eager Whether to load the image eagerly
 * @param {object[]} breakpoints The breakpoints to use
 * @returns {Element} The picture element
 *
 */
export function createOptimizedPicture(src, alt = '', eager = false, breakpoints = [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }]) {
  const isAbsoluteUrl = /^https?:\/\//i.test(src);

  // Fallback to createOptimizedPicture if src is not an absolute URL
  if (!isAbsoluteUrl) return libCreateOptimizedPicture(src, alt, eager, breakpoints);

  const url = new URL(src);
  const picture = document.createElement('picture');
  const { pathname } = url;
  const ext = pathname.substring(pathname.lastIndexOf('.') + 1);

  // webp
  breakpoints.forEach((br) => {
    const source = document.createElement('source');
    if (br.media) source.setAttribute('media', br.media);
    source.setAttribute('type', 'image/webp');
    const searchParams = new URLSearchParams({ width: br.width, format: 'webply' });
    source.setAttribute('srcset', appendQueryParams(url, searchParams));
    picture.appendChild(source);
  });

  // fallback
  breakpoints.forEach((br, i) => {
    const searchParams = new URLSearchParams({ width: br.width, format: ext });

    if (i < breakpoints.length - 1) {
      const source = document.createElement('source');
      if (br.media) source.setAttribute('media', br.media);
      source.setAttribute('srcset', appendQueryParams(url, searchParams));
      picture.appendChild(source);
    } else {
      const img = document.createElement('img');
      img.setAttribute('loading', eager ? 'eager' : 'lazy');
      img.setAttribute('alt', alt);
      picture.appendChild(img);
      img.setAttribute('src', appendQueryParams(url, searchParams));
    }
  });

  return picture;
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
      const extImageSrc = extImage.getAttribute('href');
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

/**
 * Initialize lightbox functionality for a specific element
 */
function initializeLightboxForElement() {
  // Load lightbox CSS if not already loaded
  if (!document.querySelector('link[href*="cme-lightbox.css"]')) {
    loadCSS(`${window.hlx.codeBasePath}/styles/cme-lightbox.css`);
  }

  // Initialize lightbox JavaScript if not already loaded
  if (!window.cmeModals) {
    import(`${window.hlx.codeBasePath}/scripts/cme-lightbox.js`)
      .then(() => {
        console.log('Lightbox JS loaded and initialized');
      })
      .catch((error) => {
        console.error('Failed to load lightbox JS:', error);
      });
  } else if (window.cmeModals.addMagnifyIcons) {
    window.cmeModals.addMagnifyIcons();
  }
}

/**
 * Converts a picture element into a lightbox structure
 * @param {Element} strongParent The strong element wrapping the picture
 * @param {Element} picture The picture element to convert
 */
function addLightboxStructure(strongParent, picture) {
  // Extract image information
  const imgElement = picture.querySelector('img');
  if (!imgElement) return;

  const imageSrc = imgElement.src;
  const imageAlt = imgElement.alt || '';

  // Get high-res version by modifying URL parameters for larger width
  const imageUrl = new URL(imageSrc);
  imageUrl.searchParams.set('width', '2000');
  const highResSrc = imageUrl.toString();

  // Create the lightbox component structure
  const lightboxComponent = document.createElement('div');
  lightboxComponent.className = 'component react image loaded';
  lightboxComponent.setAttribute('data-is-edit', 'false');
  lightboxComponent.setAttribute('data-img-style', 'lightbox');
  lightboxComponent.setAttribute('data-img-border', 'false');
  lightboxComponent.setAttribute('data-img-src', highResSrc);
  lightboxComponent.setAttribute('data-img-alt', imageAlt);
  lightboxComponent.setAttribute('data-img-decorative', 'false');
  lightboxComponent.setAttribute('data-img-zoom-icon', 'default');
  lightboxComponent.setAttribute('data-slider', 'false');

  // Create figure element
  const figure = document.createElement('figure');
  figure.setAttribute('role', 'group');

  // Create clickable button
  const button = document.createElement('a');
  button.setAttribute('role', 'button');
  button.setAttribute('tabindex', '0');

  // Move the picture element into the button
  const pictureClone = picture.cloneNode(true);
  button.appendChild(pictureClone);

  // Add magnify icon
  const magnifyIcon = document.createElement('span');
  magnifyIcon.className = 'magnify-icon default';
  magnifyIcon.innerHTML = '\ue901'; // CMEGroup-Icons magnify/search icon
  button.appendChild(magnifyIcon);

  // Assemble the structure
  figure.appendChild(button);
  lightboxComponent.appendChild(figure);

  // Replace the strong element with the new lightbox structure
  strongParent.parentNode.replaceChild(lightboxComponent, strongParent);

  // Initialize lightbox functionality for this new element
  initializeLightboxForElement();
}

/**
 * Decorates author bolded external images with lightbox functionality by converting those picture
 * elements wrapped in <strong> tags into interactive lightbox components.
 *
 * Search for picture elements within the main content area and
 * checks if they are wrapped in <strong> tags. When found, convert them
 * into a complete lightbox component structure.
 *
 * @param {Element} main - The main content element to search for lightbox images
 *
 * @example
 * // Before: Picture wrapped in strong tag
 * // <strong><picture><img src="image.jpg" alt="Description"></picture></strong>
 *
 * // After: Complete lightbox component
 * // <div class="component react image loaded" data-img-style="lightbox"
 * //   data-img-src="image.jpg?width=2000">
 * //   <figure role="group">
 * //     <a role="button" tabindex="0">
 * //       <picture><img src="image.jpg" alt="Description"></picture>
 * //       <span class="magnify-icon default">🔍</span>
 * //     </a>
 * //   </figure>
 * // </div>
 *
 * @see {@link addLightboxStructure} - Helper function that creates the lightbox structure
 * @see {@link initializeLightboxForElement} - Helper function that loads lightbox functionality
 */
function decorateLightboxImages(main) {
  // Find picture elements that might need to be lightboxed
  const lightboxImages = main.querySelectorAll('picture');
  lightboxImages.forEach((image) => {
    // If any picture is wrapped in <strong> tags, then the picture should be lightboxed
    const strongParent = image.closest('strong');
    if (strongParent) {
      addLightboxStructure(strongParent, image);
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
  buildAutoBlocks(main);
  buildFragmentBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateExternalLinks(main);
  // decorate external images
  decorateExternalImages(main);
  decorateLightboxImages(main); // decorate-lightbox the bolded pictures of decorateExternalImages
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

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header')).then((header) => initFloatingElements(doc, header));
  loadFooter(doc.querySelector('footer'));
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

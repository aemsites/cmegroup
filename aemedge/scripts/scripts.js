import {
  decorateIcons,
  decorateBlock,
  decorateTemplateAndTheme,
  loadCSS,
  toCamelCase,
  toClassName,
  getMetadata,
  buildBlock,
  updateTitleAndMetaTags,
  loadSection,
} from './aem.js';
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
  import('./modules/Authentication.js').then(({ authentication }) => {
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
  });
}

function handleRegistrationRedirection(event, element) {
  import('./modules/Authentication.js').then(({ authentication }) => {
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
  });
}

function handleOneClickForm(event, element) {
  import('./modules/Authentication.js').then(({ authentication }) => {
    const { authenticationData } = authentication;
    event.preventDefault();
    if (!authenticationData.isLoggedIn) {
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 30);
      window.CookieUtil?.set(
        'oneClickFormCookie',
        {
          location: element.href,
          formId: element.closest('[form-id]')?.getAttribute('form-id'),
        },
        {
          expires,
        },
      );
      //  noActivationPrompt used in registration url
      element.setAttribute('data-no-activation-prompt', 'true');
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
    if (strongParent.querySelector('em')) {
      strongParent.closest('p').classList.add('center-img');
    }

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
 * Decorates Headings
*/
function decorateHeadings(main) {
  const headings = main.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach((heading) => {
    const text = heading.textContent;
    const modifierMatch = text.match(/\[([^\]]+)\]/);
    if (modifierMatch) {
      heading.classList.add(modifierMatch[1]);
      heading.innerHTML = heading.innerHTML.replace(modifierMatch[0], '');
    }
  });
}

/**
  * Create and styles links and buttons
  * Builds fragment blocks from links to fragments
  * @param {Element} main The container element
  */
export function decorateButtons(element) {
  element.querySelectorAll('a[href]').forEach((a) => {
    const text = a.textContent;
    const url = new URL(a.href);
    const domainCheck = checkDomain(url);
    const oneCLickRegex = /\[[^\]]*\bone-click\b[^\]]*\]/i;
    const loginRegex = /\[[^\]]*\blogin\b[^\]]*\]/i;
    const registrationRegex = /\[[^\]]*\bregistration\b[^\]]*\]/i;
    const isOneClick = oneCLickRegex.test(a.textContent);
    const isLogin = loginRegex.test(a.textContent);
    const isRegistration = registrationRegex.test(a.textContent);
    let textIndex = -1;
    let iconIndex = -1;

    // Button decoration
    if (a.href !== text && !a.querySelector('img')) {
      const up = a.parentElement || null;
      const twoup = up?.parentElement || null;

      if (up?.childNodes.length === 1 && (up.tagName === 'P' || up.tagName === 'DIV')) {
        up.classList.add('button-container');
      }

      if (
        up?.childNodes.length === 1
        && up.tagName === 'STRONG'
        && twoup?.childNodes.length === 1
        && (twoup.tagName === 'P' || twoup.tagName === 'DIV')
      ) {
        a.className = 'button primary';
        twoup.classList.add('button-container');
      }

      if (
        up?.childNodes.length === 1
        && up.tagName === 'EM'
        && twoup?.childNodes.length === 1
        && (twoup.tagName === 'P' || twoup.tagName === 'DIV')
      ) {
        a.className = 'button secondary';
        twoup.classList.add('button-container');
      }

      // Add classes from brackets text
      Array.from(a.childNodes).forEach((node, index) => {
        if (node.nodeType === Node.TEXT_NODE) {
          let nodeText = node.textContent;
          const bracketMatch = nodeText.match(/\[([^\]]+)\]/);

          if (bracketMatch) {
            const classes = bracketMatch[1]
              .split(',')
              .map((value) => value.trim())
              .filter((value) => value.toLowerCase() !== 'one-click'
                && value.toLowerCase() !== 'login'
                && value.toLowerCase() !== 'registration');

            if (classes.length > 0) {
              a.classList.add(...classes);
            }

            nodeText = nodeText.replace(/\s*\[[^\]]*\]/, '');
            node.textContent = nodeText;
          }

          if (textIndex === -1 && text.trim() !== '') {
            textIndex = index;
          }
        }

        if (iconIndex === -1 && node.nodeType === Node.ELEMENT_NODE && node.matches('.icon')) {
          iconIndex = index;
        }
      });

      // Add class for spacing between text and icon
      if (iconIndex !== -1 && textIndex !== -1) {
        if (iconIndex < textIndex) {
          a.classList.add('position-left');
        } else if (iconIndex > textIndex) {
          a.classList.add('position-right');
        }
      }
    }

    // Login/Register/OneClick handling
    if (isOneClick) {
      a.addEventListener('click', (event) => {
        handleOneClickForm(event, a);
      }, { capture: true });
    }
    if (isLogin) {
      a.addEventListener('click', (event) => {
        handleLoginRedirection(event, a);
      }, { capture: true });
    }

    if (isRegistration) {
      a.addEventListener('click', (event) => {
        handleRegistrationRedirection(event, a);
      }, { capture: true });
    }

    if (domainCheck.isKnown && isFragmentLink(a)) {
      const block = buildBlock('fragment', url.pathname);
      a.replaceWith(block);
      decorateBlock(block);
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
  decorateHeadings(main);
  decorateIcons(main);
  enhanceIconAccessibility();
  buildAutoBlocks(main);
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

async function waitForFirstImage(section) {
  const lcpCandidate = section.querySelector('img:not([data-icon-name])');
  await new Promise((resolve) => {
    if (lcpCandidate && !lcpCandidate.complete) {
      lcpCandidate.setAttribute('loading', 'eager');
      lcpCandidate.setAttribute('fetchpriority', 'high');
      lcpCandidate.addEventListener('load', resolve);
      lcpCandidate.addEventListener('error', resolve);
    } else {
      resolve();
    }
  });
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

    document.body.classList.add('appear');

    const templatePromise = templateName ? loadTemplate(doc, templateName) : Promise.resolve();
    await loadSection(main.querySelector('.section'), async (section) => Promise.all([templatePromise, waitForFirstImage(section)]));
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
 */
async function loadLazy() {
  await import('./lazy.js');
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
  await loadLazy();
  loadDelayed();
}

loadPage();

async function loadPageDa() {
  await loadEager(document);
  const lazy = await import('./lazy.js');
  await lazy.default(document);
  window.setTimeout(async () => {
    const delayed = await import('./delayed.js');
    delayed.default();
  }, 3000);
}

// enable live preview in da.live
(async function loadDa() {
  if (!new URL(window.location.href).searchParams.get('dapreview')) return;
  // eslint-disable-next-line import/no-unresolved
  import('https://da.live/scripts/dapreview.js').then(({ default: daPreview }) => daPreview(loadPageDa));
}());

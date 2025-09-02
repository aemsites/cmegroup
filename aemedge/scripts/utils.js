/* eslint-disable import/prefer-default-export */
import {
  loadCSS,
  getMetadata,
  toCamelCase,
  toClassName,
  buildBlock,
  decorateBlock,
  loadBlock,
} from './aem.js';
import ffetch from './ffetch.js';

/**
 * Language
 */
function getCurrentLang() {
  return getMetadata('locale');
}

function getDefaultLang() {
  return 'en';
}

function getCurrentLangInWords() {
  const LANGUAGE_MAP = {
    en: 'English',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    it: 'Italian',
    he: 'עברית',
    ko: '한국어',
    nl: 'Dutch',
    'cn-s': '中文(简体)',
    'cn-t': '中文(繁體)',
    pt: 'Português',
    ar: 'العربية',
  };
  const locale = getCurrentLang();
  return LANGUAGE_MAP[locale] || 'English';
}

/**
 * Taxonomy
 */
const taxonomyEndpoint = '/eds-config/taxonomy.json?sheet=tags';
let taxonomyPromise = null;

function fetchTaxonomy() {
  if (!taxonomyPromise) {
    taxonomyPromise = new Promise((resolve, reject) => {
      (async () => {
        try {
          const taxonomyJson = await ffetch(`${taxonomyEndpoint}`).all();
          const taxonomy = {};
          const currentLang = getCurrentLang();
          const defaultLang = getDefaultLang();
          taxonomyJson.forEach((row) => {
            taxonomy[row.tag] = {
              tag: row.tag,
              title: row[currentLang] || row[defaultLang],
              path: row.path,
            };
          });
          resolve(taxonomy);
        } catch (e) {
          reject(e);
        }
      })();
    });
  }
  return taxonomyPromise;
}

/**
 * Translations
 */
const translationsEndpoint = '/eds-config/translations.json';
let translationsPromise = null;

function fetchTranslations() {
  if (!translationsPromise) {
    translationsPromise = new Promise((resolve, reject) => {
      (async () => {
        try {
          const currentLang = getCurrentLang();
          const defaultLang = getDefaultLang();
          const translationsJson = await ffetch(`${translationsEndpoint}?sheet=${currentLang || defaultLang}`).all();
          const translations = {};
          translationsJson.forEach((row) => {
            translations[row.k] = row.v;
          });
          resolve(translations);
        } catch (e) {
          reject(e);
        }
      })();
    });
  }
  return translationsPromise;
}

const scriptsCache = new Map();

/**
 * Loads a non module JS file.
 * @param {string} src URL to the JS file
 * @param {Object} attrs additional optional attributes
 */
async function loadScript(src, attrs) {
  if (scriptsCache.has(src)) {
    return scriptsCache.get(src);
  }
  const promise = new Promise((resolve, reject) => {
    if (!document.querySelector(`head > script[src="${src}"]`)) {
      const script = document.createElement('script');
      script.src = src;
      if (attrs) {
        // eslint-disable-next-line no-restricted-syntax, guard-for-in
        for (const attr in attrs) {
          script.setAttribute(attr, attrs[attr]);
        }
      }
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    } else {
      resolve();
    }
  });
  scriptsCache.set(src, promise);
  return promise;
}

/**
 * Creates a new HTML element
 */
const svgNamespace = 'http://www.w3.org/2000/svg';
const svgElements = ['svg', 'circle', 'path', 'text', 'line'];

function createElement(tagName, attributes, ...children) {
  const isSvg = svgElements.includes(tagName);
  const el = isSvg
    ? document.createElementNS(svgNamespace, tagName)
    : document.createElement(tagName);
  if (attributes) {
    Object.keys(attributes).forEach((name) => {
      el.setAttribute(name, attributes[name]);
    });
  }
  children.forEach((child) => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (Array.isArray(child)) {
      child.forEach((c) => el.appendChild(c));
    } else if (child) {
      el.appendChild(child);
    }
  });
  return el;
}

/**
 * Returns the tag information from a tagname
 * @param {string} tagName
 * @returns {Promise} Object containing tag data or empty object if not exists
 * @property {string} title - The tag title
 * @property {string} tag - Tag path
 */
function getTag(tagFullName) {
  return fetchTaxonomy().then((taxonomy) => taxonomy[tagFullName]);
}

/**
 * Returns the tag information from a tagname
 * @param {string} label to translate
 * @returns {Promise} Object containing the value of the translation or the key if not present
 */
function i18n(key) {
  return fetchTranslations().then((translations) => translations[key] || key);
}

/**
 * Retrieves article-related metadata from the page
 * @returns {Object} Object containing article metadata
 * @property {string} template - The template type
 * @property {string} subTemplates - The sub-templates
 * @property {string} readTime - Estimated reading time
 * @property {string} author - Article author
 * @property {string} tag - Article tag
 * @property {string} date - Article publication date
 */
async function getArticleRelatedMetadata() {
  const template = getMetadata('template');
  const subTemplates = getMetadata('sub-template')?.split(' ');
  const readTime = getMetadata('read-time');
  const author = getMetadata('author');
  const primaryTopic = getMetadata('primary-topic');
  const date = getMetadata('date');

  // Handle both single and multiple authors
  const getAuthors = async (authorString) => {
    if (!authorString) return null;
    const authors = authorString.split(',').map((a) => a.trim());
    const tags = await Promise.all(authors.map((a) => getTag(a)));
    return tags;
  };

  const [authorResult, primaryTopicTag] = await Promise.all([
    getAuthors(author),
    getTag(primaryTopic),
  ]);

  return {
    template,
    subTemplates,
    readTime,
    author: authorResult,
    primaryTopic: primaryTopicTag?.title,
    date,
  };
}

/**
 * Retrieves tags from the page
 * @returns {Object} Object containing article metadata
 */
async function getPageTags() {
  let metadataTags = getMetadata('article:tag');
  const authorTags = getMetadata('author');
  if (authorTags) {
    const metadataArray = metadataTags.split(',').map((tag) => tag.trim());
    const authorArray = authorTags.split(',').map((tag) => tag.trim());
    const allTagsSet = new Set([...metadataArray, ...authorArray]);
    metadataTags = [...allTagsSet].join(', ');
  }
  if (!metadataTags || metadataTags.trim() === '') {
    return [];
  }
  const mapTag = async (tagName) => {
    const finalName = tagName.trim();
    if (!finalName) {
      return null;
    }
    const tag = await getTag(finalName);
    return {
      name: finalName,
      title: tag ? tag.title : '',
    };
  };
  const tags = await Promise.all(metadataTags.split(',').map(mapTag));
  return tags;
}

/**
 * Adds a horizontal divider line at the end of an element
 * @param {HTMLElement} element - The element to add the divider line to
 */
function addDividerLine(element, isBottom = true) {
  const hr = createElement('hr');
  const divider = createElement('div', { class: 'block-divider-line' }, hr);
  if (isBottom) {
    element.appendChild(divider);
  } else {
    element.prepend(divider);
  }
}

/**
 * Random Id generation
 */
function generateRandomId() {
  return Math.random().toString(36).slice(-8);
}

async function parseTime(time) {
  if (!time || !/^[0-9]+:[0-9]+$/.test(time)) {
    return '';
  }
  const [
    hrLabel,
    minLabel,
  ] = await Promise.all([
    i18n('Hr'),
    i18n('Min'),
  ]);
  const [hrStr, minStr] = time.split(':');
  const minutes = parseInt(minStr, 10);
  const hours = parseInt(hrStr, 10);
  if (hours > 0) {
    return `${hours} ${hrLabel}${minutes ? ` ${minutes} ${minLabel}` : ''}`;
  }
  return `${minutes} ${minLabel}`;
}

async function getReadTimeLabel(subTemplates) {
  if (!subTemplates || subTemplates.length === 0) {
    return '';
  }
  const [
    readLabel,
    watchLabel,
    listenLabel,
  ] = await Promise.all([
    i18n('Read'),
    i18n('Watch'),
    i18n('Listen'),
  ]);
  if (subTemplates.includes('text')) {
    return readLabel;
  }
  if (subTemplates.includes('video')) {
    return watchLabel;
  }
  if (subTemplates.includes('podcast')) {
    return listenLabel;
  }
  return '';
}

function getReadTimeIcon(subTemplates) {
  if (!subTemplates || subTemplates.length === 0) {
    return '';
  }
  let readIconName = '';
  if (subTemplates.includes('text')) {
    readIconName = 'list';
  }
  if (subTemplates.includes('video')) {
    readIconName = 'play';
  }
  if (subTemplates.includes('podcast')) {
    readIconName = 'audio';
  }
  const readIcon = createElement('img', {
    src: `/aemedge/icons/${readIconName}.svg`,
    alt: 'Read Time',
    loading: 'lazy',
  });
  const readIconSpan = createElement('span', { class: `icon icon-${readIconName}` }, readIcon);
  return readIconSpan;
}

function getBrowserName() {
  const { userAgent } = navigator;

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg') && !userAgent.includes('OPR')) {
    return 'chrome';
  } if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'safari';
  } if (userAgent.includes('Firefox')) {
    return 'firefox';
  } if (userAgent.includes('Edg')) {
    return 'edge';
  } if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
    return 'opera';
  } if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
    return 'internet explorer';
  }
  return '';
}

function isDateBefore(date1, date2) {
  let d1;
  let d2;

  try {
    d1 = date1 instanceof Date ? date1 : new Date(date1);
    d2 = date2 instanceof Date ? date2 : new Date(date2);
  } catch (error) {
    return false;
  }

  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) {
    return false;
  }

  return d1 < d2;
}

function decodeHtmlEntities(str) {
  const doc = new DOMParser().parseFromString(str, 'text/html');
  return doc.documentElement.textContent;
}

let sliderPromise = null;

/**
 * Builds a slider. See:
 * https://nickpiscitelli.github.io/Glider.js/
 *
 * @param {*} el HTML parent element
 * @param {*} config Glider configuration
 * @param {*} includeArrows boolean, if true, arrows are included for navigation
 */
function buildSlider(
  el,
  config,
  includeArrows = true,
  disableOnDesktop = false,
  inverse = false,
  responsiveSlider = false,
) {
  if (!sliderPromise) {
    sliderPromise = loadScript('/aemedge/scripts/third-party/glider/glider.min.js');
    loadCSS('/aemedge/scripts/third-party/glider/glider.min.css');
  }

  sliderPromise.then(() => {
    let gliderInstance = null;
    let currentEl = el;
    let prevClass;
    let nextClass;

    const createArrows = () => {
      const parent = currentEl.parentElement;
      const uniqueId = `glider-${generateRandomId()}`;
      const prevImg = createElement('img', { 'data-icon-name': 'chevron-left', src: '/aemedge/icons/chevron-left.svg' });
      const nextImg = createElement('img', { 'data-icon-name': 'chevron-right', src: '/aemedge/icons/chevron-right.svg' });
      prevClass = `glider-prev-${uniqueId}`;
      nextClass = `glider-next-${uniqueId}`;
      const prev = createElement('button', { 'aria-label': 'Previous', class: `glider-prev ${prevClass}` }, prevImg);
      const next = createElement('button', { 'aria-label': 'Next', class: `glider-next ${nextClass} ${inverse && 'inverse'}` }, nextImg);
      parent.append(prev);
      parent.append(next);
      parent.classList.add('glider-contain');
    };

    const initSlider = () => {
      if (!gliderInstance && currentEl) {
        if (includeArrows) {
          createArrows();
          config.arrows = {
            prev: `.${prevClass}`,
            next: `.${nextClass}`,
          };
        }
        // eslint-disable-next-line no-new, no-undef
        gliderInstance = new Glider(currentEl, config);
      }
    };

    const destroySlider = () => {
      if (gliderInstance) {
        try {
          if (gliderInstance.ele?.parentNode) {
            const original = gliderInstance.ele;
            const clone = original.cloneNode(true);
            if (!config.skipTrack && clone.children[0]) {
              clone.children[0].outerHTML = clone.children[0].innerHTML;
            }
            const cleanElement = (node) => {
              node.removeAttribute('style');
              [...node.classList].forEach((cls) => {
                if (/^glider/.test(cls)) node.classList.remove(cls);
              });
            };
            cleanElement(clone);
            [...clone.getElementsByTagName('*')].forEach(cleanElement);
            original.parentNode.replaceChild(clone, original);
            currentEl = clone;
          }

          const prevBtn = document.querySelector(`.${prevClass}`);
          const nextBtn = document.querySelector(`.${nextClass}`);
          prevBtn?.remove();
          nextBtn?.remove();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log('Error destroying slider:', err);
        }
        gliderInstance = null;
      }
    };

    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const childCount = currentEl.querySelectorAll('li').length;

      let shouldEnableSlider = true;

      if (disableOnDesktop && windowWidth >= 769) {
        shouldEnableSlider = false;
      } else if (responsiveSlider) {
        if (
          (childCount <= 2 && windowWidth >= 769)
          || (childCount <= 3 && windowWidth >= 860)
          || (childCount <= 4 && windowWidth >= 1139)
          || (childCount <= 5 && windowWidth >= 1436)
        ) {
          shouldEnableSlider = false;
        }
      }

      if (shouldEnableSlider) {
        initSlider();
      } else {
        destroySlider();
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
  });
}

export const PRODUCTION_DOMAINS = ['cmegroup.com', 'beta.cmegroup.com'];
const domainCheckCache = {};

/**
 * Checks a url to determine if it is a known domain and categorizes it based on domain type.
 * Uses a cache to avoid repeated checks for the same hostname.
 *
 * @param {string | URL} url - The url to check, can be a string or URL object
 * @returns {Object} Domain categorization with properties:
 *   - isProd {boolean} - True for production domains (cmegroup.com, beta.cmegroup.com)
 *   - isAEM {boolean} - True for AEM domains (contains aem.page or aem.live)
 *   - isLocal {boolean} - True for localhost
 *   - isPreview {boolean} - True for localhost or aem.page domains
 *   - isKnown {boolean} - True if domain is production, AEM, or local
 *   - isExternal {boolean} - True if domain is not recognized as known
 */
function checkDomain(url) {
  const urlToCheck = typeof url === 'string' ? new URL(url) : url;

  let result = domainCheckCache[urlToCheck.hostname];
  if (!result) {
    const isProd = PRODUCTION_DOMAINS.some((host) => urlToCheck.hostname.includes(host));
    const isAEM = ['aem.page', 'aem.live'].some((host) => urlToCheck.hostname.includes(host));
    const isLocal = urlToCheck.hostname.includes('localhost');
    const isPreview = isLocal || urlToCheck.hostname.includes('aem.page');
    const isKnown = isProd || isAEM || isLocal;
    const isExternal = !isKnown;
    result = {
      isProd,
      isAEM,
      isLocal,
      isKnown,
      isExternal,
      isPreview,
    };

    domainCheckCache[urlToCheck.hostname] = result;
  }

  return result;
}

/**
 * Checks if a feature toggle is enabled via query parameter or is in iframe.
 *
 * @param {string} toggleName - The name of the toggle to check
 * @param {string} expectedValue - The expected value (defaults to 'y')
 * @param {boolean} ignoreIframe - ignores if the page is in iframe
 * @returns {boolean} - True if the toggle is enabled, false otherwise
 *
 * @example
 * // Check if course nav should be hidden
 * if (isFeatureToggled('hideCourseNav')) {
 *   // Hide course navigation
 * }
 *
 * // Check for custom value
 * if (isFeatureToggled('debugMode', 'true')) {
 *   // Enable debug mode
 * }
 */
function isFeatureToggled(toggleName, expectedValue = 'y', ignoreIframe = false) {
  return (!ignoreIframe && window.self !== window.top)
    || new URLSearchParams(window.location.search).get(toggleName) === expectedValue;
}

/**
 * Extracts the config from a block.
 * @param {Element} block The block element
 * @returns {object} The block config
 */
function readBlockConfig(block, keysToCamelCase = false) {
  const config = {};
  block.querySelectorAll(':scope > div').forEach((row) => {
    if (row.children) {
      const cols = [...row.children];
      if (cols[1]) {
        const col = cols[1];
        const name = keysToCamelCase
          ? toCamelCase(cols[0].textContent) : toClassName(cols[0].textContent);
        let value = '';
        if (col.querySelector('a')) {
          const as = [...col.querySelectorAll('a')];
          if (as.length === 1) {
            value = as[0].href;
          } else {
            value = as.map((a) => a.href);
          }
        } else if (col.querySelector('img')) {
          const imgs = [...col.querySelectorAll('img')];
          if (imgs.length === 1) {
            value = imgs[0].src;
          } else {
            value = imgs.map((img) => img.src);
          }
        } else if (col.querySelector('p')) {
          const ps = [...col.querySelectorAll('p')];
          if (ps.length === 1) {
            value = ps[0].textContent;
          } else {
            value = ps.map((p) => p.textContent);
          }
        } else value = row.children[1].textContent;
        config[name] = value;
      }
    }
  });
  return config;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function toStartCase(str) {
  return str.split(/[\s-_]+/).map(capitalize).join(' ');
}

/**
 * Setup the clientlibs for dayjs library
 */
async function setupDayjsLibs() {
  await Promise.all([
    loadScript('/aemedge/scripts/third-party/dayjs/dayjs.min.js'),
    loadScript('/aemedge/scripts/third-party/dayjs/utc.js'),
    loadScript('/aemedge/scripts/third-party/dayjs/timezone.js'),
    loadScript('/aemedge/scripts/third-party/dayjs/advancedFormat.js'),
  ]);
  /* eslint-disable no-undef */
  dayjs.extend(dayjs_plugin_utc);
  dayjs.extend(dayjs_plugin_timezone);
  dayjs.extend(dayjs_plugin_advancedFormat);
  /* eslint-enable no-undef */
}

/**
 * Returns a Dayjs object with the datetime set to CDT
 */
function getCdtDate(date) {
  return dayjs.utc(date).tz('America/Chicago');
}

function getCountryCode() {
  const { locale } = Intl.DateTimeFormat().resolvedOptions();
  return new Intl.Locale(locale)?.region || '';
}

/**
 * Preserves hideXXX query parameters for internal links
 * @param {Element} main The main element
 */
function preserveHideParameters(main) {
  const currentUrl = new URL(window.location.href);
  const hideParams = new Map();

  // Extract all hideXXX parameters from current URL
  currentUrl.searchParams.forEach((value, key) => {
    if (key.startsWith('hide') && value) {
      hideParams.set(key, value);
    }
  });

  // If no hide parameters, nothing to preserve
  if (hideParams.size === 0) return;

  main.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (href) {
      const isInternal = href.startsWith('/') || href.startsWith('#') || href.startsWith('?');
      const isAnchorOnly = href.startsWith('#');

      // Only process internal links that aren't just anchor links
      if (isInternal && !isAnchorOnly) {
        try {
          const linkUrl = new URL(href, window.location.origin);

          // Add hide parameters that don't already exist
          hideParams.forEach((value, key) => {
            if (!linkUrl.searchParams.has(key)) {
              linkUrl.searchParams.set(key, value);
            }
          });

          // Update the href with preserved parameters
          const newHref = linkUrl.pathname + linkUrl.search + linkUrl.hash;
          link.setAttribute('href', newHref);
        } catch (error) {
          // Skip malformed URLs
        }
      }
    }
  });
}

function showTooltip(parent, content, hideAfter) {
  let tooltip = parent.querySelector('.tooltip');
  if (tooltip) {
    tooltip.remove();
  }
  tooltip = createElement('div', { class: 'tooltip-content' }, content);
  const tooltipContainer = createElement('div', { class: 'tooltip' }, tooltip);
  parent.append(tooltipContainer);
  if (hideAfter) {
    setTimeout(() => { tooltip.remove(); }, hideAfter);
  }
}

function closeAuthToast(toast) {
  toast.classList.remove('fade-in');
  toast.classList.add('fade-out');
  setTimeout(() => { toast.remove(); }, 2000);
}

function showAuthToast(message, type, fade) {
  const main = document.querySelector('main');
  const toastClasses = {
    success: 'alert-success',
    warning: 'alert-warning',
    error: 'alert-error',
  };
  const authToastBox = createElement('div', { class: 'auth-toast-box fadeIn' });
  authToastBox.classList.add(toastClasses[type]);
  const alertIcon = createElement('div', { class: 'alert-icon' });
  const icon = createElement('i', { class: type === 'success' ? 'icon-check' : 'icon-attention-triangle' });
  alertIcon.appendChild(icon);
  const alertHeading = createElement('div', { class: 'alert-heading' });
  alertHeading.append(message);
  const alertClose = createElement('button', { class: 'alert-close' });
  const iconClose = createElement('i', { class: 'icon-close' });
  alertClose.appendChild(iconClose);
  alertClose.addEventListener('click', async () => {
    closeAuthToast(authToastBox);
  });
  authToastBox.appendChild(alertIcon);
  authToastBox.appendChild(alertHeading);
  authToastBox.appendChild(alertClose);
  main.appendChild(authToastBox);
  if (fade) {
    setTimeout(() => { closeAuthToast(authToastBox); }, 5000);
  }
}

/**
 * Appends a fragment block to the main element
 * @param {string} fragmentUrl - The fragment URL to load
 */
async function addFragmentBlock(fragmentUrl) {
  const main = document.querySelector('main');
  if (!main) return;

  const fragmentLink = createElement('a', { href: fragmentUrl }, fragmentUrl);
  const fragmentBlock = buildBlock('fragment', [[fragmentLink]]);
  main.appendChild(fragmentBlock);
  decorateBlock(fragmentBlock);
  await loadBlock(fragmentBlock);
}

export {
  loadScript,
  createElement,
  getArticleRelatedMetadata,
  addDividerLine,
  parseTime,
  getReadTimeLabel,
  getReadTimeIcon,
  getTag,
  i18n,
  getPageTags,
  getBrowserName,
  isDateBefore,
  getCurrentLangInWords,
  decodeHtmlEntities,
  checkDomain,
  buildSlider,
  generateRandomId,
  isFeatureToggled,
  readBlockConfig,
  toStartCase,
  setupDayjsLibs,
  getCdtDate,
  getCountryCode,
  preserveHideParameters,
  showTooltip,
  showAuthToast,
  addFragmentBlock,
};

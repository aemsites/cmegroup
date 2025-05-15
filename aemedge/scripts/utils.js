/* eslint-disable import/prefer-default-export */
import { loadScript, loadCSS, getMetadata } from './aem.js';
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

/**
 * Creates a new HTML element
 */
function createElement(tagName, attributes, ...children) {
  const el = document.createElement(tagName);
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
 * @property {string} readTime - Estimated reading time
 * @property {string} author - Article author
 * @property {string} tag - Article tag
 * @property {string} date - Article publication date
 */
async function getArticleRelatedMetadata() {
  const template = getMetadata('template');
  const readTime = getMetadata('read-time');
  const author = getMetadata('author');
  const primaryTopic = getMetadata('primary-topic');
  const date = getMetadata('date');

  const [authorTag, primaryTopicTag] = await Promise.all([getTag(author), getTag(primaryTopic)]);

  return {
    template,
    readTime,
    author: authorTag.title,
    primaryTopic: primaryTopicTag.title,
    date,
  };
}

/**
 * Retrieves tags from the page
 * @returns {Object} Object containing article metadata
 */
async function getPageTags() {
  const metadataTags = getMetadata('article:tag');
  const mapTag = async (tagName) => {
    const finalName = tagName.trim();
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
function addDividerLine(element) {
  const hr = createElement('hr');
  const divider = createElement('div', { class: 'block-divider-line' }, hr);
  element.appendChild(divider);
}

function parseTime(time) {
  if (!time) {
    return '';
  }
  const [minStr, secStr] = time.split(':');
  const seconds = parseInt(secStr, 10);
  let minutes = parseInt(minStr, 10);

  if (minutes === 0) {
    minutes = 1;
  } else if (seconds > 30) {
    minutes += 1;
  }

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} Hr${mins ? ` ${mins} Min` : ''}`;
  }
  return `${minutes} Min`;
}

function formatDate(dateString, includeYear = false) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = includeYear ? ` ${date.getFullYear()}` : '';
  return `${day} ${month}${year}`;
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

function getEnvType() {
  const prodEnvs = [
    'cmegroup.com',
    'www.cmegroup.com',
    'main--cmegroup--aemsites.aem.page',
    'main--cmegroup--aemsites.aem.live',
  ];
  const type = prodEnvs.includes(window.location.hostname) ? 'prod' : 'stage';
  return type;
}

function urlByEnvType() {
  return `https://${getEnvType() !== 'prod' ? 'beta' : 'www'}.cmegroup.com`;
}

function formatToCentralTime(utcDateString, lastUpdatedFormat, showCT = true, getParts = []) {
  const utcDate = new Date(utcDateString);
  const options = {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(utcDate);
  const day = parts.find((p) => p.type === 'day').value;
  const month = parts.find((p) => p.type === 'month').value;
  const year = parts.find((p) => p.type === 'year').value;
  const hour = parts.find((p) => p.type === 'hour').value.padStart(2, '0');
  const minute = parts.find((p) => p.type === 'minute').value.padStart(2, '0');
  const second = parts.find((p) => p.type === 'second').value.padStart(2, '0');
  const period = parts.find((p) => p.type === 'dayPeriod').value.toUpperCase();

  if (getParts.length) {
    return getParts.reduce((acc, cur) => {
      acc[cur] = parts.find((p) => p.type === cur).value;
      return acc;
    }, {});
  }

  if (lastUpdatedFormat) {
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }
  return `${month} ${day}, ${year} ${hour}:${minute} ${period} ${showCT ? 'CT' : ''}`;
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

// only to be used with dates with no time, eg. '2025-10-28'
// eslint-disable-next-line consistent-return
function getUTCfromDateString(date) {
  if (!date) {
    return null;
  }
  const [cleanDate] = date.split(/[T\s]/);
  const parts = cleanDate.split('-').map(Number);
  const [year, month, day] = parts;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
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
function buildSlider(el, config, includeArrows = true, disableOnDesktop = false) {
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
      const uniqueId = `glider-${Math.random().toString(36).substr(2, 9)}`;
      const prevImg = createElement('img', { 'data-icon-name': 'chevron-left', src: '/aemedge/icons/chevron-left.svg' });
      const nextImg = createElement('img', { 'data-icon-name': 'chevron-right', src: '/aemedge/icons/chevron-right.svg' });
      prevClass = `glider-prev-${uniqueId}`;
      nextClass = `glider-next-${uniqueId}`;
      const prev = createElement('button', { 'aria-label': 'Previous', class: `glider-prev ${prevClass}` }, prevImg);
      const next = createElement('button', { 'aria-label': 'Next', class: `glider-next ${nextClass}` }, nextImg);
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
          console.error('Error destroying slider:', err);
        }
        gliderInstance = null;
      }
    };

    const handleResize = () => {
      if (disableOnDesktop && window.innerWidth >= 769) {
        destroySlider();
      } else {
        initSlider();
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

export {
  createElement,
  getArticleRelatedMetadata,
  addDividerLine,
  parseTime,
  formatDate,
  getTag,
  i18n,
  getPageTags,
  getBrowserName,
  getEnvType,
  formatToCentralTime,
  isDateBefore,
  urlByEnvType,
  getCurrentLangInWords,
  decodeHtmlEntities,
  checkDomain,
  buildSlider,
  getUTCfromDateString,
};

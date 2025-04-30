/* eslint-disable import/prefer-default-export */
import { getMetadata } from './aem.js';
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
  const parts = time.split(':');
  if (parts.length !== 2) {
    return '';
  }
  const timeInMins = parseInt(parts[1], 10) > 30
    ? parseInt(parts[0], 10) + 1 : parseInt(parts[0], 10);
  let hours = 0;
  let mins = 0;

  if (timeInMins > 60) {
    hours = Math.floor(timeInMins / 60);
    mins = timeInMins - 60 * hours;
    return `${hours} hr ${mins} min`;
  }
  return `${timeInMins} min`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${day} ${month}`;
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

function formatToCentralTime(utcDateString, lastUpdatedFormat, showCT = true) {
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

export const PRODUCTION_DOMAINS = ['cmegroup.com', 'beta.cmegroup.com'];
const domainCheckCache = {};

/**
 * Checks a url to determine if it is a known domain.
 * @param {string | URL} url the url to check
 * @returns {Object} an object with properties indicating the urls domain types.
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
};

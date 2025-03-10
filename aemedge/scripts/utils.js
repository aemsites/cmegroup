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

export {
  createElement,
  getArticleRelatedMetadata,
  addDividerLine,
  parseTime,
  formatDate,
  getTag,
  i18n,
};

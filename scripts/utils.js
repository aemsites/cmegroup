/* eslint-disable import/prefer-default-export */
import { getMetadata } from './aem.js';

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
 * Retrieves article-related metadata from the page
 * @returns {Object} Object containing article metadata
 * @property {string} template - The template type
 * @property {string} readTime - Estimated reading time
 * @property {string} author - Article author
 * @property {string} tag - Article tag
 * @property {string} date - Article publication date
 */
function getArticleRelatedMetadata() {
  const template = getMetadata('template');
  const readTime = getMetadata('read-time');
  const author = getMetadata('author');
  const primaryTopic = getMetadata('primary-topic');
  const date = getMetadata('date');

  return {
    template,
    readTime,
    author,
    primaryTopic,
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

export {
  createElement,
  getArticleRelatedMetadata,
  addDividerLine,
  parseTime,
};

/* eslint-disable import/prefer-default-export */
import { getMetadata } from './aem.js';

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

function getArticleRelatedMetadata() {
  const template = getMetadata('template');
  const readTime = getMetadata('read-time');
  const author = getMetadata('author');
  const tag = getMetadata('tag');
  const date = getMetadata('date');

  return {
    template,
    readTime,
    author,
    tag,
    date,
  };
}

export {
  createElement,
  getArticleRelatedMetadata,
};

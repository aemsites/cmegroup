import { getMetadata } from '../../scripts/aem.js';
import { createElement } from '../../scripts/utils.js';

export default function courseTemplate() {
  const main = document.querySelector('main');
  const courseHeading = main.querySelector('h1');
  const header = document.createElement('div');
  header.classList.add('course-header');

  // Get metadata values
  const readTime = getMetadata('read-time');
  const template = getMetadata('template');

  // Create the metadata bar
  const metadataBar = createElement('div', { class: 'course-metadata' });

  if (readTime) {
    const readTimeElement = createElement('div', { class: 'course-read-time' }, `${readTime}`);
    metadataBar.appendChild(readTimeElement);
  }

  if (template.toLowerCase() === 'course') {
    const type = createElement('div', { class: 'course-type' });
    type.textContent = 'Course';
    metadataBar.appendChild(type);
  }

  header.appendChild(metadataBar);
  courseHeading.before(header);
}

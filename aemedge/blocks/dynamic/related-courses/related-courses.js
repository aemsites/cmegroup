import {
  buildBlock,
  decorateBlock,
  loadBlock,
  getMetadata,
} from '../../../scripts/aem.js';
import { createElement } from '../../../scripts/utils.js';

function createHeader() {
  const header = createElement('div', { class: 'cards-header' });
  const h3 = createElement('h3', {}, 'Related Courses');
  header.appendChild(h3);
  const coursesLink = createElement('a', { href: '/education/courses/' }, 'View Course Catalog');
  header.appendChild(coursesLink);
  return header;
}

export default async function createRelatedCourses(main) {
  const container = createElement('div', { class: 'section full-width' });
  const wrapper = createElement('div');
  container.appendChild(wrapper);

  const header = createHeader();
  wrapper.appendChild(header);

  const tags = getMetadata('article:tag');
  const block = buildBlock('cards', [
    ['optional-tags', tags],
    ['limit', '3'],
  ]);

  block.classList.add('course', 'dynamic', 'related-courses');
  wrapper.appendChild(block);
  decorateBlock(block);
  await loadBlock(block);

  main.appendChild(container);
}

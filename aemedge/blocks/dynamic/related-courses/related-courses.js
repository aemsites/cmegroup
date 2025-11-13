import {
  buildBlock,
  decorateBlock,
  loadBlock,
  getMetadata,
} from '../../../scripts/aem.js';
import { createElement, i18n } from '../../../scripts/utils.js';

async function createHeader() {
  const [title, linkText] = await Promise.all([
    i18n('Related Courses'),
    i18n('View Course Catalog'),
  ]);
  const header = createElement('div', { class: 'cards-header' });
  const h3 = createElement('h3', {}, title);
  header.appendChild(h3);
  const coursesLink = createElement('a', { href: '/education/courses' }, linkText);
  header.appendChild(coursesLink);
  return header;
}

export default async function createRelatedCourses(main) {
  const container = createElement('div', { class: 'section full-width' });
  const wrapper = createElement('div');
  container.appendChild(wrapper);

  const header = await createHeader();
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

import { buildBlock, decorateBlock, loadBlock } from '../../../scripts/aem.js';
import { createElement } from '../../../scripts/utils.js';

export default async function createRelatedCourses(main) {
  const container = createElement('div', { class: 'section full-width' });
  const wrapper = createElement('div');
  container.appendChild(wrapper);

  const block = buildBlock('cards', '');
  block.classList.add('course', 'dynamic');
  wrapper.appendChild(block);
  decorateBlock(block);
  loadBlock(block);

  // Dynamic import for createDynamicCards
  const { createDynamicCards } = await import('../../cards/cards.js');
  const cards = await createDynamicCards(block, 3);
  const header = createElement('div', {
    style: 'display: flex; justify-content: space-between; align-items: flex-start;',
  });

  const h3 = createElement('h3', {}, 'Related Courses');
  header.appendChild(h3);

  const link = createElement('a', { href: '/education/courses/' }, 'View Course Catalog');
  header.appendChild(link);

  block.textContent = '';
  block.append(header);
  block.append(cards);

  // update ul style to 3 columns
  const ul = block.querySelector('ul');
  if (ul) {
    ul.style.display = 'grid';
    ul.style.gridTemplateColumns = 'repeat(3, 1fr)';
  }

  main.appendChild(container);
}

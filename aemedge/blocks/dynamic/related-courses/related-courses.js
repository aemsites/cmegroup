import { createElement } from '../../../scripts/utils.js';
import { createDynamicCards } from '../../cards/cards.js';

export default async function createRelatedCourses(main) {
  const blockContainer = createElement('div', { class: 'section cards-container full-width' });
  const blockWrapper = createElement('div', { class: 'cards-wrapper' });
  blockContainer.appendChild(blockWrapper);

  const block = createElement('div', { class: 'block course dynamic cards' });
  blockWrapper.appendChild(block);

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

  main.appendChild(blockContainer);
}

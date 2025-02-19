import { createDynamicCard, fetchAndFilterData } from '../cards/cards.js';
import { createElement } from '../../scripts/utils.js';

function createCardsBlock(cards) {
  const block = createElement('div', { class: 'cards block' });
  const ul = createElement('ul', { class: 'cards-container' });
  ul.append(...cards);
  block.appendChild(ul);
  block.classList.add('course');
  return block;
}

function createAccordionItem(title, content) {
  const details = createElement('details', { class: 'accordion-item' });
  const summary = createElement('summary', { class: 'accordion-item-label' });
  summary.textContent = title;

  const body = createElement('div', { class: 'accordion-item-body' });
  body.appendChild(content);

  details.append(summary, body);
  return details;
}

async function decorateCardsAccordion(block) {
  try {
    const rows = [...block.children];
    const accordionData = [];
    let currentTitle = '';
    let currentTags = [];

    // First pass: collect all titles and tags
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const [label, value] = [...row.children];
      const labelText = label?.textContent.trim().toLowerCase();

      if (labelText === 'tags') {
        currentTags = value?.textContent.trim()
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);
      } else {
        if (currentTitle) {
          accordionData.push({ title: currentTitle, tags: currentTags });
        }
        currentTitle = label?.textContent.trim();
        currentTags = [];
      }
    }

    // Add the last section if it exists
    if (currentTitle && currentTags.length) {
      accordionData.push({ title: currentTitle, tags: currentTags });
    }

    // Fetch all data concurrently
    const accordions = await Promise.all(
      accordionData.map(async ({ title, tags }) => {
        const filteredData = await fetchAndFilterData(tags);
        const cards = filteredData.map(createDynamicCard);
        const cardsBlock = createCardsBlock(cards);
        return createAccordionItem(title, cardsBlock);
      }),
    );

    // Replace content with accordions
    block.textContent = '';
    block.append(...accordions);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading query index data:', error);
  }
}

function decorateAccordion(block) {
  [...block.children].forEach((row) => {
    const [label, body] = [...row.children];
    const accordion = createAccordionItem(
      label.textContent,
      body,
    );
    row.replaceWith(accordion);
  });
}

export default async function decorate(block) {
  if (block.classList.contains('cards')) {
    await decorateCardsAccordion(block);
  } else {
    decorateAccordion(block);
  }
}

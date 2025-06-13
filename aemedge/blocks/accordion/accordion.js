import { createDynamicCard } from '../cards/cards.js';
import { fetchCoursesIndex } from '../../scripts/indexing.js';

import {
  createElement,
  buildSlider,
} from '../../scripts/utils.js';

function createCardsBlock(cards) {
  const block = createElement('div', { class: 'cards block' });
  const ul = createElement('ul', { class: 'cards-container' });
  const sliderConfig = {
    slidesToShow: 'auto',
    slidesToScroll: 1,
    scrollLock: false,
    itemWidth: 255,
    exactWidth: true,
    draggable: true,
    duration: 2,
    responsive: [
      {
        breakpoint: 481,
        settings: {
          itemWidth: 426,
        },
      },
    ],
  };
  ul.append(...cards);
  block.appendChild(ul);
  block.classList.add('course');
  buildSlider(ul, sliderConfig, true, true, true);
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

// Helper function to manually filter data by tags
const filterDataByTags = (data, searchTags) => {
  if (!searchTags?.length) return data;

  return data.filter((item) => {
    const itemTags = item.tags?.map((tag) => tag.replace(/\\"/g, '"').replace(/'/g, '"').toLowerCase()) || [];

    // eslint-disable-next-line max-len
    return searchTags.every((searchTag) => itemTags.some((itemTag) => itemTag.includes(searchTag.toLowerCase())));
  });
};

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

    // Fetch all course data once
    const allCourseData = await fetchCoursesIndex();

    // Create accordions with filtered data
    const accordions = accordionData.map(({ title, tags }) => {
      const filteredData = filterDataByTags(allCourseData, tags);
      const cards = filteredData.map(createDynamicCard);
      const cardsBlock = createCardsBlock(cards);
      return createAccordionItem(title, cardsBlock);
    });

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

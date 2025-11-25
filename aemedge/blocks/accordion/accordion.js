import { createDynamicCardCourse } from '../cards/cards.js';
import { getIndexedContent } from '../../scripts/indexing.js';

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

function createLinksAccordionItem(title, content, isFirstOpen = false) {
  const card = createElement('div', { class: 'accordion-card' });
  const header = createElement('div', { class: 'card-header' });
  if (isFirstOpen) {
    header.classList.add('open');
  }

  const titleText = createElement('span', { class: 'card-header-title' });
  titleText.textContent = title;

  const iconSpan = createElement('span', { class: 'card-header-icon' });

  header.append(titleText, iconSpan);

  const collapse = createElement('div', { class: 'collapse' });
  if (isFirstOpen) {
    collapse.classList.add('show');
  }

  const body = createElement('div', { class: 'card-body' });
  body.appendChild(content);

  collapse.appendChild(body);
  card.append(header, collapse);

  header.addEventListener('click', () => {
    const isOpen = header.classList.contains('open');

    if (isOpen) {
      // Closing animation
      header.classList.remove('open');
      collapse.style.height = `${collapse.scrollHeight}px`;
      collapse.classList.add('collapsing');
      collapse.classList.remove('show');

      // Force reflow
      // eslint-disable-next-line no-unused-expressions
      collapse.offsetHeight;

      collapse.style.height = '0';

      // After transition completes
      const handleTransitionEnd = () => {
        collapse.classList.remove('collapsing');
        collapse.style.height = '';
        collapse.removeEventListener('transitionend', handleTransitionEnd);
      };
      collapse.addEventListener('transitionend', handleTransitionEnd);
    } else {
      // Opening animation
      header.classList.add('open');
      collapse.classList.add('collapsing');
      collapse.style.height = '0';

      // Force reflow
      // eslint-disable-next-line no-unused-expressions
      collapse.offsetHeight;

      collapse.style.height = `${collapse.scrollHeight}px`;

      // After transition completes
      const handleTransitionEnd = () => {
        collapse.classList.remove('collapsing');
        collapse.classList.add('show');
        collapse.style.height = '';
        collapse.removeEventListener('transitionend', handleTransitionEnd);
      };
      collapse.addEventListener('transitionend', handleTransitionEnd);
    }
  });

  return card;
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
    block.textContent = '';

    // Add the last section if it exists
    if (currentTitle && currentTags.length) {
      accordionData.push({ title: currentTitle, tags: currentTags });
    }

    // Create accordions with filtered data
    accordionData.forEach(async ({ title, tags }) => {
      const wrapper = createElement('div');
      const accordionItem = createAccordionItem(title, wrapper);
      block.append(accordionItem);
      const indexFilter = {
        templates: ['course'],
        orderBy: 'date',
        sortDirection: 'desc',
        tagsAnd: tags,
      };
      const filteredData = await getIndexedContent(indexFilter);
      const cards = await Promise.all(filteredData.map(createDynamicCardCourse));
      const cardsBlock = createCardsBlock(cards);
      wrapper.append(cardsBlock);
    });
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

function decorateLinksAccordion(block) {
  const rows = [...block.children];
  const accordionItems = [];

  rows.forEach((row, index) => {
    const [label, body] = [...row.children];
    if (label && body) {
      const isFirstOpen = index === 0;
      const accordionItem = createLinksAccordionItem(
        label.textContent.trim(),
        body,
        isFirstOpen,
      );
      accordionItems.push(accordionItem);
    }
  });

  block.textContent = '';
  block.append(...accordionItems);
}

export default async function decorate(block) {
  if (block.classList.contains('cards')) {
    decorateCardsAccordion(block);
  } else if (block.classList.contains('links')) {
    decorateLinksAccordion(block);
  } else {
    decorateAccordion(block);
  }
}

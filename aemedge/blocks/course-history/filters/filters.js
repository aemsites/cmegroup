import { createElement, i18n } from '../../../scripts/utils.js';

// eslint-disable-next-line import/prefer-default-export
export async function createFilters({ items, onFilterChange }) {
  const [allLabel, inProgressLabel, completedLabel, viewLabel] = await Promise.all([
    i18n('All'),
    i18n('In Progress'),
    i18n('Completed'),
    i18n('View:'),
  ]);

  const resultsText = createElement('div', { class: 'results-text' });

  const filterButtons = [
    { label: allLabel, index: 0 },
    { label: inProgressLabel, index: 1 },
    { label: completedLabel, index: 2 },
  ];

  const ul = createElement(
    'ul',
    {},
    ...filterButtons.map(({ label, index }) => createElement(
      'li',
      {},
      createElement(
        'button',
        {
          type: 'button',
          class: index === 0 ? 'selected' : '',
          'data-index': index,
        },
        label,
      ),
    )),
  );

  ul.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      ul.querySelectorAll('button').forEach((btn) => btn.classList.remove('selected'));
      button.classList.add('selected');

      const filterIndex = parseInt(button.dataset.index, 10);
      let filteredItems = [...items];

      if (filterIndex === 1) {
        filteredItems = items.filter(({ data }) => data.status === 'PROGRESS');
      } else if (filterIndex === 2) {
        filteredItems = items.filter(({ data }) => data.status === 'COMPLETED');
      }

      onFilterChange(filteredItems);
    });
  });

  const filtersSection = createElement(
    'div',
    { class: 'filters-section row' },
    resultsText,
    createElement(
      'div',
      { class: 'filters-options' },
      createElement(
        'div',
        { class: 'option-switcher' },
        createElement('span', {}, viewLabel),
        ul,
      ),
    ),
  );

  return { filtersSection, resultsText };
}

import { createElement, i18n } from '../../../scripts/utils.js';

// eslint-disable-next-line import/prefer-default-export
export async function createFilters({ items, onFilterChange, initialFilterValue = 'all' }) {
  const [allLabel, inProgressLabel, completedLabel, viewLabel] = await Promise.all([
    i18n('All'),
    i18n('In Progress'),
    i18n('Completed'),
    i18n('View:'),
  ]);

  const resultsText = createElement('div', { class: 'results-text' });

  const filterButtons = [
    { label: allLabel, value: 'all' },
    { label: inProgressLabel, value: 'PROGRESS' },
    { label: completedLabel, value: 'COMPLETED' },
  ];

  const ul = createElement(
    'ul',
    {},
    ...filterButtons.map(({ label, value }) => createElement(
      'li',
      {},
      createElement(
        'button',
        {
          type: 'button',
          class: value === initialFilterValue ? 'selected' : '',
          'data-value': value,
        },
        label,
      ),
    )),
  );

  ul.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.classList.contains('selected')) return;
      ul.querySelectorAll('button').forEach((btn) => btn.classList.remove('selected'));
      button.classList.add('selected');
      const selectedValue = button.dataset.value;
      let filteredItems = [...items];
      if (selectedValue === 'COMPLETED') {
        filteredItems = items.filter(({ data }) => data.completed);
      } else if (selectedValue === 'PROGRESS') {
        filteredItems = items.filter(({ data }) => !data.completed);
      }
      onFilterChange(filteredItems, selectedValue, true);
    });
  });

  const initialButton = ul.querySelector(`button[data-value="${initialFilterValue}"]`);
  if (initialButton) {
    let filteredItems = [...items];
    if (initialFilterValue === 'PROGRESS') {
      filteredItems = items.filter(({ data }) => !data.completed);
    } else if (initialFilterValue === 'COMPLETED') {
      filteredItems = items.filter(({ data }) => data.completed);
    }
    onFilterChange(filteredItems, initialFilterValue, false);
  }

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

  return { filtersSection, resultsText, ulElement: ul };
}

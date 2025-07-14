import searchConfig from '../search-config.js';
import { i18n } from '../../../scripts/utils.js';
import { div, button, a } from '../../../scripts/dom-helpers.js';
import {
  toggleClearButton, removeAppliedFilter, clearAllFilters, urlUpdate,
} from '../search-utils.js';

const updateFilteringByUI = async (container, onChange) => {
  container.innerHTML = '';
  const { appliedFilters, searchInput } = searchConfig;

  if (!appliedFilters.length && !searchInput) {
    onChange?.();
    urlUpdate();
    return;
  }

  const [
    filterTitleText,
    resetText,
  ] = await Promise.all([
    i18n('Currently filtering by'),
    i18n('Reset'),
  ]);

  const filterTitle = div({ class: 'filter-title' }, `${filterTitleText}:`);
  const filterTags = div({ class: 'filter-tags' });

  // Add search term as filter tag
  if (searchInput) {
    const searchTag = button({ class: 'filter-tag search-input-tag' }, `${searchInput}`);
    searchTag.onclick = async () => {
      searchConfig.searchInput = '';
      const searchField = document.querySelector('.search-input');
      if (searchField) {
        searchField.value = '';
        toggleClearButton(false);
      }
      await updateFilteringByUI(container, onChange);
    };
    filterTags.appendChild(searchTag);
  }

  // Add each applied filter as tag
  appliedFilters.forEach(({ filterId, value, labelContent }) => {
    const tag = button({ class: 'filter-tag' }, labelContent);
    tag.onclick = async () => {
      const cbs = document.querySelectorAll(`#${filterId} input[value="${value}"]`);
      cbs.forEach((cb) => {
        cb.checked = false;
      });
      removeAppliedFilter(filterId, value);
      await updateFilteringByUI(container, onChange);
    };
    filterTags.appendChild(tag);
  });

  // Add reset link
  const reset = a({ class: 'reset', href: '#' }, resetText);
  reset.onclick = async (e) => {
    e.preventDefault();
    clearAllFilters();
    await updateFilteringByUI(container, onChange);
  };

  filterTitle.appendChild(reset);
  container.appendChild(filterTitle);
  container.appendChild(filterTags);
  onChange?.();
  urlUpdate();
};

const temp = () => {};

export {
  updateFilteringByUI,
  temp,
};

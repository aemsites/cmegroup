import {
  a, button, div, input, label,
} from '../../scripts/dom-helpers.js';
import { getTaxonomyWithoutModifications } from '../../scripts/taxonomy.js';
import searchConfig from './search-config.js';

// === Filter Helpers ===
const addAppliedFilter = (filterId, value) => {
  const exists = searchConfig.appliedFilters
    .some((f) => f.filterId === filterId && f.value === value);
  if (!exists) searchConfig.appliedFilters.push({ filterId, value });
};

const removeAppliedFilter = (filterId, value) => {
  searchConfig.appliedFilters = searchConfig
    .appliedFilters.filter((f) => f.filterId !== filterId || f.value !== value);
};

const clearAllFilters = () => {
  searchConfig.appliedFilters = [];
  searchConfig.searchInput = '';
  document
    .querySelectorAll('.dropdown-option-checkbox, .checkbox-input')
    .forEach((cb) => {
      cb.checked = false;
    });
  const tempInput = document.querySelector('.search-input');
  if (tempInput) {
    tempInput.value = '';
  }
};

const updateFilteringByUI = (container, onChange) => {
  container.innerHTML = '';
  const { appliedFilters, searchInput } = searchConfig;

  if (!appliedFilters.length && !searchInput) return;

  const filterTitle = div({ class: 'filter-title' }, 'Currently filtering by:');
  const filterTags = div({ class: 'filter-tags' });

  // Add search term as filter tag
  if (searchInput) {
    const searchTag = button({ class: 'filter-tag' }, `Search: ${searchInput}`);
    searchTag.onclick = () => {
      searchConfig.searchInput = '';
      const searchField = document.querySelector('.search-input');
      if (searchField) searchField.value = '';
      updateFilteringByUI(container, onChange);
      onChange?.();
    };
    filterTags.appendChild(searchTag);
  }

  // Add each applied filter as tag
  appliedFilters.forEach(({ filterId, value }) => {
    const tag = button({ class: 'filter-tag' }, value);
    tag.onclick = () => {
      const cb = document.querySelector(`#${filterId} input[value="${value}"]`);
      if (cb) cb.checked = false;
      removeAppliedFilter(filterId, value);
      updateFilteringByUI(container, onChange);
      onChange?.();
    };
    filterTags.appendChild(tag);
  });

  // Add reset link
  const reset = a({ class: 'reset', href: '#' }, 'Reset');
  reset.onclick = (e) => {
    e.preventDefault();
    clearAllFilters();
    updateFilteringByUI(container, onChange);
    onChange?.();
  };

  filterTitle.appendChild(reset);
  container.appendChild(filterTitle);
  container.appendChild(filterTags);
};

// === UI Components ===
const createOption = (opt, labelContent, type, className, filterId, index) => {
  const wrapper = div({ class: `${type}-option`, id: `${type === 'dropdown' ? 'option' : 'item'}-${filterId}-${index}` });
  const cb = input({ type: 'checkbox', class: className, value: opt });
  const lbl = label({ class: `${type}-label` }, labelContent);

  cb.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      addAppliedFilter(filterId, opt);
    } else {
      removeAppliedFilter(filterId, opt);
    }
    updateFilteringByUI(document.querySelector('.filter-bullets'));
  });

  wrapper.addEventListener('click', (e) => {
    if (e.target !== cb) {
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event('change'));
    }
  });

  wrapper.append(cb, lbl);
  return wrapper;
};

const sortOptions = (options, order) => {
  if (order === 'asc') {
    return [...options].sort((aa, bb) => aa.localeCompare(bb));
  }
  if (order === 'desc') {
    return [...options].sort((aa, bb) => bb.localeCompare(aa));
  }
  return options;
};

const createDropdown = async (options, labelText, order, filterId) => {
  const dropdown = div({ class: 'dropdown', id: filterId });
  const toggle = div({ class: 'dropdown-toggle' }, labelText);
  const menu = div({ class: 'dropdown-menu' });

  const taxonomy = await getTaxonomyWithoutModifications('tags');
  sortOptions(options, order)
    .forEach((opt, i) => {
      const labelContent = taxonomy[opt]?.en || opt;
      menu.appendChild(createOption(opt, labelContent, 'dropdown', 'dropdown-option-checkbox', filterId, i));
    });

  toggle.addEventListener('click', () => {
    menu.classList.toggle('visible');
    toggle.classList.toggle('visible');

    // eslint-disable-next-line no-use-before-define
    const onEscape = (e) => e.key === 'Escape' && close();
    // eslint-disable-next-line no-use-before-define
    const onOutsideClick = (e) => !dropdown.contains(e.target) && close();

    const close = () => {
      menu.classList.remove('visible');
      toggle.classList.remove('visible');
      document.removeEventListener('click', onOutsideClick);
      document.removeEventListener('keydown', onEscape);
    };

    setTimeout(() => {
      document.addEventListener('click', onOutsideClick);
      document.addEventListener('keydown', onEscape);
    }, 0);
  });

  dropdown.append(toggle, menu);
  return dropdown;
};

const createCheckbox = (options, labelText, order, filterId) => {
  const wrapper = div({ class: 'checkbox', id: filterId });
  wrapper.appendChild(label({ class: 'checkbox-label' }, labelText));

  const container = div({ class: 'checkbox-items' });
  wrapper.appendChild(container);

  sortOptions(options, order)
    .forEach((opt, i) => {
      container.appendChild(createOption(opt, opt, 'checkbox', 'checkbox-input', filterId, i));
    });

  return wrapper;
};

// === Filter Creation ===
const createFilters = async () => {
  const wrapper = div({ class: 'filters-wrapper' });
  wrapper.appendChild(div({ class: 'filters-wrapper-title' }, 'Filters'));

  const filtersContainer = div({ class: 'filters' });
  wrapper.appendChild(filtersContainer);

  // eslint-disable-next-line no-restricted-syntax
  for (const [index, filter] of searchConfig.filters.entries()) {
    const filterId = `${filter.type}-${index}`;

    const control = filter.type === 'dropdown'
      // eslint-disable-next-line no-await-in-loop
      ? await createDropdown(filter.values, filter.name, filter.order, filterId)
      : createCheckbox(filter.values, filter.name, filter.order, filterId);
    filtersContainer.appendChild(control);
  }

  return wrapper;
};

// === Filter Parsing ===
const manageFilters = async (key, block, index) => {
  let currentFilter = null;

  for (let i = index; i < block.children.length; i += 1) {
    const child = block.children[i];
    const header = child?.firstElementChild?.textContent.trim().toLowerCase();
    if (!header || header === key.toLowerCase()) {
      const name = child?.children[1]?.textContent.trim();
      const type = child?.children[2]?.textContent.trim();
      const values = Array.from(child?.children[3]?.querySelectorAll('li')).map((li) => li.textContent.trim());

      if (name && type && values.length) {
        currentFilter = { name, type, values };
      } else if (child?.children[2]?.textContent.trim().toLowerCase() === 'order') {
        currentFilter.order = child.children[3]?.textContent.trim();
        searchConfig.filters.push(currentFilter);
        currentFilter = null;
      }
    } else {
      break;
    }
  }

  const tempObj = await createFilters();
  return tempObj;
};

export {
  manageFilters,
  addAppliedFilter,
  removeAppliedFilter,
  clearAllFilters,
  updateFilteringByUI,
};

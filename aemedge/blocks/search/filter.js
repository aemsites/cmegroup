import {
  a,
  button,
  div, input, label,
  span,
} from '../../scripts/dom-helpers.js';
import { getTaxonomyWithoutModifications } from '../../scripts/taxonomy.js';
import { i18n } from '../../scripts/utils.js';

// const appliedFilters = {};

const filterJson = {
  numbers: true,
  position: 'default',
  filters: [],
  appliedFilters: [],
  searchInput: '',
};

const addAppliedFilter = (filterId, value) => {
  if (!filterJson.appliedFilters.some((f) => f.filterId === filterId && f.value === value)) {
    filterJson.appliedFilters.push({ filterId, value });
  }
};

const removeAppliedFilter = (filterId, value) => {
  filterJson.appliedFilters = filterJson.appliedFilters.filter(
    (f) => !(f.filterId === filterId && f.value === value),
  );
};

const clearAllAppliedFilters = () => {
  filterJson.appliedFilters = [];
};

const getAppliedFilters = () => filterJson.appliedFilters;

const createDropdown = async (options, labelText, order, filterId) => {
  const dropdown = div({ class: 'dropdown', id: filterId });
  const dropdownToggle = div({ class: 'dropdown-toggle' }, labelText);
  const dropdownMenu = div({ class: 'dropdown-menu' });
  const taxonomy = await getTaxonomyWithoutModifications('tags');

  options.sort((a, b) => {
    if (!order || order === 'default') {
      return 0;
    }
    return order === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
  }).forEach((opt, index) => {
    const dropdownItem = div({ class: 'dropdown-option', id: `option-${filterId}-${index}` });
    const checkboxWrapper = div({ class: 'dropdown-option-checkbox-wrapper' });
    const checkbox = input({ type: 'checkbox', class: 'dropdown-option-checkbox', value: opt });
    checkboxWrapper.appendChild(checkbox);
    dropdownItem.appendChild(checkboxWrapper);
    dropdownItem.appendChild(label({ class: 'dropdown-option-label' }, taxonomy[opt]?.en || opt));
    dropdownMenu.appendChild(dropdownItem);

    dropdownItem.addEventListener('click', (e) => {
      // Only toggle if the click wasn't directly on the checkbox
      if (e.target !== checkbox) {
        const internalCheckbox = dropdownItem.querySelector('.dropdown-option-checkbox');
        if (internalCheckbox) {
          internalCheckbox.checked = !internalCheckbox.checked;
          // trigger checkbox change here
          internalCheckbox.dispatchEvent(new Event('change'));
        }
      }
    });

    // Add change event listener for the checkbox
    checkbox.addEventListener('change', (e) => {
      const { value } = e.target;
      console.log(e.target);
      // tempSpan.classList.toggle('checked');
      if (e.target.checked) {
        addAppliedFilter(filterId, value);
      } else {
        removeAppliedFilter(filterId, value);
      }

      updateFilteringByUI(document.querySelector('.filter-bullets'));
      // Optionally: trigger API call or UI update here
    });
  });

  dropdown.appendChild(dropdownToggle);
  dropdown.appendChild(dropdownMenu);

  dropdownToggle.addEventListener('click', () => {
    // on escape and click some where else hide dropdownmenu
    dropdownMenu.classList.toggle('visible');
    dropdownToggle.classList.toggle('visible');

    // Close on Escape key
    const handleEscapePress = (e) => {
      if (e.key === 'Escape') {
        dropdownMenu.classList.remove('visible');
        dropdownToggle.classList.remove('visible');
      }
    };

    // Close on outside click
    const handleOutsideClick = (e) => {
      if (!dropdown.contains(e.target)) {
        dropdownMenu.classList.remove('visible');
        dropdownToggle.classList.remove('visible');
      }
    };

    // Add listeners
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('keydown', handleEscapePress);
    }, 0); // Allow current click to propagate first
  });

  return dropdown;
};

const createCheckbox = (options, labelText, order, filterId) => {
  const checkbox = div({ class: 'checkbox', id: filterId }, label({ class: 'checkbox-label' }, labelText));
  const checkboxItems = div({ class: 'checkbox-items' });
  checkbox.appendChild(checkboxItems);

  options.sort((a, b) => {
    if (!order || order === 'default') {
      return 0;
    }
    return order === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
  }).forEach((opt, index) => {
    const checkboxItem = div({ class: 'checkbox-item', id: `item-${filterId}-${index}` });
    const inputEl = input({ type: 'checkbox', class: 'checkbox-input', value: opt });
    checkboxItem.appendChild(inputEl);
    checkboxItem.appendChild(label({ class: 'checkbox-label' }, opt));
    checkboxItems.appendChild(checkboxItem);

    checkboxItem.addEventListener('click', (e) => {
      // Only toggle if the click wasn't directly on the checkbox
      if (e.target !== inputEl) {
        const internalCheckbox = checkboxItem.querySelector('.checkbox-input');
        if (internalCheckbox) {
          internalCheckbox.checked = !internalCheckbox.checked;
          // trigger checkbox change here
          internalCheckbox.dispatchEvent(new Event('change'));
        }
      }
    });

    inputEl.addEventListener('change', (e) => {
      const { value } = e.target;
      if (e.target.checked) {
        addAppliedFilter(filterId, value);
      } else {
        removeAppliedFilter(filterId, value);
      }

      updateFilteringByUI(document.querySelector('.filter-bullets'));
      // Optionally: trigger API call or UI update here
    });
  });

  return checkbox;
};

const createFilters = async () => {
  const filtersWrapper = div({ class: 'filters-wrapper' });
  filtersWrapper.appendChild(div({ class: 'filters-wrapper-title' }, 'Filters'));
  const filters = div({ class: 'filters' });
  filtersWrapper.appendChild(filters);

  for (let index = 0; index < filterJson.filters.length; index += 1) {
    const filter = filterJson.filters[index];
    const {
      type, name, values, order,
    } = filter;

    if (type === 'dropdown') {
      // eslint-disable-next-line no-await-in-loop
      const dropdown = await createDropdown(values, name, order, `dropdown-${index}`);
      filters.appendChild(dropdown);
    } else if (type === 'checkbox') {
      const checkbox = createCheckbox(values, name, order, `checkbox-${index}`);
      filters.appendChild(checkbox);
    }

    // updateFilteringByUI();
  }

  return filtersWrapper;
};

const manageFilters = async (key, block, index) => {
  let currentFilter = null;

  for (let i = index; i < block.children.length; i += 1) {
    const child = block.children[i];
    const firstChild = child?.firstElementChild;
    const textContent = firstChild?.textContent.trim();
    let secondChild;
    if (textContent.toLowerCase() === key || !textContent) {
      secondChild = child?.children[1];
      const secondChildTextContent = secondChild?.textContent.trim();
      if (secondChildTextContent) {
        currentFilter = {
          name: secondChildTextContent,
          type: child?.children[2]?.textContent.trim(),
          values: Array.from(child?.children[3]?.querySelectorAll('li')).map((li) => li.textContent.trim()),
        };
      } else {
        const thirdChild = child.children[2];
        const thirdChildTextContent = thirdChild?.textContent.trim().toLowerCase();
        if (thirdChildTextContent === 'order') {
          currentFilter.order = child.children[3]?.textContent.trim();
          filterJson.filters.push(currentFilter);
          currentFilter = null;
        }
      }
    } else {
      break;
    }
  }

  const filters = await createFilters();
  return filters;
};

/**
 * Renders the "Currently filtering by" UI using filterJson.appliedFilters.
 * @param {HTMLElement} container - The DOM element to render the filtering UI into.
 * @param {Function} onChange - Callback to trigger when filters change (e.g., to re-filter results).
 */
function updateFilteringByUI(container, onChange) {
  container.innerHTML = ''; // Clear previous

  if (filterJson.appliedFilters.length === 0 && !filterJson.searchInput) {
    return;
  }
  // Create filter title section
  const filterTitle = div({ class: 'filter-title' });
  const title = document.createElement('span');
  title.textContent = 'Currently filtering by:';
  filterTitle.appendChild(title);

  container.appendChild(filterTitle);

  const filterTags = div({ class: 'filter-tags' });

  // Add search input as first filter if it exists
  if (filterJson.searchInput) {
    const searchTag = button({ class: 'filter-tag' }, `Search: ${filterJson.searchInput}`);
    searchTag.onclick = () => {
      filterJson.searchInput = '';
      // Clear the search input field
      const searchInput = document.querySelector('.search-input');
      if (searchInput) {
        searchInput.value = '';
      }
      updateFilteringByUI(container, onChange);
      if (onChange) onChange();
    };
    filterTags.appendChild(searchTag);
  }

  if (filterJson.appliedFilters.length === 0 && !filterJson.searchInput) {
    // Uncheck all checkboxes in both dropdowns and regular checkboxes
    document.querySelectorAll('.dropdown-option-checkbox, .checkbox-input').forEach((checkbox) => {
      checkbox.checked = false;
    });
    return;
  }

  // Render each applied filter as a tag
  filterJson.appliedFilters.forEach(({ filterId, value }) => {
    const tag = button({ class: 'filter-tag' }, value);

    tag.onclick = () => {
      // Find and uncheck the corresponding checkbox
      const checkbox = document.querySelector(`#${filterId} input[value="${value}"]`);
      if (checkbox) {
        checkbox.checked = false;
      }
      
      removeAppliedFilter(filterId, value);
      updateFilteringByUI(container, onChange);
      if (onChange) onChange();
    };
    
    filterTags.appendChild(tag);
  });

  // Reset link
  const reset = a({ class: 'reset' }, 'Reset');
  reset.href = '#';
  reset.onclick = (e) => {
    e.preventDefault();
    
    // Uncheck all checkboxes in both dropdowns and regular checkboxes
    document.querySelectorAll('.dropdown-option-checkbox, .checkbox-input').forEach((checkbox) => {
      checkbox.checked = false;
    });
    
    clearAllAppliedFilters();
    filterJson.searchInput = ''; // Clear search input
    // Clear the search input field
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
      searchInput.value = '';
    }
    updateFilteringByUI(container, onChange);
    if (onChange) onChange();
  };
  
  filterTitle.appendChild(reset);
  container.appendChild(filterTags);
}

export {
  filterJson,
  manageFilters,
  addAppliedFilter,
  removeAppliedFilter,
  clearAllAppliedFilters,
  getAppliedFilters,
  updateFilteringByUI,
};

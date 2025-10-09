/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import { createElement } from '../../../scripts/utils.js';
import { createDropdowns } from './controls/dropdown-filter.js';
import { createSearchInput } from './controls/search-input.js';
import { createFilterPillsFromDropdowns } from './controls/pills.js';
import createCheckbox from './controls/checkbox.js';

// Handles data fetching for the table based on selected filters
async function fetchTableData(filters) {
  try {
    const response = await fetch('/endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filters),
    });

    const data = await response.json();

    // Dispatch custom event to notify other components (e.g., table)
    window.dispatchEvent(
      new CustomEvent('tableDataUpdated', {
        detail: { data, filters },
      }),
    );

    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}

// Builds the filter payload to send to the backend
function buildFiltersObject(
  dropdownSelections,
  searchTerm,
  checkboxValue,
  groupData = null,
) {
  const filters = {
    group: [],
    subgroup: [],
    venues: [],
    exch: [],
    cleared: [],
    searchTerm: searchTerm || '',
    timestamp: new Date().toISOString(),
  };

  // Handle GROUP dropdown (hierarchical structure)
  if (
    dropdownSelections.group &&
    dropdownSelections.group.length > 0 &&
    groupData
  ) {
    dropdownSelections.group.forEach((itemKey) => {
      const parts = itemKey.split('');
      const id = parts[parts.length - 1];
      const name = parts.slice(0, -1).join('');

      const group = groupData.find(
        (g) => g.name === name && String(g.id) === String(id),
      );

      if (group && group.children && group.children.length > 0) {
        filters.group.push(id);
      } else {
        filters.subgroup.push(id);
      }
    });
  }

  // Handle VENUES (send IDs only)
  if (dropdownSelections.venues && dropdownSelections.venues.length > 0) {
    dropdownSelections.venues.forEach((itemKey) => {
      const parts = itemKey.split('_');
      const id = parts[parts.length - 1];
      filters.venues.push(id);
    });
  }

  // Handle EXCH (send names only)
  if (dropdownSelections.exch && dropdownSelections.exch.length > 0) {
    dropdownSelections.exch.forEach((itemKey) => {
      const parts = itemKey.split('');
      const name = parts.slice(0, -1).join('');
      filters.exch.push(name);
    });
  }

  // Handle CLEARED (send names only)
  if (dropdownSelections.cleared && dropdownSelections.cleared.length > 0) {
    dropdownSelections.cleared.forEach((itemKey) => {
      const parts = itemKey.split('');
      const name = parts.slice(0, -1).join('');
      filters.cleared.push(name);
    });
  }

  // Include tags only if checkbox is selected
  if (checkboxValue === true) {
    filters.tags = 1;
  }

  return filters;
}

export async function createFilter(options) {
  let isDesktop = window.innerWidth >= 769;
  let currentSearchTerm = '';
  let searchTimeout = null;
  let checkboxValue = false; //Check it
  let pillsContainer;
  let groupData;

  // Base containers
  const filter = createElement('div', {
    class: 'product-slate-filter reverse',
  });
  const mainFilters = createElement('div', {
    class: 'main-filters hide-modal',
  });
  const filtersContent = createElement('div', { class: 'filters-content' });
  const buttonsContainer = createElement('div', { class: 'buttons-container' });
  const filterBy = createElement('div', { class: 'filter-by' });
  const wrap = createElement('div', { class: 'wrap' });
  const resetButton = createElement('button', {
    class: 'button secondary reset-button',
  });
  const filterButton = createElement('button', {
    class: 'button primary filter-button',
  });
  const applyButton = createElement('button', {
    class: 'button primary apply-button',
  });
  const closeModal = createElement('button', { class: 'button-close-modal' });
  const title = createElement('h2');
  title.textContent = 'Filters';
  const scrollMobileWrapper = createElement('section', {
    class: 'scroll-mobile-wrapper',
  });
  const filterRow = createElement('div', { class: 'filter-row' });
  const secondFilterRow = createElement('div', { class: 'filter-row' });

  // Create dropdowns with callback
  const dropdownsContainer = createDropdowns(options, {
    onSelectionChange: () => {
      const allSelections = dropdownsContainer.getSelections();

      if (pillsContainer) {
        pillsContainer.clear();
        pillsContainer.syncWithDropdowns(allSelections);
      }

      const filters = buildFiltersObject(
        allSelections,
        currentSearchTerm,
        checkboxValue,
        groupData,
      );

      fetchTableData(filters);
    },
  });

  groupData = options.group || [];

  // Create filter pills linked to dropdowns
  pillsContainer = createFilterPillsFromDropdowns(dropdownsContainer, {
    hideWhenEmpty: true,
    onRemove: (pill) => {
      const wasDeselected = dropdownsContainer.deselectItem(pill.type, pill.id);
      if (wasDeselected) {
        const allSelections = dropdownsContainer.getSelections();
        pillsContainer.clear();
        pillsContainer.syncWithDropdowns(allSelections);

        const filters = buildFiltersObject(
          allSelections,
          currentSearchTerm,
          checkboxValue,
          groupData,
        );

        fetchTableData(filters);
      }
    },
  });

  // Create checkbox with change listener
  const checkbox = createCheckbox({
    onChange: () => {
      const allSelections = dropdownsContainer.getSelections();
      const filters = buildFiltersObject(
        allSelections,
        currentSearchTerm,
        checkboxValue,
        groupData,
      );
      fetchTableData(filters);
    },
  });

  resetButton.textContent = 'Reset';
  filterButton.textContent = 'Filter';
  applyButton.textContent = 'Apply';

  // Create search input with debounce and click handler
  const customSearch = createSearchInput({
    onSearch: (value) => {
      currentSearchTerm = value;

      if (searchTimeout) clearTimeout(searchTimeout);

      searchTimeout = setTimeout(() => {
        const allSelections = dropdownsContainer.getSelections();
        const filters = buildFiltersObject(allSelections, value);
        fetchTableData(filters);
      }, 500);
    },
    onSearchClick: (value) => {
      currentSearchTerm = value;
      const allSelections = dropdownsContainer.getSelections();
      const filters = buildFiltersObject(allSelections, value);
      fetchTableData(filters);
    },
  });

  // Reset button listener
  resetButton.addEventListener('click', (e) => {
    e.preventDefault();
    customSearch.clear();
    currentSearchTerm = '';
    pillsContainer.clear();

    dropdownsContainer.setSelections({
      group: [],
      cleared: [],
      exch: [],
      venues: [],
    });

    checkbox.reset();

    const venuesInstance = dropdownsContainer.getDropdownInstance('venues');
    if (venuesInstance) venuesInstance.updateAllCheckboxes();

    const filters = buildFiltersObject({}, '', false);
    fetchTableData(filters);
  });

  // Mobile modal handlers
  filterButton.addEventListener('click', (e) => {
    e.preventDefault();
    mainFilters.classList.remove('hide-modal');
    mainFilters.classList.add('show-modal');
  });

  closeModal.addEventListener('click', (e) => {
    e.preventDefault();
    mainFilters.classList.add('hide-modal');
    mainFilters.classList.remove('show-modal');
  });

  applyButton.addEventListener('click', (e) => {
    e.preventDefault();
    mainFilters.classList.add('hide-modal');
    mainFilters.classList.remove('show-modal');

    const allSelections = dropdownsContainer.getSelections();
    const filters = buildFiltersObject(allSelections, currentSearchTerm);
    fetchTableData(filters);
  });

  // Responsive behavior
  if (isDesktop) {
    mainFilters.classList.remove('hide-modal');
  } else {
    mainFilters.classList.remove('show-modal');
    mainFilters.classList.add('hide-modal');
  }

  window.addEventListener('resize', () => {
    isDesktop = window.innerWidth >= 769;
    if (isDesktop) {
      mainFilters.classList.remove('hide-modal');
    } else {
      mainFilters.classList.remove('show-modal');
      mainFilters.classList.add('hide-modal');
    }
  });

  // Build final structure
  filterBy.appendChild(pillsContainer);
  filter.appendChild(mainFilters);
  mainFilters.appendChild(filtersContent);
  filtersContent.appendChild(title);
  filtersContent.appendChild(customSearch);
  filtersContent.appendChild(checkbox);
  filtersContent.appendChild(closeModal);
  filtersContent.appendChild(wrap);
  wrap.appendChild(scrollMobileWrapper);
  scrollMobileWrapper.appendChild(filterRow);
  scrollMobileWrapper.appendChild(secondFilterRow);
  secondFilterRow.appendChild(dropdownsContainer);
  mainFilters.appendChild(applyButton);
  buttonsContainer.appendChild(resetButton);
  buttonsContainer.appendChild(filterButton);
  filter.appendChild(buttonsContainer);
  filter.appendChild(filterBy);

  // Expose public API methods for external use
  filter.getFilters = () => {
    const allSelections = dropdownsContainer.getSelections();
    return buildFiltersObject(allSelections, currentSearchTerm);
  };

  filter.refreshData = () => {
    const filters = filter.getFilters();
    fetchTableData(filters);
  };

  filter.resetFilters = () => {
    resetButton.click();
  };

  return filter;
}

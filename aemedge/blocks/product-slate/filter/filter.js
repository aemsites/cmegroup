/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import { createElement } from '../../../scripts/utils.js';
import { createDropdowns } from './controls/dropdown-filter.js';
import { createSearchInput } from './controls/search-input.js';
import { createFilterPillsFromDropdowns } from './controls/pills.js';
import createCheckbox from './controls/checkbox.js';

function getFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);

  return {
    groups: params.get('groups') ? params.get('groups').split(',') : [],
    subGroups: params.get('subGroups')
      ? params.get('subGroups').split(',')
      : [],
    venues: params.get('venues') ? params.get('venues').split(',') : [],
    exch: params.get('exch') ? params.get('exch').split(',') : [],
    cleared: params.get('cleared')
      ? params
          .get('cleared')
          .split(',')
          .map((c) => decodeURIComponent(c))
      : [],
    searchTerm: params.get('search') || '',
    tags: params.get('tags') === '1',
    sortField: params.get('sortField') || '',
    sortDirection: params.get('sortDirection') || '',
  };
}

function updateURLWithFilters(filters) {
  const params = new URLSearchParams();

  // Add parameters in the same order as the React component for consistency

  // subGroups first (note: capital G)
  if (filters.subgroup && filters.subgroup.length > 0) {
    params.set('subGroups', filters.subgroup.join(','));
  }

  // sortDirection and sortField (if they exist)
  if (filters.sortDirection) {
    params.set('sortDirection', filters.sortDirection);
  }

  if (filters.sortField) {
    params.set('sortField', filters.sortField);
  }

  // groups (parent groups)
  if (filters.group && filters.group.length > 0) {
    params.set('groups', filters.group.join(','));
  }

  // search term
  if (filters.searchTerm) {
    params.set('search', filters.searchTerm);
  }

  // exch (exchanges)
  if (filters.exch && filters.exch.length > 0) {
    params.set('exch', filters.exch.join(','));
  }

  // venues
  if (filters.venues && filters.venues.length > 0) {
    params.set('venues', filters.venues.join(','));
  }

  // cleared (URL encoded for spaces)
  if (filters.cleared && filters.cleared.length > 0) {
    // Join and encode special characters (like spaces)
    params.set(
      'cleared',
      filters.cleared.map((c) => encodeURIComponent(c)).join(','),
    );
  }

  // tags
  if (filters.tags === 1) {
    params.set('tags', '1');
  }

  // Update URL without page reload using pushState
  const newURL = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;

  window.history.pushState({}, '', newURL);
}

function convertURLFiltersToSelections(urlFilters, groupData, options) {
  const selections = {
    group: [],
    cleared: [],
    exch: [],
    venues: [],
  };

  // Process GROUPS and SUBGROUPS from URL (note: 'groups' and 'subGroups')
  if (groupData) {
    // Add parent groups
    if (urlFilters.groups && urlFilters.groups.length > 0) {
      urlFilters.groups.forEach((groupId) => {
        const group = groupData.find((g) => String(g.id) === String(groupId));
        if (group) {
          selections.group.push(`${group.name}_${group.id}`);
        }
      });
    }

    // Add subgroups (children) - note: capital G in subGroups
    if (urlFilters.subGroups && urlFilters.subGroups.length > 0) {
      urlFilters.subGroups.forEach((subgroupId) => {
        groupData.forEach((group) => {
          if (group.children) {
            const child = group.children.find(
              (c) => String(c.id) === String(subgroupId)
            );
            if (child) {
              selections.group.push(`${child.name}_${child.id}`);
            }
          }
        });
      });
    }
  }

  if (urlFilters.venues && urlFilters.venues.length > 0 && options.venues) {
    urlFilters.venues.forEach((venueId) => {
      const venue = options.venues.find(
        (v) => String(v.id) === String(venueId)
      );
      if (venue) {
        selections.venues.push(`${venue.name}_${venue.id}`);
      }
    });
  }

  if (urlFilters.exch && urlFilters.exch.length > 0 && options.exch) {
    urlFilters.exch.forEach((exchName) => {
      const exch = options.exch.find((e) => e.name === exchName);
      if (exch) {
        selections.exch.push(`${exch.name}_${exch.id}`);
      }
    });
  }

  if (urlFilters.cleared && urlFilters.cleared.length > 0 && options.cleared) {
    urlFilters.cleared.forEach((clearedName) => {
      const cleared = options.cleared.find((c) => c.name === clearedName);
      if (cleared) {
        selections.cleared.push(`${cleared.name}_${cleared.id}`);
      }
    });
  }

  return selections;
}

async function fetchTableData(filters) {
  try {
    // Update URL with current filters (without page reload)
    updateURLWithFilters(filters);

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
      })
    );

    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}

function buildFiltersObject(
  dropdownSelections,
  searchTerm,
  checkboxValue,
  groupData = null
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
      const parts = itemKey.split('_');
      const id = parts[parts.length - 1];
      const name = parts.slice(0, -1).join('_');

      const group = groupData.find(
        (g) => g.name === name && String(g.id) === String(id)
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
      const parts = itemKey.split('_');
      const name = parts.slice(0, -1).join('_');
      filters.exch.push(name);
    });
  }

  // Handle CLEARED (send names only)
  if (dropdownSelections.cleared && dropdownSelections.cleared.length > 0) {
    dropdownSelections.cleared.forEach((itemKey) => {
      const parts = itemKey.split('_');
      const name = parts.slice(0, -1).join('_');
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
  let checkboxValue = false;
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
  const searchRow = createElement('div', { class: 'search-row' });

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
        groupData
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
          groupData
        );

        fetchTableData(filters);
      }
    },
  });

  // Create checkbox with change listener
  const checkbox = createCheckbox({
    onChange: (isChecked) => {
      checkboxValue = isChecked;

      const allSelections = dropdownsContainer.getSelections();
      const filters = buildFiltersObject(
        allSelections,
        currentSearchTerm,
        checkboxValue,
        groupData
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
        const filters = buildFiltersObject(
          allSelections,
          value,
          checkboxValue,
          groupData
        );
        fetchTableData(filters);
      }, 500);
    },

    onSearchClick: (value) => {
      currentSearchTerm = value;
      const allSelections = dropdownsContainer.getSelections();
      const filters = buildFiltersObject(
        allSelections,
        value,
        checkboxValue,
        groupData
      );
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
    checkboxValue = false;

    const venuesInstance = dropdownsContainer.getDropdownInstance('venues');
    if (venuesInstance) venuesInstance.updateAllCheckboxes();

    const filters = buildFiltersObject({}, '', false, groupData);
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
    const filters = buildFiltersObject(
      allSelections,
      currentSearchTerm,
      checkboxValue,
      groupData
    );
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
  filtersContent.appendChild(searchRow);
  searchRow.appendChild(customSearch);
  searchRow.appendChild(checkbox);
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
    return buildFiltersObject(
      allSelections,
      currentSearchTerm,
      checkboxValue,
      groupData
    );
  };

  filter.refreshData = () => {
    const filters = filter.getFilters();
    fetchTableData(filters);
  };

  filter.resetFilters = () => {
    resetButton.click();
  };

  const urlFilters = getFiltersFromURL();

  // Check if there are any filters in the URL
  const hasURLFilters = Object.keys(urlFilters).some((key) => {
    const value = urlFilters[key];
    return Array.isArray(value) ? value.length > 0 : value;
  });

  if (hasURLFilters) {
    // Convert URL filters to dropdown selections format
    const selections = convertURLFiltersToSelections(
      urlFilters,
      groupData,
      options
    );

    // Apply selections to dropdowns
    dropdownsContainer.setSelections(selections);

    // Apply search term
    if (urlFilters.searchTerm) {
      currentSearchTerm = urlFilters.searchTerm;
      customSearch.setValue(urlFilters.searchTerm);
    }

    // Apply checkbox
    if (urlFilters.tags) {
      checkboxValue = true;
      checkbox.setChecked(true);
    }

    // Sync pills and fetch data after a small delay
    setTimeout(() => {
      const allSelections = dropdownsContainer.getSelections();
      pillsContainer.clear();
      pillsContainer.syncWithDropdowns(allSelections);

      const filters = buildFiltersObject(
        allSelections,
        currentSearchTerm,
        checkboxValue,
        groupData
      );
      fetchTableData(filters);
    }, 100);
  }

  return filter;
}

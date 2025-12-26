import { createElement, i18n, debounce } from '../../../scripts/utils.js';
import createDropdowns from './controls/dropdown-filter.js';
import createSearchInput from './controls/search-input.js';
import { createFilterPillsFromDropdowns } from './controls/pills.js';
import createCheckbox from './controls/checkbox.js';

const [
  resetText,
  filterText,
  filtersText,
  applyText,
] = await Promise.all([
  i18n('Reset'),
  i18n('Filter'),
  i18n('Filters'),
  i18n('Apply'),
]);

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
      : [],
    searchTerm: params.get('search') || '',
    tags: params.get('tags') === '1',
    sortField: params.get('sortField') || '',
    sortDirection: params.get('sortDirection') || '',
  };
}

function convertURLFiltersToSelections(urlFilters, groupData, options) {
  const selections = {
    group: [],
    cleared: [],
    exch: [],
    venues: [],
  };

  if (groupData) {
    if (urlFilters.groups && urlFilters.groups.length > 0) {
      urlFilters.groups.forEach((groupId) => {
        const group = groupData.find((g) => String(g.id) === String(groupId));
        if (group) {
          selections.group.push(`${group.name}_${group.id}`);
        }
      });
    }

    if (urlFilters.subGroups && urlFilters.subGroups.length > 0) {
      urlFilters.subGroups.forEach((subgroupId) => {
        groupData.forEach((group) => {
          if (group.children) {
            const child = group.children.find(
              (c) => String(c.id) === String(subgroupId),
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
        (v) => String(v.id) === String(venueId),
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
    if (typeof window.fetchProductSlateData === 'function') {
      await window.fetchProductSlateData(filters);
      return;
    }

    window.dispatchEvent(
      new CustomEvent('tableDataError', {
        detail: { error: new Error('fetchProductSlateData not available'), filters },
      }),
    );
  } catch (error) {
    window.dispatchEvent(
      new CustomEvent('tableDataError', {
        detail: { error, filters },
      }),
    );
  }
}

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
  };

  if (
    dropdownSelections.group
    && dropdownSelections.group.length > 0
    && groupData
  ) {
    dropdownSelections.group.forEach((itemKey) => {
      const parts = itemKey.split('_');
      const id = parts[parts.length - 1];
      const name = parts.slice(0, -1).join('_');

      const parentGroup = groupData.find(
        (g) => g.name === name && String(g.id) === String(id),
      );

      if (parentGroup) {
        filters.group.push(id);
      } else {
        let found = false;
        groupData.forEach((g) => {
          if (!found && g.children) {
            const child = g.children.find(
              (c) => c.name === name && String(c.id) === String(id),
            );
            if (child) {
              filters.subgroup.push(id);
              found = true;
            }
          }
        });
      }
    });
  }

  if (dropdownSelections.venues && dropdownSelections.venues.length > 0) {
    dropdownSelections.venues.forEach((itemKey) => {
      const parts = itemKey.split('_');
      const id = parts[parts.length - 1];
      filters.venues.push(id);
    });
  }

  if (dropdownSelections.exch && dropdownSelections.exch.length > 0) {
    dropdownSelections.exch.forEach((itemKey) => {
      const parts = itemKey.split('_');
      const name = parts.slice(0, -1).join('_');
      filters.exch.push(name);
    });
  }

  if (dropdownSelections.cleared && dropdownSelections.cleared.length > 0) {
    dropdownSelections.cleared.forEach((itemKey) => {
      const parts = itemKey.split('_');
      const name = parts.slice(0, -1).join('_');
      filters.cleared.push(name);
    });
  }

  if (checkboxValue === true) {
    filters.tags = 1;
  }

  return filters;
}

export default function createFilter(options, filterConfig = {}) {
  const visibleFilters = {
    group: filterConfig.group !== false,
    venues: filterConfig.venues !== false,
    exch: filterConfig.exch !== false,
    cleared: filterConfig.cleared !== false,
    search: filterConfig.search !== false,
    tags: filterConfig.tags !== false,
  };

  let isDesktop = window.innerWidth >= 769;
  let currentSearchTerm = '';
  let checkboxValue = false;
  let pillsContainer;

  const groupData = options.group || [];

  const filter = createElement('div', {
    class: 'product-slate-filter reverse',
  });
  const mainFilters = createElement('div', {
    class: 'main-filters hide-modal',
  });
  const filtersContent = createElement('div', { class: 'filters-content' });
  const buttonsContainerMobile = createElement('div', { class: 'buttons-container mobile' });
  const buttonsContainerDesktop = createElement('div', { class: 'buttons-container desktop' });
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
  title.textContent = filtersText;
  const scrollMobileWrapper = createElement('section', {
    class: 'scroll-mobile-wrapper',
  });
  const filterRow = createElement('div', { class: 'filter-row' });
  const secondFilterRow = createElement('div', { class: 'filter-row' });
  const searchRow = createElement('div', { class: 'search-row' });

  const dropdownsContainer = createDropdowns(options, {
    visibleFilters,
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

  const checkbox = visibleFilters.tags ? createCheckbox({
    onChange: (isChecked) => {
      checkboxValue = isChecked;

      const allSelections = dropdownsContainer.getSelections();
      const filters = buildFiltersObject(
        allSelections,
        currentSearchTerm,
        checkboxValue,
        groupData,
      );
      fetchTableData(filters);
    },
  }) : null;

  resetButton.textContent = resetText;
  filterButton.textContent = filterText;
  applyButton.textContent = applyText;

  let isResetting = false;

  const debouncedFetch = debounce((value) => {
    if (isResetting) return;

    const allSelections = dropdownsContainer.getSelections();
    const filters = buildFiltersObject(
      allSelections,
      value,
      checkboxValue,
      groupData,
    );
    fetchTableData(filters);
  }, 500);

  const customSearch = visibleFilters.search ? createSearchInput({
    onSearch: (value) => {
      currentSearchTerm = value;
      debouncedFetch(value);
    },

    onSearchClick: (value) => {
      currentSearchTerm = value;
      const allSelections = dropdownsContainer.getSelections();
      const filters = buildFiltersObject(
        allSelections,
        value,
        checkboxValue,
        groupData,
      );
      fetchTableData(filters);
    },
  }) : null;

  resetButton.addEventListener('click', (e) => {
    e.preventDefault();

    isResetting = true;

    pillsContainer.clear();

    dropdownsContainer.setSelections({
      group: [],
      cleared: [],
      exch: [],
      venues: [],
    });

    if (checkbox) {
      checkbox.reset();
      checkboxValue = false;
    }

    const venuesInstance = dropdownsContainer.getDropdownInstance('venues');
    if (venuesInstance) venuesInstance.updateAllCheckboxes();

    currentSearchTerm = '';

    if (customSearch) {
      const searchInput = customSearch.querySelector('input');
      if (searchInput) {
        searchInput.value = '';
      }
    }

    isResetting = false;

    if (typeof window.resetProductSlate === 'function') {
      window.resetProductSlate();
    }
  });

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
      groupData,
    );
    fetchTableData(filters);
  });

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

  filterBy.appendChild(pillsContainer);
  filter.appendChild(mainFilters);
  mainFilters.appendChild(filtersContent);
  filtersContent.appendChild(title);
  filtersContent.appendChild(searchRow);
  if (customSearch) searchRow.appendChild(customSearch);
  if (checkbox) searchRow.appendChild(checkbox);
  filtersContent.appendChild(closeModal);
  filtersContent.appendChild(wrap);
  wrap.appendChild(scrollMobileWrapper);
  scrollMobileWrapper.appendChild(filterRow);
  scrollMobileWrapper.appendChild(secondFilterRow);
  secondFilterRow.appendChild(dropdownsContainer);
  mainFilters.appendChild(applyButton);
  buttonsContainerMobile.appendChild(resetButton);
  buttonsContainerMobile.appendChild(filterButton);
  buttonsContainerDesktop.appendChild(resetButton.cloneNode(true));
  buttonsContainerDesktop.appendChild(filterButton.cloneNode(true));
  dropdownsContainer.appendChild(buttonsContainerDesktop);
  filter.appendChild(buttonsContainerMobile);
  filter.appendChild(filterBy);

  filter.getFilters = () => {
    const allSelections = dropdownsContainer.getSelections();
    return buildFiltersObject(
      allSelections,
      currentSearchTerm,
      checkboxValue,
      groupData,
    );
  };

  filter.refreshData = () => {
    const filters = filter.getFilters();
    fetchTableData(filters);
  };

  filter.resetFilters = () => {
    resetButton.click();
  };

  const resetButtonDesktop = buttonsContainerDesktop.querySelector('.reset-button');
  const filterButtonDesktop = buttonsContainerDesktop.querySelector('.filter-button');

  resetButtonDesktop.addEventListener('click', () => {
    resetButton.click();
  });

  filterButtonDesktop.addEventListener('click', () => {
    filterButton.click();
  });

  const urlFilters = getFiltersFromURL();

  const hasURLFilters = Object.keys(urlFilters).some((key) => {
    const value = urlFilters[key];
    return Array.isArray(value) ? value.length > 0 : value;
  });

  if (hasURLFilters) {
    const selections = convertURLFiltersToSelections(urlFilters, groupData, options);

    dropdownsContainer.setSelections(selections);

    if (urlFilters.searchTerm && customSearch) {
      currentSearchTerm = urlFilters.searchTerm;
      customSearch.setValue(urlFilters.searchTerm);
    }

    if (urlFilters.tags && checkbox) {
      checkboxValue = true;
      checkbox.setChecked(true);
    }

    const allSelections = dropdownsContainer.getSelections();
    pillsContainer.clear();
    pillsContainer.syncWithDropdowns(allSelections);
  }

  return filter;
}

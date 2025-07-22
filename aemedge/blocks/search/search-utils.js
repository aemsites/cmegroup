import searchConfig from './search-config.js';

const urlUpdate = () => {
  const url = new URL(window.location.href);

  // Remove existing hash
  url.hash = '';

  // Handle filters
  if (searchConfig.appliedFilters.length > 0) {
    const filterValues = searchConfig.appliedFilters
      .map((f) => f.value.split('/').at(-1))
      .join(',');
    url.hash = `filters=${filterValues}`;
  }

  // Handle search
  if (searchConfig.searchInput && searchConfig.searchInput.trim() !== '') {
    const searchParam = `search=${encodeURIComponent(searchConfig.searchInput.trim())}`;
    url.hash = url.hash ? `${url.hash}&${searchParam}` : searchParam;
  }

  // Handle pagination
  if (searchConfig.pagination?.currentPage > 1) {
    const pageParam = `pageNum=${searchConfig.pagination.currentPage}`;
    url.hash = url.hash ? `${url.hash}&${pageParam}` : pageParam;
  }

  // Update the URL
  window.history.pushState({}, '', url.toString());
};

/**
 * Add a filter to the search config
 * @param {string} filterId - The ID of the filter
 * @param {string} value - The value of the filter
 */
const addAppliedFilter = (filterId, value, labelContent) => {
  const exists = searchConfig.appliedFilters
    .some((f) => f.filterId === filterId && f.value === value);
  if (!exists) {
    searchConfig.appliedFilters.push({ filterId, value, labelContent });
  }
};

/**
 * Remove a filter from the search config
 * @param {string} filterId - The ID of the filter
 * @param {string} value - The value of the filter
 */
const removeAppliedFilter = async (filterId, value) => {
  searchConfig.appliedFilters = searchConfig
    .appliedFilters.filter((f) => f.filterId !== filterId || f.value !== value);
};

/**
 * Toggle the clear button visibility
 * @param {boolean} value - The value of the clear button
 */
const toggleClearButton = (value) => {
  const clearBtn = document.querySelector('.search .search-bar-wrapper .nav-close');
  if (clearBtn) {
    clearBtn.classList.toggle('display-none', !value);
  }
};

/**
 * Clear all filters and reset the search input
 */
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
  toggleClearButton(false);
};

/**
 * Parse URL hash and populate filters and search input
 */
const populateFromURL = () => {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.replace('#', ''));

  // Handle search input
  const searchValue = hashParams.get('search');
  if (searchValue) {
    searchConfig.searchInput = decodeURIComponent(searchValue);
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
      searchInput.value = searchConfig.searchInput;
      toggleClearButton(true);
    }
  }

  // Handle pagination
  const pageValue = hashParams.get('pageNum');
  if (pageValue) {
    const pageNum = parseInt(pageValue, 10);
    if (!Number.isNaN(pageNum) && pageNum > 0) {
      searchConfig.pagination.currentPage = pageNum;
    }
  } else {
    searchConfig.pagination.currentPage = 1;
  }

  // Handle filters
  const filterValues = hashParams.get('filters');
  if (filterValues) {
    const filters = filterValues.split(',');

    filters.forEach((filterValue) => {
      // Find the corresponding checkbox
      const checkboxboxes = document.querySelectorAll(`.dropdown-option-checkbox[value$="/${filterValue}"],
        .dropdown-option-checkbox[value="${filterValue}"], .checkbox-input[value$="/${filterValue}"],
        .checkbox-input[value="${filterValue}"]`);

      if (checkboxboxes?.length) {
        checkboxboxes.forEach((checkbox) => {
          checkbox.checked = true;
          // Add to applied filters
          const filterId = checkbox.closest('.dropdown')?.id || checkbox.closest('.checkbox')?.id || '';
          const labelContent = checkbox.closest('.dropdown')?.querySelector('.dropdown-option-label')?.textContent
            || checkbox.nextElementSibling?.textContent;
          if (filterId) {
            addAppliedFilter(filterId, checkbox.value, labelContent);
          }
        });
      }
    });
  }
};

export {
  addAppliedFilter,
  removeAppliedFilter,
  toggleClearButton,
  clearAllFilters,
  urlUpdate,
  populateFromURL,
};

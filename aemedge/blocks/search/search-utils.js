import searchConfig from './search-config.js';

/**
 * Add a filter to the search config
 * @param {string} filterId - The ID of the filter
 * @param {string} value - The value of the filter
 */
const addAppliedFilter = (filterId, value) => {
  const exists = searchConfig.appliedFilters
    .some((f) => f.filterId === filterId && f.value === value);
  if (!exists) {
    searchConfig.appliedFilters.push({ filterId, value });
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

export {
  addAppliedFilter,
  removeAppliedFilter,
  toggleClearButton,
  clearAllFilters,
};

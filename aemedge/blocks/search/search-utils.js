import searchConfig from './search-config.js';

const addAppliedFilter = (filterId, value) => {
  const exists = searchConfig.appliedFilters
    .some((f) => f.filterId === filterId && f.value === value);
  if (!exists) searchConfig.appliedFilters.push({ filterId, value });
};

const removeAppliedFilter = (filterId, value) => {
  searchConfig.appliedFilters = searchConfig
    .appliedFilters.filter((f) => f.filterId !== filterId || f.value !== value);
};

const toggleClearButton = (block, value) => {
  const clearBtn = block.querySelector('.search-bar-wrapper .nav-close');
  if (clearBtn) {
    clearBtn.classList.toggle('display-none', !value);
  }
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

export {
  addAppliedFilter,
  removeAppliedFilter,
  toggleClearButton,
  clearAllFilters,
};

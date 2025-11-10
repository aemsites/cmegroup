import { createElement, i18n } from '../../../../scripts/utils.js';

const [
  placeholderText,
] = await Promise.all([
  i18n('Search by product name or symbol'),
]);

function createSearchInput(options = {}) {
  const searchComponent = createElement('div', {
    class: 'search-component',
  });
  const searchInput = createElement('input', {
    class: 'search-input',
  });
  searchInput.type = 'text';
  searchInput.placeholder = placeholderText;

  const searchButton = createElement('button', {
    class: 'search-icon',
  });

  const handleSearch = (value) => {
    if (options.onSearch) {
      options.onSearch(value);
    }
  };

  const handleSearchClick = (value) => {
    if (options.onSearchClick) {
      options.onSearchClick(value);
    }
  };

  searchInput.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    handleSearch(value);
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = e.target.value.trim();
      handleSearchClick(value);
    }
  });

  searchButton.addEventListener('click', (e) => {
    e.preventDefault();
    const value = searchInput.value.trim();
    handleSearchClick(value);
  });

  searchComponent.appendChild(searchInput);
  searchComponent.appendChild(searchButton);

  searchComponent.getValue = () => searchInput.value;
  searchComponent.setValue = (value) => {
    searchInput.value = value;
    handleSearch(value);
  };
  searchComponent.clear = () => {
    searchInput.value = '';
    handleSearch('');
  };
  searchComponent.focus = () => searchInput.focus();
  searchComponent.disable = () => {
    searchInput.disabled = true;
    searchButton.disabled = true;
  };
  searchComponent.enable = () => {
    searchInput.disabled = false;
    searchButton.disabled = false;
  };

  return searchComponent;
}

function createQuickSearch() {
  return createSearchInput({
    onSearch: () => {},
    onSearchClick: () => {},
  });
}

export { createSearchInput, createQuickSearch };

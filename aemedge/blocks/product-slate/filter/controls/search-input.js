import { createElement } from '../../../../scripts/utils.js';

function createSearchInput(options = {}) {
  const searchComponent = createElement('div', {
    class: 'search-component',
  });
  const searchInput = createElement('input', {
    class: 'search-input',
  });
  searchInput.type = 'text';
  searchInput.placeholder = 'Search by product name or symbol';

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
    onSearch: (value) => console.log('Typing:', value),
    onSearchClick: (value) => console.log('Clicked search:', value),
  });
}

export { createSearchInput, createQuickSearch };

import {
  getSearchSuggestions,
  getPopularSearch,
  getRecentSearch,
  updateRecentSearch,
} from '../../../scripts/services/SearchResultsService.js';
import { createElement } from '../../../scripts/utils.js';
import { store } from '../../../scripts/store/store.js';
import { getAbsoluteUrl, isEmpty } from '../../../scripts/utils/index.js';

const customSearch = createElement('div', { class: 'custom-search' });
const searchContainer = createElement('div', { class: 'search-container' });
const inputSearch = createElement('input');
const buttonSearch = createElement('button', { class: 'searching' });
const spanSearch = createElement('span', { class: 'icon-search' });
const popularSearchesContainer = createElement('div', { class: 'popular-searches' });
const suggestionSearchesContainer = createElement('div', { class: 'suggestion-searches' });
const recentSearchesContainer = createElement('div', { class: 'recent-searches' });
const searchUrl = '/search.html';
let popularSearchesVar;
let suggestionsVar;
let recentSearchesVar;
let loggedIn = false;
let thisLoginInfo = {};
let searchValueVar = '';
let timeoutId;

const setSearch = (term) => updateRecentSearch(thisLoginInfo, loggedIn, term);

const handleClickSuggestionSearches = async (title, page) => {
  await setSearch(title);
  window.location = getAbsoluteUrl(page);
};

const handleClickRecentSearches = async (term) => {
  await setSearch(term);
  window.location = `${getAbsoluteUrl(searchUrl)}?q=${encodeURIComponent(term)}`;
};

const buildSuggestionSearches = (suggestions) => {
  if (isEmpty(suggestions)) {
    return suggestionSearchesContainer;
  }

  suggestionSearchesContainer.innerHTML = `
  <span class='title'>Suggestions</span>
  <div class='searches'>
    ${suggestions.map(({ title, page }) => `
      <div class='search'>
        <button 
          type="button"
          data-title="${title}"
          data-page="${page}"
          class="suggestion-button" 
        >
          <span class="icon-arrow-right"></span>
          <span>${title}</span>
        </button>
      </div>
    `).join('')}
  </div>
  `;

  suggestionSearchesContainer.querySelectorAll('.suggestion-button').forEach((button) => {
    button.addEventListener('click', () => {
      const { title } = button.dataset;
      const { page } = button.dataset;
      handleClickSuggestionSearches(title, page);
    });
  });

  return suggestionSearchesContainer;
};

const buildRecentSearches = (recentSearches) => {
  if (isEmpty(recentSearches)) {
    return recentSearchesContainer;
  }

  recentSearchesContainer.innerHTML = `
  <span class='title'>Recent searches</span>
  <div class='searches'>
    ${recentSearches.map((search) => `
      <div class='search'>
        <span class="icon-history"></span>
        <button
          type="button"
          class="recent-search-button"
          data-term="${search.term}"
        >
          ${search.term}
        </button>
      </div>
    `).join('')}
  </div>
  `;

  recentSearchesContainer.querySelectorAll('.recent-search-button').forEach((button) => {
    button.addEventListener('click', () => {
      const { term } = button.dataset;
      handleClickRecentSearches(term);
    });
  });

  return recentSearchesContainer;
};

const buildPopularSearches = (popularSearches) => {
  if (isEmpty(popularSearches)) {
    return popularSearchesContainer;
  }

  const limit = 10;

  popularSearchesContainer.innerHTML = `
  <h6 class='title'>Trending Pages</h6>
  <div class='searches'>
    ${popularSearches
    .slice(0, limit)
    .map(({ url, title }) => (
      `<a href="${getAbsoluteUrl(url)}" class='search-box'>
        <span class='box-title'>
          ${title}
        </span>
        <span class="icon-arrow-right"></span>
      </a>`
    ))
    .join('')}
  </div>
`;

  return popularSearchesContainer;
};

const updatePopularSearches = async () => {
  popularSearchesVar = await getPopularSearch();
  if (popularSearchesVar.length > 0) {
    if (customSearch.contains(popularSearchesContainer)) {
      popularSearchesContainer.remove();
    }
    customSearch.append(buildPopularSearches(popularSearchesVar));
  }
};

const updateRecentSearches = async (loginInfo) => {
  recentSearchesVar = await getRecentSearch(loginInfo);
  if (recentSearchesVar.length > 0) {
    if (customSearch.contains(recentSearchesContainer)) {
      recentSearchesContainer.remove();
    }
    customSearch.append(buildRecentSearches(recentSearchesVar));
  }
};

const getSuggestions = async (searchValue) => {
  if (searchValue !== '') {
    if (customSearch.contains(recentSearchesContainer)) {
      recentSearchesContainer.remove();
    }

    if (customSearch.contains(popularSearchesContainer)) {
      popularSearchesContainer.remove();
    }

    suggestionsVar = await getSearchSuggestions(searchValue, 5);
    if (suggestionsVar.length > 0) {
      if (customSearch.contains(suggestionSearchesContainer)) {
        suggestionSearchesContainer.remove();
      }
      customSearch.append(buildSuggestionSearches(suggestionsVar));
    }
  }
};

const handleChange = (e) => {
  searchValueVar = e.target.value;
  if (searchValueVar !== '') {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      getSuggestions(searchValueVar);
    }, 400);
  } else {
    customSearch.append(buildRecentSearches(recentSearchesVar));
    customSearch.append(buildPopularSearches(popularSearchesVar));
  }
};

const handleSearch = async () => {
  if (!searchValueVar.trim()) {
    return;
  }
  await setSearch(searchValueVar);
  window.location = `${getAbsoluteUrl(searchUrl)}?q=${encodeURIComponent(searchValueVar)}`;
};

const handleEnter = (e) => {
  if (e.key === 'Enter') {
    handleSearch();
  }
};

const init = async () => {
  updatePopularSearches();
  updateRecentSearches();
};

const renderSearch = () => {
  init();

  buttonSearch.addEventListener('click', async () => {
    handleSearch();
  });
  buttonSearch.append(spanSearch);
  inputSearch.addEventListener('input', async (e) => {
    handleChange(e);
  });
  inputSearch.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      handleEnter(e);
    }
  });
  inputSearch.placeholder = 'Search products, pages and more';

  searchContainer.append(inputSearch);
  searchContainer.append(buttonSearch);
  customSearch.append(searchContainer);
  customSearch.append(buildRecentSearches(recentSearchesVar));
  customSearch.append(buildPopularSearches(popularSearchesVar));

  store.subscribe(({ authentication }) => authentication, ({ isLoggedIn, loginInfo }) => {
    if (isLoggedIn !== loggedIn) {
      loggedIn = isLoggedIn;
      thisLoginInfo = loginInfo;
      updateRecentSearches(thisLoginInfo);
    }
  });

  return customSearch;
};

// eslint-disable-next-line import/prefer-default-export
export { renderSearch };

import {
  getSearchSuggestions,
  getPopularSearch,
  getRecentSearch,
  updateRecentSearch,
} from '../../../scripts/services/SearchResultsService.js';
import { createElement } from '../../../scripts/utils.js';
import { getAbsoluteUrl, debounce } from '../../../scripts/utils/index.js';
// import SuggestionSearches from './suggestion-searches/suggestion-searches';
// import RecentSearches from './recent-searches/recent-searches';
// import PopularSearches from './popular-searches/popular-searches';

const customSearch = createElement('div', { class: 'custom-search' });
const searchContainer = createElement('div', { class: 'search-container' });
const inputSearch = createElement('input');
const buttonSearch = createElement('button', { class: 'searching' });
const spanSearch = createElement('span', { class: 'icon-search' });

const updatePopularSearches = async () => {
  const popularSearches = await getPopularSearch();
  this.setState({ popularSearches });
};

const updateRecentSearches = async () => {
  const { AEMAuth } = this.props;
  const loginInfo = await AEMAuth.loginPromise;
  const recentSearches = await getRecentSearch(loginInfo);
  this.setState({ recentSearches });
};

const getSuggestions = async (searchValue) => {
  const isTyping = !!searchValue;
  this.setState({ isTyping });
  const suggestions = await getSearchSuggestions(searchValue, 5);
  this.setState({ suggestions });
};

const debouncedGetSuggestions = debounce(getSuggestions, 500);

const handleChange = (e) => {
  e.persist();
  const searchValue = e.target.value || '';
  this.setState({ searchValue });
  debouncedGetSuggestions(searchValue);
};

const handleEnter = (e) => {
  if (e.key === 'Enter') {
    this.handleSearch();
  }
};

const setSearch = (term) => {
  const { AEMAuth } = this.props;
  return updateRecentSearch(AEMAuth, term);
};

const handleSearch = async () => {
  const { searchUrl } = this.props;
  const { searchValue } = this.state;
  if (!searchValue.trim()) {
    return;
  }
  await setSearch(searchValue);
  window.location = `${getAbsoluteUrl(searchUrl)}?q=${encodeURIComponent(searchValue)}`;
};

const init = async () => {
  updatePopularSearches();
  updateRecentSearches();
};

const buildSuggestionSearches = (customSearch) => {
//   <SuggestionSearches
//     searches=${suggestions}
//     handleSetSearch=${this.setSearch}
//   />
};

const buildRecentSearches = (customSearch) => {
//     <RecentSearches
//       searches=${recentSearches}
//       handleSetSearch=${this.setSearch}
//       searchUrl=${searchUrl}
//     />
};

const buildPopularSearches = (customSearch) => {
  //     <PopularSearches searches=${popularSearches} />
};

const renderSearch = () => {
  init();

  buttonSearch.addEventListener('click', async () => {
    handleSearch();
  });
  buttonSearch.append(spanSearch);
  inputSearch.addEventListener('change', async () => {
    handleChange();
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

  // isTyping
  buildSuggestionSearches(customSearch);
  // !isTyping
  buildRecentSearches(customSearch);
  buildPopularSearches(customSearch);

  return customSearch;
};

// eslint-disable-next-line import/prefer-default-export
export { renderSearch };

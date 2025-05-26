import {
  a, div,
} from '../../../scripts/dom-helpers.js';
import searchConfig from '../search-config.js';
import { updateFilteringByUI } from '../filter-bullets/filter-bullets.js';
import { getCards } from './cards-template.js';
import { i18n } from '../../../scripts/utils.js';
import { clearAllFilters } from '../search-utils.js';

const searchResults = async () => {
  const apiReq = {};
  if (searchConfig.pagination?.show) {
    apiReq.pagination = searchConfig.pagination.num;
  }
  if (searchConfig.sortOptions) {
    apiReq.sort = searchConfig.sortOptions;
  }
  if (searchConfig.template) {
    apiReq.template = searchConfig.template;
  }

  apiReq.filters = searchConfig.appliedFilters.map((filter) => {
    if (filter.value.endsWith('--star')) {
      return filter.value.replace('--star', '');
    }
    return filter.value;
  });

  const mockResults = await fetch('/aemedge/blocks/search/mock-results.json').then((res) => res.json());
  console.log('Search Results Called');

  // eslint-disable-next-line no-use-before-define
  filterAndRender(mockResults.results);
};

async function filterAndRender(results) {
  const resultsTitle = document.querySelector('.results-title');
  const resultsWrapper = document.querySelector('.results-wrapper');

  const [
    resultsTitleText,
    resultsTitleText2,
    noResultsText,
    resetText,
  ] = await Promise.all([
    i18n('Showing'),
    i18n('Results'),
    i18n('No results found. There are no results that meet your selection criteria.'),
    i18n('Reset filters'),
  ]);

  if (resultsTitle) {
    resultsTitle.querySelector('h4').textContent = `${resultsTitleText} ${results.length} ${resultsTitleText2}`;
  }

  resultsWrapper.innerHTML = '';

  if (results.length === 0) {
    const noResultsDiv = div({ class: 'no-results' }, `${noResultsText} `);
    const reset = a({ class: 'reset', href: '#' }, resetText);
    noResultsDiv.appendChild(reset);

    reset.onclick = async (e) => {
      e.preventDefault();
      clearAllFilters();
      await updateFilteringByUI(document.querySelector('.filter-bullets'), searchResults);
    };
    resultsWrapper.appendChild(noResultsDiv);
    return;
  }

  results.forEach(async (item) => {
    const cardType = searchConfig.template[item.template]?.cardType || '';
    const cardDetails = await getCards(cardType, item);
    resultsWrapper.appendChild(cardDetails);
  });
}

export {
  searchResults,
  filterAndRender,
};

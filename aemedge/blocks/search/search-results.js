import {
  a, div,
} from '../../scripts/dom-helpers.js';
import searchConfig from './search-config.js';
import { clearAllFilters, updateFilteringByUI } from './filter.js';
import { getCards } from './cards-template.js';

// Mock dataset
const mockResults = [
  {
    type: 'lesson',
    topic: 'Introduction to Futures',
    assetClass: 'Derivatives',
    product: 'Futures',
    title: 'Definition of a Futures Contract',
    description: 'Learn more about the functions of a Futures contract, including the benefits of a standardized, exchange-traded contract.',
    date: 'Jul 11, 2024',
    lessons: 0,
    template: 'lesson',
  },
  {
    type: 'course',
    topic: 'Introduction to Futures',
    assetClass: 'Derivatives',
    product: 'Futures',
    title: 'Introduction to Futures',
    description: 'Learn about futures contracts, the role of a futures exchange, who participates in this market and how a futures trade works.',
    date: 'Jul 11, 2024',
    lessons: 18,
    template: 'article',
  },
  // Add more mock results as needed
];

const searchResults = () => {
  console.log('searchResults');
  // eslint-disable-next-line no-use-before-define
  filterAndRender(mockResults);
};

function filterAndRender(results) {
  const resultsTitle = document.querySelector('.results-title');
  const resultsWrapper = document.querySelector('.results-wrapper');

  if (resultsTitle) {
    resultsTitle.querySelector('h4').textContent = `Showing ${results.length} Results`;
  }

  resultsWrapper.innerHTML = '';

  if (results.length === 0) {
    const noResultsDiv = div({ class: 'no-results' }, 'No results found. There are no results that meet your selection criteria. ');
    const reset = a({ class: 'reset', href: '#' }, 'Reset filters');
    noResultsDiv.appendChild(reset);

    reset.onclick = (e) => {
      e.preventDefault();
      clearAllFilters();
      updateFilteringByUI(document.querySelector('.filter-bullets'), searchResults);
      searchResults?.();
    };
    resultsWrapper.appendChild(noResultsDiv);
    return;
  }

  results.forEach((item) => {
    const cardType = searchConfig.template[item.template]?.cardType || '';
    const cardDetails = getCards(cardType, item);
    resultsWrapper.appendChild(cardDetails);
  });
}

export {
  searchResults,
  filterAndRender,
};

import {
  a, div,
} from '../../../scripts/dom-helpers.js';
import searchConfig from '../search-config.js';
import { updateFilteringByUI } from '../filter-bullets/filter-bullets.js';
import { getCards } from './cards-template.js';
import { i18n } from '../../../scripts/utils.js';
import { clearAllFilters } from '../search-utils.js';

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
    href: 'www.google.com',
    image: 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png',
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
    href: 'www.google.com',
    image: 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png',
  },
  // Add more mock results as needed
];

const searchResults = () => {
  console.log('searchResults');
  // eslint-disable-next-line no-use-before-define
  filterAndRender(mockResults);
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

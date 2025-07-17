import {
  a, div,
} from '../../../scripts/dom-helpers.js';
import searchConfig from '../search-config.js';
import { updateFilteringByUI } from '../filter-bullets/filter-bullets.js';
import { getCards } from './cards-template.js';
import { i18n } from '../../../scripts/utils.js';
import { clearAllFilters } from '../search-utils.js';

const API_ENDPOINT = 'https://beta.cmegroup.com/services/query-index/search';

function showSpinner(container) {
  const spinner = div({ class: 'search-spinner' }, div({ class: 'spinner' }));
  container.innerHTML = '';
  container.appendChild(spinner);
}

const buildSearchRequest = () => {
  const request = {
    page: searchConfig.pagination?.currentPage || 1,
    size: searchConfig.pagination?.size || 10,
    query: {
      languages: ['en'], // currently hardcoding languages
      fullText: searchConfig.searchInput || '',
    },
    getFacets: searchConfig.getFacets,
  };

  const mp = {};
  searchConfig.appliedFilters.forEach((filter) => {
    const value = filter.value.endsWith('--star') ? filter.value.replace('--star', '') : filter.value;
    if (mp[filter.filterId]) {
      mp[filter.filterId].push(value);
    } else {
      mp[filter.filterId] = [value];
    }
  });

  if (Object.keys(mp).length > 0) {
    request.query.tags = [];
    Object.keys(mp).forEach((key) => {
      request.query.tags.push({
        or: mp[key],
      });
    });
  }

  if (searchConfig.template && Object.keys(searchConfig.template).length > 0) {
    request.query.templates = Object.keys(searchConfig.template);
    Object.keys(searchConfig.template).forEach((template) => {
      if (searchConfig.template[template].paths?.length > 0) {
        searchConfig.template[template].paths.forEach((path) => {
          if (request.query.basePaths) {
            request.query.basePaths.push(path);
          } else {
            request.query.basePaths = [path];
          }
        });
      }
    });
  }

  if (searchConfig.sortOptions) {
    // request.sort = {
    //   field: searchConfig.sortOptions.value,
    //   order: searchConfig.sortOptions.sortType,
    // };
  }

  return request;
};

const searchResults = async () => {
  const apiReq = buildSearchRequest();
  showSpinner(document.querySelector('.results-wrapper'));

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-agent': 'CME Group Helix', // todo temporary change
      },
      body: JSON.stringify(apiReq),
    });

    if (!response.ok) {
      throw new Error(`Search API returned ${response.status}: ${response.statusText}`);
    }

    const results = await response.json();

    // Update pagination info from response
    if (results.pagination) {
      searchConfig.pagination = {
        ...searchConfig.pagination,
        total: results.pagination.total,
        totalPages: results.pagination.totalPages,
      };
    }

    if (results.facets) {
      // Common function to update option counts
      const updateOptionCount = (element) => {
        const input = element.querySelector('input');
        const label = element.querySelector('label');

        if (!input || !label) return;

        const facetValue = input.value;
        const existingText = label.textContent;
        const lastText = existingText?.match(/\(\d+\)$/);
        const baseText = existingText.replace(lastText, '');
        const matchingFacet = results.facets?.find((f) => f.tag === facetValue);
        const count = matchingFacet ? matchingFacet.count : 0;

        label.textContent = `${baseText} (${count})`;
      };

      // Update both dropdowns and checkboxes
      document.querySelectorAll('.dropdown-option, .checkbox-option')
        .forEach(updateOptionCount);
    }

    // eslint-disable-next-line no-use-before-define
    filterAndRender(results.data || []);
  } catch (error) {
    console.error('Search failed:', error);
    // eslint-disable-next-line no-use-before-define
    filterAndRender([]);
  }
};

async function filterAndRender(results) {
  const resultsTitle = document.querySelector('.results-title');
  const resultsWrapper = document.querySelector('.results-wrapper');

  const [
    resultsTitleText,
    resultsTitleText2,
    resultsTitleText3,
    noResultsText,
    resetText,
  ] = await Promise.all([
    i18n('Showing'),
    i18n('Results'),
    i18n('Result'),
    i18n('No results found. There are no results that meet your selection criteria.'),
    i18n('Reset filters'),
  ]);

  if (resultsTitle) {
    const total = searchConfig.pagination?.total || results.length;
    resultsTitle.querySelector('h4').textContent = `${resultsTitleText} ${total} ${total === 1 ? resultsTitleText3 : resultsTitleText2}`;
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
    const cardType = searchConfig.template?.[item.template]?.cardType || '';
    const cardDetails = await getCards(cardType, item);
    resultsWrapper.appendChild(cardDetails);
  });
}

export {
  searchResults,
  filterAndRender,
};

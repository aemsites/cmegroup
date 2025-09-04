import {
  a, div,
} from '../../../scripts/dom-helpers.js';
import searchConfig from '../search-config.js';
import { updateFilteringByUI } from '../filter-bullets/filter-bullets.js';
import { getCards } from './cards-template.js';
import { i18n, setupDayjsLibs } from '../../../scripts/utils.js';
import { clearAllFilters } from '../search-utils.js';
import { buildIndexFilter, getIndexedContent } from '../../../scripts/indexing.js';
import renderPagination from './pagination.js';

function showSpinner(container) {
  const spinner = div({ class: 'search-spinner' }, div({ class: 'spinner' }));
  container.innerHTML = '';
  container.appendChild(spinner);
}

const buildSearchRequest = () => {
  const request = {
    basePaths: searchConfig.basePaths,
    page: searchConfig.pagination?.currentPage || 1,
    limit: searchConfig.pagination?.size || 10,
    fullText: searchConfig.searchInput || '',
    languages: ['en'], // currently hardcoding languages
    getFacets: searchConfig.getFacets,
  };

  if (searchConfig.template && Object.keys(searchConfig.template).length > 0) {
    request.templates = Object.keys(searchConfig.template).join(',');
  }

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
    request.customTagObjArr = [];
    Object.keys(mp).forEach((key) => {
      request.customTagObjArr.push({
        or: mp[key],
      });
    });
  }

  if (searchConfig.basePaths) {
    request.basePaths = searchConfig.basePaths;
  }

  if (searchConfig.sortOptions) {
    request.orderBy = searchConfig.sortOptions.value;
    request.sortDirection = searchConfig.sortOptions.sortType;
  }

  return buildIndexFilter(request);
};

const searchResults = async () => {
  const apiReq = buildSearchRequest();
  showSpinner(document.querySelector('.results-wrapper'));
  const results = await getIndexedContent(apiReq);

  if (results && Object.keys(results).length > 0) {
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
        const matchingFacet = results.facets?.find((f) => f.tag === facetValue);
        const count = matchingFacet ? matchingFacet.count : 0;

        let countSpan = label.querySelector('.filter-facet');
        if (!countSpan) {
          countSpan = document.createElement('span');
          countSpan.className = 'filter-facet';
          label.appendChild(countSpan);
        }

        countSpan.textContent = ` (${count})`;
      };

      // Update both dropdowns and checkboxes
      document.querySelectorAll('.dropdown-option, .checkbox-option')
        .forEach(updateOptionCount);
    }

    // eslint-disable-next-line no-use-before-define
    filterAndRender(results.data || []);
  } else {
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
    setupDayjsLibs(),
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

  // Create a container for the results cards
  const resultsContainer = div({ class: 'results-container' });
  const cards = await Promise.all(
    results.map(async (item) => {
      const cardType = searchConfig.template?.[item.template]?.cardType || '';
      return getCards(cardType, item);
    }),
  );

  cards.forEach((card) => resultsContainer.appendChild(card));
  resultsWrapper.appendChild(resultsContainer);

  // Render pagination if enabled
  if (searchConfig.pagination?.show) {
    await renderPagination(resultsWrapper, async () => {
      await searchResults();
    });
  }
}

export {
  searchResults,
  filterAndRender,
};

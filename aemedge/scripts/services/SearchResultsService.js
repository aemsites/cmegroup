import {
  apiGet,
  apiGetAbsolute,
  apiPostAbsolute,
  getResponseData,
  DataCacheUtil,
  getPopularSearchUrl,
  getRecentSearchByUserUrl,
  getRecentSearchFullUpdateByUserUrl,
  updateRecentSearchUrl,
  getSearchSuggestionsUrl,
} from '../utils/index.js';
import { formatToCentralTime, isDateBefore } from '../utils.js';

const getUserInfo = ({ userId, token }) => ({ userId, token });

// this data is shared between search box and search results...
const searchCache = new DataCacheUtil(1000);

export async function getSearchAdvisories(
  mranSearch = false,
  limit = 5,
) {
  const latestsUrl = '/content/cmegroup/en/search/advisories/jcr:content/full-par/cmetable.ajax.';
  const filterSearch = mranSearch
    ? 'Advisory%20Notices%2CMarket%20Regulation%20Advisories%2CMRANs.-.-.1.-.-'
    : '';
  const url = `${latestsUrl}${filterSearch}.json`;
  try {
    const response = await apiGet(url);
    const data = getResponseData(response, 'results');
    return data.slice(0, limit).map(({ dynamicProperties: el }) => ({
      ...el,
      path:
        (el.path && el.path.includes('.html') ? el.path : `${el.path}.html`)
          || '',
    }));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('SearchResultsService => getSearchLatests error:', e);
    return [];
  }
}

export async function getSearchProducts(term) {
  const productsUrl = '/CmeWS/mvc/ProductSlate/V2/List?pageNumber=1&sortAsc=false&sortField=rank';
  const url = `${productsUrl}&searchString=${term}&pageSize=5`;
  try {
    const response = await apiGet(url);
    return getResponseData(response, 'products');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('SearchResultsService => fetchProducts error:', e);
    return [];
  }
}

export async function getProductFilters() {
  const url = '/CmeWS/mvc/ProductSlate/V2/List';
  try {
    const response = await apiGet(url);
    return getResponseData(response, 'filters');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('SearchResultsService => getProductFilters error:', e);
    return [];
  }
}

export async function getSearchResultsApi(
  term,
  facet,
  startIndex = 1,
) {
  const resultsUrl = window.globalConfig?.googleSearchUrl
    || 'https://www.googleapis.com/customsearch/v1?key=AIzaSyA08OZ-RbJDylrSmnVUC4kK2poCIXHhiIU&cx=008309878562025710937:xfqpxxldhce';
  const url = `${resultsUrl}&q=${term}${
    facet ? `+${facet}` : ''
  }&start=${startIndex}`;
  try {
    const response = await apiGet(url);
    return getResponseData(response);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('SearchResultsService => getSearchResults error:', e);
    return [];
  }
}

export async function getSearchResults(
  term,
  facet,
  startIndex = 1,
) {
  const data = await searchCache.getData(
    'search',
    getSearchResultsApi,
    term,
    facet,
    startIndex,
  );
  return data;
}

export async function getPopularSearch() {
  const url = window.globalConfig?.popularSearchUrl
    || getPopularSearchUrl();
  try {
    const response = await apiGetAbsolute(url);
    const data = getResponseData(response, 'data');
    return data.map((item) => {
      const { title } = item;
      return {
        ...item,
        title: title.replace(/( - CME Group)/gi, ''),
      };
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('SearchResultsService => getSearchPopular error:', e);
    return [];
  }
}

export async function getRecentSearch(loginInfo) {
  const localSearches = window.LocalStorageUtil?.get('searches', true) || [];

  if (!loginInfo) {
    return localSearches;
  }

  try {
    const loggedSearches = getResponseData(
      await apiPostAbsolute(getRecentSearchByUserUrl(), {
        ...getUserInfo(loginInfo),
      }),
      'data',
    );

    const mergedSearches = [...loggedSearches, ...localSearches]
      .reduce((acc, curr) => {
        const index = acc.findIndex((el) => el.term === curr.term);
        if (index < 0) {
          acc.push(curr);
        } else if (isDateBefore(new Date(acc[index].lastUpdated), new Date(curr.lastUpdated))) {
          acc[index] = curr;
        }
        return acc;
      }, [])
      .sort(
        (a, b) => new Date(b.lastUpdated).valueOf() - new Date(a.lastUpdated).valueOf(),
      )
      .slice(0, 5);

    apiPostAbsolute(
      getRecentSearchFullUpdateByUserUrl(),
      {
        ...getUserInfo(loginInfo),
        terms: mergedSearches.map((term) => term.term),
      },
      { 'Content-Type': 'application/json; charset=utf-8' },
    );

    return mergedSearches;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('SearchResultsService => getRecentSearch error:', e);
    return null;
  }
}

export async function updateRecentSearch(
  loginInfo,
  isLoggedIn,
  term,
) {
  if (isLoggedIn) {
    try {
      return apiPostAbsolute(
        updateRecentSearchUrl(),
        {
          ...getUserInfo(loginInfo),
          terms: [term],
        },
        { 'Content-Type': 'application/json; charset=utf-8' },
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('SearchResultsService => updateRecentSearch error:', e);
      return [];
    }
  }

  let searches = window.LocalStorageUtil?.get('searches', true) || [];
  const newSearch = {
    term,
    lastUpdated: formatToCentralTime(new Date(), true),
  };

  if (!searches.length) {
    searches = [newSearch];
  } else {
    let index = searches.findIndex(({ term: t }) => t === term);

    // if newSearch exists and is not in first position, remove it (then place first)
    if (index >= 0 && searches[0].term !== term) {
      searches.splice(index, 1);
      index = -1;
    }

    if (index < 0) {
      const combinedSearches = [newSearch, ...searches];
      searches = combinedSearches.slice(0, 5);
    }
  }

  window.LocalStorageUtil?.set('searches', searches);

  return searches;
}

export async function getSearchSuggestions(
  term,
  limit,
) {
  try {
    const response = await apiGetAbsolute(getSearchSuggestionsUrl(term));
    const data = getResponseData(response, 'data');
    if (data) {
      return data.slice(0, limit);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('SearchResultsService => getSearchSuggestions error:', e);
  }
  return [];
}

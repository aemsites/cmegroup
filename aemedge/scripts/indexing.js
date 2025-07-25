/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
/* eslint-disable max-len */
import { urlByEnvType } from './utils.js';
import { apiPost, getResponseData } from './utils/index.js';

const QUERY_INDEX_ENDPOINT = '/services/query-index/search';

function hasValue(value) {
  return value !== null && value !== undefined && value !== '' && !Number.isNaN(value);
}

/**
 * Builds a search using the config from a block
 */
function buildIndexFilter(config) {
  return {
    basePaths: config.basePaths ? config.basePaths.split(',').map((path) => path.trim().toLowerCase()) : [],
    templates: config.templates ? config.templates.split(',').map((template) => template.trim().toLowerCase()) : [],
    tagsAnd: config.tags ? config.tags.split(',').map((tag) => tag.trim().toLowerCase()) : [],
    tagsOr: config['optional-tags'] ? config['optional-tags'].split(',').map((tag) => tag.trim().toLowerCase()) : [],
    tagsNot: config['excluded-tags'] ? config['excluded-tags'].split(',').map((tag) => tag.trim().toLowerCase()) : [],
    relativeDateFrom: config['relative-date-from'], // Number in days
    relativeDateTo: config['relative-date-to'], // Number in days
    orderBy: config.orderBy,
    sortDirection: config.sortDirection,
    limit: config.limit,
    page: 1,
  };
}

/**
 * Search pages on the index.
 * example:
 * getIndexedContent({
 *   basePaths: ['/education'],
 *   templates: ['event'],
 *   tagsAnd: ['content-type/webinar', 'News-And-Events/classroom'], // The page must contain all tags in the array
 *   tagsOr: ['content-type/webinar', 'News-And-Events/classroom'], // The page must contain at least one of the tags in the array
 *   tagsNot: ['content-type/webinar', 'News-And-Events/classroom'], // The page must not contain none of the tags in the array
 *   relativeDateFrom: 0, // Integer number of days from current date (allows negative numbers)
 *   relativeDateTo: 365, // Integer number of days from current date (allows negative numbers)
 *   orderBy: 'date', // The property to order by
 *   sortDirection: 'asc', // use asc or desc
 *   limit: 10, // Max quantity of results
 *   page: 1, // Page num
 * });
 */
async function getIndexedContent(indexFilter) {
  try {
    const postData = {
      page: indexFilter.page || 1,
      size: indexFilter.limit || 10,
      getFacets: indexFilter.getFacets || false,
      query: {},
    };
    if (indexFilter.basePaths && indexFilter.basePaths.length > 0) {
      postData.query.basePaths = indexFilter.basePaths;
    }
    if (indexFilter.templates && indexFilter.templates.length > 0) {
      postData.query.templates = indexFilter.templates;
    }
    if (indexFilter.fullText) {
      postData.query.fullTextSearch = indexFilter.fullText;
    }
    if (indexFilter.languages && indexFilter.languages.length > 0) {
      postData.query.languages = indexFilter.languages;
    }
    const tags = {};
    tags.and = indexFilter.tagsAnd;
    tags.or = indexFilter.tagsOr;
    tags.not = indexFilter.tagsNot;
    if ((tags.and && tags.and.length > 0)
      || (tags.or && tags.or.length > 0)
      || (tags.not && tags.not.length > 0)) {
      postData.tags = tags;
    }
    if (indexFilter.customTagObj && indexFilter.customTagObj.length > 0) {
      postData.query.tags = indexFilter.customTagObj;
    }
    const dateRange = {};
    if (hasValue(indexFilter.relativeDateFrom)) {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() + indexFilter.relativeDateFrom);
      dateFrom.setHours(0, 0, 0, 0);
      dateRange.from = dateFrom.toISOString();
    }
    if (hasValue(indexFilter.relativeDateTo)) {
      const dateTo = new Date();
      dateTo.setDate(dateTo.getDate() + indexFilter.relativeDateTo);
      dateTo.setHours(23, 59, 59, 0);
      dateRange.to = dateTo.toISOString();
    }
    if (dateRange.from || dateRange.to) {
      postData.query.dateRange = dateRange;
    }
    if (indexFilter.orderBy) {
      postData.sort = {
        field: indexFilter.orderBy,
        order: indexFilter.sortDirection || 'desc',
      };
    }
    const url = `${urlByEnvType()}${QUERY_INDEX_ENDPOINT}`;
    const response = await apiPost(url, postData);
    const responseData = getResponseData(response);
    if (indexFilter.getFacets) {
      return responseData;
    }
    return responseData && responseData.data ? responseData.data : responseData;
  } catch (error) {
    console.error('Error loading data:', error);
    if (indexFilter.getFacets) {
      return {};
    }
    return [];
  }
}

export {
  buildIndexFilter,
  getIndexedContent,
};

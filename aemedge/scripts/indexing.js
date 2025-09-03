/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
/* eslint-disable max-len */
import { apiPost, getResponseData, urlByEnvType } from './utils/index.js';

const QUERY_INDEX_ENDPOINT = '/services/query-index/search';

function hasValue(value) {
  return value !== null && value !== undefined && value !== '' && !Number.isNaN(value);
}

function getValueList(value) {
  if (!value) {
    return [];
  }
  const values = Array.isArray(value) ? value : value.split(',');
  return values.map((item) => item.trim()).filter((item) => item !== '');
}

/**
 * Builds a search using the config from a block
 */
function buildIndexFilter(config) {
  return {
    basePaths: getValueList(config['base-paths']),
    templates: getValueList(config.templates),
    tagsAnd: getValueList(config.tags),
    tagsOr: getValueList(config['optional-tags']),
    tagsNot: getValueList(config['excluded-tags']),
    relativeDateFrom: config['relative-date-from'], // Number in days
    relativeDateTo: config['relative-date-to'], // Number in days
    orderBy: config.orderBy,
    sortDirection: config.sortDirection,
    limit: config.limit,
    page: config.page || 1,
    fullText: config.fullText || '',
    languages: config.languages || [],
    getFacets: config.getFacets || false,
    customTagObjArr: config.customTagObjArr || [],
    metadataAnd: config.metadataAnd,
    metadataOr: config.metadataOr,
    metadataNot: config.metadataNot,
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
 *   fullText: 'search query', // Full text search query
 *   languages: ['en'], // Array of languages
 *   metadata: ['en'], // Array of languages
 *   customTagObjArr: [{}] // Custom array for the tags
 *   metadataAnd: { "moduleId": "G-IF-Course" }, // The page must match all of these key-value pairs
 *   metadataOr: { "mediaType": "course" }, // The page must match at least one of these key-value pairs
 *   metadataNot: { "subNavShow": "show" }, // The page must not match any of these key-value pairs
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
    if (indexFilter.tagsAnd && indexFilter.tagsAnd.length > 0) {
      tags.and = indexFilter.tagsAnd;
    }
    if (indexFilter.tagsOr && indexFilter.tagsOr.length > 0) {
      tags.or = indexFilter.tagsOr;
    }
    if (indexFilter.tagsNot && indexFilter.tagsNot.length > 0) {
      tags.not = indexFilter.tagsNot;
    }
    if (tags.and || tags.or || tags.not) {
      postData.query.tags = tags;
    }
    const metadata = {};
    if (indexFilter.metadataAnd) {
      metadata.and = indexFilter.metadataAnd;
    }
    if (indexFilter.metadataOr) {
      metadata.or = indexFilter.metadataOr;
    }
    if (indexFilter.metadataNot) {
      metadata.not = indexFilter.metadataNot;
    }
    if (metadata.and || metadata.or || metadata.not) {
      postData.query.metadata = metadata;
    }
    if (indexFilter.customTagObjArr && indexFilter.customTagObjArr.length > 0) {
      postData.query.tags = indexFilter.customTagObjArr;
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

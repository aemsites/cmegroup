/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
/* eslint-disable max-len */
import ffetch from './ffetch.js';

const QUERY_INDEX_ENDPOINT = '/query-index.json';

function hasValue(value) {
  return value !== null && value !== undefined && value !== '' && !Number.isNaN(value);
}

/**
 * Search pages on the index.
 * example:
 * fetchAndFilterDataIndex({
 *   template: 'event',
 *   tagsAnd: ['content-type/webinar', 'News-And-Events/classroom'], // The page must contain all tags in the array
 *   tagsOr: ['content-type/webinar', 'News-And-Events/classroom'], // The page must contain at least one of the tags in the array
 *   relativeDateFrom: 0, // Integer number of days from current date (allows negative numbers)
 *   relativeDateTo: 365, // Integer number of days from current date (allows negative numbers)
 *   orderBy: 'date', // The property to order by
 *   sortDirection: 'asc', // use asc or desc
 *   limit: 10, // Max quantity of results
 * });
 */
async function fetchAndFilterDataIndex(searchConfig) {
  try {
    const response = await ffetch(QUERY_INDEX_ENDPOINT).all();
    let dateFrom;
    let dateTo;
    if (hasValue(searchConfig.relativeDateFrom) && hasValue(searchConfig.relativeDateTo)) {
      const today = new Date();
      dateFrom = new Date(today);
      dateFrom.setDate(today.getDate() + searchConfig.relativeDateFrom);
      dateTo = new Date(today);
      dateTo.setDate(today.getDate() + searchConfig.relativeDateTo);
    }
    let data = response.filter((item) => {
      if (item.template && item.template.toLowerCase() !== searchConfig.template) return false;
      if (searchConfig.tagsOr?.length > 0 || searchConfig.tagsAnd?.length > 0) {
        let itemTags = [];
        try {
          if (item.tags?.length > 0) {
            const tagsString = item.tags.map((tag) => tag.replace(/\\"/g, '"').replace(/'/g, '"'));
            itemTags = tagsString.map((tag) => tag.toLowerCase());
          }
        } catch (e) {
          return false;
        }
        if (searchConfig.tagsOr?.length > 0
          && !searchConfig.tagsOr.some((searchTag) => itemTags.some((itemTag) => itemTag.includes(searchTag)))) {
          return false;
        }
        if (searchConfig.tagsAnd?.length > 0
          && !searchConfig.tagsAnd.every((searchTag) => itemTags.some((itemTag) => itemTag.includes(searchTag)))) {
          return false;
        }
      }
      if (dateFrom && dateTo) {
        if (!item.date) return false;
        const dateObj = new Date(item.date * 1000);
        item.date = dateObj;
        if (dateObj < dateFrom || dateTo < dateObj) return false;
      }

      return true;
    });
    if (searchConfig.orderBy && searchConfig.sortDirection) {
      data = data.sort((a, b) => (searchConfig.sortDirection === 'asc' ? (a[searchConfig.orderBy] - b[searchConfig.orderBy]) : (b[searchConfig.orderBy] - a[searchConfig.orderBy])));
    }
    if (searchConfig.limit) {
      data = data.slice(0, searchConfig.limit);
    }
    return data;
  } catch (error) {
    console.error('Error loading data:', error);
    return [];
  }
}

export {
  fetchAndFilterDataIndex,
};

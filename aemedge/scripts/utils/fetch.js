import { isEmpty, axiosGet, axiosPost } from './misc.js';

export function apiGet(
  url,
  params = {},
  headers = {},
) {
  const baseUrl = window.baseUrl || '';
  const data = { params, headers };
  return axiosGet(baseUrl + url, data);
}

export function apiPost(
  url,
  params = {},
  headers = {},
) {
  const baseUrl = window.baseUrl || '';
  return axiosPost(baseUrl + url, params, {
    headers,
  });
}

export function getResponseData(
  response,
  fields = [],
  errorResponse = [],
) {
  if (
    isEmpty(response) || (response.status && Math.floor(response.status / 100) !== 2)
  ) {
    return errorResponse;
  }

  const arrFields = !Array.isArray(fields)
    ? (`${fields}`).split(/,\s?/)
    : fields;
  const fieldPath = ['data', ...arrFields];

  let acc = response;
  // eslint-disable-next-line no-restricted-syntax
  for (const key of fieldPath) {
    if (!(key in acc)) {
      return errorResponse;
    }
    acc = acc[key];
  }

  return acc;
}

export function encodeSelectors(elements, isTag) {
  if (!elements || isEmpty(elements)) {
    return '';
  }
  let selectors;
  // tags
  if (isTag) {
    selectors = Array.isArray(elements) ? elements.join('.') : elements;
    return encodeURIComponent(selectors.replace(/\//g, '|'));
  }
  // filters
  selectors = Array.isArray(elements) ? elements : [elements];
  selectors = selectors.map((item) => item.split('/').pop());
  return `.${encodeURIComponent(selectors.join('.'))}`;
}

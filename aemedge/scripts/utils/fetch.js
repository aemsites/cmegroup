import { isEmpty, axiosGet, axiosPost } from './misc.js';

// function makeProtectedUrl(url, withCache = false) {
//   if (window.forceUseCache || withCache) {
//     return url;
//   }
//   return `${url}${
//     /\?/.test(url) ? '&' : '?'
//   }isProtected&_t=${new Date().getTime()}`;
// }

export function apiGet(
  url,
  params = {},
  headers = {},
  // withCache = false,
) {
  const baseUrl = window.baseUrl || '';
  const data = { params, headers };
  // return axiosGet(baseUrl + makeProtectedUrl(url, withCache), data);
  return axiosGet(baseUrl + url, data);
}

export function apiGetAbsolute(
  url,
  params = {},
  headers = {},
  // withCache = false,
) {
  const baseUrl = window.baseUrl || '';
  const data = { params, headers };
  // return axiosGet(baseUrl + makeProtectedUrl(url, withCache), true, data);
  return axiosGet(baseUrl + url, true, data);
}

export function apiPost(
  url,
  params = {},
  headers = {},
  // withCache = false,
) {
  const baseUrl = window.baseUrl || '';
  // return axiosPost(baseUrl + makeProtectedUrl(url, withCache), params, {
  //   headers,
  // });
  return axiosPost(baseUrl + url, params, {
    headers,
  });
}

export function apiPostAbsolute(
  url,
  params = {},
  headers = {},
  // withCache = false,
) {
  const baseUrl = window.baseUrl || '';
  // return axiosPost(baseUrl + makeProtectedUrl(url, withCache), params, true, {
  //   headers,
  // });
  return axiosPost(baseUrl + url, params, true, {
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

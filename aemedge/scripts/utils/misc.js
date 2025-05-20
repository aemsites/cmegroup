export function isEmpty(value) {
  if (value == null) { // Handles null and undefined
    return true;
  }

  if (typeof value === 'boolean') {
    return false; // Booleans are never considered empty
  }

  if (typeof value === 'number') {
    return false; // Numbers are never considered empty
  }

  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === 'object') {
    if (value instanceof Map || value instanceof Set) {
      return value.size === 0;
    }
    // eslint-disable-next-line no-restricted-syntax
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        return false; // Found at least one property
      }
    }
    return Object.getPrototypeOf(value) === Object.prototype; // Check if it's a plain object
  }

  return true; // Default to true for other types (e.g., functions)
}

export async function axiosGet(url, absoluteUrl, config = {}) {
  const { params = {}, headers = {} } = config;
  let urlObj;
  if (absoluteUrl) {
    urlObj = new URL(url);
  } else {
    urlObj = new URL(window.location.origin + url);
  }
  Object.keys(params).forEach((key) => urlObj.searchParams.append(key, params[key]));

  const fetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  try {
    const response = await fetch(urlObj.href, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    let responseData;

    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      config,
    };
  } catch (error) {
    // eslint-disable-next-line prefer-promise-reject-errors
    return Promise.reject({
      message: error.message,
      config,
    });
  }
}

export async function axiosPost(url, data, absoluteUrl, config = {}) {
  const { headers = {}, params = {} } = config;
  let urlObj;
  if (absoluteUrl) {
    urlObj = new URL(url);
  } else {
    urlObj = new URL(window.location.origin + url);
  }
  Object.keys(params).forEach((key) => urlObj.searchParams.append(key, params[key]));

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (data) {
    if (typeof data === 'object') {
      fetchOptions.body = JSON.stringify(data);
    } else {
      fetchOptions.body = data;
    }
  }

  try {
    const response = await fetch(urlObj.href, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    let responseData;

    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      config,
    };
  } catch (error) {
    // eslint-disable-next-line prefer-promise-reject-errors
    return Promise.reject({
      message: error.message,
      config,
    });
  }
}

export function filter(collection, predicate) {
  const result = [];

  if (collection == null) {
    return result;
  }

  if (Array.isArray(collection)) {
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < collection.length; i++) {
      const value = collection[i];
      if (predicate(value, i, collection)) {
        result.push(value);
      }
    }
  } else if (typeof collection === 'object') {
    // eslint-disable-next-line no-restricted-syntax
    for (const key in collection) {
      if (Object.hasOwn(collection, key)) {
        const value = collection[key];
        if (predicate(value, key, collection)) {
          result.push(value);
        }
      }
    }
  }

  return result;
}

export function some(collection, predicate) {
  if (collection == null) {
    return false;
  }

  if (typeof predicate !== 'function') {
    // eslint-disable-next-line no-param-reassign
    predicate = (value) => !!value;
  }

  if (Array.isArray(collection)) {
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < collection.length; i++) {
      if (predicate(collection[i], i, collection)) {
        return true;
      }
    }
  } else if (typeof collection === 'object') {
    // eslint-disable-next-line no-restricted-syntax
    for (const key in collection) {
      if (Object.hasOwn(collection, key)) {
        if (predicate(collection[key], key, collection)) {
          return true;
        }
      }
    }
  }

  return false;
}

export function every(collection, predicate) {
  if (collection == null) {
    return true;
  }

  if (typeof predicate !== 'function') {
    // eslint-disable-next-line no-param-reassign
    predicate = (value) => !!value;
  }

  if (Array.isArray(collection)) {
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < collection.length; i++) {
      if (!predicate(collection[i], i, collection)) {
        return false;
      }
    }
  } else if (typeof collection === 'object') {
    // eslint-disable-next-line no-restricted-syntax
    for (const key in collection) {
      if (Object.hasOwn(collection, key)) {
        if (!predicate(collection[key], key, collection)) {
          return false;
        }
      }
    }
  }

  return true;
}

export function get(object, path, defaultValue) {
  if (object == null) {
    return defaultValue;
  }

  const pathArray = Array.isArray(path) ? path : path.replace(/\[(\w+)\]/g, '.$1').split('.');
  let result = object;

  // eslint-disable-next-line no-restricted-syntax
  for (const key of pathArray) {
    if (result == null || typeof result !== 'object' || !(key in result)) {
      return defaultValue;
    }
    result = result[key];
  }

  return result === undefined ? defaultValue : result;
}

export function sortBy(collection, iteratees) {
  if (collection == null) {
    return [];
  }

  const isArray = Array.isArray(collection);
  const result = isArray ? [...collection] : Object.values(collection);

  const iterateesArray = Array.isArray(iteratees) ? iteratees : [iteratees || ((value) => value)];

  result.sort((a, b) => {
    // eslint-disable-next-line no-restricted-syntax
    for (const iteratee of iterateesArray) {
      const valueA = typeof iteratee === 'function' ? iteratee(a) : a[iteratee];
      const valueB = typeof iteratee === 'function' ? iteratee(b) : b[iteratee];

      if (valueA < valueB) {
        return -1;
      }
      if (valueA > valueB) {
        return 1;
      }
    }
    return 0;
  });

  return result;
}

export function find(collection, predicate, fromIndex = 0) {
  if (collection == null) {
    return undefined;
  }

  if (typeof predicate !== 'function') {
    // eslint-disable-next-line no-param-reassign
    predicate = (value) => !!value;
  }

  if (Array.isArray(collection)) {
    const startIndex = Math.max(0, fromIndex);
    // eslint-disable-next-line no-plusplus
    for (let i = startIndex; i < collection.length; i++) {
      if (predicate(collection[i], i, collection)) {
        return collection[i];
      }
    }
  } else if (typeof collection === 'object') {
    // eslint-disable-next-line no-restricted-syntax
    for (const key in collection) {
      if (Object.hasOwn(collection, key)) {
        if (predicate(collection[key], key, collection)) {
          return collection[key];
        }
      }
    }
  }

  return undefined;
}

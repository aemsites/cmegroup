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

export function axiosGet(url, config = {}) {
  const { params = {}, headers = {} } = config;

  // Build the URL with query parameters
  const urlObj = new URL(url);
  Object.keys(params).forEach((key) => urlObj.searchParams.append(key, params[key]));

  const fetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json', // Default content type
      ...headers,
    },
  };

  return fetch(urlObj.href, fetchOptions)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      return response.text(); // Return text for other content types
    })
    .then((responseData) => ({
      data: responseData,
      // eslint-disable-next-line no-undef
      status: response.status,
      // eslint-disable-next-line no-undef
      statusText: response.statusText,
      // eslint-disable-next-line no-undef
      headers: response.headers,
      config,
    }))
    // eslint-disable-next-line prefer-promise-reject-errors
    .catch((error) => Promise.reject({
      message: error.message,
      config,
    }));
}

export function axiosPost(url, data, config = {}) {
  const { headers = {}, params = {} } = config;

  // Build the URL with query parameters
  const urlObj = new URL(url);
  Object.keys(params).forEach((key) => urlObj.searchParams.append(key, params[key]));

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', // Default content type
      ...headers,
    },
  };

  if (data) {
    if (typeof data === 'object') {
      fetchOptions.body = JSON.stringify(data);
    } else {
      fetchOptions.body = data; // Allows sending raw strings, form data, etc.
    }
  }

  return fetch(urlObj.href, fetchOptions)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      return response.text(); // Return text for other content types
    })
    .then((responseData) => ({
      data: responseData,
      // eslint-disable-next-line no-undef
      status: response.status,
      // eslint-disable-next-line no-undef
      statusText: response.statusText,
      // eslint-disable-next-line no-undef
      headers: response.headers,
      config,
    }))
    // eslint-disable-next-line prefer-promise-reject-errors
    .catch((error) => Promise.reject({
      message: error.message,
      config,
    }));
}

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

export async function axiosGet(url, config = {}) {
  const { params = {}, headers = {} } = config;
  const urlObj = new URL(url);
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

export async function axiosPost(url, data, config = {}) {
  const { headers = {}, params = {} } = config;
  const urlObj = new URL(url);
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

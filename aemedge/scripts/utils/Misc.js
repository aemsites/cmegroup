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
  const urlObj = new URL(window.location.origin + url);
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
  const urlObj = new URL(window.location.origin + url);
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

export function debounce(func, wait, options) {
  let lastArgs;
  let lastThis;
  let maxWait;
  let result;
  let timerId;
  let lastCallTime;
  let leading;
  let trailing;

  if (typeof func !== 'function') {
    throw new TypeError('Expected a function');
  }
  // eslint-disable-next-line no-param-reassign
  wait = +wait || 0;
  if (typeof options === 'object') {
    leading = !!options.leading;
    maxWait = 'maxWait' in options ? Math.max(+options.maxWait || 0, wait) : undefined; // Changed from original to match lodash behavior.
    trailing = 'trailing' in options ? !!options.trailing : true;
  }

  function invokeFunc(time) {
    const args = lastArgs;
    const thisArg = lastThis;

    // eslint-disable-next-line no-multi-assign
    lastArgs = lastThis = undefined;
    lastCallTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function trailingEdge(time) {
    timerId = undefined;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    // eslint-disable-next-line no-multi-assign
    lastArgs = lastThis = undefined;
    return result;
  }

  function leadingEdge(time) {
    lastCallTime = time;
    timerId = setTimeout(trailingEdge, wait);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - (lastCallTime || 0);
    const timeWaiting = wait - timeSinceLastCall;

    return maxWait === undefined
      ? timeWaiting
      : Math.min(timeWaiting, maxWait - timeSinceLastInvoke);
  }

  function shouldInvoke(time) {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - (lastCallTime || 0);

    return (
      lastCallTime === undefined
      || timeSinceLastCall >= wait
      || timeSinceLastInvoke >= maxWait
    );
  }

  // eslint-disable-next-line consistent-return
  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    // eslint-disable-next-line no-multi-assign
    lastArgs = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(Date.now());
  }

  function debounced(...args) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(time);
      }
      if (maxWait !== undefined) {
        clearTimeout(timerId);
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(time);
      }
      return invokeFunc(time);
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

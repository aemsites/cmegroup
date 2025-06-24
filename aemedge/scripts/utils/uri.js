// eslint-disable-next-line import/prefer-default-export
export class URIUtil {
  node;

  arrayEncode;

  handlers;

  static ARRAY_BRACKETS_ENCODE = 1;

  static ARRAY_LIST_ENCODE = 2;

  static ARRAY_COMMA_ENCODE = 3;

  static globalHandlerSet = false;

  static globalHandlers = [];

  static history = [];

  static index = 0;

  constructor(uri, arrayEncode) {
    this.node = document.createElement('a');
    this.node.href = typeof uri === 'string' && uri.length ? uri : window.location.href;
    this.arrayEncode = arrayEncode || URIUtil.ARRAY_BRACKETS_ENCODE;
    this.handlers = [];
    // handle pop state
    if (!URIUtil.globalHandlerSet) {
      window.addEventListener('popstate', URIUtil.popState);
      // set initial history state
      if (window.history.state === null) {
        URIUtil.updateHistory(window.location.href, true);
      } else {
        // restore if page was reloaded
        URIUtil.restoreHistory(window.history.state);
      }
      URIUtil.globalHandlerSet = true;
    }
  }

  static restoreHistory(state) {
    const { index = -1, href } = state || {};
    if (index < 0 || !href) {
      return;
    }
    // restore local history from history state
    if (URIUtil.history[index] === undefined) {
      URIUtil.history[index] = href;
    }
    URIUtil.index = index;
  }

  static updateHistory(href, replace) {
    if (!replace) {
      // new state, update index
      // eslint-disable-next-line no-plusplus
      ++URIUtil.index;
      // remove old history
      if (URIUtil.history.length > URIUtil.index) {
        URIUtil.history.splice(URIUtil.index + 1, URIUtil.history.length);
      }
    }
    const state = {
      index: URIUtil.index,
      href,
    };
    // save history (local and native)
    URIUtil.history[URIUtil.index] = href;
    if (replace) {
      window.history.replaceState(state, null, href);
    } else {
      window.history.pushState(state, null, href);
    }
  }

  static popState(event) {
    const { state } = event;
    const { index = -1, href } = state || {};
    if (index < 0 || !href) {
      // not our history
      return;
    }
    // get previous url
    const prevHRef = URIUtil.history[URIUtil.index];
    // rebuild if page was reloaded
    URIUtil.restoreHistory(state);
    // process handlers
    if (!URIUtil.globalHandlers.length) {
      return;
    }
    URIUtil.globalHandlers.forEach(({ handlers }) => {
      if (!handlers.length) {
        return;
      }
      const prev = new URIUtil(prevHRef);
      const next = new URIUtil(href);
      handlers.forEach(({ cb, type, key }) => {
        if (type) {
          if (type === 'selector') {
            if (key === undefined || typeof key === 'number') {
              const oldSelectors = prev.getSelector(key);
              const newSelectors = next.getSelector(key);
              if (Array.isArray(oldSelectors) && Array.isArray(newSelectors)) {
                if (oldSelectors.find((item, i) => item !== newSelectors[i])) {
                  cb(newSelectors, oldSelectors);
                  return;
                }
                return;
              }
              if (newSelectors !== oldSelectors) {
                cb(newSelectors, oldSelectors);
                return;
              }
            }
            return;
          }
          const realType = type === 'query' ? 'search' : type;
          const oldValue = prev.accessor(realType, undefined, !!key);
          const newValue = next.accessor(realType, undefined, !!key);
          if (typeof newValue === 'object' && typeof oldValue === 'object') {
            if (key && key !== true) {
              if (typeof key === 'string' && newValue[key] !== oldValue[key]) {
                cb(newValue[key], oldValue[key]);
                return;
              }
              if (
                Array.isArray(key) && key.find((sKey) => newValue[sKey] !== oldValue[sKey])
              ) {
                cb(newValue, oldValue);
                return;
              }
              return;
            }
            const newValueKeys = Object.keys(newValue);
            const oldValueKeys = Object.keys(oldValue);
            const mixedKeys = newValueKeys.concat(
              oldValueKeys.filter((i) => newValueKeys.indexOf(i) === -1),
            );
            if (mixedKeys.find((sKey) => newValue[sKey] !== oldValue[sKey])) {
              cb(newValue, oldValue);
              return;
            }
            return;
          }
          if (newValue !== oldValue) {
            cb(newValue, oldValue);
            return;
          }
          return;
        }
        cb(next, prev);
      });
    });
  }

  // eslint-disable-next-line class-methods-use-this
  decode(value) {
    if (value) {
      try {
        return decodeURIComponent(value);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.info(`Error: invalid parameter value: ${value}`);
      }
    }
    return value;
  }

  mapParams(params) {
    const map = {};
    if (typeof params === 'string' && params.length) {
      const paramsList = params.replace(/[?|#]/g, '');
      paramsList.split('&').forEach((param) => {
        const values = param.split('=');
        if (values[0]) {
          const key = this.decode(values[0]).replace(/\[\]/, '');
          const value = this.decode(values[1]);
          const subValues = value ? value.split(',') : [];
          if (subValues.length > 1) {
            subValues.forEach((subValue) => {
              map[key] = Array.isArray(map[key]) ? map[key] : [];
              map[key].push(subValue || '');
            });
          // eslint-disable-next-line no-prototype-builtins
          } else if (map.hasOwnProperty(key)) {
            map[key] = Array.isArray(map[key]) ? map[key] : [map[key]];
            map[key].push(value || '');
          } else {
            map[key] = value || '';
          }
        }
      });
    }
    return map;
  }

  objectToUrlParam(obj) {
    const str = Object.keys(obj).map((k) => {
      const key = encodeURIComponent(k);
      const values = obj[k];
      if (Array.isArray(values)) {
        if (this.arrayEncode === URIUtil.ARRAY_COMMA_ENCODE) {
          return (
            `${key}=${values.map((value) => (value ? encodeURIComponent(value) : '')).join(',')}`
          );
        }
        return values
          .map((value) => (this.arrayEncode === URIUtil.ARRAY_LIST_ENCODE
            ? key + (value ? `=${encodeURIComponent(value)}` : '')
            : `${key}[]${value ? `=${encodeURIComponent(value)}` : ''}`)).join('&');
      }
      return key + (values ? `=${encodeURIComponent(values)}` : '');
    });
    return str.join('&');
  }

  accessor(
    type,
    value,
    decompose,
  ) {
    if (value) {
      if (typeof value === 'object') {
        this.node[type] = this.objectToUrlParam(value);
        return this;
      }
      this.node[type] = value;
      return this;
    }
    if (decompose) {
      return this.mapParams(this.node[type]);
    }
    return this.decode(this.node[type]);
  }

  update() {
    this.node.href = window.location.href;
    return this;
  }

  href(href) {
    return this.accessor('href', href);
  }

  protocol(protocol) {
    return this.accessor('protocol', protocol);
  }

  host(host) {
    return this.accessor('host', host);
  }

  hostname(hostname) {
    return this.accessor('hostname', hostname);
  }

  port(port) {
    return this.accessor('port', port);
  }

  pathname(pathname) {
    return this.accessor('pathname', pathname);
  }

  search(search, decompose) {
    return this.accessor('search', search, decompose);
  }

  hash(hash, decompose) {
    return this.accessor('hash', hash, decompose);
  }

  username(username) {
    return this.accessor('username', username);
  }

  password(password) {
    return this.accessor('password', password);
  }

  origin(origin) {
    return this.accessor('origin', origin);
  }

  filename(newFilename) {
    const pathname = this.pathname();
    const filename = pathname.split('/').pop();
    if (newFilename) {
      if (filename) {
        return this.pathname(
          pathname.replace(new RegExp(`${filename}$`), newFilename),
        );
      }
      return this;
    }
    return filename;
  }

  extension(newExtension) {
    const filename = this.filename();
    const extension = filename.split('.').pop();
    if (newExtension) {
      if (extension) {
        const pathname = this.pathname();
        return this.pathname(
          pathname.replace(new RegExp(`${extension}$`), newExtension),
        );
      }
      return this;
    }
    return extension;
  }

  getSelector(index) {
    const filename = this.filename();
    if (filename) {
      const selectors = filename.split('.');
      if (index && index >= 0) {
        return selectors[index];
      }
      return selectors;
    }
    return null;
  }

  addSelector(index, selector) {
    const selectors = this.getSelector();
    if (selectors) {
      selectors.splice(index, 0, selector);
      return this.filename(selectors.join('.'));
    }
    return this;
  }

  setSelector(index, selector) {
    const selectors = this.getSelector();
    if (selectors) {
      selectors[index] = selector;
      return this.filename(selectors.join('.'));
    }
    return this;
  }

  setSelectors(selectors) {
    const originalSelectors = this.getSelector();
    if (selectors) {
      const newSelectors = [originalSelectors[0], ...selectors];
      return this.filename(newSelectors.join('.'));
    }
    return this;
  }

  removeSelector(index) {
    const selectors = this.getSelector();
    if (selectors) {
      selectors.splice(index, 1);
      return this.filename(selectors.join('.'));
    }
    return this;
  }

  hasHash(key) {
    const hashes = this.hash('', true);
    return hashes[key] !== undefined;
  }

  getHash(key, def) {
    const hashes = this.hash('', true);
    if (key) {
      return hashes[key] ?? def;
    }
    return hashes;
  }

  setHash(key, value) {
    let hashes = {};
    if (typeof key === 'object') {
      hashes = key;
    } else if (key) {
      hashes[key] = value ?? '';
    }
    return this.hash(hashes);
  }

  addHash(key, value) {
    let hashes = this.hash('', true);
    if (typeof key === 'object') {
      hashes = { ...hashes, ...key };
    } else if (key) {
      hashes[key] = value ?? '';
    }
    return this.hash(hashes);
  }

  removeHash(key) {
    if (!key) {
      return this.hash({});
    }
    const hashes = this.hash('', true);
    if (Array.isArray(key)) {
      key.forEach((k) => {
        if (hashes[k] !== undefined) {
          delete hashes[k];
        }
      });
    } else if (hashes[key] !== undefined) {
      delete hashes[key];
    }
    return this.hash(hashes);
  }

  hasQuery(key) {
    const queries = this.search('', true);
    return queries[key] !== undefined;
  }

  getQuery(key, def) {
    const queries = this.search('', true);
    if (key) {
      return queries[key] ?? def;
    }
    return queries;
  }

  setQuery(key, value) {
    let queries = {};
    if (typeof key === 'object') {
      queries = key;
    } else if (key) {
      queries[key] = value || '';
    }
    return this.search(queries);
  }

  addQuery(key, value) {
    let queries = this.search('', true);
    if (typeof key === 'object') {
      queries = { ...queries, ...key };
    } else if (key) {
      queries[key] = value || '';
    }
    return this.search(queries);
  }

  removeQuery(key) {
    if (!key) {
      return this.search({});
    }
    const queries = this.search('', true);
    if (Array.isArray(key)) {
      key.forEach((q) => {
        if (queries[q] !== undefined) {
          delete queries[q];
        }
      });
    } else if (queries[key] !== undefined) {
      delete queries[key];
    }
    return this.search(queries);
  }

  navigate(tryPush, replace) {
    if (tryPush && window.history && window.history.pushState) {
      try {
        URIUtil.updateHistory(this.node.href, replace);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`Error when navigating to: ${this.node.href}`, e);
        return false;
      }
    } else if (window.location.href !== this.node.href) {
      window.location.href = this.node.href;
    }
    return true;
  }

  replace() {
    window.location.replace(this.node.href);
  }

  assign() {
    window.location.assign(this.node.href);
  }

  open(name, specs, replace) {
    window.open(this.node.href, name, specs, replace);
  }

  addPopStateHandler(
    cb,
    type,
    key,
  ) {
    const item = { cb, type, key };
    if (!this.handlers.length) {
      URIUtil.globalHandlers.push(this);
    }
    this.handlers.push(item);
    return item;
  }

  removePopStateHandler(item) {
    let index = this.handlers.indexOf(item);
    if (index >= 0) {
      this.handlers.splice(index, 1);
    }
    if (!this.handlers.length) {
      index = URIUtil.globalHandlers.indexOf(this);
      if (index >= 0) {
        URIUtil.globalHandlers.splice(index, 1);
      }
    }
  }
}

/*
  * Appends query params to a URL
  * @param {string} url The URL to append query params to
  * @param {object} params The query params to append
  * @returns {string} The URL with query params appended
  * @private
  * @example
  * appendQueryParams('https://example.com', { foo: 'bar' });
  * // returns 'https://example.com?foo=bar'
*/
export function appendQueryParams(url, params) {
  const { searchParams } = url;
  params.forEach((value, key) => {
    searchParams.set(key, value);
  });
  url.search = searchParams.toString();
  return url.toString();
}

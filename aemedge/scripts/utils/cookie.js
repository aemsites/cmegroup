/* eslint-disable import/prefer-default-export */
class CookieClass {
  // eslint-disable-next-line class-methods-use-this
  get(key, isJson) {
    let encKey;
    if (typeof document === 'undefined') {
      return null;
    }
    if (key instanceof RegExp) {
      encKey = key.source;
    } else {
      encKey = encodeURIComponent(String(key));
    }
    const matches = document.cookie.match(`(^|; )${encKey}=([^;]*)`);
    if (matches) {
      let cookie = matches[2];
      try {
        cookie = decodeURIComponent(cookie);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`CookiesUtil: Error decoding cookie value: ${cookie}`, e);
      }
      if (isJson) {
        try {
          cookie = JSON.parse(cookie);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('CookiesUtil: Error parsing json string', e);
        }
      }
      return cookie;
    }
    return null;
  }

  // eslint-disable-next-line class-methods-use-this
  set(key, value, attr) {
    let encValue = value;
    if (typeof document === 'undefined') {
      return null;
    }
    const attributes = { path: '/', ...attr };
    if (typeof attributes.expires === 'number') {
      attributes.expires = new Date(
        new Date().getTime() + attributes.expires * 864e5,
      );
    }
    attributes.expires = attributes.expires
      ? attributes.expires.toUTCString()
      : '';
    const encKey = encodeURIComponent(String(key));
    if (typeof encValue === 'object') {
      encValue = JSON.stringify(encValue);
    }
    encValue = encodeURIComponent(String(encValue));
    let stringifiedAttributes = '';
    Object.keys(attributes).forEach((attributeName) => {
      if (
        attributes[attributeName] === false ||
        attributes[attributeName] === ''
      ) {
        return;
      }
      stringifiedAttributes += `; ${attributeName}`;
      if (attributes[attributeName] !== true) {
        stringifiedAttributes += `=${attributes[attributeName].split(';')[0]}`;
      }
    });
    document.cookie = `${encKey}=${encValue}${stringifiedAttributes}`;
    return document.cookie;
  }

  remove(key) {
    this.set(key, '', { expires: -1 });
  }
}

export const CookieUtil = new CookieClass();

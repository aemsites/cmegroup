class StorageUtil {
  storage;

  constructor(storage) {
    this.storage = storage;
  }

  get(key, isJson) {
    if (!this.storage) {
      return null;
    }
    let value = this.storage.getItem(key);
    if (value && isJson) {
      try {
        value = JSON.parse(value);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('StorageUtil: Error parsing Storage string');
      }
    }
    return value;
  }

  set(key, value) {
    if (!this.storage) {
      return null;
    }
    let encValue = value;
    if (typeof encValue === 'object') {
      encValue = JSON.stringify(encValue);
    }
    this.storage.setItem(key, encValue);
    return value;
  }

  remove(key) {
    if (!this.storage) {
      return;
    }
    this.storage.removeItem(key);
  }

  clear() {
    if (!this.storage) {
      return;
    }
    this.storage.clear();
  }
}

export const LocalStorageUtil = new StorageUtil(
  window.localStorage,
);
export const SessionStorageUtil = new StorageUtil(
  window.sessionStorage,
);

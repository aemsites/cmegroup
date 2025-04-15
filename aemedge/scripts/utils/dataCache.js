// eslint-disable-next-line import/prefer-default-export
export class DataCacheUtil {
  cache;

  cacheTimeout;

  queryInProgress;

  constructor(cacheTimeout) {
    this.cache = {};
    this.cacheTimeout = cacheTimeout || 5 * 60 * 1000; // 5 minutes
    this.queryInProgress = null;
  }

  async getData(key, callback, ...params) {
    let { data, timestamp } = this.cache[key] || {};
    const newTimestamp = Date.now();
    if (!data || newTimestamp - timestamp > this.cacheTimeout) {
      if (this.queryInProgress) {
        await this.queryInProgress;
        return this.cache[key].data;
      }
      let resolvePromise = '';
      this.queryInProgress = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      data = await callback(...params);
      timestamp = new Date();
      this.cache[key] = {
        data,
        timestamp,
      };
      resolvePromise();
      this.queryInProgress = null;
    }
    return data;
  }

  update(key, data) {
    const timestamp = new Date();
    this.cache[key] = {
      data,
      timestamp,
    };
    return data;
  }

  clear(key) {
    delete this.cache[key];
  }

  clearAll() {
    this.cache = {};
    this.queryInProgress = null;
  }
}

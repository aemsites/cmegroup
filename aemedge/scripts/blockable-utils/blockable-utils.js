import { CookieUtil } from './CookieUtil/index.js';
import { LocalStorageUtil, SessionStorageUtil } from './StorageUtil/index.js';

/* eslint-disable import/prefer-default-export */
class BlockableUtilsClass {
  // eslint-disable-next-line class-methods-use-this
  init() {
    window.CookieUtil = CookieUtil;
    window.LocalStorageUtil = LocalStorageUtil;
    window.SessionStorageUtil = SessionStorageUtil;
  }
}

export const BlockableUtils = new BlockableUtilsClass();

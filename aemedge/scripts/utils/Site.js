import { siteConstants } from '../constants/index.js';

const sites = {
  openmarkets: [
    '/content/openmarkets/',
    '/content/experience-fragments/openmarkets/',
    '/conf/openmarkets/',
    '/openmarkets/',
  ],
  cmegroup: [
    '/content/cmegroup/',
    '/content/cmegroup1/',
    '/content/experience-fragments/cmegroup/',
    '/conf/cmegroupaem',
  ],
};

export function getSite(path) {
  if (!path) {
    return '';
  }
  if (sites.openmarkets.find((item) => path.startsWith(item))) {
    return siteConstants.OPENMARKETS;
  }
  if (sites.cmegroup.find((item) => path.startsWith(item))) {
    return siteConstants.CMEGROUP;
  }
  return '';
}

export function getAbsoluteUrl(
  path,
  onlyForExternals = true,
) {
  const [, subdomain] = window.location.host.match(/([^.]+)\.(.+)/) || [];
  let newPath = onlyForExternals || !subdomain
    ? path
    : `https://${subdomain}.cmegroup.com${path}`;
  if (window.loader) {
    const { env: envLoader, host } = window.loader;
    newPath = `https://${envLoader}.${host}${path}`;
  }
  return newPath;
}

export function getGlobalConfig(prop, defaultValue = '') {
  return prop
    ? window.globalConfig?.[prop] ?? defaultValue
    : window.globalConfig || {};
}

import { urlByEnvType } from './utils/index.js';

export function getLegacyAlerts() {
  return `${urlByEnvType()}/content/cmegroup/en/misc/api/content-feeds-for-google-docs/full-alerts-list/jcr:content/main-content-section/section/section-elements/search_sort_filter_d.ssfajax.0.json`;
}

export function getLoginDataUrl(fromUrl, fromUrlTitle) {
  return `${urlByEnvType()}/libs/cmegroup/security/login?fromUrl=${fromUrl}&fromUrlTitle=${fromUrlTitle}`;
}

export function getSearchSuggestionsUrl(term) {
  return `${urlByEnvType()}/bin/service/search.${term}.json`;
}

export function getSitewidePopups() {
  return `${urlByEnvType()}/content/cmegroup/en/misc/api/content-feeds-for-google-docs/full-popups-list/jcr:content/main-content-section/section/section-elements/search_sort_filter_d.ssfajax.0.json`;
}

import { getEnvType } from './utils.js';

// eslint-disable-next-line import/prefer-default-export
export function getLegacyAlerts() {
  return `${getEnvType() !== 'prod' ? 'https://beta.cmegroup.com' : 'https://www.cmegroup.com'}/content/cmegroup/en/misc/api/content-feeds-for-google-docs/full-alerts-list/jcr:content/main-content-section/section/section-elements/search_sort_filter_d.ssfajax.0.json`;
}

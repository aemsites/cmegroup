import { apiGet, getResponseData } from '../utils/index.js';
import { getEconomicReleaseFiltersUrl } from '../legacy-api.js';

// eslint-disable-next-line import/prefer-default-export
export async function getEconomicReleaseFilters() {
  const url = getEconomicReleaseFiltersUrl();
  try {
    const response = await apiGet(url);
    return getResponseData(response);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Calendar => getEconomicReleaseFilters error:', e);
    return [];
  }
}

import { apiGet, apiPost, getResponseData } from '../utils/index.js';
import { urlByEnvType } from '../utils.js';

export async function getEconomicReleaseFilters() {
  const url = `${urlByEnvType()}/services/economic-release-filters`;
  try {
    const response = await apiGet(url);
    return getResponseData(response);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Calendar => getEconomicReleaseFilters error:', e);
    return [];
  }
}

export async function postEconomicReleaseDates(date, countries, impact, daysLimit, textSearch) {
  const url = `${urlByEnvType()}/services/economic-release-dates`;
  try {
    const response = await apiPost(url, {
      date,
      countries,
      impact,
      daysLimit,
      textSearch,
    });
    return getResponseData(response);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Calendar => postEconomicReleaseDates error:', e);
    return [];
  }
}

export async function postEconomicReleaseEvents(date, countries, impact, textSearch) {
  const url = `${urlByEnvType()}/services/economic-release-events`;
  try {
    const response = await apiPost(url, {
      date,
      countries,
      impact,
      textSearch,
    });
    return getResponseData(response);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Calendar => postEconomicReleaseEvents error:', e);
    return [];
  }
}

import {
  apiGet,
  apiPost,
  getResponseData,
  urlByEnvType,
} from '../utils/index.js';

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

export async function getEconomicReleaseDates(date, countries, impact, daysLimit, textSearch) {
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
    console.error('Calendar => getEconomicReleaseDates error:', e);
    return [];
  }
}

export async function getEconomicReleaseEvents(date, countries, impact, textSearch, size) {
  const url = `${urlByEnvType()}/services/economic-release-events`;
  try {
    const response = await apiPost(url, {
      date,
      countries,
      impact,
      textSearch,
      size,
    });
    return getResponseData(response).events;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Calendar => getEconomicReleaseEvents error:', e);
    return [];
  }
}

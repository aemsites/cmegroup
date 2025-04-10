import { apiGet, getResponseData } from '../utils/index.js';

export async function getCalendarData(
  productId,
  optionProductId,
  isOptionProduct,
) {
  const serviceUrl = '/CmeWS/mvc/ProductCalendar/';
  const futureOrOptions = isOptionProduct ? 'Options/' : 'Future/';

  try {
    const url = `${serviceUrl}${futureOrOptions}${productId}`;
    const response = await apiGet(url);

    if (optionProductId) {
      const values = getResponseData(response);
      return (
        values.find((value) => value.productId.toString() === optionProductId)
          .calendarEntries || {}
      );
    }

    return getResponseData(response);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Calendar => get error:', e);

    return [];
  }
}

export async function getCalendarDates(
  date,
  product,
  groups,
  subGroups,
  dateType,
  countries,
  attributes,
  limit,
  calendarVersion,
) {
  try {
    let queryString;
    let url;
    let response;
    switch (calendarVersion) {
      case 'expiration':
        queryString = (product.length > 0 ? `&products=${product?.join()}` : '')
          + (groups ? `&groups=${groups}` : '')
          + (subGroups ? `&subGroups=${subGroups}` : '')
          + (dateType ? `&date-types=${dateType}` : '')
          + (limit ? `&limit=${limit}` : '');
        url = `/CmeWS/mvc/product-calendar/${date}?${queryString}`;
        response = await apiGet(url);
        return getResponseData(response);
      case 'release':
        queryString = `.${countries}`
          + `.${groups || '-'}`
          + `.${attributes}`
          + '.-'
          + '.json'
          + `${product[0] !== '' ? `?text=${product?.join()}` : ''}`;
        url = `/bin/service/economic-release.${date}.-${queryString}`;
        response = await apiGet(url);
        return getResponseData(response);
      default:
        return null;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Calendar => getCalendarDates error:', e);
    return {};
  }
}

export async function getCalendarDatesMobile(
  date,
  product,
  groups,
  subGroups,
  dateType,
  countries,
  attributes,
  limit,
  calendarVersion,
) {
  try {
    let queryString;
    let url;
    let response;
    switch (calendarVersion) {
      case 'expiration':
        queryString = (product.length > 0 ? `&products=${product?.join()}` : '')
          + (groups ? `&groups=${groups}` : '')
          + (subGroups ? `&subGroups=${subGroups}` : '')
          + (dateType ? `&date-types=${dateType}` : '')
          + (limit ? `&limit=${limit}` : '');
        url = `/CmeWS/mvc/product-calendar/${date}/mobile?${queryString}`;
        response = await apiGet(url);
        return getResponseData(response);
      case 'release':
        queryString = '.mobile'
          + `.${countries}`
          + `.${groups || '-'}`
          + `.${attributes}`
          + '.360.json'
          + `${product[0] !== '' ? `?text=${product?.join()}` : ''}`;
        url = `/bin/service/economic-release.${date}${queryString}`;
        response = await apiGet(url);
        return getResponseData(response);
      default:
        return null;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Calendar => getCalendarDatesMobile error:', e);
    return {};
  }
}

export async function getCalendarEvents(
  date,
  product,
  groups,
  subGroups,
  dateType,
  countries,
  attributes,
  calendarVersion,
) {
  try {
    let queryString;
    let url;
    let response;
    switch (calendarVersion) {
      case 'expiration':
        queryString = (product.length > 0 ? `&products=${product?.join()}` : '')
          + (groups ? `&groups=${groups}` : '')
          + (subGroups ? `&subGroups=${subGroups}` : '')
          + (dateType ? `&date-types=${dateType}` : '');
        url = `/CmeWS/mvc/product-calendar/${date}/events?${queryString}`;
        response = await apiGet(url);
        return getResponseData(response);
      case 'release':
        queryString = `.${countries}`
          + `.${groups || '-'}`
          + `.${attributes}`
          + '.-'
          + '.json'
          + `${product[0] !== '' ? `?text=${product?.join()}` : ''}`;
        url = `/bin/service/economic-release.${date}.events${queryString}`;
        response = await apiGet(url);
        return {
          events: getResponseData(response).events.flatMap((event) =>
            // eslint-disable-next-line implicit-arrow-linebreak
            event.eventValues.map((eventValue) => ({
              ...event,
              ...eventValue,
              eventValues: null,
              isElementExpandable: Object.prototype.hasOwnProperty.call(event, 'text'),
            }))),
        };
      default:
        return null;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Calendar => getCalendarEvents error:', e);
    return {};
  }
}

export async function getCalendarEventsDownload(
  date,
  product,
  groups,
  subGroups,
  dateType,
  period,
) {
  const queryString = (product.length ? `&products=${product}` : '')
    + (groups.length ? `&groups=${groups}` : '')
    + (subGroups.length ? `&subGroups=${subGroups}` : '')
    + (dateType.length ? `&date-types=${dateType}` : '')
    + (period ? `&period=${period}` : '&period=1');
  const url = `/CmeWS/mvc/product-calendar/${date}/events/export?${queryString}`;
  try {
    window.location = url;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Calendar => getCalendarEventsDownload error:', e);
  }
}

export async function getEconomicReleaseFilters() {
  const url = '/bin/service/economic-release-filter';
  try {
    const response = await apiGet(url);
    return getResponseData(response);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Calendar => getEconomicReleaseFilters error:', e);
    return [];
  }
}

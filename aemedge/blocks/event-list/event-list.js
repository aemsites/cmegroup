import { loadScript } from '../../scripts/aem.js';
import { fetchAndFilterDataIndex } from '../../scripts/indexing.js';
import { createElement } from '../../scripts/utils.js';

function createUpcomingEvent(content) {
  const {
    path,
    location,
    title,
    image,
    date,
  } = content;
  const cdtDate = dayjs.utc(date).tz('America/Chicago');
  const dateTag = createElement('div', { class: 'card-date' }, cdtDate.format('MMM DD, YYYY'));
  const chevron = createElement('img', { src: '/aemedge/icons/chevron-right.svg' });
  const spanChevron = createElement('span', { class: 'icon icon-chevron-right' }, chevron);
  const spanTitle = createElement('span', { class: 'card-title-text' }, title);
  const titletag = createElement('div', { class: 'card-title' }, spanTitle, spanChevron);
  const webinar = createElement('img', { src: '/aemedge/icons/webinar.svg' });
  const spanWebinar = createElement('span', { class: 'icon icon-webinar' }, webinar);
  const locationtag = createElement('div', { class: 'card-location' }, spanWebinar, location);
  const timeTag = createElement('div', { class: 'card-time' }, cdtDate.format('hh:mm A [CT]'));
  const cardBody = createElement('div', { class: 'card-body' }, dateTag, titletag, locationtag, timeTag);
  const imagetag = createElement('img', { src: image });
  const cardImage = createElement('div', { class: 'card-image' }, imagetag);
  return createElement('a', { class: 'card', href: path }, cardImage, cardBody);
}

async function createEventList() {
  const indexConfig = {};
  indexConfig.template = 'event';
  indexConfig.relativeDateFrom = 0;
  indexConfig.relativeDateTo = 365;
  indexConfig.orderBy = 'date';
  indexConfig.sortDirection = 'asc';
  indexConfig.limit = 10;
  const filteredData = await fetchAndFilterDataIndex(indexConfig);
  if (filteredData && filteredData.length) {
    await Promise.all([
      loadScript('/aemedge/scripts/third-party/dayjs/dayjs.min.js'),
      loadScript('/aemedge/scripts/third-party/dayjs/utc.js'),
      loadScript('/aemedge/scripts/third-party/dayjs/timezone.js'),
      loadScript('/aemedge/scripts/third-party/dayjs/advancedFormat.js'),
    ]);
    /* eslint-disable no-undef */
    dayjs.extend(dayjs_plugin_utc);
    dayjs.extend(dayjs_plugin_timezone);
    dayjs.tz.setDefault('America/Chicago');
    dayjs.extend(dayjs_plugin_advancedFormat);
    /* eslint-enable no-undef */
    const cardElements = filteredData.map(createUpcomingEvent);
    return createElement('div', null, ...cardElements);
  }
  return null;
}

export default async function decorate(block) {
  const list = await createEventList();
  block.append(list);
}

import { loadScript } from '../../scripts/aem.js';
import { fetchAndFilterDataIndex } from '../../scripts/indexing.js';
import { createElement } from '../../scripts/utils.js';
import createMonthSelector from '../../scripts/utils/monthSelector.js';

async function setupLibs() {
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
}

function createUpcomingEvent(content) {
  const {
    path,
    location,
    title,
    image,
    date,
  } = content;
  const cdtDate = dayjs.utc(date).tz('America/Chicago');
  const dateTag = createElement('div', { class: 'card-date' }, cdtDate.format('MMMM DD, YYYY'));
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

function createSeparator(date) {
  const line1 = createElement('span', { class: 'list-divider-line' });
  const line2 = createElement('span', { class: 'list-divider-line' });
  const text = createElement('span', { class: 'list-divider-text' }, date.format('MMMM YYYY'));
  return createElement('div', { class: 'list-divider' }, line1, text, line2);
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
    let currentDate = null;
    const list = [];
    filteredData.forEach((item) => {
      const { date } = item;
      const cdtDate = dayjs.utc(date).tz('America/Chicago');
      if (currentDate == null
        || currentDate.get('month') !== cdtDate.get('month')
        || currentDate.get('year') !== cdtDate.get('year')) {
        currentDate = cdtDate;
        list.push(createSeparator(cdtDate));
      }
      list.push(createUpcomingEvent(item));
    });
    return createElement('div', null, ...list);
  }
  return null;
}

function createNavigation() {
  const cdtDate = dayjs.utc(Date.now()).tz('America/Chicago');
  return createElement('div', { class: 'month-navigation' }, createMonthSelector(cdtDate));
}

export default async function decorate(block) {
  await setupLibs();
  block.append(createNavigation());
  const list = await createEventList();
  block.append(list);
}

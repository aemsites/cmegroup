import { loadScript } from '../../scripts/aem.js';
import { getIndexedContent } from '../../scripts/indexing.js';
import { createElement, i18n } from '../../scripts/utils.js';
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

function createUpcomingEvent(content, timeZoneLabel) {
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
  const timeTag = createElement('div', { class: 'card-time' }, `${timeZoneLabel}: `, cdtDate.format('hh:mm a [CT]'));
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

async function createEventList(year, month) {
  const dateDiffMs = new Date(`${year}-${String(month).padStart(2, '0')}-01 00:00:00`) - Date.now();
  const dateDiffDays = Math.ceil(dateDiffMs / (1000 * 60 * 60 * 24));
  const indexFilter = {};
  indexFilter.template = 'event';
  indexFilter.relativeDateFrom = dateDiffDays;
  indexFilter.relativeDateTo = dateDiffDays + 365;
  indexFilter.orderBy = 'date';
  indexFilter.sortDirection = 'asc';
  indexFilter.limit = 10;
  const [
    filteredData,
    timeZoneLabel,
  ] = await Promise.all([
    getIndexedContent(indexFilter),
    i18n('TIME ZONE'),
  ]);
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
      list.push(createUpcomingEvent(item, timeZoneLabel));
    });
    return createElement('div', null, ...list);
  }
  return createElement('div', null, 'No events to show');
}

function createSpinner() {
  const spinner = createElement('div', { class: 'spinner-event-list' });
  spinner.innerHTML = `
    <div></div>
    <div></div>
    <div></div>
    <div></div>
  `;
  return spinner;
}

async function monthSelected(resultContainer, year, month) {
  resultContainer.innerHTML = '';
  resultContainer.append(createSpinner());
  const list = await createEventList(year, month);
  resultContainer.innerHTML = '';
  resultContainer.append(list);
}

async function createNavigation(cdtDate, resultContainer) {
  const chevronLeft = createElement('img', { src: '/aemedge/icons/chevron-left.svg' });
  const spanChevronLeft = createElement('span', { class: 'icon icon-chevron-left' }, chevronLeft);
  const spanPrevMonth = createElement('span', { class: 'month-navigation-button' }, spanChevronLeft, 'Prev Month');
  const chevronRight = createElement('img', { src: '/aemedge/icons/chevron-right.svg' });
  const spanChevronRight = createElement('span', { class: 'icon icon-chevron-right' }, chevronRight);
  const spanNextMonth = createElement('span', { class: 'month-navigation-button' }, 'Next Month', spanChevronRight);
  const prevNextMonth = createElement('div', { class: 'month-navigation-buttons' }, spanPrevMonth, spanNextMonth);
  const monthSelector = await createMonthSelector(cdtDate, (year, month) => {
    monthSelected(resultContainer, year, month);
  }, spanPrevMonth, spanNextMonth);
  return createElement('div', { class: 'month-navigation' }, monthSelector, prevNextMonth);
}

export default async function decorate(block) {
  await setupLibs();
  const cdtDate = dayjs.utc(Date.now()).tz('America/Chicago');
  const resultContainer = createElement('div', { class: 'result-container' });
  block.append(await createNavigation(cdtDate, resultContainer));
  block.append(resultContainer);
  monthSelected(resultContainer, cdtDate.get('year'), cdtDate.get('month') + 1);
}

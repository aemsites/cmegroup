import { getIndexedContent } from '../../scripts/indexing.js';
import {
  createElement,
  i18n,
  setupDayjsLibs,
  getCdtDate,
} from '../../scripts/utils.js';
import createMonthSelector from '../../scripts/utils/monthSelector.js';

function createUpcomingEvent(content, timeZoneLabel) {
  const {
    path,
    title,
    date,
    metadata: {
      location,
      // eslint-disable-next-line no-useless-computed-key
      ['og:image']: ogImage,
      image,
    },
  } = content;
  const cdtDate = getCdtDate(date);
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
  const imagetag = createElement('img', { src: image || ogImage });
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
  indexFilter.templates = ['event'];
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
      const cdtDate = getCdtDate(date);
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

async function init(block) {
  await setupDayjsLibs();
  const cdtDate = getCdtDate(Date.now());
  const resultContainer = createElement('div', { class: 'result-container' });
  block.append(await createNavigation(cdtDate, resultContainer));
  block.append(resultContainer);
  monthSelected(resultContainer, cdtDate.get('year'), cdtDate.get('month') + 1);
}

export default function decorate(block) {
  init(block);
}

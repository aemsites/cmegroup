import { getMetadata } from '../../scripts/aem.js';
import {
  createElement,
  i18n,
  getTag,
  setupDayjsLibs,
  getCdtDate,
} from '../../scripts/utils.js';

/**
 * Event hero section
 */
async function decorateEventPageHero(block) {
  // Static section
  const contentArea = createElement('span', { class: 'content-area' });
  const shadow = createElement('span', { class: 'shadow' });
  const fade = createElement('span', { class: 'fade' });
  const shadowWrapper = createElement('span', { class: 'shadow-wrapper' }, contentArea, shadow, fade);
  const picture = block.querySelector('picture');
  picture.closest('div').classList.add('background-image');
  picture.closest('p').append(shadowWrapper);

  const eventLabel = createElement('div', { class: 'event-label' });
  const topInfo = createElement('div', { class: 'top-info' }, eventLabel);
  const h1 = block.querySelector('h1');
  const dateWrapper = createElement('div', { class: 'event-property-wrapper' });
  const locationWrapper = createElement('div', { class: 'event-property-wrapper' });
  const timeWrapper = createElement('div', { class: 'event-property-wrapper' });
  const sponsoringWrapper = createElement('div', { class: 'event-property-wrapper' });
  const lastInfo = createElement('div', { class: 'event-data' }, dateWrapper, locationWrapper, timeWrapper, sponsoringWrapper);
  const contentWrapper = createElement('div', { class: 'default-content-wrapper' }, topInfo, h1, lastInfo);
  block.append(contentWrapper);

  // Dynamic section
  const date = getMetadata('date');
  const location = getMetadata('location');
  const sponsoring = getMetadata('sponsoring');
  const [
    eventLabelText,
    dateLabel,
    locationLabel,
    timeLabel,
    sponsoringLabel,
  ] = await Promise.all([
    i18n('Event'),
    i18n('Date'),
    i18n('Location'),
    i18n('Time'),
    i18n('Sponsoring Firm'),
    setupDayjsLibs(),
  ]);
  const cdtDate = getCdtDate(date);
  eventLabel.textContent = eventLabelText;
  const dateTag = createElement('div', { class: 'event-property-value' }, cdtDate.format('dddd DD MMM YYYY'));
  dateWrapper.textContent = `${dateLabel}: `;
  dateWrapper.append(dateTag);
  const locationTag = createElement('div', { class: 'event-property-value' }, location);
  locationWrapper.textContent = `${locationLabel}: `;
  locationWrapper.append(locationTag);
  const timeTag = createElement('div', { class: 'event-property-value' }, cdtDate.format('hh:mm A [CDT]'));
  timeWrapper.textContent = `${timeLabel}: `;
  timeWrapper.append(timeTag);
  const sponsoringTag = createElement('div', { class: 'event-property-value' }, sponsoring);
  sponsoringWrapper.textContent = `${sponsoringLabel}: `;
  sponsoringWrapper.append(sponsoringTag);
}

/**
 * Econoday Event hero section
 */
async function decorateEconodayEventPageHero(block) {
  // Static section
  const contentArea = createElement('span', { class: 'content-area' });
  const shadow = createElement('span', { class: 'shadow' });
  const fade = createElement('span', { class: 'fade' });
  const shadowWrapper = createElement('span', { class: 'shadow-wrapper' }, contentArea, shadow, fade);
  const picture = block.querySelector('picture');
  picture.closest('div').classList.add('background-image');
  picture.closest('p').append(shadowWrapper);

  const featuredTag = createElement('div', { class: 'economic-release-featured-tag' });
  const topInfo = createElement('div', { class: 'economic-release-info' }, block.querySelector('a'), featuredTag);
  const h1 = block.querySelector('h1');
  const dateWrapper = createElement('div', { class: 'economic-release-data-date-wrapper' });
  const lastInfo = createElement('div', { class: 'economic-release-data' }, dateWrapper);
  const contentWrapper = createElement('div', { class: 'default-content-wrapper' }, topInfo, h1, lastInfo);
  block.append(contentWrapper);

  // Dynamic section
  const primaryTopic = getMetadata('primary-topic');
  const date = getMetadata('date');
  const [
    {
      title: primaryTopicTitle,
    },
    dateLabel,
  ] = await Promise.all([
    getTag(primaryTopic),
    i18n('Date'),
    setupDayjsLibs(),
  ]);
  const cdtDate = getCdtDate(date).format('MMMM DD, YYYY hh:mm A [CT]');
  featuredTag.textContent = primaryTopicTitle;
  const dateTag = createElement('div', { class: 'economic-release-data-date-value' }, cdtDate);
  dateWrapper.textContent = `${dateLabel}: `;
  dateWrapper.append(dateTag);
}

/**
 * Generic hero section
 */
function decorateGenericHero(block) {
  const contentDiv = block.children.item(0);
  contentDiv.classList.add('container');
}

/**
 * Main decorate function
 */
export default async function decorate(block) {
  const { classList } = block;
  if (classList.contains('econoday-event')) {
    decorateEconodayEventPageHero(block);
  } else if (classList.contains('event')) {
    decorateEventPageHero(block);
  } else {
    decorateGenericHero(block);
  }
}

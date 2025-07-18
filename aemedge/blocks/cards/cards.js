/* eslint-disable max-len */
import createOptimizedPicture from '../../scripts/utils/picture.js';
import {
  buildIndexFilter,
  getIndexedContent,
} from '../../scripts/indexing.js';
import { getEconomicReleaseEvents } from '../../scripts/services/EconomicReleaseService.js';
import {
  createElement,
  parseTime,
  getReadTimeLabel,
  getReadTimeIcon,
  formatDate,
  i18n,
  decodeHtmlEntities,
  buildSlider,
  formatToCentralTime,
  getUTCfromDateString,
  readBlockConfig,
} from '../../scripts/utils.js';
import { convertReadTimeFormat, convertMediaTypeToSubtemplate } from '../../scripts/legacyContentMapping.js';

async function createStaticCards(block) {
  const cardsContainer = document.createElement('div');
  if (block.classList.contains('links')) {
    const titleWrapper = block.querySelector('h6').closest('div');
    const cardTitle = document.createElement('h6');
    cardTitle.textContent = block.querySelector('h6').textContent;
    titleWrapper.remove();
    const container = document.createElement('div');
    container.className = 'main-list-container';
    [...block.children].forEach((row) => {
      const columns = row.children.length;
      [...row.children].forEach((div) => {
        div.className = 'cards-card-body';
        div.style.setProperty('--cols', columns);
        container.append(div);
      });
    });
    cardsContainer.append(cardTitle);
    cardsContainer.append(container);
  } else if (block.classList.contains('event')) {
    const backgroundUrl = block.querySelector('picture img').src;
    const title = block.querySelector('h3');
    const text = title.nextElementSibling;
    const btn = block.querySelector('.button-container');
    const mainContainer = title.parentElement;
    const titleContainer = document.createElement('div');
    const mainTextContainer = document.createElement('div');

    titleContainer.classList.add('title-container');
    mainTextContainer.classList.add('text-container');
    title.parentNode.insertBefore(mainTextContainer, title.nextSibling);
    mainTextContainer.appendChild(text);
    mainTextContainer.appendChild(btn);

    title.parentNode.insertBefore(titleContainer, title);
    titleContainer.appendChild(title);

    mainContainer.className = 'cards-body-container';
    mainContainer.style.backgroundImage = `url('${backgroundUrl}')`;
    cardsContainer.append(mainContainer);
  } else if (block.classList.contains('promo-link')) {
    const title = block.querySelector('h3');
    const text = title.nextElementSibling;
    const linkSrc = block.querySelector('p a').href;
    const linkEl = document.createElement('a');
    linkEl.href = linkSrc;
    linkEl.append(title);
    linkEl.append(text);
    const mainContainer = document.createElement('div');
    mainContainer.className = 'cards-body-container';
    mainContainer.append(linkEl);
    const backgroundUrl = block.querySelector('picture img');
    if (backgroundUrl) {
      mainContainer.style.backgroundImage = `url('${backgroundUrl.src}')`;
    }
    cardsContainer.append(mainContainer);
  } else if (block.classList.contains('static')) {
    const [
      readLabel,
      watchLabel,
    ] = await Promise.all([
      i18n('Read'),
      i18n('Watch'),
    ]);
    const ul = document.createElement('ul');
    [...block.children].forEach((row) => {
      const li = document.createElement('li');
      const image = row.querySelector('picture');
      const title = row.querySelector('h3').innerText;
      const linkSrc = row.querySelector('h3 a').href;
      const date = row.querySelector('strong').innerText;
      const format = row.querySelector('em').innerText;
      const time = row.querySelector('em').parentNode.parentNode.nextElementSibling.querySelector('p').innerText;

      const linkEl = document.createElement('a');
      linkEl.href = linkSrc;
      linkEl.classList.add(`${format === 'video' ? 'video-card' : 'article-card'}`);

      const imageContainer = document.createElement('div');
      imageContainer.className = 'cards-image-container';
      imageContainer.append(image);
      imageContainer.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));

      const mainContainer = document.createElement('div');
      mainContainer.className = 'cards-body-container';
      const cardSubtitle = document.createElement('div');
      cardSubtitle.className = 'cards-subtitle';
      const cardTime = document.createElement('span');
      cardTime.className = 'cards-time';
      cardTime.innerText = `${parseTime(time)} ${format === 'video' ? watchLabel : readLabel}`;
      const cardDate = document.createElement('span');
      cardDate.className = 'cards-date';
      cardDate.innerText = date;
      const cardTitle = document.createElement('h3');
      cardTitle.innerHTML = title;

      mainContainer.append(cardTime);
      mainContainer.append(cardDate);
      mainContainer.append(cardTitle);

      linkEl.append(imageContainer);
      linkEl.append(mainContainer);

      li.append(linkEl);
      ul.append(li);
    });

    cardsContainer.append(ul);
  } else {
    const ul = document.createElement('ul');
    [...block.children].forEach((row) => {
      const li = document.createElement('li');
      while (row.firstElementChild) li.append(row.firstElementChild);
      [...li.children].forEach((div) => {
        if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
        else div.className = 'cards-card-body';
      });
      ul.append(li);
    });
    ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
    cardsContainer.append(ul);
  }
  block.textContent = '';
  block.append(cardsContainer);
}

export async function createDynamicCardCourse(contentData) {
  const {
    metadata: { 'og:image': image },
    title,
    description,
    path,
    readTime,
  } = contentData;
  const imageWrapper = createElement('div', { class: 'cards-card-image' });
  const link = createElement('a', { href: path });
  imageWrapper.style.backgroundImage = `url('${image}')`;

  const bodyWrapper = createElement('div', { class: 'cards-card-body' });
  bodyWrapper.innerHTML = `
    <div class="card-subtitle">
    course
    <span>${await parseTime(readTime)}</span>
    </div>
    <div class="cards-card-title">
      <h3>${title}</h3>
    </div>
    <div class="cards-card-description">
      <p>${description}</p>
    </div>
  `;
  link.append(bodyWrapper);

  const li = createElement('li', { class: 'cards-card' }, imageWrapper, link);
  return li;
}

export async function createDynamicCardArticle({ content }) {
  const { dynamicProperties } = content;
  const {
    path,
    mediaType,
    fullImage,
    duration,
    date,
    title,
  } = dynamicProperties;
  const durationMin = convertReadTimeFormat(duration);
  const subTemplates = convertMediaTypeToSubtemplate(mediaType);
  const [
    readLabel,
    durationStr,
  ] = await Promise.all([
    getReadTimeLabel(subTemplates),
    parseTime(durationMin),
  ]);

  const li = document.createElement('li');
  const linkEl = document.createElement('a');
  linkEl.href = path;
  if (subTemplates.includes('video')) {
    linkEl.classList.add('video-card');
  }

  const imageContainer = document.createElement('div');
  imageContainer.className = 'cards-image-container';
  const image = document.createElement('img');
  image.src = fullImage;
  imageContainer.append(image);

  const mainContainer = document.createElement('div');
  mainContainer.className = 'cards-body-container';

  const cardSubtitle = document.createElement('div');
  cardSubtitle.className = 'cards-subtitle';

  const cardTime = document.createElement('span');
  cardTime.className = 'cards-time';
  cardTime.innerText = `${durationStr} ${readLabel}`;
  cardTime.prepend(getReadTimeIcon(subTemplates));

  const cardDate = document.createElement('span');
  cardDate.className = 'cards-date';
  const utcDate = getUTCfromDateString(date);
  const { day, month } = formatToCentralTime(utcDate, false, false, ['month', 'day']);
  cardDate.innerText = `${day} ${month}`;

  const cardTitle = document.createElement('h3');
  cardTitle.innerHTML = title;

  mainContainer.append(cardTime, cardDate, cardTitle);
  linkEl.append(imageContainer, mainContainer);
  li.append(linkEl);

  return li;
}

function createDynamicCardThumbnailMedium({ content }) {
  const { dynamicProperties } = content;
  const {
    path,
    fullImage,
    title,
  } = dynamicProperties;
  const cardImgTop = createOptimizedPicture(fullImage);
  cardImgTop.className = 'card-img-top';
  const paragraph = createElement('p', { class: 'card-text' }, decodeHtmlEntities(title));
  const titletag = createElement('div', { class: 'card-title' }, paragraph);
  const cardBody = createElement('div', { class: 'card-body' }, titletag);
  const link = createElement('a', { href: path }, cardImgTop, cardBody);
  return createElement('li', null, link);
}

function createDynamicCardUpcomingEvent(content) {
  const {
    url,
    date,
    eventName,
  } = content;
  const paragraph = createElement('p', { class: 'card-text' }, decodeHtmlEntities(eventName));
  const titletag = createElement('div', { class: 'card-title' }, paragraph);
  const datetag = createElement('div', { class: 'card-date' }, formatDate(date, true));
  const cardBody = createElement('div', { class: 'card-body' }, titletag, datetag);
  const link = createElement('a', { href: url }, cardBody);
  return createElement('li', null, link);
}

async function fetchAndFilterDataLegacyEndpoint(endpoint) {
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.results;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading data:', error);
    return [];
  }
}

function createSpinner() {
  const spinner = createElement('div', { class: 'spinner-cards' });
  spinner.innerHTML = `
    <div></div>
    <div></div>
    <div></div>
    <div></div>
  `;
  return spinner;
}

export async function createDynamicCards(block, numEntries = null) {
  const config = readBlockConfig(block);
  block.textContent = '';
  block.append(createSpinner());
  let filteredData;
  let cardElements;
  let sliderConfig = null;
  let disabledOnDesktop = false;
  let inverse = false;
  if (block.classList.contains('course')) {
    const indexFilter = buildIndexFilter(config);
    indexFilter.templates = ['course'];
    indexFilter.orderBy = 'date';
    indexFilter.sortDirection = 'desc';
    if (numEntries) {
      indexFilter.limit = numEntries;
    }
    filteredData = await getIndexedContent(indexFilter);
    sliderConfig = {
      slidesToShow: 'auto',
      slidesToScroll: 1,
      scrollLock: false,
      itemWidth: 270,
      exactWidth: true,
      draggable: true,
      duration: 2,
      responsive: [
        {
          breakpoint: 481,
          settings: {
            itemWidth: 434,
          },
        },
      ],
    };
    inverse = true;
    disabledOnDesktop = true;
    cardElements = await Promise.all(filteredData.map(createDynamicCardCourse));
  } else if (block.classList.contains('article')) {
    const { endpoint } = config;
    filteredData = await fetchAndFilterDataLegacyEndpoint(endpoint);
    cardElements = await Promise.all(filteredData.map(createDynamicCardArticle));
    sliderConfig = {
      slidesToShow: 'auto',
      slidesToScroll: 1,
      scrollLock: false,
      itemWidth: 255,
      exactWidth: true,
      draggable: true,
      duration: 2,
      responsive: [
        {
          breakpoint: 481,
          settings: {
            itemWidth: 426,
          },
        },
      ],
    };
    disabledOnDesktop = true;
  } else if (block.classList.contains('thumbnail-medium')) {
    const { endpoint } = config;
    filteredData = await fetchAndFilterDataLegacyEndpoint(endpoint);
    cardElements = await Promise.all(filteredData.map(createDynamicCardThumbnailMedium));
  } else if (block.classList.contains('upcoming-events')) {
    if (block.classList.contains('econoday-events')) {
      filteredData = await getEconomicReleaseEvents(new Date().toISOString().slice(0, 10), null, null, null, 10);
    } else {
      const indexFilter = buildIndexFilter(config);
      indexFilter.templates = ['event'];
      indexFilter.relativeDateFrom = 0;
      indexFilter.relativeDateTo = 365;
      indexFilter.orderBy = 'date';
      indexFilter.sortDirection = 'asc';
      indexFilter.limit = 10;
      filteredData = await getIndexedContent(indexFilter);
      filteredData.forEach((obj) => {
        obj.eventName = obj.title;
        obj.url = obj.path;
      });
    }
    if (filteredData.length > 0) {
      cardElements = filteredData.map(createDynamicCardUpcomingEvent);
      sliderConfig = {
        slidesToShow: 'auto',
        slidesToScroll: 1,
        scrollLock: false,
        itemWidth: 249,
        exactWidth: true,
        draggable: true,
        duration: 2,
        responsive: [
          {
            breakpoint: 993,
            settings: {
              itemWidth: 324,
            },
          },
        ],
      };
    }
  } else {
    cardElements = [];
  }
  if (cardElements && cardElements.length) {
    const ul = createElement('ul', null, ...cardElements);
    const cardsContainer = createElement('div', null, ul);
    block.textContent = '';
    block.appendChild(cardsContainer);
    if (sliderConfig) {
      buildSlider(ul, sliderConfig, true, disabledOnDesktop, inverse);
    }
  } else {
    const noResultsLabel = createElement('h4', null, 'No results found');
    const noResults = createElement('div', { class: 'no-results' }, noResultsLabel);
    block.textContent = '';
    block.append(noResults);
  }
}

export default async function decorate(block) {
  if (block.classList.contains('dynamic')) {
    createDynamicCards(block);
  } else {
    createStaticCards(block);
  }
}

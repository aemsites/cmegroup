/* eslint-disable max-len */
import {
  buildIndexFilter,
  getIndexedContent,
} from '../../scripts/indexing.js';

import {
  createElement,
  parseTime,
  getReadTimeLabel,
  getReadTimeIcon,
  decodeHtmlEntities,
  buildSlider,
  readBlockConfig,
  setupDayjsLibs,
  getCdtDate,
} from '../../scripts/utils.js';
import {
  legacyArticleTemplates,
  mapLegacyArticleData,
  isLegacyContent,
} from '../../scripts/legacyContentMapping.js';
import { wrapImgsInLinks } from '../../scripts/utils/dom.js';

import createOptimizedPicture from '../../scripts/utils/picture.js';
import { getEconomicReleaseEvents } from '../../scripts/services/EconomicReleaseService.js';

async function createStaticCards(block) {
  const size = block.children.length;
  block.classList.add(`size-${size}`);
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
    const cardElements = [];
    let sliderConfig = null;
    const disabledOnDesktop = false;
    const inverse = false;
    const hasClickableImages = block.classList.contains('clickable-image');

    [...block.children].forEach((row) => {
      if (hasClickableImages) {
        wrapImgsInLinks(row);
      }
      const li = createElement('li');
      const courseQty = row.querySelector('em');
      const title = row.querySelector('h3');
      const text = title.nextElementSibling;
      const linkEl = createElement('a');
      const linkSrc = row.querySelector('a').href;
      linkEl.innerText = row.querySelector('a').innerText;
      linkEl.href = linkSrc;

      const mainContainer = createElement('div', { class: 'cards-body-container' });
      const cardBody = createElement('div', { class: 'cards-body' });
      const cardTitleContainer = createElement('div', { class: 'cards-title-container' });
      const cardTextContainer = createElement('div', { class: 'cards-text-container' });

      cardTitleContainer.append(courseQty);
      cardTitleContainer.append(title);

      if (
        text
        && text.tagName.toLowerCase() === 'p'
        && !text.classList.contains('button-container')
      ) {
        cardTextContainer.append(text);
      }

      cardBody.append(cardTitleContainer);
      cardBody.append(cardTextContainer);
      cardBody.append(linkEl);
      mainContainer.append(cardBody);
      li.append(mainContainer);
      cardElements.push(li);
    });

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

    if (cardElements && cardElements.length) {
      const ul = createElement('ul', null, ...cardElements);
      cardsContainer.append(ul);
      block.textContent = '';
      block.appendChild(cardsContainer);
      buildSlider(ul, sliderConfig, true, disabledOnDesktop, inverse, true);
    }
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
    metadata: {
      'og:image': ogimage,
      image,
    },
    title,
    description,
    path,
    readTime,
  } = contentData;
  const imageWrapper = createElement('div', { class: 'cards-card-image' });
  const link = createElement('a', { href: path });
  imageWrapper.style.backgroundImage = `url('${ogimage || image}')`;

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

export async function createDynamicCardArticle(content) {
  const curatedContent = isLegacyContent(content) ? mapLegacyArticleData(content) : content;
  const {
    path,
    readTime,
    date,
    title,
    metadata: {
      'sub-template': subTemplates,
      image,
    },
  } = curatedContent;
  const [
    readLabel,
    durationStr,
  ] = await Promise.all([
    getReadTimeLabel(subTemplates),
    parseTime(readTime),
  ]);
  const cardTime = createElement('span', { class: 'cards-time' }, `${durationStr} ${readLabel}`);
  cardTime.prepend(getReadTimeIcon(subTemplates));
  const cardDate = createElement('span', { class: 'cards-date' }, getCdtDate(date).format('DD MMMM'));
  const cardTitle = createElement('h3');
  cardTitle.innerHTML = title;
  const mainContainer = createElement('div', { class: 'cards-body-container' }, cardTime, cardDate, cardTitle);
  const img = createElement('img', { src: image });
  const imageContainer = createElement('div', { class: 'cards-image-container' }, img);
  const linkEl = createElement('a', { href: path }, imageContainer, mainContainer);
  if (subTemplates.includes('video')) {
    linkEl.classList.add('video-card');
  }
  return createElement('li', null, linkEl);
}

function createDynamicCardThumbnailMedium(content) {
  const curatedContent = isLegacyContent(content) ? mapLegacyArticleData(content) : content;
  const {
    path,
    title,
    metadata: {
      image,
    },
  } = curatedContent;
  const cardImgTop = createOptimizedPicture(image);
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
  const datetag = createElement('div', { class: 'card-date' }, getCdtDate(date).format('DD MMM YYYY'));
  const cardBody = createElement('div', { class: 'card-body' }, titletag, datetag);
  const link = createElement('a', { href: url }, cardBody);
  return createElement('li', null, link);
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

export async function createDynamicCards(block) {
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
    indexFilter.orderBy = 'lastModified';
    indexFilter.sortDirection = 'desc';
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
    const isList = block.classList.contains('list');
    const isThumbnailMedium = block.classList.contains('thumbnail-medium');
    const isCardList = block.classList.contains('card-list');
    const indexFilter = buildIndexFilter(config);
    indexFilter.templates = ['article', ...legacyArticleTemplates];
    if (!indexFilter.basePaths || indexFilter.basePaths.length === 0) {
      indexFilter.basePaths = ['/education', '/content/cmegroup/en'];
    }
    if (!indexFilter.limit) {
      indexFilter.limit = (isList || isThumbnailMedium) ? 3 : 4;
    }
    indexFilter.orderBy = 'date';
    indexFilter.sortDirection = 'desc';
    [filteredData] = await Promise.all([
      getIndexedContent(indexFilter),
      setupDayjsLibs(),
    ]);
    const mapFunction = isThumbnailMedium ? createDynamicCardThumbnailMedium : createDynamicCardArticle;
    cardElements = await Promise.all(filteredData.map(mapFunction));
    if (isCardList) {
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
    }
    disabledOnDesktop = true;
  } else if (block.classList.contains('upcoming-events')) {
    if (block.classList.contains('econoday-events')) {
      [filteredData] = await Promise.all([
        getEconomicReleaseEvents(new Date().toISOString().slice(0, 10), null, null, null, 10),
        setupDayjsLibs(),
      ]);
    } else {
      const indexFilter = buildIndexFilter(config);
      indexFilter.templates = ['event'];
      indexFilter.relativeDateFrom = 0;
      indexFilter.relativeDateTo = 365;
      indexFilter.orderBy = 'date';
      indexFilter.sortDirection = 'asc';
      indexFilter.limit = 10;
      [filteredData] = await Promise.all([
        getIndexedContent(indexFilter),
        setupDayjsLibs(),
      ]);
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
    if (config.title) {
      const listCardTitle = document.createElement('h4');
      listCardTitle.textContent = config.title;
      block.appendChild(listCardTitle);
    }
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

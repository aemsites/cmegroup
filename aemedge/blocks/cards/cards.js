/* eslint-disable no-console */
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
  getTag,
  i18n,
  convertMMSSToHHMM,
} from '../../scripts/utils.js';
import {
  legacyArticleTemplates,
  mapLegacyArticleData,
  isLegacyContent,
  legacyOpenMarketsTemplates,
  legacyNewsTemplates,
} from '../../scripts/legacyContentMapping.js';
import { wrapImgsInLinks } from '../../scripts/utils/dom.js';
import {
  urlByEnvType,
} from '../../scripts/utils/index.js';
import createOptimizedPicture from '../../scripts/utils/picture.js';
import { getEconomicReleaseEvents } from '../../scripts/services/EconomicReleaseService.js';

const fallbackImage = `url(${urlByEnvType()}/content/dam/cmegroup/images/common/default/article-940x600.jpg)`;

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
  } else if (block.classList.contains('promo')) {
    const ul = document.createElement('ul');
    const textClass = Array.from(block.classList).find((className) => className.startsWith('text-'));
    [...block.children].forEach((row) => {
      const li = document.createElement('li');
      if (row.querySelector('div').hasChildNodes()) {
        const link = document.createElement('a');
        const linkSrc = row.firstElementChild.querySelector('p a')?.href;
        link.href = linkSrc;
        li.append(link);
        while (row.firstElementChild) link.append(row.firstElementChild);
        [...li.children].forEach((anchor) => {
          const div = anchor.querySelector('div');
          if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
          else div.className = 'cards-card-body';
          if (textClass) {
            const paragraphs = div.querySelectorAll('p');
            paragraphs.forEach((p) => {
              p.classList.add(textClass);
            });
          }
          if (!div.hasChildNodes()) {
            div.parentElement.classList.add('empty-card');
          }
        });
      } else {
        li.classList.add('empty-card');
      }
      ul.append(li);
    });
    ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
    cardsContainer.append(ul);
  } else {
    const ul = document.createElement('ul');
    const textClass = Array.from(block.classList).find((className) => className.startsWith('text-'));
    [...block.children].forEach((row) => {
      const li = document.createElement('li');
      while (row.firstElementChild) li.append(row.firstElementChild);
      [...li.children].forEach((div) => {
        if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
        else div.className = 'cards-card-body';
        if (textClass) {
          const paragraphs = div.querySelectorAll('p');
          paragraphs.forEach((p) => {
            p.classList.add(textClass);
          });
        }
        if (!div.hasChildNodes()) {
          div.parentElement.classList.add('empty-card');
        }
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
  imageWrapper.style.backgroundImage = `url('${ogimage || image || fallbackImage}')`;

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

export async function createDynamicCardArticle(content, showPrimaryTopic = false) {
  const curatedContent = isLegacyContent(content) ? mapLegacyArticleData(content) : content;
  const {
    path,
    readTime,
    date,
    title,
    metadata: {
      'sub-template': subTemplates,
      image,
      'primary-topic': primaryTopic,
    },
  } = curatedContent;
  const [
    readLabel,
    durationStr,
    primaryTopicStr,
  ] = await Promise.all([
    getReadTimeLabel(subTemplates),
    parseTime(readTime),
    showPrimaryTopic ? getTag(primaryTopic) : '',
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
  if (showPrimaryTopic && primaryTopicStr) {
    const cardPrimaryTopic = createElement('span', { class: 'cards-primary-topic' }, primaryTopicStr.title);
    const cardFooter = createElement('div', { class: 'cards-footer' }, cardPrimaryTopic);
    linkEl.append(cardFooter);
  }
  if (subTemplates.includes('video')) {
    linkEl.classList.add('video-card');
  }
  return createElement('li', null, linkEl);
}

async function createDynamicCardArticleMedium(content, index) {
  const curatedContent = isLegacyContent(content) ? mapLegacyArticleData(content) : content;
  const {
    path,
    readTime,
    date,
    title,
    description,
    author,
    metadata: {
      'sub-template': subTemplates,
      image,
    },
  } = curatedContent;
  const [
    readLabel,
    durationStr,
    authorTag,
    byLabel,
  ] = await Promise.all([
    getReadTimeLabel(subTemplates),
    parseTime(readTime),
    getTag(author || ''),
    i18n('By'),
  ]);
  const cardTime = createElement('span', { class: 'cards-time' }, `${durationStr} ${readLabel}`);
  cardTime.prepend(getReadTimeIcon(subTemplates));
  const cardTitle = createElement('h3');
  cardTitle.innerHTML = title;
  const cardDescription = createElement('span', { class: 'cards-description' }, description);
  const mainContainer = createElement('div', { class: 'cards-body-container' }, cardTime, cardTitle, cardDescription);
  const cardDate = createElement('div', { class: 'cards-date' }, getCdtDate(date).format('DD MMM YYYY'));
  let cardAuthor;
  if (authorTag?.title) {
    cardAuthor = createElement('div', { class: 'cards-author' }, `${byLabel} ${authorTag?.title}`);
  }
  const footerContainer = createElement('div', { class: 'cards-footer' }, cardDate, cardAuthor);
  const linkEl = createElement('a', { href: path }, mainContainer, footerContainer);
  const liAttrs = (index === 0) ? { 'data-image': image } : null;
  return createElement('li', liAttrs, linkEl);
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

function simpleDynamicCard(content) {
  const curatedContent = isLegacyContent(content) ? mapLegacyArticleData(content) : content;
  const {
    path,
    title,
    metadata: {
      'sub-template': subTemplates,
      image,
    },
  } = curatedContent;
  const cardTitle = createElement('h3');
  cardTitle.innerHTML = title;
  const mainContainer = createElement('div', { class: 'cards-body-container' }, cardTitle);
  const img = createElement('img', { src: image });
  const imageContainer = createElement('div', { class: 'cards-image-container' }, img);
  const linkEl = createElement('a', { href: path }, imageContainer, mainContainer);
  if (subTemplates.includes('video')) {
    linkEl.classList.add('video-card');
  }
  return createElement('li', null, linkEl);
}

function getArticleTypeConfig(block) {
  if (block.classList.contains('list')) {
    return {
      type: 'list',
      limit: 3,
      mapFunction: (content) => createDynamicCardArticle(content, false),
      sliderConfig: null,
      disableSliderOnDesktop: true,
    };
  }
  if (block.classList.contains('thumbnail-medium')) {
    return {
      type: 'thumbnail-medium',
      limit: 3,
      mapFunction: createDynamicCardThumbnailMedium,
      sliderConfig: null,
      disableSliderOnDesktop: true,
    };
  }
  if (block.classList.contains('card-list')) {
    return {
      type: 'card-list',
      limit: 4,
      mapFunction: (content) => {
        const showPrimaryTopic = block.classList.contains('show-primary-topic');
        return createDynamicCardArticle(content, showPrimaryTopic);
      },
      disableSliderOnDesktop: true,
      sliderConfig: {
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
              itemWidth: 292,
            },
          },
        ],
      },
    };
  }
  if (block.classList.contains('medium')) {
    return {
      type: 'medium',
      limit: 10,
      mapFunction: createDynamicCardArticleMedium,
      disableSliderOnDesktop: false,
      sliderConfig: {
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
      },
      refreshCallback: (el) => {
        if (block.classList.contains('featured')) {
          const windowWidth = window.innerWidth;
          const firstSlide = el.querySelector('.glider-slide');
          firstSlide.style.backgroundImage = `url('${firstSlide.dataset.image}')`;
          if (windowWidth >= 993) {
            firstSlide.style.width = '401px';
            const track = el.querySelector('.glider-track');
            track.style.width = `${track.offsetWidth + 77}px`;
          }
        }
      },
    };
  }
  return {};
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
  let disableSliderOnDesktop = false;
  let inverse = false;
  let refreshCallback = null;
  if (block.classList.contains('course')) {
    const indexFilter = buildIndexFilter(config);
    indexFilter.templates = ['course'];
    indexFilter.orderBy = 'lastModified';
    indexFilter.sortDirection = 'desc';
    if (indexFilter.limit) {
      block.classList.add(`columns-grid-${indexFilter.limit}`);
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
    disableSliderOnDesktop = true;
    cardElements = await Promise.all(filteredData.map(createDynamicCardCourse));
  } else if (block.classList.contains('article')) {
    const articleTypeConfig = getArticleTypeConfig(block);
    const indexFilter = buildIndexFilter(config);
    if (!indexFilter.templates || indexFilter.templates.length === 0) {
      indexFilter.templates = ['article', ...legacyArticleTemplates];
    } else {
      if (indexFilter.templates.includes('article')) {
        indexFilter.templates = [...indexFilter.templates, ...legacyArticleTemplates];
      }
      if (indexFilter.templates.includes('news')) {
        indexFilter.templates = [...indexFilter.templates, ...legacyNewsTemplates];
      }
    }
    if (!indexFilter.basePaths || indexFilter.basePaths.length === 0) {
      indexFilter.basePaths = ['/education', '/content/cmegroup/en'];
    }
    if (!indexFilter.limit) {
      indexFilter.limit = articleTypeConfig.limit;
    }
    if (!indexFilter.orderBy) {
      indexFilter.orderBy = 'date';
    }
    if (!indexFilter.sortDirection) {
      indexFilter.sortDirection = 'desc';
    }
    [filteredData] = await Promise.all([
      getIndexedContent(indexFilter),
      setupDayjsLibs(),
    ]);
    cardElements = await Promise.all(filteredData.map(articleTypeConfig.mapFunction));
    sliderConfig = articleTypeConfig.sliderConfig;
    refreshCallback = articleTypeConfig.refreshCallback;
    disableSliderOnDesktop = articleTypeConfig.disableSliderOnDesktop;
  } else if (block.classList.contains('openmarkets')) {
    const indexFilter = buildIndexFilter(config);
    indexFilter.templates = legacyOpenMarketsTemplates;
    if (!indexFilter.basePaths || indexFilter.basePaths.length === 0) {
      indexFilter.basePaths = ['/content/openmarkets'];
    }
    if (!indexFilter.limit) {
      indexFilter.limit = 2;
    }
    indexFilter.orderBy = 'date';
    indexFilter.sortDirection = 'desc';
    [filteredData] = await Promise.all([
      getIndexedContent(indexFilter),
    ]);
    cardElements = await Promise.all(filteredData.map(simpleDynamicCard));
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
    disableSliderOnDesktop = true;
    inverse = true;
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
    const paramsFallback = config['params-fallback'];
    block.textContent = '';
    if (config['params-fallback']) {
      cardElements.map((item) => {
        const childrenArray = Array.from(item.children || []);
        const anchor = childrenArray.find((child) => child.tagName === 'A');
        if (anchor) {
          anchor.href = `${anchor.href}?${paramsFallback}`;
        }
        return item;
      });
    }
    if (config.title) {
      const listCardTitle = document.createElement('h4');
      listCardTitle.textContent = config.title;
      block.appendChild(listCardTitle);
    }
    block.appendChild(cardsContainer);
    if (sliderConfig) {
      disableSliderOnDesktop = disableSliderOnDesktop && !block.classList.contains('always-slider');
      buildSlider(ul, sliderConfig, true, disableSliderOnDesktop, inverse, false, refreshCallback);
    }
  } else {
    const noResultsLabel = createElement('h4', null, 'No results found');
    const noResults = createElement('div', { class: 'no-results' }, noResultsLabel);
    block.textContent = '';
    block.append(noResults);
  }
}

async function createRecommendedFromService(data, block) {
  const { params } = readBlockConfig(block);
  const blockDiv = createElement('div', {
    class: 'cards recommended-ai block',
  });
  blockDiv.setAttribute('data-block-name', 'cards');
  const containerDiv = createElement('div');
  const ul = createElement('ul');
  ul.style.setProperty('--columns', Math.min(data.length, 4));

  const elements = await Promise.all(
    data.map(async (item) => {
      const imageDiv = createElement('div', {
        class: 'cards-card-image',
      });
      const imgSrc = item.image_uri;
      imageDiv.style.backgroundImage = imgSrc ? `url('https://www.cmegroup.com/${imgSrc}')` : fallbackImage;

      const link = createElement('a', { href: params ? `${item.uri}?${params}` : item.uri });

      const subtitleDiv = createElement('div', {
        class: 'card-subtitle',
      });
      subtitleDiv.textContent = `${item.image_name || ''} `;

      const span = createElement('span');
      parseTime(convertMMSSToHHMM(item.media_duration)).then((i) => {
        span.textContent = i;
        subtitleDiv.appendChild(span);
      });

      const titleDiv = createElement('div', {
        class: 'cards-card-title',
      });
      const h3 = createElement('h3');
      h3.textContent = item.title || '';
      titleDiv.appendChild(h3);

      const descDiv = createElement('div', {
        class: 'cards-card-description',
      });

      const p = createElement('p');
      p.textContent = item.description || '';
      descDiv.appendChild(p);

      const bodyDiv = createElement('div', {
        class: 'cards-card-body',
      }, subtitleDiv, titleDiv, descDiv);

      link.appendChild(bodyDiv);

      const li = createElement('li', {
        class: 'cards-card',
      }, imageDiv, link);

      ul.appendChild(li);
      return ul;
    }),
  );

  elements.forEach((li) => blockDiv.appendChild(li));

  const disableSliderOnDesktop = true;
  const inverse = true;
  const refreshCallback = null;
  const sliderConfig = {
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
  buildSlider(ul, sliderConfig, true, disableSliderOnDesktop, inverse, false, refreshCallback);

  containerDiv.appendChild(ul);
  blockDiv.appendChild(containerDiv);
  return blockDiv;
}

async function createRecommendedCards(block) {
  const blockData = block.cloneNode(true);
  const { limit } = readBlockConfig(block);
  block.textContent = '';
  block.appendChild(createSpinner());
  let dataAi = [];
  let useAiData = false;

  try {
    const { getRecommendationAi } = await import('../../scripts/services/RecommendationAiService.js');
    dataAi = await getRecommendationAi();

    if (dataAi && dataAi.length > 0) {
      const result = limit ? dataAi.slice(0, limit) : dataAi;
      const cardsAi = await createRecommendedFromService(result, blockData);
      block.replaceWith(cardsAi);
      useAiData = true;
    }
  } catch (error) {
    console.log('Error fetching Recommendation AI service:', error);
  }

  if (!useAiData) {
    if (blockData) {
      blockData.classList.remove('recommended-ai');
      await createDynamicCards(blockData);
      block.replaceWith(blockData);
    } else {
      const noResultsLabel = createElement('h4', null, 'No results found');
      const noResults = createElement('div', { class: 'no-results' }, noResultsLabel);
      block.replaceWith(noResults);
    }
  }
}

export default async function decorate(block) {
  if (block.classList.contains('dynamic')) {
    await createDynamicCards(block);
  } else if (block.classList.contains('recommended-ai')) {
    await createRecommendedCards(block);
  } else {
    createStaticCards(block);
  }
}

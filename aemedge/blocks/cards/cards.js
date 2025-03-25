/* eslint-disable max-len */
import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';
import {
  createElement,
  parseTime,
  formatDate,
  i18n,
} from '../../scripts/utils.js';

const QUERY_INDEX_ENDPOINT = '/query-index.json';

async function createStaticCards(block) {
  const cardsContainer = document.createElement('div');
  if (block.classList.contains('links')) {
    const cardTitle = document.createElement('h6');
    cardTitle.textContent = block.querySelector('h6').textContent;
    block.querySelector('h6').parentElement.parentElement.remove();
    const container = document.createElement('div');
    container.className = 'main-list-container';
    [...block.children].forEach((row) => {
      [...row.children].forEach((div) => {
        div.className = 'cards-card-body';
      });
      container.append(row);
    });
    cardsContainer.append(cardTitle);
    cardsContainer.append(container);
  } else if (block.classList.contains('event')) {
    const backgroundUrl = block.querySelector('picture img').src;
    const title = block.querySelector('h3');
    const text = block.querySelector('p');
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
      i18n('read'),
      i18n('watch'),
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
      cardTime.innerText = `${time} ${format === 'video' ? watchLabel : readLabel}`;
      const cardDate = document.createElement('span');
      cardDate.className = 'cards-date';
      cardDate.innerText = date;
      const cardTitle = document.createElement('h3');
      cardTitle.innerText = title;

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
  return cardsContainer;
}

export function createDynamicCard({
  image,
  title,
  description,
  path,
  'read-time': readTime,
}) {
  const imageWrapper = createElement('div', { class: 'cards-card-image' });
  const link = createElement('a', { href: path });
  imageWrapper.style.backgroundImage = `url('${image}')`;

  const bodyWrapper = createElement('div', { class: 'cards-card-body' });
  bodyWrapper.innerHTML = `
    <div class="card-subtitle">
    course
    <span>${parseTime(readTime)}</span>
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
    image: imagePath,
    duration,
    date,
    title,
  } = dynamicProperties;
  const [
    readLabel,
    watchLabel,
  ] = await Promise.all([
    i18n('read'),
    i18n('watch'),
  ]);

  const li = document.createElement('li');
  const linkEl = document.createElement('a');
  linkEl.href = path;
  linkEl.classList.add(mediaType === 'video-webinar' ? 'video-card' : 'article-card');

  const imageContainer = document.createElement('div');
  imageContainer.className = 'cards-image-container';
  const image = document.createElement('img');
  image.src = `https://www.cmegroup.com${imagePath}`;
  imageContainer.append(image);

  const mainContainer = document.createElement('div');
  mainContainer.className = 'cards-body-container';

  const cardSubtitle = document.createElement('div');
  cardSubtitle.className = 'cards-subtitle';

  const cardTime = document.createElement('span');
  cardTime.className = 'cards-time';
  cardTime.innerText = `${duration} ${mediaType === 'video-webinar' ? watchLabel : readLabel}`;

  const cardDate = document.createElement('span');
  cardDate.className = 'cards-date';
  cardDate.innerText = formatDate(date);

  const cardTitle = document.createElement('h3');
  cardTitle.innerText = title;

  mainContainer.append(cardTime, cardDate, cardTitle);
  linkEl.append(imageContainer, mainContainer);
  li.append(linkEl);

  return li;
}

export async function fetchAndFilterDataCourse(searchTags = []) {
  try {
    const response = await fetch(QUERY_INDEX_ENDPOINT);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const { data } = await response.json();

    const filtered = data.filter((item) => {
      const templateMatch = item.template?.toLowerCase() === 'course';

      if (!searchTags.length) return templateMatch;

      let itemTags = [];
      try {
        if (item.tags && item.tags !== '[]') {
          const tagsString = item.tags.replace(/\\"/g, '"').replace(/'/g, '"');
          itemTags = JSON.parse(tagsString).map((tag) => tag.toLowerCase());
        }
      } catch (e) {
        return false;
      }

      const tagMatch = searchTags.every((searchTag) => itemTags.some((itemTag) => itemTag.includes(searchTag)));
      return templateMatch && tagMatch;
    });

    return filtered;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading data:', error);
    return [];
  }
}

export async function fetchAndFilterDataArticle(endpoint) {
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

export default async function decorate(block) {
  const config = readBlockConfig(block);
  let cards = null;
  const cardsContainer = document.createElement('div');
  if (block.classList.contains('dynamic')) {
    const ul = createElement('ul');
    let filteredData;
    let cardElements;
    if (block.classList.contains('course')) {
      const tags = config.tags ? config.tags.split(',').map((tag) => tag.trim().toLowerCase()) : [];
      filteredData = await fetchAndFilterDataCourse(tags);
      cardElements = filteredData.map(createDynamicCard);
    } else {
      const { endpoint } = config;
      filteredData = await fetchAndFilterDataArticle(endpoint);
      cardElements = await Promise.all(filteredData.map(createDynamicCardArticle));
    }
    ul.append(...cardElements);
    cardsContainer.append(ul);
    cards = cardsContainer;
  } else {
    // Default to static mode
    cards = await createStaticCards(block);
  }

  if (cards) {
    block.textContent = '';
    block.append(cards);
  }
}

/* eslint-disable max-len */
import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';
import { createElement } from '../../scripts/utils.js';

const QUERY_INDEX_ENDPOINT = '/query-index.json';

function createStaticCards(block) {
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
}) {
  const img = createOptimizedPicture(
    image,
    title,
    false,
    [{ width: '750' }],
  );

  const imageWrapper = createElement('div', { class: 'cards-card-image' });
  const link = createElement('a', { href: path }, img);
  imageWrapper.append(link);

  const bodyWrapper = createElement('div', { class: 'cards-card-body' });
  bodyWrapper.innerHTML = `
    <div class="cards-card-title">
      <h3><a href="${path}">${title}</a></h3>
    </div>
    <div class="cards-card-description">
      <p>${description}</p>
    </div>
  `;

  const li = createElement('li', { class: 'cards-card' }, imageWrapper, bodyWrapper);
  return li;
}

export async function fetchAndFilterData(searchTags = []) {
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

export default async function decorate(block) {
  const config = readBlockConfig(block);
  let cards = null;
  const cardsContainer = document.createElement('div');
  if (block.classList.contains('dynamic')) {
    const tags = config.tags ? config.tags.split(',').map((tag) => tag.trim().toLowerCase()) : [];
    const filteredData = await fetchAndFilterData(tags);
    const ul = createElement('ul');
    const cardElements = filteredData.map(createDynamicCard);
    ul.append(...cardElements);
    cardsContainer.append(ul);
    cards = cardsContainer;
  } else {
    // Default to static mode
    cards = createStaticCards(block);
  }

  if (cards) {
    block.textContent = '';
    block.append(cards);
  }
}

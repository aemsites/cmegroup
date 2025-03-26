import { getMetadata } from '../../scripts/aem.js';
import {
  createElement,
  getArticleRelatedMetadata,
  i18n,
  getTag,
  formatToCentralTime,
} from '../../scripts/utils.js';

/**
 * Article hero section
 */
async function decorateArticlePageHero(block) {
  const [
    {
      readTime, author, primaryTopic, date,
    },
    readLabel,
    saveLabel,
    byLabel,
  ] = await Promise.all([
    getArticleRelatedMetadata(),
    i18n('read'),
    i18n('Save'),
    i18n('By'),
  ]);

  const h1 = block.querySelector('h1');
  const readIcon = createElement('img', {
    src: '/aemedge/icons/list.svg',
    alt: 'Read Time',
    loading: 'lazy',
  });

  const readIconSpan = readTime ? createElement('span', { class: 'icon icon-list' }, readIcon) : null;
  const readTimeText = readTime ? createElement('span', null, `${readTime} ${readLabel}`) : null;
  const articleTime = createElement('span', { class: 'article-time' }, readIconSpan, readTimeText);
  const featuredTag = primaryTopic ? createElement('span', { class: 'article-featured-tag' }, primaryTopic) : null;
  const saveIconOutlined = createElement('img', {
    src: '/aemedge/icons/bookmark-outlined.svg',
    alt: 'Bookmark Icon',
    loading: 'eager',
  });
  const saveIconOutlinedSpan = createElement('span', { class: 'show icon icon-bookmark-outlined' }, saveIconOutlined);
  const saveIconFilled = createElement('img', {
    src: '/aemedge/icons/bookmark-filled.svg',
    alt: 'Bookmark Icon',
    loading: 'lazy',
  });
  const saveIconFilledSpan = createElement('span', { class: 'icon icon-bookmark-filled' }, saveIconFilled);
  const saveText = createElement('span', { class: 'save-text' }, saveLabel);
  const bookmarkButton = createElement('a', { class: 'bookmark' }, saveIconOutlinedSpan, saveIconFilledSpan, saveText);
  const row1 = createElement('div', { class: 'row' }, articleTime, featuredTag, bookmarkButton);
  const row2 = createElement('div', { class: 'row article-title' }, h1);
  const authorText = `${byLabel} ${author}`;
  const authors = author ? createElement('span', { class: 'authors' }, authorText) : null;
  const articleDate = date ? createElement('span', { class: 'article-date' }, date) : null;
  const row3 = createElement('div', { class: 'row' }, authors, articleDate);

  const articleInfo = createElement('div', { class: 'article-info' }, row1, row2, row3);
  block.append(articleInfo);

  const bookmark = block.querySelector('.bookmark');
  const saveIcons = bookmark.querySelectorAll('.icon');
  bookmark.addEventListener('mouseenter', () => {
    saveIcons.forEach((saveIcon) => { saveIcon.classList.toggle('show'); });
  });
  bookmark.addEventListener('mouseleave', () => {
    saveIcons.forEach((saveIcon) => { saveIcon.classList.toggle('show'); });
  });
  bookmark.addEventListener('click', () => {
    // TODO: Add bookmark functionality
  });
}

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

  const featuredTag = createElement('div', { class: 'economic-release-featured-tag' });
  const topInfo = createElement('div', { class: 'economic-release-info' }, block.querySelector('a'), featuredTag);
  const h1 = createElement('h1');
  const dateWrapper = createElement('div', { class: 'economic-release-data-date-wrapper' });
  const lastInfo = createElement('div', { class: 'economic-release-data' }, dateWrapper);
  const contentWrapper = createElement('div', { class: 'default-content-wrapper' }, topInfo, h1, lastInfo);
  block.append(contentWrapper);

  // Dynamic section
  const { default: getEventData } = await import('../../scripts/utilities/events.js');
  const primaryTopic = getMetadata('primary-topic');
  const [
    {
      title: pageTitle,
      effectiveDate,
    },
    {
      title: primaryTopicTitle,
    },
    dateLabel,
  ] = await Promise.all([
    getEventData(),
    getTag(primaryTopic),
    i18n('Date'),
  ]);
  featuredTag.textContent = primaryTopicTitle;
  h1.textContent = pageTitle;
  const dateTag = createElement('div', { class: 'economic-release-data-date-value' }, formatToCentralTime(effectiveDate));
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
  if (classList.contains('article')) {
    await decorateArticlePageHero(block);
  } else if (classList.contains('event')) {
    decorateEventPageHero(block);
  } else {
    decorateGenericHero(block);
  }
}

import { createElement, getArticleRelatedMetadata } from '../../scripts/utils.js';

function decorateArticlePageHero(block) {
  const {
    readTime, author, tag, date,
  } = getArticleRelatedMetadata();
  const h1 = block.querySelector('h1');
  const readIcon = createElement('img', {
    src: '/icons/list.svg',
    alt: 'Read Time',
    loading: 'lazy',
  });
  const readIconSpan = createElement('span', { class: 'icon icon-list' }, readIcon);
  const readTimeText = createElement('span', null, `${readTime} READ`);
  const articleTime = createElement('span', { class: 'article-time' }, readIconSpan, readTimeText);
  const featuredTag = createElement('span', { class: 'article-featured-tag' }, tag);
  const saveIconOutlined = createElement('img', {
    src: '/icons/bookmark-outlined.svg',
    alt: 'Bookmark Icon',
    loading: 'eager',
  });
  const saveIconOutlinedSpan = createElement('span', { class: 'show icon icon-bookmark-outlined' }, saveIconOutlined);
  const saveIconFilled = createElement('img', {
    src: '/icons/bookmark-filled.svg',
    alt: 'Bookmark Icon',
    loading: 'lazy',
  });
  const saveIconFilledSpan = createElement('span', { class: 'icon icon-bookmark-filled' }, saveIconFilled);
  const saveText = createElement('span', { class: 'save-text' }, 'Save');
  const bookmarkButton = createElement('a', { class: 'bookmark' }, saveIconOutlinedSpan, saveIconFilledSpan, saveText);
  const row1 = createElement('div', { class: 'row' }, articleTime, featuredTag, bookmarkButton);
  const row2 = createElement('div', { class: 'row article-title' }, h1);
  const authorText = `By ${author}`;
  const authors = createElement('span', { class: 'authors' }, authorText);
  const articleDate = createElement('span', { class: 'article-date' }, date);
  const row3 = createElement('div', { class: 'row' }, authors, articleDate);

  const labelsWrapper = createElement('div', { class: 'labels-wrapper' }, row1, row2, row3);
  block.append(labelsWrapper);

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

export default function decorate(block) {
  const isArticleVariant = block.classList.contains('article');
  if (isArticleVariant) {
    decorateArticlePageHero(block);
  }
}

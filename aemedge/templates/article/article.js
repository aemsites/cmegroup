import { createElement, i18n, getArticleRelatedMetadata } from '../../scripts/utils.js';

export default async function articleTemplate() {
  const [
    {
      readTime, author, primaryTopic, date, subTemplate,
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

  const main = document.querySelector('main');
  main.classList.add('article', subTemplate);

  const h1 = main.querySelector('h1');
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
  const row2 = createElement('div', { class: 'row article-title' }, h1.cloneNode(true));
  const authorText = `${byLabel} ${author}`;
  const authors = author ? createElement('span', { class: 'authors' }, authorText) : null;
  const articleDate = date ? createElement('span', { class: 'article-date' }, date) : null;
  const row3 = createElement('div', { class: 'row' }, authors, articleDate);

  const articleInfo = createElement('div', { class: 'article-info' }, row1, row2, row3);
  h1.before(articleInfo);
  h1.remove();

  const bookmark = main.querySelector('.bookmark');
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
import {
  createElement,
  i18n,
  getArticleRelatedMetadata,
  parseTime,
  getReadTimeLabel,
  getReadTimeIcon,
} from '../../scripts/utils.js';

async function decorateArticleHero(main) {
  const [
    {
      readTime, author, primaryTopic, date, subTemplates,
    },
    saveLabel,
    byLabel,
  ] = await Promise.all([
    getArticleRelatedMetadata(),
    i18n('Save'),
    i18n('By'),
  ]);
  const [
    parsedTime,
    readLabel,
  ] = await Promise.all([
    parseTime(readTime),
    getReadTimeLabel(subTemplates),
  ]);

  main.classList.add('article', ...subTemplates);

  const h1 = main.querySelector('h1');
  const readIconSpan = readTime ? getReadTimeIcon(subTemplates) : null;
  const readTimeText = readTime ? createElement('span', null, `${parsedTime} ${readLabel}`) : null;
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

  const firstSection = main.querySelector('.section:first-of-type');
  const picture = firstSection.querySelector('picture');
  if (picture?.parentElement?.tagName === 'P') {
    const container = picture.parentElement.parentElement;
    if (container) {
      picture.parentElement.remove();
      container.appendChild(picture);
    }
  }
  picture?.classList.add('hero-background');

  const articleInfo = createElement('div', { class: 'article-info' }, row1, row2, row3);
  if (subTemplates.includes('showcase')) {
    firstSection.append(articleInfo);
    h1.remove();
  } else {
    const secondSection = main.querySelector('.section:nth-of-type(2)');
    const firstDivChildren = secondSection.querySelector('div:first-of-type').children;
    const secondDiv = secondSection.querySelector('div:nth-of-type(2)');
    secondDiv.append(...firstDivChildren, ...secondDiv.children);
    secondDiv.querySelector('h1')?.replaceWith(articleInfo);
    secondSection.querySelector('div:first-of-type').remove();
  }

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

export default async function articleTemplate() {
  const main = document.querySelector('main');
  await decorateArticleHero(main);
}

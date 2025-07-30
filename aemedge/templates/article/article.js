import { getMetadata } from '../../scripts/aem.js';
import {
  createElement,
  i18n,
  getArticleRelatedMetadata,
  parseTime,
  getReadTimeLabel,
  getReadTimeIcon,
  setupDayjsLibs,
  getCdtDate,
} from '../../scripts/utils.js';

async function decorateArticleHero(main) {
  const subTemplates = getMetadata('sub-template')?.split(' ');
  const readTime = getMetadata('read-time');

  // Static section
  const heroSection = main.querySelector('.section:first-of-type');
  heroSection.classList.add('hero', ...subTemplates);
  const contentArea = createElement('span', { class: 'content-area' });
  const shadow = createElement('span', { class: 'shadow' });
  const fade = createElement('span', { class: 'fade' });
  const shadowWrapper = createElement('span', { class: 'shadow-wrapper' }, contentArea, shadow, fade);
  const picture = heroSection.querySelector('picture');
  picture.closest('div').classList.add('background-image');
  picture.closest('p').append(shadowWrapper);

  const readIconSpan = readTime ? getReadTimeIcon(subTemplates) : null;
  const articleTime = createElement('span', { class: 'article-time' }, readIconSpan);
  const featuredTag = createElement('span', { class: 'featured-tag' });
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
  const saveText = createElement('span', { class: 'save-text' });
  const bookmark = createElement('a', { class: 'bookmark' }, saveIconOutlinedSpan, saveIconFilledSpan, saveText);
  const topInfo = createElement('div', { class: 'top-info' }, articleTime, featuredTag, bookmark);
  const h1 = heroSection.querySelector('h1');
  const authors = createElement('span', { class: 'authors' });
  const articleDate = createElement('span', { class: 'article-date' });
  const lastInfo = createElement('div', { class: 'article-data' }, authors, articleDate);
  const contentWrapper = createElement('div', { class: 'default-content-wrapper' }, topInfo, h1, lastInfo);
  heroSection.append(contentWrapper);

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

  // Dynamic Section
  const [
    {
      author, primaryTopic, date,
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
    setupDayjsLibs(),
  ]);
  const readTimeText = readTime ? createElement('span', null, `${parsedTime} ${readLabel}`) : null;
  articleTime.append(readTimeText);
  featuredTag.textContent = primaryTopic;
  saveText.textContent = saveLabel;
  authors.textContent = `${byLabel} ${author}`;
  articleDate.textContent = getCdtDate(date).format('DD MMM YYYY');
}

export default function articleTemplate() {
  const main = document.querySelector('main');
  decorateArticleHero(main);
}

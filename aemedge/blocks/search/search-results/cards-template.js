import {
  a, div, h3, img, p, span,
} from '../../../scripts/dom-helpers.js';
import { i18n } from '../../../scripts/utils.js';

const articleCard = async (card, item) => {
  const titleEl = h3({ class: 'result-title' }, item.title);
  const descEl = p({ class: 'result-desc' }, item.description);
  const formattedDate = new Date(item.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const date = div({ class: 'result-footer' }, formattedDate);
  const anchor = a({ href: item.path });
  const tempDiv = div({ class: 'result-item' });

  tempDiv.appendChild(titleEl);
  tempDiv.appendChild(descEl);
  if (item.readTime) {
    const readTime = span({ class: 'result-read-time' }, `${item.readTime} min read`);
    tempDiv.appendChild(readTime);
  }
  tempDiv.appendChild(date);
  anchor.appendChild(tempDiv);
  card.appendChild(anchor);
};

const articleImageCard = async (card, item) => {
  let image = null;
  if (item.metadata['og:image']) {
    image = img({ src: item.metadata['og:image'], alt: item.title });
  }
  await articleCard(card, item);
  if (image) {
    card.children[0]?.prepend(image);
  }
};

const courseCard = async (card, item) => {
  const [
    courseLabel,
    lessonsLabel,
  ] = await Promise.all([
    i18n('Course'),
    i18n('Lessons'),
  ]);
  const header = div({ class: 'result-header' }, courseLabel);
  const titleEl = h3({ class: 'result-title' }, item.title);
  const descEl = p({ class: 'result-desc' }, item.description);
  const numLesson = div({ class: 'result-footer' }, `${item.metadata?.lessons || 0} ${lessonsLabel}`);
  const anchor = a({ href: item.path });
  const tempDiv = div({ class: 'result-item' });

  tempDiv.appendChild(header);
  tempDiv.appendChild(titleEl);
  tempDiv.appendChild(descEl);
  tempDiv.appendChild(numLesson);
  anchor.appendChild(tempDiv);
  card.appendChild(anchor);
};

const lessonCard = async (card, item) => {
  const [
    lessonLabel,
  ] = await Promise.all([
    i18n('Lesson'),
  ]);
  const header = div({ class: 'result-header' }, lessonLabel); // todo piyush add course name here
  const titleEl = h3({ class: 'result-title' }, item.title);
  const descEl = p({ class: 'result-desc' }, item.description);
  const formattedDate = new Date(item.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const date = div({ class: 'result-footer' }, formattedDate);
  const anchor = a({ href: item.path });
  const tempDiv = div({ class: 'result-item' });

  tempDiv.appendChild(header);
  tempDiv.appendChild(titleEl);
  tempDiv.appendChild(descEl);
  tempDiv.appendChild(date);
  anchor.appendChild(tempDiv);
  card.appendChild(anchor);
};

const courseImageCard = async (card, item) => {
  let image = null;
  if (item.metadata['og:image']) {
    image = img({ src: item.metadata['og:image'], alt: item.title });
  }
  await courseCard(card, item);
  if (image) {
    card.children[0]?.prepend(image);
  }
};

const lessonImageCard = async (card, item) => {
  let image = null;
  if (item.metadata['og:image']) {
    image = img({ src: item.metadata['og:image'], alt: item.title }); // some default addition of img
  }
  await lessonCard(card, item);
  if (image) {
    card.children[0]?.prepend(image);
  }
};

const getCards = async (cardType, item) => {
  const card = div({ class: `result-card ${cardType}` });
  switch (cardType) {
    case 'course':
      await courseCard(card, item);
      break;
    case 'lesson':
      await lessonCard(card, item);
      break;
    case 'course-image':
      await courseImageCard(card, item);
      break;
    case 'lesson-image':
      await lessonImageCard(card, item);
      break;
    case 'article-image':
      await articleImageCard(card, item);
      break;
    case 'article':
      await articleCard(card, item);
      break;
    default:
      break;
  }

  return card;
};

export {
  courseCard,
  lessonCard,
  getCards,
};

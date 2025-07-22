import {
  a, div, h3, img, p, span,
} from '../../../scripts/dom-helpers.js';
import { formatDate, i18n, parseTime } from '../../../scripts/utils.js';

// Build base card layout with optional header and additional children
const buildBaseCard = ({
  title, description, path, header = null, children = [],
}) => {
  const titleEl = h3({ class: 'result-title' }, title);
  const descEl = p({ class: 'result-desc' }, description);
  const anchor = a({ href: path });
  const tempDiv = div({ class: 'result-item' });

  if (header) tempDiv.appendChild(header);
  tempDiv.appendChild(titleEl);
  tempDiv.appendChild(descEl);
  children.forEach((child) => tempDiv.appendChild(child));

  anchor.appendChild(tempDiv);
  return anchor;
};

// Add image to card if present
const addImage = (card, item) => {
  const imageUrl = item.metadata?.['og:image'];
  if (imageUrl) {
    const imageEl = img({ src: imageUrl, alt: item.title });
    card.children[0]?.prepend(imageEl);
  }
};

// Article card
const articleCard = async (card, item) => {
  const footer = div({ class: 'result-footer' }, item.date ? formatDate(item.date, true) : '');
  const subTemplate = item.metadata?.['sub-template'];
  const isVideo = subTemplate?.startsWith('video') || subTemplate?.startsWith('podcast');
  const readTimeTemp = item.readTime ? await parseTime(item.readTime) : null;
  const readTime = readTimeTemp
    ? span({ class: `result-read-time ${isVideo ? 'video' : ''}` }, `${readTimeTemp} ${isVideo ? 'watch' : 'read'}`)
    : null;

  const anchor = buildBaseCard({
    title: item.title,
    description: item.description,
    path: item.path,
    children: readTime ? [readTime, footer] : [footer],
  });

  card.appendChild(anchor);
};

// Generic labeled card (course/lesson)
const labeledCard = async (card, item, labelKey, footerText) => {
  const label = await i18n(labelKey);
  const header = div({ class: 'result-header' }, label);
  const footer = div({ class: 'result-footer' }, footerText);

  const anchor = buildBaseCard({
    title: item['module-title'] || item.title,
    description: item.description,
    path: item.path,
    header,
    children: [footer],
  });

  card.appendChild(anchor);
};

// Course card
const courseCard = async (card, item) => {
  const lessonsLabel = await i18n('Lessons');
  const lessonCount = `${item.metadata?.lessons || 0} ${lessonsLabel}`;
  await labeledCard(card, item, 'Course', lessonCount);
};

// Lesson card
const lessonCard = async (card, item) => {
  // todo piyush add course name in place item.metadata?.['module-title']
  await labeledCard(card, item, `Lesson ${item.metadata?.['module-title'] ? `: ${item.metadata?.['module-title']}` : ''}`, item.date ? formatDate(item.date) : '');
};

// Wrap a card type with optional image
const imageCard = async (card, item, builderFn) => {
  await builderFn(card, item);
  addImage(card, item);
};

// Factory function
const getCards = async (cardType, item) => {
  const card = div({ class: `result-card ${cardType}` });

  const cardMap = {
    course: courseCard,
    lesson: lessonCard,
    'course-image': (c, i) => imageCard(c, i, courseCard),
    'lesson-image': (c, i) => imageCard(c, i, lessonCard),
    'article-image': (c, i) => imageCard(c, i, articleCard),
    article: articleCard,
  };

  const cardFn = cardMap[cardType];
  if (cardFn) await cardFn(card, item);

  return card;
};

export {
  courseCard,
  lessonCard,
  getCards,
};

import {
  a, div, h3, img, p,
} from '../../../scripts/dom-helpers.js';
import { i18n } from '../../../scripts/utils.js';

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
  const numLesson = div({ class: 'result-footer' }, `${item.lessons} ${lessonsLabel}`);
  const anchor = a({ href: item.href });
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
  const date = div({ class: 'result-footer' }, item.date);
  const anchor = a({ href: item.href });
  const tempDiv = div({ class: 'result-item' });

  tempDiv.appendChild(header);
  tempDiv.appendChild(titleEl);
  tempDiv.appendChild(descEl);
  tempDiv.appendChild(date);
  anchor.appendChild(tempDiv);
  card.appendChild(anchor);
};

const courseImageCard = async (card, item) => {
  const image = img({ src: item.image, alt: item.title });
  await courseCard(card, item);
  card.children[0]?.prepend(image);
};

const lessonImageCard = async (card, item) => {
  const image = img({ src: item.image, alt: item.title });
  await lessonCard(card, item);
  card.children[0]?.prepend(image);
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

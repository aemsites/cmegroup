import { div, h3, p } from '../../scripts/dom-helpers.js';

const courseCard = (card, item) => {
  const header = div({ class: 'result-header' }, 'Course');
  const titleEl = h3({ class: 'result-title' }, item.title);
  const descEl = p({ class: 'result-desc' }, item.description);
  const numLesson = div({ class: 'result-footer' }, `${item.lessons} Lessons`);
  card.appendChild(header);
  card.appendChild(titleEl);
  card.appendChild(descEl);
  card.appendChild(numLesson);
};

const lessonCard = (card, item) => {
  const header = div({ class: 'result-header' }, 'Lesson'); // todo piyush add course name here
  const titleEl = h3({ class: 'result-title' }, item.title);
  const descEl = p({ class: 'result-desc' }, item.description);
  const date = div({ class: 'result-footer' }, item.date);
  card.appendChild(header);
  card.appendChild(titleEl);
  card.appendChild(descEl);
  card.appendChild(date);
};

const getCards = (cardType, item) => {
  const card = div({ class: `result-card ${cardType}` });
  switch (cardType) {
    case 'course':
      courseCard(card, item);
      break;
    case 'lesson':
      lessonCard(card, item);
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

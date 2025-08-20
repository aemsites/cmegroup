import {
  a, div, h2, img, p,
} from '../../../scripts/dom-helpers.js';
import { getTaxonomy } from '../../../scripts/taxonomy.js';
import {
  getCdtDate, i18n, parseTime, getReadTimeLabel, getReadTimeIcon,
  createElement,
} from '../../../scripts/utils.js';

// Build base card layout with optional header and additional children
const buildBaseCard = ({
  title, description, path, header = null, children = [],
}) => {
  const titleEl = h2({ class: 'result-title' }, title);
  const descEl = p({ class: 'result-desc' }, description);
  const anchor = a({ href: path });
  const tempDiv = div({ class: 'result-item' });

  if (header) tempDiv.appendChild(header);
  tempDiv.appendChild(titleEl);
  tempDiv.appendChild(descEl);
  children.forEach((child) => {
    if (child) {
      tempDiv.appendChild(child);
    }
  });

  anchor.appendChild(tempDiv);
  return anchor;
};

// Add image to card if present
const addImage = (card, item) => {
  const imageUrl = item.metadata?.['og:image'];
  if (imageUrl && (imageUrl.includes('https://') || imageUrl.includes('http://'))) {
    const imageEl = img({ src: imageUrl, alt: item.title });
    card.children[0]?.prepend(imageEl);
  }
};

const resolveTaxonomyPath = (path, taxonomy) => {
  const parts = path.split('/');
  let current = taxonomy;

  for (let i = 0; i < parts.length; i += 1) {
    const key = parts[i];
    if (!current[key]) return null;
    current = current[key];
  }

  return { node: current };
};

const articleCard = async (card, item) => {
  const date = item.date ? getCdtDate(item.date).format('MMM DD, YYYY') : '';
  const footer = div({ class: 'result-footer' }, date);
  const subTemplates = item.metadata?.['sub-template']?.split(' ');

  const [
    parsedTime,
    readLabel,
  ] = await Promise.all([
    parseTime(item.readTime),
    getReadTimeLabel(subTemplates),
  ]);

  const readIconSpan = parsedTime ? getReadTimeIcon(subTemplates) : null;
  if (readIconSpan) {
    readIconSpan.appendChild(p(`${parsedTime} ${readLabel?.toLowerCase()}`));
    footer.classList.add('no-margin-top-auto');
  }

  const taxonomy = await getTaxonomy('tags');
  let header = null;

  if (item.metadata['primary-topic']) {
    const resolved = resolveTaxonomyPath(item.metadata['primary-topic'], taxonomy);
    if (resolved) {
      header = div({ class: 'result-header' }, resolved.node.title);
    }
  }

  const anchor = buildBaseCard({
    title: item.title,
    description: item.description,
    path: item.path,
    header,
    children: parsedTime ? [readIconSpan, footer] : [footer],
  });

  card.appendChild(anchor);
};

const labeledCardCourse = async (card, item, labelKey, footerText) => {
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

const labeledCardLesson = async (card, item, labelKey, footerText) => {
  const label = await i18n(labelKey);
  const header = div({ class: 'result-header' }, label);
  const footer = div({ class: 'result-footer date' }, footerText);

  const anchor = buildBaseCard({
    title: item.metadata?.['module-title'] || item.title,
    description: item.description,
    path: item.path,
    header,
    children: [footer],
  });

  card.appendChild(anchor);
};

const labeledCardStandaloneLesson = async (card, item, labelKey, footerText) => {
  const label = labelKey ? await i18n(labelKey) : null;
  const header = label ? div({ class: 'result-header' }, label) : null;
  const footer = div({ class: 'result-footer date' }, footerText);

  const subTemplates = item.metadata?.['sub-template']?.split(' ');
  const [
    parsedTime,
    readLabel,
  ] = await Promise.all([
    parseTime(item.readTime),
    getReadTimeLabel(subTemplates),
  ]);

  const readIcon = parsedTime ? createElement('img', {
    src: '/aemedge/icons/list.svg',
    alt: 'Read Time',
    loading: 'lazy',
  }) : null;
  const readIconSpan = readIcon ? createElement('span', { class: 'icon icon-list' }, readIcon) : null;

  if (readIconSpan) {
    readIconSpan.appendChild(p(`${parsedTime} ${readLabel?.toLowerCase()}`));
    footer.classList.add('no-margin-top-auto');
  }

  const anchor = buildBaseCard({
    title: item['module-title'] || item.title,
    description: item.description,
    path: item.path,
    header,
    children: parsedTime ? [readIconSpan, footer] : [footer],
  });

  card.appendChild(anchor);
};

// Course card
const courseCard = async (card, item) => {
  const lessonsLabel = await i18n('Lessons');
  const lessonCount = `${item.metadata?.lessons || 0} ${lessonsLabel}`;
  await labeledCardCourse(card, item, 'Course', lessonCount);
};

// Lesson card
const lessonCard = async (card, item) => {
  // todo piyush add course name in place item.metadata?.['module-title']
  await labeledCardLesson(card, item, `Lesson ${item.metadata?.['module-title']
    ? `: ${item.metadata?.['module-title']}` : ''}`, item.date ? getCdtDate(item.date).format('MMM DD, YYYY') : '');
};

const standaloneLessonCard = async (card, item) => {
  await labeledCardStandaloneLesson(card, item, '', item.date ? getCdtDate(item.date).format('MMM DD, YYYY') : '');
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
    'card-course': courseCard,
    'card-lesson': lessonCard,
    'card-standalone-lesson': (c, i) => standaloneLessonCard(c, i),
    'card-course-thumbnail': (c, i) => imageCard(c, i, courseCard),
    'card-lesson-thumbnail': (c, i) => imageCard(c, i, lessonCard),
    'card-standalone-lesson-thumbnail': (c, i) => imageCard(c, i, standaloneLessonCard),
    'card-article-thumbnail': (c, i) => imageCard(c, i, articleCard),
    article: articleCard,
    default: (c, i) => imageCard(c, i, articleCard),
  };

  const cardFn = cardMap[cardType];
  if (cardFn) {
    await cardFn(card, item);
  } else {
    await cardMap.default(card, item);
  }

  return card;
};

export {
  courseCard,
  lessonCard,
  getCards,
};

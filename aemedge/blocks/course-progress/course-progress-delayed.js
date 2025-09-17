import { getRecommendedCourses } from '../../scripts/services/EducationTrackService.js';
import {
  createElement,
  buildSlider,
  i18n,
} from '../../scripts/utils.js';
import { authentication } from '../../scripts/modules/Authentication.js';

//  course in progress
async function createProgressCard(data) {
  const {
    title,
    completedLessons,
    totalLessons,
    lessons,
  } = data;
  const url = lessons?.find((lesson) => !lesson.completed)?.url;
  const link = createElement('a', { href: url });
  const bodyWrapper = createElement('div', { class: 'card-body' });
  const [ofText, completedText] = await Promise.all([i18n('of'), i18n('lessons completed')]);

  bodyWrapper.innerHTML = `
    <div class="card-eyebrow">
      <span>${completedLessons} ${ofText} ${totalLessons} ${completedText}</span>
    </div>
    <div class="card-title">
      ${title}
    </div>
  `;
  link.append(bodyWrapper);
  return createElement('li', null, link);
}

//  recommended progress
async function createRecommendedCard(data) {
  const {
    title,
    url,
  } = data;
  const link = createElement('a', { href: url });
  const bodyWrapper = createElement('div', { class: 'card-body' });
  const recommendedText = await i18n('Recommended');

  bodyWrapper.innerHTML = `
    <div class="card-eyebrow">
      <span>${recommendedText}</span>
    </div>
    <div class="card-title">
      ${title}
    </div>
  `;
  link.append(bodyWrapper);
  return createElement('li', null, link);
}

async function createCardsBlock(block, data) {
  const sliderConfig = {
    slidesToShow: 'auto',
    slidesToScroll: 1,
    scrollLock: false,
    itemWidth: 207,
    exactWidth: true,
    draggable: true,
    duration: 2,
    responsive: [
      {
        breakpoint: 993,
        settings: {
          itemWidth: 207,
        },
      },
    ],
  };

  const [progressCards, recommendedCards] = await Promise.all([
    await Promise.all(data.userProgress?.map(createProgressCard) || []),
    await Promise.all(data.recommendedCourses?.map(createRecommendedCard) || []),
  ]);
  const cards = [progressCards, recommendedCards];
  if (cards?.length) {
    const ul = createElement('ul', null, ...cards);
    const cardsContainer = createElement('div', null, ul);
    block.appendChild(cardsContainer);
    if (sliderConfig) {
      buildSlider(ul, sliderConfig, true, false, true);
    }
  } else {
    const noResultsLabel = createElement('span', null, 'No results found');
    const noResults = createElement('div', { class: 'no-results' }, noResultsLabel);
    block.append(noResults);
  }
}

async function createTitleBlock(block) {
  const [viewText, historyText] = await Promise.all([
    i18n('View all activity'),
    i18n('course History'),
  ]);

  const link = createElement('a', { href: 'education/history' });
  link.textContent = viewText;
  const title = createElement('div', { class: 'title' });
  title.textContent = historyText;
  const container = createElement(
    'div',
    { class: 'title-container' },
    title,
    link,
  );
  block.append(container);
}

async function createSummaryBlock(block, data) {
  const [coursesText, completedText, inProgressText] = await Promise.all([
    i18n('courses'),
    i18n('completed'),
    i18n('in progress'),
  ]);

  const completed = createElement('span', { class: 'courses-count' });
  completed.textContent = data.completedCourses || 0;
  const completedCourses = createElement('span');
  completedCourses.innerHTML = `${coursesText}<br/>${completedText}`;
  const inProgress = createElement('span', { class: 'courses-count' });
  inProgress.textContent = data.userProgress?.length || 0;
  const inProgressCourses = createElement('span');
  inProgressCourses.innerHTML = `${coursesText}<br/>${inProgressText}`;
  const container = createElement(
    'div',
    { class: 'summary-container' },
    completed,
    completedCourses,
    inProgress,
    inProgressCourses,
  );
  block.append(container);
}

async function createCourseProgress(config, block) {
  const data = await getRecommendedCourses(config.items || 6);
  await Promise.all([
    createTitleBlock(block),
    createSummaryBlock(block, data),
    createCardsBlock(block, data),
  ]);
}

export default async function decorate(config, block) {
  const { authenticationData } = authentication;
  authenticationData.loginPromise.then(async () => {
    if (authenticationData.isLoggedIn) {
      block.classList.remove('hide');
      createCourseProgress(config, block);
    }
  });
}

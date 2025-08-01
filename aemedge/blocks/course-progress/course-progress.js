import { getRecommendedCourses } from '../../scripts/services/EducationTrackService.js';
import {
  createElement,
  buildSlider,
  i18n,
} from '../../scripts/utils.js';
import { authentication } from '../../scripts/modules/Authentication.js';

async function createProgressCard(data) {
  const {
    moduleId,
    title,
    completedCount,
    totalCount,
    path,
  } = data;
  const link = createElement('a', { href: path });
  const bodyWrapper = createElement('div', { class: 'card-body' });
  const [ofText, completedText] = await Promise.all([i18n('of'), i18n('lessons completed')]);

  bodyWrapper.innerHTML = `
    <div class="card-eyebrow">
      <span>${completedCount} ${ofText} ${totalCount} ${completedText}</span>
    </div>
    <div class="card-title">
      Title Title ${title || moduleId}
    </div>
  `;
  link.append(bodyWrapper);
  return createElement('li', null, link);
}

async function createRecommendedCard(data) {
  const {
    moduleId,
    title,
    path,
  } = data;
  const link = createElement('a', { href: path });
  const bodyWrapper = createElement('div', { class: 'card-body' });
  const [recommendedText] = await Promise.all([i18n('Recommended')]);

  bodyWrapper.innerHTML = `
    <div class="card-eyebrow">
      <span>${recommendedText}</span>
    </div>
    <div class="cards-title">
      Title Title ${title || moduleId}
    </div>
  `;
  link.append(bodyWrapper);
  return createElement('li', null, link);
}

async function createCardsBlock(data) {
  const sliderConfig = {
    slidesToShow: 'auto',
    slidesToScroll: 1,
    scrollLock: false,
    exactWidth: false,
    draggable: true,
    duration: 2,
    responsive: [
      {
        breakpoint: 481,
        settings: {
          itemWidth: 300,
        },
      },
    ],
  };

  const progressCards = await Promise.all(data.userProgress?.map(createProgressCard));
  const recommendedCards = await Promise.all(data.recommendedCourses?.map(createRecommendedCard));
  const cards = [progressCards, recommendedCards];
  const ul = createElement('ul', null, ...cards);
  const cardsContainer = createElement('div', null, ul);
  if (sliderConfig) {
    buildSlider(ul, sliderConfig, true, false, true);
  }
  return cardsContainer;
}

async function createTitleBlock() {
  const [viewText, historyText] = await Promise.all([
    i18n('View all activity'),
    i18n('course History'),
  ]);

  const link = createElement('a', { href: '/education/history' });
  link.textContent = viewText;
  const title = createElement('div', { class: 'title' });
  title.textContent = historyText;
  const container = createElement(
    'div',
    { class: 'title-container' },
    title,
    link,
  );
  return container;
}

async function createSummaryBlock(data) {
  const [coursesText, completedText, inProgressText] = await Promise.all([
    i18n('courses'),
    i18n('completed'),
    i18n('in progress'),
  ]);

  const completed = createElement('span', { class: 'totals' });
  completed.textContent = data.completedCourses || 0;
  const completedCourses = createElement('span');
  completedCourses.innerHTML = `${coursesText}<br/>${completedText}`;
  const inProgress = createElement('span', { class: 'totals' });
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
  return container;
}

async function createCourseProgress(block) {
  const data = await getRecommendedCourses(6);
  const titleContainer = await createTitleBlock(data);
  const summaryContainer = await createSummaryBlock(data);
  block.append(titleContainer);
  block.append(summaryContainer);
  if (data.userProgress || data.recommendedCourses) {
    const cardsContainer = await createCardsBlock(data);
    block.append(cardsContainer);
  } else {
    const noResultsLabel = createElement('span', null, 'No results found');
    const noResults = createElement('div', { class: 'no-results' }, noResultsLabel);
    block.append(noResults);
  }
}

export default async function decorate(block) {
  block.textContent = '';
  block.classList.add('hide');
  const { authenticationData } = authentication;
  authenticationData.loginPromise.then(async () => {
    if (authenticationData.isLoggedIn) {
      block.classList.remove('hide');
      createCourseProgress(block);
    }
  });
}

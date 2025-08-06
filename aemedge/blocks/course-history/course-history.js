import {
  createElement,
  i18n,
  readBlockConfig,
  setupDayjsLibs,
} from '../../scripts/utils.js';
import { getUserProgress } from '../../scripts/services/EducationTrackService.js';
import { createEducationCard } from './course-card/course-card.js';
import { createPagination } from './pagination/pagination.js';
import { createFilters } from './filters/filters.js';
import { URIUtil } from '../../scripts/utils/index.js';

const uriUtil = new URIUtil('', URIUtil.ARRAY_COMMA_ENCODE);

function sortItemsByUpdated(items) {
  return items.sort((a, b) => new Date(b.data.updated) - new Date(a.data.updated));
}

function createNoResultsElement(boldText, normalText, linkText) {
  const boldSpan = createElement('span', { class: 'bold-error-text' }, boldText);
  const normalSpan = createElement('span', {}, normalText);
  const link = createElement('a', { href: '/education/courses.html' }, createElement('span', {}, linkText));

  return createElement('div', { class: 'no-results' }, boldSpan, normalSpan, link);
}

async function renderCards({
  wrapper, paginationWrapper, paginatedItems, total, resultsText,
}) {
  const [showingText] = await Promise.all([
    i18n('Showing {currentCount} of {total} results'),
  ]);

  const cards = await Promise.all(
    paginatedItems.map(({ type, data }) => {
      const isLesson = type === 'lesson';
      const launchUrl = isLesson
        ? data.url
        : data.lessons?.find((lesson) => !lesson.completed)?.url || data.url;
      return createEducationCard({ ...data, launchUrl }, isLesson);
    }),
  );

  wrapper.querySelectorAll('.course-card').forEach((el) => el.remove());
  cards.forEach((card) => wrapper.appendChild(card));

  requestAnimationFrame(() => {
    wrapper.querySelectorAll('.progress-bar .progress').forEach((bar, index) => {
      const { data, type } = paginatedItems[index];
      const progressPercentage = (type === 'lesson' && data.completed)
        ? 100
        : data.progressPercentage || 0;
      bar.style.width = `${progressPercentage}%`;
    });
  });

  wrapper.querySelector('.wrapper-paginator')?.remove();
  if (paginationWrapper) {
    wrapper.appendChild(paginationWrapper);
  }

  const currentCount = paginatedItems.length;

  resultsText.innerHTML = '';
  resultsText.appendChild(
    createElement('span', {}, showingText
      .replace('{currentCount}', currentCount)
      .replace('{total}', total)),
  );
}

function applyFilter(items, filterValue) {
  if (filterValue === 'COMPLETED') {
    return items.filter(({ data }) => data.completed);
  }
  if (filterValue === 'PROGRESS') {
    return items.filter(({ data }) => !data.completed);
  }
  return items;
}

async function setupPagination({
  container, items, pageSize, wrapper, resultsText, initialPage,
}) {
  createPagination({
    container,
    filteredItems: items,
    itemsPerPage: pageSize,
    ...(initialPage !== undefined ? { initialPage } : {}),
    onPageChange: async (paginatedItems, page) => {
      renderCards({
        wrapper,
        paginationWrapper: container,
        paginatedItems,
        page,
        total: items.length,
        pageSize,
        resultsText,
      });
    },
  });
}

function renderFilteredItems({
  wrapper,
  paginationWrapper,
  filteredItems,
  pageSize,
  resultsText,
  forcePageOne = false,
}) {
  const needsPagination = (
    Number.isFinite(pageSize)
    && pageSize > 0
    && filteredItems.length > pageSize
  );

  wrapper.querySelector('.wrapper-paginator')?.remove();

  if (needsPagination) {
    setupPagination({
      container: paginationWrapper,
      items: filteredItems,
      pageSize,
      wrapper,
      resultsText,
      initialPage: forcePageOne ? 1 : undefined,
    });
  } else {
    renderCards({
      wrapper,
      paginationWrapper: null,
      paginatedItems: filteredItems,
      page: 1,
      total: filteredItems.length,
      pageSize,
      resultsText,
    });
  }
}

export default async function decorate(block) {
  const {
    numberOfCoursesToShowPerPage: pageSizeRaw,
    noCoursesTextBold,
    noCoursesTextNormal,
    noCoursesLinkText,
  } = readBlockConfig(block, true);
  const numberOfCoursesToShowPerPage = Number(pageSizeRaw) || 10;

  let userProgress = null;

  [userProgress] = await Promise.all([
    getUserProgress(),
    setupDayjsLibs(),
  ]);

  if (!userProgress) {
    block.innerHTML = '';
    return;
  }

  const items = [
    ...userProgress.courses.map((course) => ({ type: 'course', data: course })),
    ...userProgress.lessons.map((lesson) => ({ type: 'lesson', data: lesson })),
  ];
  const wrapper = createElement('div', { class: 'course-history-wrapper' });

  if (items.length === 0) {
    const [boldText, normalText, linkText] = await Promise.all([
      i18n('You have no courses or lessons in progress.'),
      i18n('To browse courses and lessons'),
      i18n('click here'),
    ]);

    const noResultsEl = createNoResultsElement(
      noCoursesTextBold || boldText,
      noCoursesTextNormal || normalText,
      noCoursesLinkText || linkText,
    );
    wrapper.appendChild(noResultsEl);
    block.innerHTML = '';
    block.appendChild(wrapper);
    return;
  }

  const paginationWrapper = createElement('div', { class: 'wrapper-paginator' });
  let resultsText;

  const initialViewValue = uriUtil.getHash('view') || 'all';

  let filteredItems = sortItemsByUpdated(applyFilter([...items], initialViewValue));

  const { filtersSection, resultsText: newResultsText } = await createFilters({
    items,
    initialFilterValue: initialViewValue,
    onFilterChange: (newFiltered, selectedValue, isUserAction) => {
      filteredItems = sortItemsByUpdated(newFiltered);
      uriUtil.removeHash('pageNum');
      if (isUserAction) {
        if (selectedValue) {
          uriUtil.addHash('view', selectedValue);
        } else {
          uriUtil.removeHash('view');
        }
        uriUtil.navigate(true);
      }

      renderFilteredItems({
        wrapper,
        paginationWrapper,
        filteredItems,
        pageSize: numberOfCoursesToShowPerPage,
        resultsText,
        forcePageOne: true,
      });
    },
  });

  resultsText = newResultsText;

  wrapper.appendChild(filtersSection);

  renderFilteredItems({
    wrapper,
    paginationWrapper,
    filteredItems,
    pageSize: numberOfCoursesToShowPerPage,
    resultsText,
  });

  block.innerHTML = '';
  block.appendChild(wrapper);
}

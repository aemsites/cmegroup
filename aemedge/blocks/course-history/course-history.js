import { createElement, i18n, readBlockConfig } from '../../scripts/utils.js';
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
  const link = createElement('a', { href: '/education/courses.html' }, linkText);

  return createElement('div', { class: 'no-results' }, boldSpan, normalSpan, link);
}

async function renderCards({
  wrapper, paginationWrapper, paginatedItems, page, total, pageSize, resultsText,
}) {
  const [showingText] = await Promise.all([
    i18n('Showing {end} of {total} results'),
  ]);

  wrapper.querySelectorAll('.course-card').forEach((el) => el.remove());

  paginatedItems.forEach(({ type, data }) => {
    wrapper.appendChild(createEducationCard(data, type === 'lesson'));
  });

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
  wrapper.appendChild(paginationWrapper);

  const start = (page - 1) * pageSize + 1;
  const end = start + paginatedItems.length - 1;

  resultsText.innerHTML = '';
  resultsText.appendChild(
    createElement('span', {}, showingText
      .replace('{end}', end)
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
  container, items, pageSize, wrapper, resultsText,
}) {
  await createPagination({
    container,
    filteredItems: items,
    itemsPerPage: pageSize,
    onPageChange: async (paginatedItems, page) => {
      await renderCards({
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

export default async function decorate(block) {
  const {
    numberOfCoursesToShowPerPage: pageSizeRaw,
    noCoursesTextBold,
    noCoursesTextNormal,
    noCoursesLinkText,
  } = readBlockConfig(block, true);
  const numberOfCoursesToShowPerPage = Number(pageSizeRaw) || 0;

  const userProgress = await getUserProgress();

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

      setupPagination({
        container: paginationWrapper,
        items: filteredItems,
        pageSize: numberOfCoursesToShowPerPage,
        wrapper,
        resultsText,
      });
    },
  });

  resultsText = newResultsText;

  wrapper.appendChild(filtersSection);

  if (
    Number.isFinite(numberOfCoursesToShowPerPage)
    && numberOfCoursesToShowPerPage > 0
    && numberOfCoursesToShowPerPage < items.length
  ) {
    setupPagination({
      container: paginationWrapper,
      items: filteredItems,
      pageSize: numberOfCoursesToShowPerPage,
      wrapper,
      resultsText,
    });
  } else {
    await renderCards({
      wrapper,
      paginationWrapper,
      paginatedItems: filteredItems,
      page: 1,
      total: filteredItems.length,
      pageSize: numberOfCoursesToShowPerPage,
      resultsText,
    });
  }

  block.innerHTML = '';
  block.appendChild(wrapper);
}

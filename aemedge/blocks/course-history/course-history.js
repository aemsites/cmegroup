import { createElement, i18n, readBlockConfig } from '../../scripts/utils.js';
import { getUserProgress } from '../../scripts/services/EducationTrackService.js';
import { createEducationCard } from './course-card/course-card.js';
import { createPagination } from './pagination/pagination.js';
import { createFilters } from './filters/filters.js';

function sortItemsByUpdated(items) {
  return items.sort((a, b) => new Date(b.data.updated) - new Date(a.data.updated));
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
  const { numberOfCoursesToShowPerPage: pageSizeRaw } = readBlockConfig(block, true);
  const numberOfCoursesToShowPerPage = Number(pageSizeRaw) || 0;

  const userProgress = await getUserProgress();

  const items = [
    ...userProgress.courses.map((course) => ({ type: 'course', data: course })),
    ...userProgress.lessons.map((lesson) => ({ type: 'lesson', data: lesson })),
  ];

  let filteredItems = sortItemsByUpdated([...items]);

  const wrapper = createElement('div', { class: 'course-history-wrapper' });
  const paginationWrapper = createElement('div', { class: 'wrapper-paginator' });

  let resultsText;

  const { filtersSection, resultsText: newResultsText } = await createFilters({
    items,
    onFilterChange: (newFiltered) => {
      filteredItems = sortItemsByUpdated(newFiltered);
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

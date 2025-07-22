import { i18n } from '../../../scripts/utils.js';
import searchConfig from '../search-config.js';
import { urlUpdate } from '../search-utils.js';

function createPaginationItem(text, page, onPageChange, isDisabled = false, isActive = false) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = '#';
  a.textContent = text;
  li.className = `pagination-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;

  if (!isDisabled && !isActive) {
    a.onclick = async (e) => {
      e.preventDefault();
      searchConfig.pagination.currentPage = page;
      await onPageChange(page);
      urlUpdate();
      window.scrollTo(0, 0);
    };
  }

  li.appendChild(a);
  return li;
}

function getPageRange(currentPage, totalPages) {
  const range = window.matchMedia('(min-width: 993px)').matches ? 5 : 2;

  // Calculate start and end pages with max range limit
  const startPage = Math.max(1, Math.min(currentPage - range));
  const endPage = Math.min(totalPages, Math.max(currentPage + range));

  return { startPage, endPage };
}

export default async function renderPagination(container, onPageChange) {
  if (!searchConfig.pagination?.show) return;

  const { currentPage = 1, totalPages = 1 } = searchConfig.pagination;

  // Create pagination wrapper
  const nav = document.createElement('nav');
  nav.className = 'pagination-nav';
  const paginationList = document.createElement('ul');
  paginationList.className = 'pagination-list';

  // First/Prev buttons
  const firstItem = createPaginationItem('«', 1, onPageChange, currentPage === 1);
  const prevItem = createPaginationItem(
    await i18n('Prev'),
    currentPage - 1,
    onPageChange,
    currentPage === 1,
  );

  // Create page items
  const createPageItems = () => {
    const pageItems = [];
    const { startPage, endPage } = getPageRange(currentPage, totalPages);

    // Add page items
    for (let i = startPage; i <= endPage; i += 1) {
      const pageItem = createPaginationItem(
        i.toString(),
        i,
        onPageChange,
        false,
        i === currentPage,
      );
      pageItems.push(pageItem);
    }

    return pageItems;
  };

  // Next/Last buttons
  const nextItem = createPaginationItem(
    await i18n('Next'),
    currentPage + 1,
    onPageChange,
    currentPage === totalPages,
  );
  const lastItem = createPaginationItem('»', totalPages, onPageChange, currentPage === totalPages);

  // Append all items
  paginationList.appendChild(firstItem);
  paginationList.appendChild(prevItem);
  createPageItems().forEach((item) => paginationList.appendChild(item));
  paginationList.appendChild(nextItem);
  paginationList.appendChild(lastItem);

  nav.appendChild(paginationList);
  container.appendChild(nav);

  // Add resize listener to update pagination when screen size changes
  const resizeObserver = new ResizeObserver(() => {
    nav.innerHTML = '';
    const newPaginationList = document.createElement('ul');
    newPaginationList.className = 'pagination-list';
    newPaginationList.appendChild(firstItem);
    newPaginationList.appendChild(prevItem);
    createPageItems().forEach((item) => newPaginationList.appendChild(item));
    newPaginationList.appendChild(nextItem);
    newPaginationList.appendChild(lastItem);
    nav.appendChild(newPaginationList);
  });

  resizeObserver.observe(container);
}

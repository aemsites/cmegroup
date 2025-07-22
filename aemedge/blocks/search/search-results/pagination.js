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

function getPageRange(currentPage, totalPages, isLargeScreen) {
  const range = isLargeScreen ? 4 : 2; // Changed to 4 to match the design
  let startPage = Math.max(1, currentPage - range);
  let endPage = Math.min(totalPages, currentPage + range);

  // Adjust start if we're near the end
  if (endPage - startPage < range * 2) {
    if (currentPage > totalPages / 2) {
      // Near the end, so we adjust start
      startPage = Math.max(1, endPage - (range * 2));
    } else {
      // Near the start, so we adjust end
      endPage = Math.min(totalPages, startPage + (range * 2));
    }
  }

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
    const { startPage, endPage } = getPageRange(currentPage, totalPages, true);

    // Add ellipsis at start if needed
    if (startPage > 1) {
      const ellipsisStart = document.createElement('li');
      ellipsisStart.className = 'pagination-ellipsis';
      ellipsisStart.textContent = '...';
      pageItems.push(ellipsisStart);
    }

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

    // Add ellipsis at end if needed
    if (endPage < totalPages) {
      const ellipsisEnd = document.createElement('li');
      ellipsisEnd.className = 'pagination-ellipsis';
      ellipsisEnd.textContent = '...';
      pageItems.push(ellipsisEnd);
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
}

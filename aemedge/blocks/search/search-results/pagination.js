import { i18n } from '../../../scripts/utils.js';
import searchConfig from '../search-config.js';
import { urlUpdate } from '../search-utils.js';

function createPaginationButton(text, page, onPageChange, isDisabled = false, isActive = false) {
  const button = document.createElement('button');
  button.textContent = text;
  button.className = `pagination-btn ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;

  if (!isDisabled && !isActive) {
    button.onclick = async () => {
      searchConfig.pagination.currentPage = page;
      await onPageChange(page);
      urlUpdate();
      window.scrollTo(0, 0);
    };
  }

  return button;
}

function getPageRange(currentPage, totalPages, isLargeScreen) {
  const range = isLargeScreen ? 5 : 2;
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

  // Create responsive pagination wrapper
  const paginationWrapper = document.createElement('div');
  paginationWrapper.className = 'pagination-wrapper';

  // First/Prev buttons
  const firstBtn = createPaginationButton('«', 1, onPageChange, currentPage === 1);
  const prevBtn = createPaginationButton(
    await i18n('Prev'),
    currentPage - 1,
    onPageChange,
    currentPage === 1,
  );

  // Create page buttons for both mobile and desktop
  const createPageButtons = (isLargeScreen) => {
    const pageButtons = [];
    const { startPage, endPage } = getPageRange(currentPage, totalPages, isLargeScreen);

    // Add ellipsis at start if needed
    if (startPage > 1) {
      const ellipsisStart = document.createElement('span');
      ellipsisStart.className = 'pagination-ellipsis';
      ellipsisStart.textContent = '...';
      pageButtons.push(ellipsisStart);
    }

    // Add page buttons
    for (let i = startPage; i <= endPage; i += 1) {
      const pageBtn = createPaginationButton(
        i.toString(),
        i,
        onPageChange,
        false,
        i === currentPage,
      );
      pageButtons.push(pageBtn);
    }

    // Add ellipsis at end if needed
    if (endPage < totalPages) {
      const ellipsisEnd = document.createElement('span');
      ellipsisEnd.className = 'pagination-ellipsis';
      ellipsisEnd.textContent = '...';
      pageButtons.push(ellipsisEnd);
    }

    return pageButtons;
  };

  // Create mobile and desktop containers
  const mobilePages = document.createElement('div');
  mobilePages.className = 'pagination-pages mobile';
  createPageButtons(false).forEach((btn) => mobilePages.appendChild(btn));

  const desktopPages = document.createElement('div');
  desktopPages.className = 'pagination-pages desktop';
  createPageButtons(true).forEach((btn) => desktopPages.appendChild(btn));

  // Next/Last buttons
  const nextBtn = createPaginationButton(
    await i18n('Next'),
    currentPage + 1,
    onPageChange,
    currentPage === totalPages,
  );
  const lastBtn = createPaginationButton('»', totalPages, onPageChange, currentPage === totalPages);

  // Append all buttons
  paginationWrapper.appendChild(firstBtn);
  paginationWrapper.appendChild(prevBtn);
  paginationWrapper.appendChild(mobilePages);
  paginationWrapper.appendChild(desktopPages);
  paginationWrapper.appendChild(nextBtn);
  paginationWrapper.appendChild(lastBtn);

  container.appendChild(paginationWrapper);
}

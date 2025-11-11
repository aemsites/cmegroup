import { createElement, i18n } from '../../../scripts/utils.js';
import { URIUtil } from '../../../scripts/utils/index.js';

const uriUtil = new URIUtil('', URIUtil.ARRAY_COMMA_ENCODE);

// eslint-disable-next-line import/prefer-default-export
export async function createPagination({
  container,
  filteredItems,
  itemsPerPage,
  onPageChange,
  initialPage,
}) {
  const [
    firstLabel,
    previousLabel,
    nextLabel,
    lastLabel,
    prevVisible,
  ] = await Promise.all([
    i18n('First'),
    i18n('Previous'),
    i18n('Next'),
    i18n('Last'),
    i18n('Prev'),
  ]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  let currentPage = initialPage;

  const update = (triggeredByUser = false) => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = filteredItems.slice(start, end);

    if (triggeredByUser) {
      uriUtil.update().addHash('pageNum', currentPage.toString()).navigate(true);
    }

    onPageChange(paginatedItems, currentPage);
    // eslint-disable-next-line no-use-before-define
    render();
  };

  function getPageRange() {
    const range = window.matchMedia('(min-width: 993px)').matches ? 5 : 2;
    // Calculate start and end pages with max range limit
    const startPage = Math.max(1, Math.min(currentPage - range));
    const endPage = Math.min(totalPages, Math.max(currentPage + range));
    return { startPage, endPage };
  }

  const render = () => {
    const nav = createElement('nav', { 'aria-label': 'Page navigation' });
    const pagination = createElement('ul', { class: 'pagination' });

    const createBtn = (label, html, disabled, onClick) => {
      const li = createElement(
        'li',
        { class: `controls page-item ${disabled ? 'disabled' : ''}` },
        createElement(
          'button',
          { class: 'page-link', 'aria-label': label },
          createElement('span', { 'aria-hidden': 'true' }, html),
          createElement('span', { class: 'visually-hidden' }, label),
        ),
      );
      if (!disabled) li.querySelector('button').addEventListener('click', onClick);
      return li;
    };

    pagination.appendChild(createBtn(firstLabel, '«', currentPage === 1, () => {
      currentPage = 1;
      update(true);
    }));

    pagination.appendChild(createBtn(previousLabel, prevVisible, currentPage === 1, () => {
      currentPage -= 1;
      update(true);
    }));

    const { startPage, endPage } = getPageRange();
    Array.from({ length: endPage - startPage + 1 }).forEach((_, index) => {
      const page = startPage + index;
      const li = createElement(
        'li',
        { class: `page-item ${page === currentPage ? 'disabled' : ''}` },
        createElement('a', { 'data-page': page, href: '#', class: 'page-link' }, `${page}`),
      );
      li.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        if (page !== currentPage) {
          currentPage = page;
          update(true);
        }
      });
      pagination.appendChild(li);
    });

    pagination.appendChild(createBtn(nextLabel, nextLabel, currentPage === totalPages, () => {
      currentPage += 1;
      update(true);
    }));

    pagination.appendChild(createBtn(lastLabel, '»', currentPage === totalPages, () => {
      currentPage = totalPages;
      update(true);
    }));

    nav.innerHTML = '';
    nav.appendChild(pagination);
    container.innerHTML = '';
    container.appendChild(nav);
  };

  if (typeof initialPage === 'undefined') {
    const hash = uriUtil.getHash();
    const pageFromHash = parseInt(hash.pageNum, 10);
    if (!Number.isNaN(pageFromHash) && pageFromHash >= 1 && pageFromHash <= totalPages) {
      currentPage = pageFromHash;
    } else {
      currentPage = 1;
    }
  }

  update();
}

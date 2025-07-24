import { createElement, i18n } from '../../../scripts/utils.js';
import { URIUtil } from '../../../scripts/utils/index.js';

const uriUtil = new URIUtil('', URIUtil.ARRAY_COMMA_ENCODE);

// eslint-disable-next-line import/prefer-default-export
export async function createPagination({
  container,
  filteredItems,
  itemsPerPage,
  onPageChange,
}) {
  const [
    firstLabel,
    previousLabel,
    nextLabel,
    lastLabel,
    prevVisible,
    nextVisible,
  ] = await Promise.all([
    i18n('First'),
    i18n('Previous'),
    i18n('Next'),
    i18n('Last'),
    i18n('Prev'),
    i18n('Next'),
  ]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  let currentPage = 1;

  const update = (triggeredByUser = false) => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = filteredItems.slice(start, end);

    if (triggeredByUser) {
      uriUtil.addHash('pageNum', currentPage.toString()).navigate(true);
    }

    onPageChange(paginatedItems, currentPage);
    // eslint-disable-next-line no-use-before-define
    render();
  };

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

    Array.from({ length: totalPages }).forEach((_, index) => {
      const page = index + 1;
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

    pagination.appendChild(createBtn(nextLabel, nextVisible, currentPage === totalPages, () => {
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

  const hash = uriUtil.getHash();
  const pageFromHash = parseInt(hash.pageNum, 10);
  if (!Number.isNaN(pageFromHash) && pageFromHash >= 1 && pageFromHash <= totalPages) {
    currentPage = pageFromHash;
  }

  update();
}

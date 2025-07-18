import { createElement, i18n } from '../../../scripts/utils.js';

// eslint-disable-next-line import/prefer-default-export
export async function createPagination({
  container, filteredItems, itemsPerPage, onPageChange,
}) {
  const [
    firstLabel,
    previousLabel,
    nextLabel,
    lastLabel,
    prevVisible,
    nextVisible,
    firstVisible,
    lastVisible,
  ] = await Promise.all([
    i18n('First'),
    i18n('Previous'),
    i18n('Next'),
    i18n('Last'),
    i18n('Prev'),
    i18n('Next'),
    i18n('«'),
    i18n('»'),
  ]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  let currentPage = 1;

  const update = () => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = filteredItems.slice(start, end);
    onPageChange(paginatedItems, currentPage, filteredItems.length);
    // eslint-disable-next-line no-use-before-define
    render();
  };

  const render = () => {
    const nav = createElement('nav', { 'aria-label': 'Page navigation' });
    const pagination = createElement('ul', { class: 'pagination' });

    const firstBtn = createElement(
      'li',
      { class: `controls page-item ${currentPage === 1 ? 'disabled' : ''}` },
      createElement(
        'button',
        { class: 'page-link', 'aria-label': firstLabel },
        createElement('span', { 'aria-hidden': 'true' }, firstVisible),
        createElement('span', { class: 'visually-hidden' }, firstLabel),
      ),
    );
    firstBtn.querySelector('button').addEventListener('click', () => {
      if (currentPage !== 1) {
        currentPage = 1;
        update();
      }
    });
    pagination.appendChild(firstBtn);

    const prevBtn = createElement(
      'li',
      { class: `controls page-item ${currentPage === 1 ? 'disabled' : ''}` },
      createElement(
        'button',
        { class: 'page-link', 'aria-label': previousLabel },
        createElement('span', { 'aria-hidden': 'true' }, createElement('span', {}, prevVisible)),
        createElement('span', { class: 'visually-hidden' }, previousLabel),
      ),
    );
    prevBtn.querySelector('button').addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage -= 1;
        update();
      }
    });
    pagination.appendChild(prevBtn);

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
          update();
        }
      });

      pagination.appendChild(li);
    });

    const nextBtn = createElement(
      'li',
      { class: `controls page-item ${currentPage === totalPages ? 'disabled' : ''}` },
      createElement(
        'button',
        { class: 'page-link', 'aria-label': nextLabel },
        createElement('span', { 'aria-hidden': 'true' }, createElement('span', {}, nextVisible)),
        createElement('span', { class: 'visually-hidden' }, nextLabel),
      ),
    );
    nextBtn.querySelector('button').addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage += 1;
        update();
      }
    });
    pagination.appendChild(nextBtn);

    const lastBtn = createElement(
      'li',
      { class: `controls page-item ${currentPage === totalPages ? 'disabled' : ''}` },
      createElement(
        'button',
        { class: 'page-link', 'aria-label': lastLabel },
        createElement('span', { 'aria-hidden': 'true' }, lastVisible),
        createElement('span', { class: 'visually-hidden' }, lastLabel),
      ),
    );
    lastBtn.querySelector('button').addEventListener('click', () => {
      if (currentPage !== totalPages) {
        currentPage = totalPages;
        update();
      }
    });
    pagination.appendChild(lastBtn);

    nav.appendChild(pagination);
    container.innerHTML = '';
    container.appendChild(nav);
  };

  update();
}

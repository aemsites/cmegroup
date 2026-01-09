import { createElement, i18n } from '../../../scripts/utils.js';

export default async function createPagination(options = {}) {
  const [
    previousText,
    nextText,
  ] = await Promise.all([
    i18n('Prev'),
    i18n('Next'),
  ]);

  const {
    currentPage = 1,
    totalPages = 1,
    onPageChange = () => { },
  } = options;

  const wrapper = createElement('div', { class: 'wrapper-paginator' });
  const nav = createElement('nav', { 'aria-label': 'Page navigation' });
  const div = createElement('div', { class: 'pagination' });

  if (totalPages <= 1) {
    return wrapper;
  }

  let isDesktop = window.innerWidth >= 769;

  const renderPagination = () => {
    div.innerHTML = '';

    const maxVisible = isDesktop ? 4 : 3;

    const firstLi = createElement('div', { class: currentPage === 1 ? 'controls page-item disabled' : 'controls page-item' });
    const firstButton = createElement('button', { class: 'page-link', 'aria-label': 'First' });
    const firstSpan = createElement('span', { class: 'content', 'aria-hidden': 'true' });
    const firstIconLeft1 = createElement('span', { class: 'icon icon-chevron-left' });
    const firstIconLeft2 = createElement('span', { class: 'icon icon-chevron-left' });
    firstSpan.appendChild(firstIconLeft1);
    firstSpan.appendChild(firstIconLeft2);
    firstButton.appendChild(firstSpan);
    firstButton.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentPage > 1) {
        onPageChange(1);
      }
    });
    firstLi.appendChild(firstButton);

    const prevLi = createElement('div', { class: currentPage === 1 ? 'controls page-item disabled' : 'controls page-item' });
    const prevButton = createElement('button', { class: 'page-link', 'aria-label': 'Previous' });
    const prevSpan = createElement('span', { 'aria-hidden': 'true' });
    const prevControlGroup = createElement('div', { class: 'control-group' });
    const prevIconLeft = createElement('span', { class: 'icon icon-chevron-left' });
    const prevControlText = createElement('span', { class: 'control-text' });
    prevControlText.textContent = previousText;
    prevControlGroup.appendChild(prevIconLeft);
    prevControlGroup.appendChild(prevControlText);
    prevSpan.appendChild(prevControlGroup);
    prevButton.appendChild(prevSpan);
    prevButton.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentPage > 1) {
        onPageChange(currentPage - 1);
      }
    });
    prevLi.appendChild(prevButton);

    div.appendChild(firstLi);
    div.appendChild(prevLi);

    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i += 1) {
      const pageLi = createElement('div', { class: i === currentPage ? 'page-item disabled' : 'page-item' });
      const pageLink = createElement('button', { class: 'page-link', 'data-page': i });
      pageLink.textContent = i;
      pageLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (i !== currentPage) {
          onPageChange(i);
        }
      });
      pageLi.appendChild(pageLink);
      div.appendChild(pageLi);
    }

    const nextLi = createElement('div', { class: currentPage === totalPages ? 'controls page-item disabled' : 'controls page-item' });
    const nextButton = createElement('button', { class: 'page-link', 'aria-label': 'Next' });
    const nextSpan = createElement('span', { 'aria-hidden': 'true' });
    const nextControlGroup = createElement('div', { class: 'control-group' });
    const nextControlText = createElement('span', { class: 'control-text' });
    nextControlText.textContent = nextText;
    const nextIconRight = createElement('span', { class: 'icon icon-chevron-right' });
    nextControlGroup.appendChild(nextControlText);
    nextControlGroup.appendChild(nextIconRight);
    nextSpan.appendChild(nextControlGroup);
    nextButton.appendChild(nextSpan);
    nextButton.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentPage < totalPages) {
        onPageChange(currentPage + 1);
      }
    });
    nextLi.appendChild(nextButton);

    const lastLi = createElement('div', { class: currentPage === totalPages ? 'controls page-item disabled' : 'controls page-item' });
    const lastButton = createElement('button', { class: 'page-link', 'aria-label': 'Last' });
    const lastSpan = createElement('span', { class: 'content', 'aria-hidden': 'true' });
    const lastIconRight1 = createElement('span', { class: 'icon icon-chevron-right' });
    const lastIconRight2 = createElement('span', { class: 'icon icon-chevron-right' });
    lastSpan.appendChild(lastIconRight1);
    lastSpan.appendChild(lastIconRight2);
    lastButton.appendChild(lastSpan);
    lastButton.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentPage < totalPages) {
        onPageChange(totalPages);
      }
    });
    lastLi.appendChild(lastButton);

    div.appendChild(nextLi);
    div.appendChild(lastLi);
  };

  window.addEventListener('resize', () => {
    const wasDesktop = isDesktop;
    isDesktop = window.innerWidth >= 481;
    if (wasDesktop !== isDesktop) {
      renderPagination();
    }
  });

  renderPagination();

  nav.appendChild(div);
  wrapper.appendChild(nav);

  return wrapper;
}

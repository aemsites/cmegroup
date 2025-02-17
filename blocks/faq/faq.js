import { createElement, addDividerLine } from '../../scripts/utils.js';

function addBackToTopLink(row) {
  const topIconImg = createElement('img', { src: '/icons/chevron-up.svg' });
  const topIconSpan = createElement('span', { class: 'icon icon-chevron-up' }, topIconImg);
  const linkText = createElement('span', null, 'Back to Top');
  const link = createElement('a', { href: '#top', class: 'back-to-top' }, topIconSpan, linkText);
  row.appendChild(link);
}

export default function decorate(block) {
  const rows = block.querySelectorAll(':scope > div');
  const isOrdered = block.classList.contains('ordered');
  const faqHeadings = [];
  rows.forEach((row, index) => {
    const title = row.querySelector(':scope > div:first-child');
    title.id = `title-${index + 1}`;
    title?.classList.add('title');
    faqHeadings.push(title.textContent.trim());
    if (isOrdered) {
      const innerTag = title.querySelector('*:first-child');
      innerTag.textContent = `${index + 1}. ${innerTag.textContent.trim()}`;
    }
    addBackToTopLink(row);
    addDividerLine(row);
  });

  const tocList = isOrdered ? createElement('ol') : createElement('ul');
  const toc = createElement('div', { class: 'toc' }, tocList);
  faqHeadings.forEach((heading, index) => {
    const anchor = createElement('a', { href: `#title-${index + 1}` });
    const li = createElement('li', null, anchor);
    anchor.textContent = heading;
    tocList.appendChild(li);
  });

  block.prepend(toc);
}

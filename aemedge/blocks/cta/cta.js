import { createElement, addDividerLine } from '../../scripts/utils.js';

export default function decorate(block) {
  if (block.classList.contains('promo')) {
    const rows = block.querySelectorAll(':scope > div');
    const linkWrapper = createElement('a', { href: '#' });
    const contentWrapper = createElement('div', { class: 'content-wrapper' });
    linkWrapper.append(contentWrapper);
    Array.from(rows).forEach((row) => {
      const type = row.querySelector(':scope > div:first-child')?.textContent?.trim().toLowerCase();
      const content = row.querySelector(':scope > div:last-child');

      if (type === 'url') {
        linkWrapper.href = content.textContent.trim();
      } else if (type === 'background') {
        content.classList.add('background-image');
        linkWrapper.append(content);
      } else if (type === 'eyebrow') {
        content.classList.add('eyebrow');
        contentWrapper.append(content);
      } else if (type === 'title') {
        content.classList.add('title');
        contentWrapper.append(content);
      } else if (type === 'description') {
        content.classList.add('description');
        contentWrapper.append(content);
      } else if (type === 'footer') {
        content.classList.add('footer');
        linkWrapper.append(content);
      }
    });

    block.innerHTML = '';
    block.appendChild(linkWrapper);
  }

  if (block.classList.contains('divider-line')) {
    addDividerLine(block);
  }

  if (block.classList.contains('promo-two-columns')) {
    const rows = block.querySelectorAll(':scope > div');
    const linkWrapper = createElement('a', { href: '#' });
    const promoWrapper = createElement('div', { class: 'promo-wrapper' });
    const mainWrapper = createElement('div', { class: 'content-wrapper' });
    const leftContentWrapper = createElement('div', { class: 'content-wrapper-left' });
    const rightContentWrapper = createElement('div', { class: 'content-wrapper-right' });
    Array.from(rows).forEach((row) => {
      const type = row.querySelector(':scope > div:first-child')?.textContent?.trim().toLowerCase();
      const content = row.querySelector(':scope > div:last-child');

      if (type === 'url') {
        linkWrapper.href = content.textContent.trim();
      } else if (type === 'background') {
        content.classList.add('background-image');
        promoWrapper.append(content);
      } else if (type === 'eyebrow') {
        content.classList.add('eyebrow');
        leftContentWrapper.append(content);
      } else if (type === 'title') {
        content.classList.add('title');
        leftContentWrapper.append(content);
      } else if (type === 'description') {
        content.classList.add('description');
        rightContentWrapper.append(content);
      } else if (type === 'footer') {
        linkWrapper.innerHTML = content.innerHTML;
      }
    });

    block.innerHTML = '';
    rightContentWrapper.append(linkWrapper);
    mainWrapper.append(leftContentWrapper);
    mainWrapper.append(rightContentWrapper);
    promoWrapper.append(mainWrapper);
    block.appendChild(promoWrapper);
  }
}

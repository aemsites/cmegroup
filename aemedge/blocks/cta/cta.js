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

      if (content.children.length !== 0) {
        switch (type) {
          case 'url':
            linkWrapper.href = content.textContent.trim();
            break;
          case 'background':
            content.classList.add('background-image');
            linkWrapper.append(content);
            break;
          case 'eyebrow':
            content.classList.add('eyebrow');
            contentWrapper.append(content);
            break;
          case 'title':
            content.classList.add('title');
            contentWrapper.append(content);
            break;
          case 'description':
            content.classList.add('description');
            contentWrapper.append(content);
            break;
          case 'footer':
            content.classList.add('footer');
            linkWrapper.append(content);
            break;
          case 'title color':
            linkWrapper.querySelector('.title p').style.color = `var(--${content.textContent.trim()})`;
            break;
          case 'eyebrow color':
            linkWrapper.querySelector('.eyebrow p').style.color = `var(--${content.textContent.trim()})`;
            break;
          case 'arrow color': {
            let footer = linkWrapper.querySelector('.footer');
            if (!footer) {
              footer = createElement('div', { class: 'footer' });
              linkWrapper.append(footer);
            }
            footer.style.setProperty('--after-background-color', `var(--${content.textContent.trim()})`);
            break;
          }
          case 'description color':
            contentWrapper.querySelector('.description p').style.color = `var(--${content.textContent.trim()})`;
            break;
          default:
            break;
        }
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

      if (content.children.length !== 0) {
        switch (type) {
          case 'url':
            linkWrapper.href = content.textContent.trim();
            break;
          case 'background':
            content.classList.add('background-image');
            promoWrapper.append(content);
            break;
          case 'eyebrow':
            content.classList.add('eyebrow');
            leftContentWrapper.append(content);
            break;
          case 'title':
            content.classList.add('title');
            leftContentWrapper.append(content);
            break;
          case 'description':
            content.classList.add('description');
            rightContentWrapper.append(content);
            break;
          case 'footer':
            linkWrapper.innerHTML = content.innerHTML;
            break;
          case 'title color':
            linkWrapper.querySelector('.title p').style.color = `var(--${content.textContent.trim()})`;
            break;
          case 'eyebrow color':
            linkWrapper.querySelector('.eyebrow p').style.color = `var(--${content.textContent.trim()})`;
            break;
          case 'arrow color':
            linkWrapper.querySelector('.footer').style.setProperty('--after-background-color', `var(--${content.textContent.trim()})`);
            break;
          case 'description color':
            rightContentWrapper.querySelector('.description p').style.color = `var(--${content.textContent.trim()})`;
            break;
          default:
            break;
        }
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

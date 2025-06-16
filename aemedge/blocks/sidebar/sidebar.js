import { createElement, addDividerLine } from '../../scripts/utils.js';

/**
 * Decorates the sidebar block
 * @param {Element} block The sidebar block element
 */
export default function decorate(block) {
  const processedContent = [];

  [...block.children].forEach((row) => {
    const [typeCell, contentCell] = [...row.children];
    const type = typeCell?.textContent?.trim().toLowerCase();
    const content = contentCell;

    // Skip if type is missing or content is empty
    if (!type || !content || !content.textContent?.trim()) return;
    content.className = `${type}`;
    switch (type) {
      case 'header': {
        content.className = 'sidebar-header';
        const pTag = content.querySelector('p');
        if (pTag) {
          const h5 = createElement('h5', { class: `sidebar-${type}` }, pTag.textContent);
          pTag.replaceWith(h5);
          processedContent.push(h5);
        } else if (content.querySelector('h5')) {
          processedContent.push(content);
        }
        break;
      }
      case 'description':
      case 'by':
      case 'footer':
        processedContent.push(content);
        break;
      case 'references': {
        const list = content.querySelector('ul') || content.querySelector('ol');
        if (list) {
          const references = createElement('ul', null, ...list.children);
          content.innerHTML = '';
          content.className = 'references-data';
          content.appendChild(references);
          processedContent.push(content);
        }
        break;
      }
      case 'cta': {
        const a = content.querySelector('a.button');
        a.classList.remove('button');
        const button = createElement('button', { class: 'button primary cta' }, a);
        const iconSpan = content.querySelector('span.icon');
        if (iconSpan) {
          button.prepend(iconSpan);
        }
        processedContent.push(button);
        break;
      }
      default:
        // Skip unknown types
        break;
    }
  });

  // Replace block content with processed elements
  block.innerHTML = '';
  processedContent.forEach((content) => block.appendChild(content));

  // Add divider lines based on variant classes
  if (block.classList.contains('divider-top')) {
    addDividerLine(block, true);
  }

  if (block.classList.contains('divider-bottom')) {
    addDividerLine(block, false);
  }
}

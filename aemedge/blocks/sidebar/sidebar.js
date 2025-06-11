import { createElement } from '../../scripts/utils.js';

/**
 * Decorates the sidebar block
 * @param {Element} block The sidebar block element
 */
export default function decorate(block) {
  const processedContent = [];
  let ctaIcon = null;
  
  [...block.children].forEach((row) => {
    const [typeCell, contentCell] = [...row.children];
    const type = typeCell?.textContent?.trim().toLowerCase();
    const content = contentCell;
    
    // Skip if type is missing or content is empty
    if (!type || !content || !content.textContent?.trim()) return;
    
    switch (type) {
      case 'header':
        const pTag = content.querySelector('p');
        if (pTag) {
          const h5 = createElement('h5', { class: 'sidebar-header' }, pTag.textContent);
          pTag.replaceWith(h5);
          processedContent.push(h5);
        }
        break;
      case 'description':
        content.className = 'sidebar-description';
        processedContent.push(content);
        break;
      case 'footer':
        content.className = 'sidebar-footer';
        processedContent.push(content);
        break;
      case 'cta':
        const a = content.querySelector('a.button');
        a.classList.remove('button');
        const button = createElement('button', { class: 'button primary sidebar-cta' }, a);
        const iconSpan = content.querySelector('span.icon');
        if (iconSpan) {
          button.prepend(iconSpan);
        }
        processedContent.push(button);
        break;
      default:
        // Skip unknown types
        break;
    }
  });
  
  // Replace block content with processed elements
  block.innerHTML = '';
  processedContent.forEach((content) => block.appendChild(content));
  
  // Add icon to CTA button if both exist
  if (ctaIcon) {
    const ctaButton = block.querySelector('.sidebar-cta-link a.button');
    if (ctaButton) {
      const iconSpan = createElement('span', { class: 'cta-button-icon' }, ctaIcon);
      ctaButton.prepend(iconSpan);
    }
  }
}

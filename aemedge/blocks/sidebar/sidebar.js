import { addDividerLine, createElement } from '../../scripts/utils.js';

function decorateHeaders(block) {
  const headers = block.querySelectorAll('h2, h3, h4, h5, h6');
  headers.forEach((header) => {
    header.classList.add('sidebar-header');
    if (header.textContent.includes('---')) {
      addDividerLine(header.previousElementSibling);
      header.remove();
    }
  });
}

function decorateReferences(block) {
  const referenceLists = block.querySelectorAll('ul');
  referenceLists.forEach((list) => {
    list.classList.add('references');
  });
}

function decorateCtas(block) {
  const ctas = block.querySelectorAll('a');
  ctas.forEach((cta) => {
    const { parentElement } = cta;

    // Check if parent is a paragraph and contains the < > pattern
    if (parentElement && parentElement.tagName === 'P') {
      const parentText = parentElement.textContent.trim();

      // Check if paragraph text starts with < and ends with >
      const hasValidPattern = parentText.startsWith('<') && parentText.endsWith('>');

      if (hasValidPattern) {
        const button = createElement('button', { class: 'primary button cta' });

        // Check if there's an icon (span.icon) before the link within the same paragraph
        const prevElement = cta.previousElementSibling;
        const hasIcon = prevElement
                       && prevElement.tagName === 'SPAN'
                       && prevElement.classList.contains('icon');

        if (hasIcon) {
          // Format: < icon link > - include icon in button
          button.append(prevElement.cloneNode(true), cta.cloneNode(true));
        } else {
          // Format: < link > - just include link in button
          button.append(cta.cloneNode(true));
        }

        // Replace the entire paragraph with the button
        parentElement.replaceWith(button);
      }
    }
  });
}

export default function decorate(block) {
  if (block.classList.contains('divider-top')) {
    addDividerLine(block, false);
  }
  if (block.classList.contains('divider-bottom')) {
    addDividerLine(block, true);
  }

  decorateHeaders(block);
  decorateReferences(block);
  decorateCtas(block);
}

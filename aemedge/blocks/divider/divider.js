import { createElement, i18n } from '../../scripts/utils.js';

export default async function decorate(block) {
  // Divider back-to-top variant
  if (block.classList.contains('back-to-top')) {
    block.innerHTML = '';
    const divider = createElement('div', { class: 'divider' });
    const backToTopLabel = await i18n('Back to Top');
    const link = createElement('a', { href: '#top', class: 'back-to-top-link text-3' }, backToTopLabel);
    block.appendChild(link);
    block.appendChild(divider);
  }
}

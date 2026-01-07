import {
  div,
  button,
  ul,
  li,
  a,
} from '../../scripts/dom-helpers.js';

function buildDropdown(block) {
  let dropdownLabel = '';
  let dropdownTitle = '';
  const options = [];

  const firstP = block.querySelector('p');
  if (firstP) {
    dropdownLabel = firstP.textContent.trim();
    firstP.remove();
  }

  const mainList = block.querySelector('ul');
  if (mainList) {
    const firstLi = mainList.querySelector(':scope > li');
    if (firstLi) {
      const titleText = firstLi.childNodes[0];
      if (titleText && titleText.nodeType === Node.TEXT_NODE) {
        dropdownTitle = titleText.textContent.trim();
      }

      const subList = firstLi.querySelector('ul');
      if (subList) {
        subList.querySelectorAll(':scope > li').forEach((item) => {
          const link = item.querySelector('a');
          if (link) {
            options.push({
              href: link.getAttribute('href'),
              text: link.textContent.trim(),
            });
          }
        });
      }
    }
    mainList.remove();
  }

  const btn = button({
    class: 'dropdown-selector-button',
    'aria-expanded': 'false',
    'aria-haspopup': 'true',
  }, dropdownLabel);

  const dropdown = div({ class: 'dropdown-selector-dropdown' });
  dropdown.hidden = true;

  if (dropdownTitle) {
    dropdown.appendChild(div({ class: 'dropdown-selector-title' }, dropdownTitle));
  }

  if (options.length > 0) {
    const currentPath = window.location.pathname.replace(/\.html$/, '');

    const listItems = options.map((option) => {
      const linkPath = option.href.replace(/\.html$/, '');
      const isActive = currentPath === linkPath || currentPath.startsWith(`${linkPath}/`);
      return li({}, a({ href: option.href, class: isActive ? 'active' : '' }, option.text));
    });

    dropdown.appendChild(ul({}, ...listItems));
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!isExpanded));
    dropdown.hidden = isExpanded;
  });

  const wrapper = div({ class: 'dropdown-selector-wrapper' }, btn, dropdown);

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      btn.setAttribute('aria-expanded', 'false');
      dropdown.hidden = true;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      btn.setAttribute('aria-expanded', 'false');
      dropdown.hidden = true;
    }
  });

  block.textContent = '';
  block.appendChild(wrapper);
}

export default function decorate(block) {
  buildDropdown(block);
}

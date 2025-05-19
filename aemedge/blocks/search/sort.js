import { a, div, input, label, span } from '../../scripts/dom-helpers.js';

const createDropdown = (options, labelText, dropdownId = 'sort-dropdown', onChange) => {
  let selectedIndex = 0; // Default to first option
  const dropdown = div({ class: 'dropdown', id: dropdownId });
  const dropdownLabel = label({ class: 'dropdown-label' }, 'Sort by');

  // Dropdown toggle with arrow
  // const arrow = span({ class: 'dropdown-arrow', style: 'margin-left: 8px; font-size: 1.1em;' });
  const dropdownToggle = div({ class: 'dropdown-toggle' }, options[selectedIndex].name);

  const dropdownMenu = div({ class: 'dropdown-menu' });

  // Build options
  options.forEach((opt, index) => {
    const dropdownItem = div({ class: 'dropdown-option', id: `option-${dropdownId}-${index}` });
    // Option text
    const optionText = a(span({ class: 'dropdown-option-text', type: 'button', value: opt.value, sortType: opt.sortType }, opt.name));

    if (index === selectedIndex) {
      optionText.classList.add('selected');
    } else {
      optionText.classList.remove('selected');
    }
    // Checkmark
    // const check = span({
    //   class: 'dropdown-check',
    //   style: `margin-right: 8px; color: #1976d2; visibility: ${index === selectedIndex ? 'visible' : 'hidden'};`,
    // }, '✔');
    // dropdownItem.appendChild(check);
    dropdownItem.appendChild(optionText);

    dropdownItem.addEventListener('click', () => {
      selectedIndex = index;
      dropdownToggle.childNodes[0].textContent = opt.name; // update label
      // Update checkmarks
      // Array.from(dropdownMenu.children).forEach((child, idx) => {
      //   child.querySelector('.dropdown-check').style.visibility = idx === selectedIndex ? 'visible' : 'hidden';
      // });
      dropdownMenu.classList.remove('visible');
      if (onChange) onChange(opt, index);
    });

    dropdownMenu.appendChild(dropdownItem);
  });

  dropdown.appendChild(dropdownLabel);
  dropdown.appendChild(dropdownToggle);
  dropdown.appendChild(dropdownMenu);

  dropdownToggle.addEventListener('click', () => {
    dropdownMenu.classList.toggle('visible');
    dropdownToggle.classList.toggle('visible');
    // arrow.textContent = isOpen ? '▲' : '▼';
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdownMenu.classList.remove('visible');
    }
  });

  return dropdown;
};

const createSortDropdown = (sortOptions, onChange) => {
  return createDropdown(sortOptions, 'Sort by', 'sort-dropdown', onChange);
};

const manageSort = (key, block, index, onChange) => {
  const sortOptions = [];
  for (let i = index; i < block.children.length; i += 1) {
    const child = block.children[i];
    const firstChild = child?.firstElementChild;
    const textContent = firstChild?.textContent.trim();
    let secondChild;
    if (textContent.toLowerCase() === key || !textContent) {
      secondChild = child?.children[1];
      const secondChildTextContent = secondChild?.textContent.trim();
      const sortOption = {
        name: secondChildTextContent,
        value: child?.children[2]?.textContent.trim(),
        sortType: child?.children[3]?.textContent.trim(),
      };
      if (secondChildTextContent) {
        sortOptions.push(sortOption);
      }
    } else {
      break;
    }
  }

  return createSortDropdown(sortOptions, onChange);
};

export {
  // searchSort,
  manageSort,
};

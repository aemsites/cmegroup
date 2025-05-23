import {
  a, div, label, span,
} from '../../../scripts/dom-helpers.js';
import searchConfig from '../search-config.js';
import { i18n } from '../../../scripts/utils.js';

const createDropdown = (options, labelText, onChange, dropdownId = 'sort-dropdown') => {
  const dropdown = div({ class: 'dropdown', id: dropdownId });
  const dropdownLabel = label({ class: 'dropdown-label' }, labelText);
  const dropdownToggle = div({ class: 'dropdown-toggle' }, options[0]?.name || '');
  const dropdownMenu = div({ class: 'dropdown-menu' });

  options.forEach((opt, index) => {
    const dropdownItem = div({ class: 'dropdown-option', id: `option-${dropdownId}-${index}` });
    const optionText = a(span({
      class: 'dropdown-option-text',
      value: opt.value,
      sortType: opt.sortType,
    }, opt.name));

    if (index === 0) optionText.classList.add('selected');

    dropdownItem.appendChild(optionText);
    dropdownItem.addEventListener('click', () => {
      dropdownMenu.querySelectorAll('.dropdown-option a').forEach((el) => el.classList.remove('selected'));
      optionText.classList.add('selected');
      dropdownToggle.textContent = opt.name;
      searchConfig.sortOptions = opt;
      dropdownMenu.classList.remove('visible');
      dropdownToggle.classList.remove('visible');
      onChange?.(opt, index);
    });

    dropdownMenu.appendChild(dropdownItem);
  });

  const toggleContainer = div({ class: 'dropdown-toggle-menu' }, dropdownToggle, dropdownMenu);
  dropdown.append(dropdownLabel, toggleContainer);

  const closeDropdown = () => {
    dropdownMenu.classList.remove('visible');
    dropdownToggle.classList.remove('visible');
  };

  // Dropdown toggle functionality
  const handleEscapePress = (e) => {
    if (e.key === 'Escape') closeDropdown();
  };

  const handleOutsideClick = (e) => {
    if (!dropdown.contains(e.target)) closeDropdown();
  };

  const openDropdown = () => {
    dropdownMenu.classList.add('visible');
    dropdownToggle.classList.add('visible');
    document.addEventListener('click', handleOutsideClick, { once: true });
    document.addEventListener('keydown', handleEscapePress, { once: true });
  };

  dropdownToggle.addEventListener('click', () => {
    const isVisible = dropdownMenu.classList.contains('visible');
    if (isVisible) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  return dropdown;
};

const createSortDropdown = async (sortOptions, onChange) => {
  const [
    sortLabel,
  ] = await Promise.all([
    i18n('Sort by'),
  ]);
  return createDropdown(sortOptions, sortLabel, onChange);
};

const manageSort = async (key, block, index, onChange) => {
  const sortOptions = [];

  for (let i = index; i < block.children.length; i += 1) {
    const child = block.children[i];
    const firstChildText = child?.firstElementChild?.textContent.trim().toLowerCase();
    if (firstChildText !== key.toLowerCase() && firstChildText) break;

    const [, nameEl, valueEl, typeEl] = child.children;
    const name = nameEl?.textContent.trim();
    const value = valueEl?.textContent.trim();
    const sortType = typeEl?.textContent.trim();

    if (name) {
      sortOptions.push({ name, value, sortType });
    }
  }

  const dropdown = await createSortDropdown(sortOptions, onChange);
  searchConfig.sortOptions = sortOptions[0] || null;
  return dropdown;
};

const getCurrentSort = () => searchConfig.sortOptions;

const resetSort = () => {
  if (Array.isArray(searchConfig.sortOptions)) {
    searchConfig.sortOptions = searchConfig.sortOptions[0] || null;
  } else {
    searchConfig.sortOptions = null;
  }
};

export {
  manageSort,
  getCurrentSort,
  resetSort,
};

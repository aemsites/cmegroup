import {
  div, input, label,
} from '../../scripts/dom-helpers.js';
import { getTaxonomyWithoutModifications } from '../../scripts/taxonomy.js';
import searchConfig from './search-config.js';
import { i18n } from '../../scripts/utils.js';
import {
  addAppliedFilter, removeAppliedFilter,
} from './search-utils.js';
import { updateFilteringByUI } from './filter-bullets/filter-bullets.js';
import { searchResults } from './search-results/search-results.js';

// === UI Components ===
const createOption = (opt, labelContent, type, className, filterId, index) => {
  const wrapper = div({ class: `${type}-option`, id: `${type === 'dropdown' ? 'option' : 'item'}-${filterId}-${index}` });
  const cb = input({ type: 'checkbox', class: className, value: opt });
  const lbl = label({ class: `${type}-label` }, labelContent);

  cb.addEventListener('change', async (e) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      addAppliedFilter(filterId, opt);
    } else {
      removeAppliedFilter(filterId, opt);
    }
    await updateFilteringByUI(document.querySelector('.filter-bullets'), searchResults);
  });

  wrapper.addEventListener('click', (e) => {
    if (e.target !== cb) {
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event('change'));
    }
  });

  wrapper.append(cb, lbl);
  return wrapper;
};

const sortOptions = (options, order) => {
  if (order === 'asc') {
    return [...options].sort((aa, bb) => aa.localeCompare(bb));
  }
  if (order === 'desc') {
    return [...options].sort((aa, bb) => bb.localeCompare(aa));
  }
  return options;
};

const createDropdown = async (options, labelText, order, filterId) => {
  const dropdown = div({ class: 'dropdown', id: filterId });
  const toggle = div({ class: 'dropdown-toggle' }, labelText);
  const menu = div({ class: 'dropdown-menu' });

  const taxonomy = await getTaxonomyWithoutModifications('tags');
  sortOptions(options, order)
    .forEach((opt, i) => {
      const labelContent = taxonomy[opt]?.en || opt;
      menu.appendChild(createOption(opt, labelContent, 'dropdown', 'dropdown-option-checkbox', filterId, i));
    });

  toggle.addEventListener('click', () => {
    menu.classList.toggle('visible');
    toggle.classList.toggle('visible');

    // eslint-disable-next-line no-use-before-define
    const onEscape = (e) => e.key === 'Escape' && close();
    // eslint-disable-next-line no-use-before-define
    const onOutsideClick = (e) => !dropdown.contains(e.target) && close();

    const close = () => {
      menu.classList.remove('visible');
      toggle.classList.remove('visible');
      document.removeEventListener('click', onOutsideClick);
      document.removeEventListener('keydown', onEscape);
    };

    setTimeout(() => {
      document.addEventListener('click', onOutsideClick);
      document.addEventListener('keydown', onEscape);
    }, 0);
  });

  dropdown.append(toggle, menu);
  return dropdown;
};

const createCheckbox = (options, labelText, order, filterId) => {
  const wrapper = div({ class: 'checkbox', id: filterId });
  wrapper.appendChild(label({ class: 'checkbox-label' }, labelText));

  const container = div({ class: 'checkbox-items' });
  wrapper.appendChild(container);

  sortOptions(options, order)
    .forEach((opt, i) => {
      container.appendChild(createOption(opt, opt, 'checkbox', 'checkbox-input', filterId, i));
    });

  return wrapper;
};

// === Filter Creation ===
const createFilters = async () => {
  const wrapper = div({ class: 'filters-wrapper' });
  const [
    filtersLabel,
  ] = await Promise.all([
    i18n('Filters'),
  ]);
  wrapper.appendChild(div({ class: 'filters-wrapper-title' }, filtersLabel));

  const filtersContainer = div({ class: 'filters' });
  wrapper.appendChild(filtersContainer);

  // eslint-disable-next-line no-restricted-syntax
  for (const [index, filter] of searchConfig.filters.entries()) {
    const filterId = `${filter.type}-${index}`;

    const control = filter.type === 'dropdown'
      // eslint-disable-next-line no-await-in-loop
      ? await createDropdown(filter.values, filter.name, filter.order, filterId)
      : createCheckbox(filter.values, filter.name, filter.order, filterId);
    filtersContainer.appendChild(control);
  }

  return wrapper;
};

// === Filter Parsing ===
const manageFilters = async (key, block, index) => {
  let currentFilter = null;

  for (let i = index; i < block.children.length; i += 1) {
    const child = block.children[i];
    const header = child?.firstElementChild?.textContent.trim().toLowerCase();
    if (!header || header === key.toLowerCase()) {
      const name = child?.children[1]?.textContent.trim();
      const type = child?.children[2]?.textContent.trim();
      const values = Array.from(child?.children[3]?.querySelectorAll('li')).map((li) => li.textContent.trim());

      if (name && type && values.length) {
        currentFilter = { name, type, values };
      } else if (child?.children[2]?.textContent.trim().toLowerCase() === 'order') {
        currentFilter.order = child.children[3]?.textContent.trim();
        searchConfig.filters.push(currentFilter);
        currentFilter = null;
      }
    } else {
      break;
    }
  }

  const tempObj = await createFilters();
  return tempObj;
};

const templateFiltering = (key, block, index) => {
  for (let i = index; i < block.children.length; i += 1) {
    const child = block.children[i];
    const header = child?.firstElementChild?.textContent.trim().toLowerCase();
    if (!header || header === key.toLowerCase()) {
      const templates = child?.children[1]?.textContent.trim().split(',');
      const paths = child?.children[2]?.textContent.trim().split(',');
      const cardType = child?.children[3]?.textContent.trim();

      if (templates.length && paths.length && cardType) {
        if (searchConfig.template) {
          templates.forEach((template) => {
            searchConfig.template[template] = { template, paths, cardType };
          });
        } else {
          templates.forEach((template) => {
            searchConfig.template = {
              [template]: { template, paths, cardType },
            };
          });
        }
      }
    } else {
      break;
    }
  }
};

export {
  templateFiltering,
  manageFilters,
};

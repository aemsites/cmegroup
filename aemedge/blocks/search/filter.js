import { div, input, label } from '../../scripts/dom-helpers.js';
import { getTaxonomy } from '../../scripts/taxonomy.js';
import searchConfig from './search-config.js';
import { i18n } from '../../scripts/utils.js';
import { addAppliedFilter, removeAppliedFilter } from './search-utils.js';
import { updateFilteringByUI } from './filter-bullets/filter-bullets.js';
import { searchResults } from './search-results/search-results.js';

const createOption = (value, labelText, type, className, filterId, index) => {
  const id = `${type === 'dropdown' ? 'option' : 'item'}-${filterId}-${index}`;
  const wrapper = div({ class: `${type}-option`, id });
  const cb = input({
    type: 'checkbox', class: className, value, id: `${id}-input`,
  });
  const lbl = label({ class: `${type}-label`, for: `${id}-input` }, labelText);

  cb.addEventListener('change', async ({ target }) => {
    if (target.checked) {
      addAppliedFilter(filterId, value, labelText);
    } else {
      removeAppliedFilter(filterId, value, labelText);
    }
    await updateFilteringByUI(document.querySelector('.filter-bullets'), searchResults);
  });

  wrapper.addEventListener('click', (e) => {
    if (e.target !== cb) {
      e.preventDefault();
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event('change'));
    }
  });

  wrapper.append(cb, lbl);
  return wrapper;
};

const sortOptions = (arr, key, order) => [...arr].sort((a, b) => {
  const aVal = key ? a?.[key] : a;
  const bVal = key ? b?.[key] : b;
  return order === 'desc'
    ? bVal?.localeCompare?.(aVal)
    : aVal?.localeCompare?.(bVal);
});

const recursiveOptionsGet = (node, collected = [], excluded = new Set()) => {
  Object.entries(node).forEach(([key, value]) => {
    if (typeof value === 'object' && value.path) {
      if (!excluded.has(key) && !excluded.has(value.path)) {
        collected.push({ value: key, label: value.title || key, path: value.path });
      }
      recursiveOptionsGet(value, collected, excluded);
    }
  });
  return collected;
};

const resolveTaxonomyPath = (path, taxonomy) => {
  const isStar = path.endsWith('--star');
  const parts = path.split('/');
  const last = isStar ? parts.at(-1).replace('--star', '') : parts.at(-1);
  let current = taxonomy;

  for (let i = 0; i < parts.length; i += 1) {
    const key = (i === parts.length - 1 && isStar) ? last : parts[i];
    if (!current[key]) return null;
    current = current[key];
  }

  return { node: current, isStar };
};

const createDropdown = async (options, labelText, order, filterId) => {
  const dropdown = div({ class: 'dropdown', id: filterId });
  const toggle = div({ class: 'dropdown-toggle' }, labelText);
  const menu = div({ class: 'dropdown-menu' });
  const taxonomy = await getTaxonomy('tags');
  const resultMap = new Map();
  const excluded = new Set();

  options.forEach((opt) => {
    if (opt.endsWith('--star')) excluded.add(opt.replace('--star', ''));
    excluded.add(opt);
  });

  options.forEach((opt) => {
    const resolved = resolveTaxonomyPath(opt, taxonomy);
    if (!resolved) return;

    const { node, isStar } = resolved;
    if (!resultMap.has(opt)) resultMap.set(opt, { path: opt, title: node.title || opt });

    if (isStar) {
      const subOptions = recursiveOptionsGet(node, [], excluded);
      subOptions.forEach((o) => {
        if (!resultMap.has(o.path)) resultMap.set(o.path, { path: o.path, title: o.label });
      });
    }
  });

  const sorted = sortOptions([...resultMap.values()], 'title', order);
  sorted
    .forEach(({ path, title }, i) => menu.appendChild(createOption(path, title, 'dropdown', 'dropdown-option-checkbox', filterId, i)));

  toggle.addEventListener('click', () => {
    menu.classList.toggle('visible');
    toggle.classList.toggle('visible');

    const close = () => {
      menu.classList.remove('visible');
      toggle.classList.remove('visible');
      // eslint-disable-next-line no-use-before-define
      document.removeEventListener('click', onOutsideClick);
      // eslint-disable-next-line no-use-before-define
      document.removeEventListener('keydown', onEscape);
    };

    const onEscape = (e) => e.key === 'Escape' && close();
    const onOutsideClick = (e) => !dropdown.contains(e.target) && close();

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
  wrapper.append(label({ class: 'checkbox-label' }, labelText));

  const container = div({ class: 'checkbox-items' });
  wrapper.append(container);

  sortOptions(options, null, order)
    .forEach((opt, i) => container.appendChild(createOption(opt, opt, 'checkbox', 'checkbox-input', filterId, i)));

  return wrapper;
};

const createFilters = async () => {
  const wrapper = div({ class: 'filters-wrapper' });
  wrapper.append(div({ class: 'filters-wrapper-title' }, await i18n('Filters')));

  const container = div({ class: 'filters' });
  wrapper.append(container);

  const controls = await Promise.all(
    searchConfig.filters.map((filter, i) => {
      const id = `${filter.type}-${i}`;
      return filter.type === 'dropdown'
        ? createDropdown(filter.values, filter.name, filter.order, id)
        : Promise.resolve(createCheckbox(filter.values, filter.name, filter.order, id));
    }),
  );

  controls.forEach((control) => container.append(control));
  return wrapper;
};

const manageFilters = async (key, block, index) => {
  let current = null;

  for (let i = index; i < block.children.length; i += 1) {
    const child = block.children[i];
    const header = child?.firstElementChild?.textContent.trim().toLowerCase();
    if (!header || header === key.toLowerCase()) {
      const name = child?.children[1]?.textContent.trim();
      const type = child?.children[2]?.textContent.trim();
      const values = Array.from(child?.children[3]?.querySelectorAll('li')).map((li) => li.textContent.trim());

      if (name && type && values.length) {
        current = { name, type, values };
      } else if (child?.children[2]?.textContent.trim().toLowerCase() === 'order') {
        current.order = child.children[3]?.textContent.trim();
        searchConfig.filters.push(current);
        current = null;
      }
    } else {
      break;
    }
  }

  const tempFilters = await createFilters();
  return tempFilters;
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
        if (!searchConfig.template) searchConfig.template = {};
        templates.forEach((template) => {
          searchConfig.template[template] = { template, paths, cardType };
        });
      }
    } else {
      break;
    }
  }
};

export { templateFiltering, manageFilters };

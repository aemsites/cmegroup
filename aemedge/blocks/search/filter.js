import {
  div,
  input,
  label,
  button,
} from '../../scripts/dom-helpers.js';
import { getTaxonomy } from '../../scripts/taxonomy.js';
import searchConfig from './search-config.js';
import { i18n } from '../../scripts/utils.js';
import { addAppliedFilter, clearAllFilters, removeAppliedFilter } from './search-utils.js';
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

const createMobileFilterSection = async (filter, filterId, type) => {
  console.log(1111, filter, filterId, type);
  const section = div({ class: 'mobile-filter-section', id: filterId });
  const header = div({ class: 'mobile-filter-section-header' });
  const sectionTitle = div({ class: 'mobile-filter-section-title' }, filter.name.toUpperCase());
  const toggle = button({ class: 'mobile-filter-section-toggle', 'aria-expanded': 'false' });
  header.append(sectionTitle, toggle);

  const content = div({ class: 'mobile-filter-section-content' });
  const taxonomy = await getTaxonomy('tags');
  const resultMap = new Map();
  const excluded = new Set();

  // Handle star options (similar to existing dropdown logic)
  filter.values.forEach((opt) => {
    if (opt.endsWith('--star')) excluded.add(opt.replace('--star', ''));
    excluded.add(opt);
  });

  filter.values.forEach((opt) => {
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

  const sorted = sortOptions([...resultMap.values()], 'title', filter.order);

  sorted.forEach(({ path, title: optionTitle }, i) => {
    const id = `${type === 'dropdown' ? 'option' : 'item'}-${filterId}-${i}`;
    const optionWrapper = div({ class: `${type}-option`, id });
    const checkbox = input({
      type: 'checkbox',
      class: 'dropdown-option-checkbox',
      value: path,
      id: `${id}-input`,
    });
    const labelEl = document.createElement('label');
    labelEl.setAttribute('for', `${id}-input`);
    labelEl.className = `${type}-label`;
    labelEl.textContent = optionTitle;

    // Add event listener for checkbox changes
    checkbox.addEventListener('change', async ({ target }) => {
      if (target.checked) {
        addAppliedFilter(filterId, path, optionTitle);
      } else {
        removeAppliedFilter(filterId, path, optionTitle);
      }
    });

    optionWrapper.addEventListener('click', (e) => {
      if (e.target !== checkbox) {
        e.preventDefault();
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      }
    });

    optionWrapper.append(checkbox, labelEl);
    content.appendChild(optionWrapper);
  });

  // Toggle functionality
  header.addEventListener('click', (e) => {
    e.preventDefault();
    // remove all other expansion false
    const expandedSections = document.querySelectorAll('.mobile-filter-section.expanded');
    expandedSections.forEach((x) => {
      if (x.querySelector('.mobile-filter-section-header') !== header) {
        x.querySelector('.mobile-filter-section-toggle').setAttribute('aria-expanded', 'false');
        x.querySelector('.mobile-filter-section-content').classList.remove('expanded');
        x.classList.remove('expanded');
      }
    });

    const isExpanded = section.querySelector('.mobile-filter-section-toggle')?.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', !isExpanded);
    content.classList.toggle('expanded', !isExpanded);
    section.classList.toggle('expanded', !isExpanded);
  });

  section.append(header, content);
  return section;
};

const updateMobileFilterCheckboxes = () => {
  // Sync mobile checkboxes with applied filters
  document.querySelectorAll('.mobile-filter-checkbox').forEach((checkbox) => {
    const isApplied = searchConfig.appliedFilters.some(
      (filter) => filter.value === checkbox.value,
    );
    checkbox.checked = isApplied;
  });
};

const createMobileFilterOverlay = async () => {
  const overlay = div({ class: 'mobile-filter-overlay' });

  // Header
  const header = div({ class: 'mobile-filter-header' });
  const title = div({ class: 'mobile-filter-title' }, 'FILTER BY');
  const closeBtn = button({ class: 'mobile-filter-close' });
  header.append(closeBtn);

  // Content
  const content = div({ class: 'mobile-filter-content' }, title);

  // Create sections for each filter
  const sections = await Promise.all(
    searchConfig.filters.map((filter, i) => {
      const id = `${filter.type}-${i}`;
      // console.log(filter, id);
      return createMobileFilterSection(filter, id, filter.type);
    }),
  );

  sections.forEach((section) => content.appendChild(section));

  // Footer with Apply button
  const footer = div({ class: 'mobile-filter-footer' });
  const applyBtn = button({ class: 'mobile-filter-apply' }, 'APPLY');
  footer.appendChild(applyBtn);

  // Close button functionality
  closeBtn.addEventListener('click', () => {
    overlay.classList.remove('visible');
  });

  // Apply button functionality
  applyBtn.addEventListener('click', async () => {
    overlay.classList.remove('visible');
    await updateFilteringByUI(document.querySelector('.filter-bullets'), searchResults);
  });

  // Close on overlay background click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('visible');
    }
  });

  // Update checkboxes when overlay becomes visible
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        if (overlay.classList.contains('visible')) {
          updateMobileFilterCheckboxes();
        }
      }
    });
  });
  observer.observe(overlay, { attributes: true });

  overlay.append(header, content, footer);
  return overlay;
};

/**
 * Create desktop filters
 * @returns
 */
const createFilters = async () => {
  const wrapper = div({ class: 'filters-wrapper' });
  wrapper.append(div({ class: 'filters-wrapper-title' }, await i18n('Filters')));

  const container = div({ class: 'filters' });
  wrapper.append(container);

  const mobileFilterButtons = div({ class: 'mobile-filter-buttons' });

  // Add mobile filter button
  const mobileFilterBtn = button({ class: 'mobile-filter-button primary' }, await i18n('Filters'));
  const mobileResetBtn = button({ class: 'mobile-reset-button secondary' }, await i18n('Reset'));
  mobileFilterButtons.append(mobileResetBtn, mobileFilterBtn);

  mobileResetBtn.onclick = async (e) => {
    e.preventDefault();
    clearAllFilters();
    await updateFilteringByUI(document.querySelector('.filter-bullets'), searchResults);
  };

  // Create and append mobile filter overlay
  const mobileFilterOverlay = await createMobileFilterOverlay();
  wrapper.append(mobileFilterButtons, mobileFilterOverlay);

  // Handle mobile filter button click
  mobileFilterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    mobileFilterOverlay.classList.add('visible');
  });

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

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

/**
 * Sync checkboxes
 * @param {HTMLElement} sourceCheckbox
 * @param {string} value
 * @param {string} filterId
 */
const syncCheckboxes = (sourceCheckbox, value, filterId) => {
  const isMobile = !!sourceCheckbox.closest('.mobile-filter-overlay');
  const selector = isMobile
    ? `#${filterId} input[value="${value}"]`
    : `.mobile-filter-section#${filterId} input[value="${value}"]`;

  const targetCheckbox = document.querySelector(selector);
  if (targetCheckbox && targetCheckbox !== sourceCheckbox) {
    targetCheckbox.checked = sourceCheckbox.checked;
  }
};

/**
 * Create filter option
 * @param {Object} options
 * @param {string} options.value
 * @param {string} options.labelText
 * @param {string} options.type
 * @param {string} options.className
 * @param {string} options.filterId
 * @param {number} options.index
 * @param {boolean} isMobile
 * @returns {HTMLElement}
 */
const createFilterOption = (
  {
    value, labelText, type, className, filterId, index,
  },
  isMobile = false,
) => {
  const idPrefix = isMobile ? 'mobile-' : '';
  const optionType = type === 'dropdown' ? 'option' : 'item';
  const id = `${idPrefix}${optionType}-${filterId}-${index}`;

  const wrapperClass = type === 'dropdown' ? 'dropdown-option' : 'checkbox-option';
  const wrapper = div({ class: wrapperClass, id });

  const isApplied = searchConfig.appliedFilters.some(
    (appliedFilter) => appliedFilter.value === value,
  );

  const cb = input({
    type: 'checkbox',
    class: className,
    value,
    id: `${id}-input`,
  });
  if (isApplied) cb.checked = true;

  const lbl = label({ class: `${type === 'dropdown' ? 'dropdown-label' : 'checkbox-label'}`, for: `${id}-input` }, labelText);

  cb.addEventListener('change', async ({ target }) => {
    syncCheckboxes(target, value, filterId);

    if (target.checked) {
      addAppliedFilter(filterId, value, labelText);
    } else {
      removeAppliedFilter(filterId, value, labelText);
    }

    if (!isMobile) {
      await updateFilteringByUI(document.querySelector('.filter-bullets'), searchResults);
    }
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

/**
 * Create dropdown
 * @param {Array} options
 * @param {string} labelText
 * @param {string} order
 * @param {string} filterId
 * @returns {Promise<HTMLElement>}
 */
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
    .forEach(({ path, title }, i) => menu.appendChild(
      createFilterOption({
        value: path, labelText: title, type: 'dropdown', className: 'dropdown-option-checkbox', filterId, index: i,
      }),
    ));

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

/**
 * Create checkbox
 * @param {Array} options
 * @param {string} labelText
 * @param {string} order
 * @param {string} filterId
 * @returns {HTMLElement}
 */
const createCheckbox = (options, labelText, order, filterId) => {
  const wrapper = div({ class: 'checkbox', id: filterId });
  wrapper.append(label({ class: 'checkbox-label' }, labelText));

  const container = div({ class: 'checkbox-items' });
  wrapper.append(container);

  sortOptions(options, null, order)
    .forEach((opt, i) => container.appendChild(
      createFilterOption({
        value: opt, labelText: opt, type: 'checkbox', className: 'checkbox-input', filterId, index: i,
      }),
    ));

  return wrapper;
};

/**
 * Create mobile filter section
 * @param {Object} filter
 * @param {string} filterId
 * @param {string} type
 * @returns {Promise<HTMLElement>}
 */
const createMobileFilterSection = async (filter, filterId, type) => {
  const section = div({ class: 'mobile-filter-section', id: filterId });
  const header = div({ class: 'mobile-filter-section-header' });
  const sectionTitle = div({ class: 'mobile-filter-section-title' }, filter.name.toUpperCase());
  const toggle = button({ class: 'mobile-filter-section-toggle', 'aria-expanded': 'false' });
  header.append(sectionTitle, toggle);

  const content = div({ class: 'mobile-filter-section-content' });

  // Handle different filter types
  if (type === 'checkbox') {
    // Simple checkbox handling - no taxonomy resolution needed
    const sorted = sortOptions(filter.values, null, filter.order);

    sorted.forEach((value, i) => {
      content.appendChild(createFilterOption({
        value,
        labelText: value,
        type: 'checkbox',
        className: 'checkbox-input',
        filterId,
        index: i,
      }, true));
    });
  } else {
    // Dropdown handling with taxonomy resolution (existing code)
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
      content.appendChild(createFilterOption({
        value: path,
        labelText: optionTitle,
        type: 'dropdown',
        className: 'dropdown-option-checkbox',
        filterId,
        index: i,
      }, true));
    });
  }

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

/**
 * Update mobile filter checkboxes
 */
const updateMobileFilterCheckboxes = () => {
  // Sync mobile checkboxes with applied filters
  document.querySelectorAll('.mobile-filter-checkbox').forEach((checkbox) => {
    const isApplied = searchConfig.appliedFilters.some(
      (filter) => filter.value === checkbox.value,
    );
    checkbox.checked = isApplied;
  });
};

/**
 * Create mobile filter overlay
 * @returns {Promise<HTMLElement>}
 */
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
      return createMobileFilterSection(filter, id, filter.type);
    }),
  );

  sections.forEach((section) => content.appendChild(section));

  // Footer with Apply button
  const footer = div({ class: 'mobile-filter-footer' });
  const applyBtn = button({ class: 'mobile-filter-apply' }, 'APPLY');
  footer.appendChild(applyBtn);

  // Close button functionality
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // remove all other expansion false
    const expandedSections = document.querySelectorAll('.mobile-filter-section.expanded');
    expandedSections.forEach((x) => {
      x.querySelector('.mobile-filter-section-toggle').setAttribute('aria-expanded', 'false');
      x.querySelector('.mobile-filter-section-content').classList.remove('expanded');
      x.classList.remove('expanded');
    });
    overlay.classList.remove('visible');
  });

  // Apply button functionality
  applyBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const expandedSections = document.querySelectorAll('.mobile-filter-section.expanded');
    expandedSections.forEach((x) => {
      x.querySelector('.mobile-filter-section-toggle').setAttribute('aria-expanded', 'false');
      x.querySelector('.mobile-filter-section-content').classList.remove('expanded');
      x.classList.remove('expanded');
    });
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
 * @returns {Promise<HTMLElement>}
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

/**
 * Manage filters
 * @param {string} key
 * @param {HTMLElement} block
 * @param {number} index
 * @returns {Promise<HTMLElement>}
 */
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

/**
 * Template filtering
 * @param {string} key
 * @param {HTMLElement} block
 * @param {number} index
 * @returns {Promise<HTMLElement>}
 */
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

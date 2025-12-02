/* eslint-disable class-methods-use-this */
import { createElement, i18n } from '../../../../scripts/utils.js';

const [
  assetsText,
  exchangesText,
  venuesText,
  clearedText,
] = await Promise.all([
  i18n('Asset Classes & Product Groups'),
  i18n('Exchanges'),
  i18n('Venues'),
  i18n('Cleared As'),
]);

class UniversalDropdown {
  constructor(container, config) {
    this.container = container;
    this.config = config;
    this.isOpen = false;
    this.selectedItems = new Set(config.selectedItems || []);
    this.focusedIndex = -1;
    this.focusableElements = [];

    if (!window.activeDropdowns) {
      window.activeDropdowns = [];
    }
    window.activeDropdowns.push(this);

    this.init();
  }

  init() {
    this.createDropdown();
    this.bindEvents();
    this.updateAllCheckboxes();
  }

  createDropdown() {
    this.dropdown = createElement('div', { class: 'dropdown' });
    this.dropdown.dataset.type = this.config.type;

    this.header = createElement('button', {
      class: 'dropdown-header',
      type: 'button',
    });
    this.header.innerHTML = `
      <span>${this.config.title}</span>
      <span class="dropdown-arrow"></span>
    `;

    this.content = createElement('div', { class: 'dropdown-content' });

    if (this.config.isHierarchical) {
      this.createHierarchicalItems();
    } else {
      this.createFlatItems();
    }

    this.dropdown.appendChild(this.header);
    this.dropdown.appendChild(this.content);
    this.container.appendChild(this.dropdown);
  }

  createHierarchicalItems() {
    this.config.data.forEach((group) => {
      this.createGroup(group.name, group.id, group.children || []);
    });
  }

  createFlatItems() {
    this.config.data.forEach((item) => {
      const itemElement = this.createItem(item.name, item.id, false);
      this.content.appendChild(itemElement);
    });
  }

  createCheckboxComponent(id) {
    const checkboxComponent = createElement('div', {
      class: 'checkbox-component',
    });

    const checkbox = createElement('input', { class: 'checkbox-input' });
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.tabIndex = -1;

    const checkboxCustom = document.createElement('span');
    checkboxCustom.className = 'checkbox-custom';

    const checkmark = createElement('span', { class: 'checkmark' });
    checkmark.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: none;">
        <path d="M11.6666 3.5L5.24998 9.91667L2.33331 7" stroke="blue" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    checkboxCustom.appendChild(checkmark);
    checkboxComponent.appendChild(checkbox);
    checkboxComponent.appendChild(checkboxCustom);

    return { checkboxComponent, checkbox, checkmark };
  }

  createGroup(groupName, groupId, children) {
    const groupItem = createElement('div', {
      class: 'dropdown-item group',
      tabindex: '-1',
    });
    const id = `${this.config.type}-group-${groupId}`;
    const { checkboxComponent, checkbox, checkmark } = this.createCheckboxComponent(id);

    const label = createElement('label', { class: 'checkbox-label item-label' });
    label.textContent = groupName;
    label.style.cursor = 'pointer';

    groupItem.appendChild(checkboxComponent);
    groupItem.appendChild(label);

    const handleToggle = (e) => {
      e.preventDefault();
      e.stopPropagation();
      checkbox.checked = !checkbox.checked;
      this.updateCheckboxVisual(checkbox, checkmark);
      this.toggleGroupSelection(groupName, groupId, checkbox, children);
    };

    groupItem.addEventListener('click', handleToggle);

    groupItem.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleToggle(e);
      }
    });

    this.content.appendChild(groupItem);

    children.forEach((child) => {
      const childElement = this.createItem(child.name, child.id, true, groupName, groupId);
      this.content.appendChild(childElement);
    });
  }

  createItem(itemName, itemId, isSubitem = false, groupName = null, groupId = null) {
    const itemClass = isSubitem ? 'dropdown-item subitem' : 'dropdown-item';
    const item = createElement('div', {
      class: itemClass,
      tabindex: '-1',
    });
    const id = `${this.config.type}-item-${itemId}`;
    const { checkboxComponent, checkbox, checkmark } = this.createCheckboxComponent(id);

    const label = createElement('label', { class: 'checkbox-label item-label' });
    label.textContent = itemName;
    label.style.cursor = 'pointer';

    item.appendChild(checkboxComponent);
    item.appendChild(label);

    const handleToggle = (e) => {
      e.preventDefault();
      e.stopPropagation();
      checkbox.checked = !checkbox.checked;
      this.updateCheckboxVisual(checkbox, checkmark);

      if (isSubitem) {
        this.toggleChildItem(itemName, itemId, checkbox, groupName, groupId);
      } else {
        this.toggleSimpleItem(itemName, itemId);
      }
    };

    item.addEventListener('click', handleToggle);

    item.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleToggle(e);
      }
    });

    return item;
  }

  updateCheckboxVisual(checkbox, checkmark) {
    const svg = checkmark.querySelector('svg');
    svg.style.display = checkbox.checked ? 'block' : 'none';
  }

  updateFocusableElements() {
    this.focusableElements = Array.from(
      this.content.querySelectorAll('.dropdown-item'),
    );
  }

  bindEvents() {
    this.header.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    this.header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!this.isOpen) {
          this.open();
        }
        this.focusFirstItem();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!this.isOpen) {
          this.open();
        }
        this.focusLastItem();
      }
    });

    this.content.addEventListener('keydown', (e) => {
      this.handleContentKeyboard(e);
    });

    this.dropdown.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && this.isOpen) {
        setTimeout(() => {
          if (!this.dropdown.contains(document.activeElement)) {
            this.close();
          }
        }, 0);
      }
    });

    document.addEventListener('click', (e) => {
      if (!this.dropdown.contains(e.target)) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        this.close();
        this.header.focus();
      }
    });
  }

  handleContentKeyboard(e) {
    if (!this.isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.focusNext();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.focusPrevious();
        break;
      case 'Home':
        e.preventDefault();
        this.focusFirstItem();
        break;
      case 'End':
        e.preventDefault();
        this.focusLastItem();
        break;
      default:
        break;
    }
  }

  focusNext() {
    if (this.focusableElements.length === 0) return;

    this.focusedIndex += 1;
    if (this.focusedIndex >= this.focusableElements.length) {
      this.focusedIndex = 0;
    }

    const el = this.focusableElements[this.focusedIndex];
    if (el) el.focus();
  }

  focusPrevious() {
    if (this.focusableElements.length === 0) return;

    this.focusedIndex -= 1;
    if (this.focusedIndex < 0) {
      this.focusedIndex = this.focusableElements.length - 1;
    }

    const el = this.focusableElements[this.focusedIndex];
    if (el) el.focus();
  }

  focusFirstItem() {
    if (this.focusableElements.length === 0) return;

    this.focusedIndex = 0;
    this.focusableElements[0]?.focus();
  }

  focusLastItem() {
    if (this.focusableElements.length === 0) return;

    this.focusedIndex = this.focusableElements.length - 1;
    this.focusableElements[this.focusedIndex]?.focus();
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.closeOtherDropdowns();
      this.open();
    }
  }

  closeOtherDropdowns() {
    if (window.activeDropdowns) {
      window.activeDropdowns.forEach((dropdown) => {
        if (dropdown !== this && dropdown.isOpen) {
          dropdown.close();
        }
      });
    }
  }

  open() {
    this.isOpen = true;
    this.content.classList.add('open');
    this.header.querySelector('.dropdown-arrow').classList.add('open');
    this.updateFocusableElements();
  }

  close() {
    this.isOpen = false;
    this.content.classList.remove('open');
    this.header.querySelector('.dropdown-arrow').classList.remove('open');
    this.focusedIndex = -1;
  }

  toggleGroupSelection(groupName, groupId, checkbox, children) {
    const groupKey = `${groupName}_${groupId}`;

    if (this.selectedItems.has(groupKey)) {
      this.selectedItems.delete(groupKey);
      children.forEach((child) => {
        this.selectedItems.delete(`${child.name}_${child.id}`);
      });
    } else {
      this.selectedItems.add(groupKey);
      children.forEach((child) => {
        this.selectedItems.add(`${child.name}_${child.id}`);
      });
    }

    this.updateAllCheckboxes();
    this.dispatchSelectionEvent();
  }

  toggleChildItem(itemName, itemId, checkbox, groupName, groupId) {
    const itemKey = `${itemName}_${itemId}`;

    if (this.selectedItems.has(itemKey)) {
      this.selectedItems.delete(itemKey);
    } else {
      this.selectedItems.add(itemKey);
    }

    this.updateGroupState(groupName, groupId);
    this.updateAllCheckboxes();
    this.dispatchSelectionEvent();
  }

  toggleSimpleItem(itemName, itemId) {
    const itemKey = `${itemName}_${itemId}`;

    if (this.selectedItems.has(itemKey)) {
      this.selectedItems.delete(itemKey);
    } else {
      this.selectedItems.add(itemKey);
    }

    this.updateAllCheckboxes();
    this.dispatchSelectionEvent();
  }

  updateGroupState(groupName, groupId) {
    if (!this.config.isHierarchical) return;

    const group = this.config.data.find(
      (g) => g.name === groupName && g.id === groupId,
    );
    if (!group || !group.children) return;

    const groupKey = `${groupName}_${groupId}`;
    const selectedChildren = group.children.filter((child) => this.selectedItems.has(`${child.name}_${child.id}`));

    if (selectedChildren.length === group.children.length && group.children.length > 0) {
      this.selectedItems.add(groupKey);
    } else {
      this.selectedItems.delete(groupKey);
    }
  }

  updateAllCheckboxes() {
    const checkboxes = this.content.querySelectorAll('.checkbox-input');
    checkboxes.forEach((checkbox) => {
      const isGroup = checkbox.id.includes('-group-');

      if (isGroup && this.config.isHierarchical) {
        this.updateGroupCheckbox(checkbox);
      } else {
        this.updateItemCheckbox(checkbox);
      }
    });
  }

  updateGroupCheckbox(checkbox) {
    const groupId = checkbox.id.split('-group-')[1];
    const group = this.config.data.find((g) => String(g.id) === String(groupId));
    if (!group) return;

    const selectedChildren = (group.children || []).filter((child) => this.selectedItems.has(`${child.name}_${child.id}`));

    checkbox.checked = selectedChildren.length === (group.children || []).length
      && (group.children || []).length > 0;

    const checkboxComponent = checkbox.parentElement;
    const checkmark = checkboxComponent.querySelector('.checkmark');
    if (checkmark) {
      this.updateCheckboxVisual(checkbox, checkmark);
    }
  }

  updateItemCheckbox(checkbox) {
    const itemId = checkbox.id.split('-item-')[1];
    const items = this.config.isHierarchical
      ? this.config.data.flatMap((g) => g.children || [])
      : this.config.data;

    const item = items.find((i) => String(i.id) === String(itemId));
    if (item) {
      checkbox.checked = this.selectedItems.has(`${item.name}_${item.id}`);

      const checkboxComponent = checkbox.parentElement;
      const checkmark = checkboxComponent.querySelector('.checkmark');
      if (checkmark) {
        this.updateCheckboxVisual(checkbox, checkmark);
      }
    }
  }

  dispatchSelectionEvent() {
    this.dropdown.dispatchEvent(
      new CustomEvent('selectionChange', {
        detail: {
          type: this.config.type,
          selectedItems: Array.from(this.selectedItems),
          selectedCount: this.selectedItems.size,
        },
      }),
    );
  }

  getSelectedItems() {
    return Array.from(this.selectedItems);
  }

  deselectItem(itemKey) {
    if (!this.selectedItems.has(itemKey)) return false;

    this.selectedItems.delete(itemKey);

    if (this.config.isHierarchical) {
      const group = this.config.data.find((g) => `${g.name}_${g.id}` === itemKey);

      if (group && group.children) {
        group.children.forEach((child) => {
          this.selectedItems.delete(`${child.name}_${child.id}`);
        });
      } else {
        this.config.data.forEach((g) => {
          const child = (g.children || []).find((c) => `${c.name}_${c.id}` === itemKey);
          if (child) {
            this.updateGroupState(g.name, g.id);
          }
        });
      }
    }

    this.updateAllCheckboxes();
    this.dispatchSelectionEvent();
    return true;
  }

  deselectItems(itemKeys) {
    itemKeys.forEach((key) => this.deselectItem(key));
  }
}

function createDropdowns(apiData, options = {}) {
  const { visibleFilters = {} } = options;
  const container = createElement('div', { class: 'dropdowns-container' });

  const dropdownConfigs = {
    group: { title: assetsText, isHierarchical: true },
    exch: { title: exchangesText, isHierarchical: false },
    venues: { title: venuesText, isHierarchical: false },
    cleared: { title: clearedText, isHierarchical: false },
  };

  const dropdownInstances = new Map();

  Object.keys(dropdownConfigs).forEach((key) => {
    if (visibleFilters[key] === false) return;

    const data = apiData[key];
    const config = dropdownConfigs[key];

    if (data && data.length > 0) {
      const wrapper = createElement('div', { class: 'dropdown-wrapper' });
      container.appendChild(wrapper);

      const dropdownConfig = {
        type: key,
        title: config.title,
        data,
        isHierarchical: config.isHierarchical,
        selectedItems: options.selectedItems?.[key] || [],
      };

      const dropdown = new UniversalDropdown(wrapper, dropdownConfig);
      dropdownInstances.set(key, dropdown);

      if (options.onSelectionChange) {
        dropdown.dropdown.addEventListener('selectionChange', (e) => {
          options.onSelectionChange(e.detail);
        });
      }
    }
  });

  container.getSelections = () => {
    const selections = {};
    dropdownInstances.forEach((dropdown, type) => {
      selections[type] = dropdown.getSelectedItems();
    });
    return selections;
  };

  container.setSelections = (selections) => {
    dropdownInstances.forEach((dropdown, type) => {
      if (selections[type]) {
        dropdown.selectedItems = new Set(selections[type]);
        dropdown.updateAllCheckboxes();
      }
    });
  };

  container.deselectItem = (type, itemKey) => {
    const dropdown = dropdownInstances.get(type);
    return dropdown ? dropdown.deselectItem(itemKey) : false;
  };

  container.getDropdownInstance = (type) => dropdownInstances.get(type);

  return container;
}

export default createDropdowns;

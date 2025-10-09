import { createElement } from '../../../../scripts/utils.js';

class UniversalDropdown {
  constructor(container, config) {
    this.container = container;
    this.config = config;
    this.isOpen = false;
    this.selectedItems = new Set(config.selectedItems || []);

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
    this.dropdown = createElement('div', {
      class: 'dropdown',
    });
    this.dropdown.dataset.type = this.config.type;
    this.header = createElement('button', {
      class: 'dropdown-header',
    });
    this.header.innerHTML = `
            <span>${this.config.title}</span>
            <span class="dropdown-arrow">▼</span>
        `;
    this.content = createElement('div', {
      class: 'dropdown-content',
    });

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
      const itemElement = this.createSimpleItem(item.name, item.id);
      this.content.appendChild(itemElement);
    });
  }

  createGroup(groupName, groupId, children) {
    const groupItem = createElement('div', {
      class: 'dropdown-item group',
    });

    const groupCheckbox = createElement('input', {
      class: 'checkbox',
    });
    groupCheckbox.type = 'checkbox';
    groupCheckbox.id = `${this.config.type}-group-${groupId}`;

    groupCheckbox.style.pointerEvents = 'none';

    const groupLabel = createElement('label', {
      class: 'item-label',
    });
    groupLabel.htmlFor = groupCheckbox.id;
    groupLabel.textContent = groupName;
    groupLabel.style.pointerEvents = 'none';

    groupItem.appendChild(groupCheckbox);
    groupItem.appendChild(groupLabel);

    groupItem.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      groupCheckbox.checked = !groupCheckbox.checked;

      this.toggleGroupSelection(groupName, groupId, groupCheckbox, children);
    });

    this.content.appendChild(groupItem);

    children.forEach((child) => {
      const childElement = this.createChildItem(
        child.name,
        child.id,
        groupName,
        groupId
      );
      this.content.appendChild(childElement);
    });
  }

  createChildItem(itemName, itemId, groupName, groupId) {
    const item = createElement('div', {
      class: 'dropdown-item subitem',
    });
    const checkbox = createElement('input', {
      class: 'checkbox',
    });
    const label = createElement('label', {
      class: 'item-label',
    });
    checkbox.type = 'checkbox';
    checkbox.id = `${this.config.type}-item-${itemId}`;

    checkbox.style.pointerEvents = 'none';
    label.htmlFor = checkbox.id;
    label.textContent = itemName;

    label.style.pointerEvents = 'none';

    item.appendChild(checkbox);
    item.appendChild(label);

    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      checkbox.checked = !checkbox.checked;

      this.toggleChildItem(itemName, itemId, checkbox, groupName, groupId);
    });

    return item;
  }

  createSimpleItem(itemName, itemId) {
    const item = createElement('div', {
      class: 'dropdown-item',
    });
    const checkbox = createElement('input', {
      class: 'checkbox',
    });
    const label = createElement('label', {
      class: 'item-label',
    });
    checkbox.type = 'checkbox';
    checkbox.id = `${this.config.type}-item-${itemId}`;

    checkbox.style.pointerEvents = 'none';
    label.htmlFor = checkbox.id;
    label.textContent = itemName;

    label.style.pointerEvents = 'none';

    item.appendChild(checkbox);
    item.appendChild(label);

    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      checkbox.checked = !checkbox.checked;

      this.toggleSimpleItem(itemName, itemId, checkbox);
    });

    return item;
  }

  bindEvents() {
    this.header.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    document.addEventListener('click', (e) => {
      if (!this.dropdown.contains(e.target)) {
        this.close();
      }
    });
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
  }

  close() {
    this.isOpen = false;
    this.content.classList.remove('open');
    this.header.querySelector('.dropdown-arrow').classList.remove('open');
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

  toggleSimpleItem(itemName, itemId, checkbox) {
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
      (g) => g.name === groupName && g.id === groupId
    );
    if (!group || !group.children) return;

    const groupKey = `${groupName}_${groupId}`;
    const selectedChildren = group.children.filter((child) =>
      this.selectedItems.has(`${child.name}_${child.id}`)
    );

    if (selectedChildren.length === 0) {
      this.selectedItems.delete(groupKey);
    } else if (selectedChildren.length === group.children.length) {
      this.selectedItems.add(groupKey);
    } else {
      this.selectedItems.delete(groupKey);
    }
  }

  updateAllCheckboxes() {
    const checkboxes = this.content.querySelectorAll('.checkbox');
    checkboxes.forEach((checkbox) => {
      const id = checkbox.id;
      const isGroup = id.includes('-group-');

      if (isGroup && this.config.isHierarchical) {
        this.updateGroupCheckbox(checkbox);
      } else {
        this.updateItemCheckbox(checkbox);
      }
    });
  }

  updateGroupCheckbox(checkbox) {
    const groupId = checkbox.id.split('-group-')[1];

    const group = this.config.data.find(
      (g) => String(g.id) === String(groupId)
    );
    if (!group) return;

    const groupKey = `${group.name}_${group.id}`;
    const selectedChildren = (group.children || []).filter((child) =>
      this.selectedItems.has(`${child.name}_${child.id}`)
    );

    if (selectedChildren.length === 0) {
      checkbox.checked = false;
      checkbox.indeterminate = false;
    } else if (selectedChildren.length === (group.children || []).length) {
      checkbox.checked = true;
      checkbox.indeterminate = false;
    } else {
      checkbox.checked = false;
      checkbox.indeterminate = true;
    }
  }

  updateItemCheckbox(checkbox) {
    const itemId = checkbox.id.split('-item-')[1];

    if (this.config.isHierarchical) {
      this.config.data.forEach((group) => {
        (group.children || []).forEach((child) => {
          if (String(child.id) === String(itemId)) {
            checkbox.checked = this.selectedItems.has(
              `${child.name}_${child.id}`
            );
          }
        });
      });
    } else {
      this.config.data.forEach((item) => {
        if (String(item.id) === String(itemId)) {
          checkbox.checked = this.selectedItems.has(`${item.name}_${item.id}`);
        }
      });
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
      })
    );
  }

  getSelectedItems() {
    return Array.from(this.selectedItems);
  }

  deselectItem(itemKey) {
    if (this.selectedItems.has(itemKey)) {
      this.selectedItems.delete(itemKey);

      if (this.config.isHierarchical) {
        const group = this.config.data.find(
          (g) => `${g.name}_${g.id}` === itemKey
        );

        if (group && group.children) {
          group.children.forEach((child) => {
            const childKey = `${child.name}_${child.id}`;
            this.selectedItems.delete(childKey);
          });
        } else {
          this.config.data.forEach((g) => {
            const child = (g.children || []).find(
              (c) => `${c.name}_${c.id}` === itemKey
            );
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
    return false;
  }

  deselectItems(itemKeys) {
    itemKeys.forEach((key) => this.deselectItem(key));
  }
}

function createDropdowns(apiData, options = {}) {
  const container = createElement('div', {
    class: 'dropdowns-container',
  });

  const dropdownConfigs = {
    group: {
      title: 'Asset Classes & Product Groups',
      isHierarchical: true,
    },
    cleared: {
      title: 'Cleared Products',
      isHierarchical: false,
    },
    exch: {
      title: 'Exchanges',
      isHierarchical: false,
    },
    venues: {
      title: 'Venues',
      isHierarchical: false,
    },
  };

  const dropdownInstances = new Map();

  Object.keys(apiData).forEach((key) => {
    const data = apiData[key];
    const config = dropdownConfigs[key];

    if (data && data.length > 0 && config) {
      const wrapper = createElement('div', {
        class: 'dropdown-wrapper',
      });
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

  container.getSelections = function () {
    const selections = {};
    dropdownInstances.forEach((dropdown, type) => {
      selections[type] = dropdown.getSelectedItems();
    });
    return selections;
  };

  container.setSelections = function (selections) {
    dropdownInstances.forEach((dropdown, type) => {
      if (selections[type]) {
        dropdown.selectedItems = new Set(selections[type]);
        dropdown.updateAllCheckboxes();
      }
    });
  };

  container.deselectItem = function (type, itemKey) {
    const dropdown = dropdownInstances.get(type);
    if (dropdown) {
      return dropdown.deselectItem(itemKey);
    }
    return false;
  };

  container.getDropdownInstance = function (type) {
    return dropdownInstances.get(type);
  };

  return container;
}

export { createDropdowns };

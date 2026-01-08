import { createElement } from '../../../../scripts/utils.js';

function createCheckbox(options = {}) {
  const {
    id = 'custom-checkbox',
    label,
    items = null,
    fieldName = '',
    selected = [],
    onChange = null,
  } = options;

  const isMultiple = items !== null;

  const state = {
    selected: isMultiple ? [...selected] : [],
  };

  const container = createElement('div', {
    class: isMultiple ? 'checkbox-filter' : 'checkbox-component',
    tabindex: isMultiple ? null : '0',
  });

  function createCheckmarkSvg() {
    const checkmark = createElement('span', { class: 'checkmark' });
    checkmark.innerHTML = `
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style="display: none;"
      >
        <path
          d="M11.6666 3.5L5.24998 9.91667L2.33331 7"
          stroke="blue"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>`;
    return checkmark;
  }

  function updateVisual(checkmark, isChecked) {
    const svg = checkmark.querySelector('svg');
    svg.style.display = isChecked ? 'block' : 'none';
  }

  function updateAllCheckboxes() {
    const allCheckboxes = container.querySelectorAll('li');
    allCheckboxes.forEach((li) => {
      const input = li.querySelector('input');
      const checkmark = li.querySelector('.checkmark');
      if (input && checkmark) {
        const isSelectAll = input.id === fieldName;
        if (isSelectAll) {
          input.checked = state.selected.length === items.length && items.length > 0;
        } else {
          input.checked = state.selected.includes(input.value);
        }
        updateVisual(checkmark, input.checked);
      }
    });
  }

  function renderSingle() {
    container.innerHTML = '';

    const checkbox = createElement('input', {
      class: 'checkbox-input',
      type: 'checkbox',
      id,
      tabindex: '-1',
    });

    const checkboxCustom = createElement('span', { class: 'checkbox-custom' });
    const checkmark = createCheckmarkSvg();
    checkboxCustom.appendChild(checkmark);

    const labelEl = createElement('label', { class: 'checkbox-label' });
    labelEl.textContent = label;
    labelEl.style.cursor = 'pointer';

    container.append(checkbox, checkboxCustom, labelEl);

    const toggleCheckbox = () => {
      checkbox.checked = !checkbox.checked;
      updateVisual(checkmark, checkbox.checked);
      if (onChange) {
        onChange(checkbox.checked);
      }
    };

    checkbox.addEventListener('change', (e) => {
      updateVisual(checkmark, e.target.checked);
      if (onChange) {
        onChange(e.target.checked);
      }
    });

    container.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        toggleCheckbox();
      }
    });

    container.addEventListener('click', (e) => {
      if (e.target === checkbox) return;
      e.preventDefault();
      e.stopPropagation();
      toggleCheckbox();
    });

    container.isChecked = () => checkbox.checked;
    container.setChecked = (value) => {
      checkbox.checked = value;
      updateVisual(checkmark, value);
    };
    container.reset = () => {
      checkbox.checked = false;
      updateVisual(checkmark, false);
    };
    container.setDisabled = (disabled) => {
      checkbox.disabled = disabled;
      container.setAttribute('tabindex', disabled ? '-1' : '0');
      container.classList.toggle('disabled', disabled);
    };

    updateVisual(checkmark, checkbox.checked);
  }

  function createCheckboxItem(itemId, itemLabel, isSelectAll = false) {
    const li = createElement('li', { tabindex: '0' });
    const wrapper = createElement('div', { class: 'checkbox-item-wrapper' });

    const input = createElement('input', {
      type: 'checkbox',
      id: isSelectAll ? fieldName : fieldName + itemId,
      'data-key': fieldName,
      class: 'checkbox-input',
      tabindex: '-1',
    });

    if (!isSelectAll) {
      input.value = itemId;
    }

    if (isSelectAll) {
      input.checked = state.selected.length === items.length && items.length > 0;
    } else {
      input.checked = state.selected.includes(itemId);
    }

    const checkboxCustom = createElement('span', { class: 'checkbox-custom' });
    const checkmark = createCheckmarkSvg();
    checkboxCustom.appendChild(checkmark);

    const labelEl = createElement('label', { for: input.id, class: 'checkbox-label' });
    labelEl.textContent = itemLabel;

    wrapper.append(input, checkboxCustom);
    li.append(wrapper, labelEl);

    updateVisual(checkmark, input.checked);

    const toggleItem = () => {
      input.checked = !input.checked;
      updateVisual(checkmark, input.checked);

      if (isSelectAll) {
        state.selected = input.checked ? items.map((item) => item.id) : [];
      } else if (input.checked) {
        if (!state.selected.includes(itemId)) {
          state.selected.push(itemId);
        }
      } else {
        const index = state.selected.indexOf(itemId);
        if (index >= 0) {
          state.selected.splice(index, 1);
        }
      }

      updateAllCheckboxes();

      if (onChange) {
        onChange(fieldName, state.selected);
      }
    };

    input.addEventListener('change', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    wrapper.addEventListener('click', (e) => {
      if (e.target === input) return;
      e.preventDefault();
      e.stopPropagation();
      toggleItem();
    });

    labelEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleItem();
    });

    li.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        toggleItem();
      }
    });

    return li;
  }

  function renderMultiple() {
    container.innerHTML = '';
    const list = createElement('ul', { class: 'checkbox-filter-items' });

    list.append(createCheckboxItem(null, 'Select All', true));

    items.forEach((item) => {
      list.append(createCheckboxItem(item.id, item.name));
    });

    container.append(list);
  }

  if (isMultiple) {
    renderMultiple();
    container.getSelected = () => [...state.selected];
    container.setSelected = (newSelected) => {
      state.selected = [...newSelected];
      updateAllCheckboxes();
    };
    container.reset = () => {
      state.selected = [];
      updateAllCheckboxes();
    };
  } else {
    renderSingle();
  }

  return container;
}

export default createCheckbox;

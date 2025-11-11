import { createElement, i18n } from '../../../../scripts/utils.js';

const [
  checkboxLabel,
] = await Promise.all([
  i18n('New Products Only'),
]);

function createCheckbox(options = {}) {
  const container = createElement('div', {
    class: 'checkbox-component',
    tabindex: '0',
  });

  const checkbox = createElement('input', {
    class: 'checkbox-input',
    type: 'checkbox',
    id: options.id || 'custom-checkbox',
    tabindex: '-1',
  });

  const checkboxCustom = document.createElement('span');
  checkboxCustom.className = 'checkbox-custom';

  const checkmark = createElement('span', {
    class: 'checkmark',
  });
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

  checkboxCustom.appendChild(checkmark);

  const label = createElement('label', {
    class: 'checkbox-label',
  });
  label.textContent = options.label || checkboxLabel;
  label.style.cursor = 'pointer';

  container.appendChild(checkbox);
  container.appendChild(checkboxCustom);
  container.appendChild(label);

  const updateVisual = (isChecked) => {
    const svg = checkmark.querySelector('svg');
    if (isChecked) {
      svg.style.display = 'block';
    } else {
      svg.style.display = 'none';
    }
  };

  const toggleCheckbox = () => {
    checkbox.checked = !checkbox.checked;
    updateVisual(checkbox.checked);

    if (options.onChange) {
      options.onChange(checkbox.checked);
    }
  };

  checkbox.addEventListener('change', (e) => {
    updateVisual(e.target.checked);
    if (options.onChange) {
      options.onChange(e.target.checked);
    }
  });

  container.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggleCheckbox();
    }
  });

  container.addEventListener('click', (e) => {
    if (e.target === checkbox) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    toggleCheckbox();
  });

  container.isChecked = () => checkbox.checked;
  container.setChecked = (value) => {
    checkbox.checked = value;
    updateVisual(value);
  };
  container.reset = () => {
    checkbox.checked = false;
    updateVisual(false);
  };
  container.setDisabled = (disabled) => {
    checkbox.disabled = disabled;
    if (disabled) {
      container.setAttribute('tabindex', '-1');
      container.classList.add('disabled');
    } else {
      container.setAttribute('tabindex', '0');
      container.classList.remove('disabled');
    }
  };
  container.focus = () => {
    container.focus();
  };

  updateVisual(checkbox.checked);

  return container;
}

export default createCheckbox;

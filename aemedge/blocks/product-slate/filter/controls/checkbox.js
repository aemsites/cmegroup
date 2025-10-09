import { createElement } from '../../../../scripts/utils.js';

function createCheckbox(options = {}) {
  const container = createElement('div', {
    class: 'checkbox-component',
  });

  // Hidden native checkbox input
  const checkbox = createElement('input', {
    class: 'checkbox-input',
  });
  checkbox.type = 'checkbox';
  checkbox.id = 'custom-checkbox';

  // Custom visual checkbox element
  const checkboxCustom = document.createElement('span');
  checkboxCustom.className = 'checkbox-custom';

  // SVG checkmark (initially hidden)
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
      {' '}
      <path
        d="M11.6666 3.5L5.24998 9.91667L2.33331 7"
        stroke="blue"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />{' '}
    </svg>`;

  checkboxCustom.appendChild(checkmark);

  // Label (without htmlFor to avoid double event triggering)
  const label = createElement('label', {
    class: 'checkbox-label',
  });
  label.textContent = 'New Products Only';
  label.style.cursor = 'pointer';

  // Assemble elements
  container.appendChild(checkbox);
  container.appendChild(checkboxCustom);
  container.appendChild(label);

  // Updates the visual state of the checkbox
  const updateVisual = (isChecked) => {
    if (isChecked) {
      checkmark.querySelector('svg').style.display = 'block';
    } else {
      checkmark.querySelector('svg').style.display = 'none';
    }
  };

  // Listen to native checkbox changes
  checkbox.addEventListener('change', (e) => {
    updateVisual(e.target.checked);
    if (options.onChange) {
      options.onChange(e.target.checked);
    }
  });

  // Make the entire container clickable (except the native checkbox)
  container.addEventListener('click', (e) => {
    // Skip if the click came directly from the native checkbox
    if (e.target === checkbox) {
      return;
    }

    // Toggle state manually when clicking other parts
    e.preventDefault();
    e.stopPropagation();
    checkbox.checked = !checkbox.checked;
    updateVisual(checkbox.checked);

    if (options.onChange) {
      options.onChange(checkbox.checked);
    }
  });

  // Public API
  container.isChecked = () => checkbox.checked;
  container.setChecked = (value) => {
    checkbox.checked = value;
    updateVisual(value);
  };
  container.reset = () => {
    checkbox.checked = false;
    updateVisual(false);
  };

  // Initialize visual state
  updateVisual(checkbox.checked);

  return container;
}

export default createCheckbox;

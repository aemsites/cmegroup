import { toClassName } from '../../scripts/aem.js';
import { createElement } from '../../scripts/utils.js';

function createFieldWrapper(fd) {
  const fieldWrapper = document.createElement('div');
  if (fd.Style) fieldWrapper.className = fd.Style;
  if (fd.DefaultHide === 'true') {
    fieldWrapper.classList.add('hide');
    if (fd.VisibleExpression) {
      fieldWrapper.dataset.visibleExpression = fd.VisibleExpression;
    }
  }
  if (fd.ColumnsSpan) {
    const sizes = fd.ColumnsSpan.split(',');
    sizes.forEach((size) => {
      fieldWrapper.classList.add(`col-${size.trim()}`);
    });
  }
  if (fd.CustomStyle) {
    fieldWrapper.classList.add(...fd.CustomStyle.split(',').map((style) => `custom-${style.trim()}`));
  }
  fieldWrapper.classList.add('field-wrapper', `${fd.Type}-wrapper`);
  if (fd.Fieldset) {
    fieldWrapper.dataset.fieldset = fd.Fieldset;
  }
  return fieldWrapper;
}

const ids = [];
function generateFieldId(fd, suffix = '') {
  const slug = toClassName(`form-${fd.Name}${suffix}`);
  ids[slug] = ids[slug] || 0;
  const idSuffix = ids[slug] ? `-${ids[slug]}` : '';
  ids[slug] += 1;
  return `${slug}${idSuffix}`;
}

function createLabel(fd) {
  const label = document.createElement('label');
  label.id = generateFieldId(fd, '-label');
  label.textContent = fd.Label || fd.Name;
  label.setAttribute('for', fd.Id);
  if (fd.Mandatory.toLowerCase() === 'true' || fd.Mandatory.toLowerCase() === 'x') {
    label.dataset.required = true;
  } else if (fd.Mandatory.toLowerCase() === 'false') {
    // adding optional text to the label
    const optional = document.createElement('i');
    optional.textContent = ' (Optional)';
    label.append(optional);
  }
  return label;
}

function setCommonAttributes(field, fd) {
  field.id = fd.Id;
  field.name = fd.Name;
  field.required = fd.Mandatory?.toLowerCase() === 'true' || fd.Mandatory?.toLowerCase() === 'x';
  field.placeholder = fd.Placeholder;
  field.value = fd.Value;
  field.submitName = fd.SubmitName;

  // Set validation message (empty if not provided)
  const validationMessage = fd.ValidationMessage || '';
  field.dataset.customError = validationMessage;

  // Set initial validation state
  if (field.required && !field.value) {
    field.setCustomValidity(validationMessage);
  }

  const handler = () => {
    if (field.required) {
      field.setCustomValidity(field.value ? '' : field.dataset.customError);
    }
    if (field.value) {
      const wrapper = field.closest('.field-wrapper');
      const errorMsg = wrapper.querySelector('.error-message');
      errorMsg?.remove();
    }
  };

  field.addEventListener('input', handler);
  field.addEventListener('change', handler);
}

const createHeading = (fd) => {
  const fieldWrapper = createFieldWrapper(fd);

  const level = fd.Style && fd.Style.includes('sub-heading') ? 3 : 2;
  const heading = document.createElement(`h${level}`);
  heading.textContent = fd.Value || fd.Label;
  heading.id = fd.Id;

  fieldWrapper.append(heading);

  return { field: heading, fieldWrapper };
};

const createPlaintext = (fd) => {
  const fieldWrapper = createFieldWrapper(fd);

  const text = document.createElement('p');
  text.textContent = fd.Value || fd.Label;
  text.id = fd.Id;

  fieldWrapper.append(text);

  return { field: text, fieldWrapper };
};

const createSelect = async (fd) => {
  const select = document.createElement('select');
  setCommonAttributes(select, fd);
  const addOption = ({ text, value }) => {
    const option = document.createElement('option');
    option.text = text.trim();
    option.value = value.trim();
    if (option.value === fd.Value) {
      option.setAttribute('selected', '');
    }
    select.add(option);
    return option;
  };

  if (fd.Placeholder) {
    addOption({ text: fd.Placeholder, value: '' });
  }

  if (fd.Options) {
    let options = [];
    if (fd.Options.startsWith('https://')) {
      const optionsUrl = new URL(fd.Options);
      const resp = await fetch(`${optionsUrl.pathname}${optionsUrl.search}`);
      const json = await resp.json();
      json.data.forEach((opt) => {
        options.push({
          text: opt.Option,
          value: opt.Value || opt.Option,
        });
      });
    } else {
      options = fd.Options.split(',').map((opt) => ({
        text: opt.trim(),
        value: opt.trim(),
      }));
    }
    if (fd.OptionsSort === 'true') {
      options.sort((a, b) => a.text.localeCompare(b.text));
    }
    options.forEach((opt) => addOption(opt));
  }

  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.append(select);
  fieldWrapper.prepend(createLabel(fd));

  return { field: select, fieldWrapper };
};

const createConfirmation = (fd, form) => {
  form.dataset.confirmation = new URL(fd.Value).pathname;

  return {};
};

const createSubmit = (fd) => {
  const button = document.createElement('button');
  button.textContent = fd.Label || fd.Name;
  button.classList.add('button');
  button.type = 'submit';

  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.append(button);
  fieldWrapper.setAttribute('data-type', 'submit');
  fieldWrapper.setAttribute('data-action', fd.Action);
  fieldWrapper.setAttribute('data-submit-message', fd.Value);
  return { field: button, fieldWrapper };
};

const createTextArea = (fd) => {
  const field = document.createElement('textarea');
  setCommonAttributes(field, fd);
  if (fd.Rows) {
    field.setAttribute('rows', fd.Rows);
  }

  const fieldWrapper = createFieldWrapper(fd);
  const label = createLabel(fd);
  field.setAttribute('aria-labelledby', label.id);
  fieldWrapper.append(field);
  fieldWrapper.prepend(label);

  return { field, fieldWrapper };
};

const createInput = (fd) => {
  const field = document.createElement('input');
  field.type = fd.Type;
  setCommonAttributes(field, fd);

  const fieldWrapper = createFieldWrapper(fd);
  const label = createLabel(fd);
  field.setAttribute('aria-labelledby', label.id);
  fieldWrapper.append(field);
  if (fd.Type === 'radio' || fd.Type === 'checkbox') {
    fieldWrapper.append(label);
  } else {
    fieldWrapper.prepend(label);
  }

  return { field, fieldWrapper };
};

const createFieldset = (fd) => {
  const field = document.createElement('fieldset');
  setCommonAttributes(field, fd);

  if (fd.Label) {
    const legend = document.createElement('legend');
    legend.textContent = fd.Label;
    field.append(legend);
  }

  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.append(field);

  return { field, fieldWrapper };
};

const createToggle = (fd) => {
  const { field, fieldWrapper } = createInput(fd);
  field.type = 'checkbox';
  if (!field.value) field.value = 'on';
  field.classList.add('toggle');
  fieldWrapper.classList.add('selection-wrapper');

  const toggleSwitch = document.createElement('div');
  toggleSwitch.classList.add('switch');
  toggleSwitch.append(field);
  fieldWrapper.append(toggleSwitch);

  const slider = document.createElement('span');
  slider.classList.add('slider');
  toggleSwitch.append(slider);
  slider.addEventListener('click', () => {
    field.checked = !field.checked;
  });

  return { field, fieldWrapper };
};

const createCheckbox = (fd) => {
  const { field, fieldWrapper } = createInput(fd);
  if (!field.value) field.value = 'checked';
  fieldWrapper.classList.add('selection-wrapper');

  return { field, fieldWrapper };
};

const createRadio = (fd) => {
  const { field, fieldWrapper } = createInput(fd);
  if (!field.value) field.value = fd.Label || 'on';
  fieldWrapper.classList.add('selection-wrapper');

  return { field, fieldWrapper };
};

const createFeedbackSmiley = (fd) => {
  const fieldWrapper = createFieldWrapper(fd);
  const field = createElement('input', {
    type: 'radio',
    id: fd.Id,
    name: fd.SubmitName || fd.Fieldset || 'FeedbackRating',
    value: fd.Value,
    'aria-label': `Feedback ${fd.Value}`,
  });

  const label = createLabel(fd);
  const img = createElement('img', {
    src: `/aemedge/icons/${fd.Name}.svg`,
    alt: `Feedback ${fd.Value}`,
    loading: 'eager',
  });
  const span = createElement('span', { class: `icon icon-${fd.Name}` }, img);
  label.textContent = '';
  label.append(span);
  fieldWrapper.append(field, label);
  return { field, fieldWrapper };
};

const createGoogleRecaptcha = (fd) => {
  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.classList.add('recaptcha-disclaimer');

  const label = createLabel(fd);
  label.dataset.sitekey = fd.Value;
  fieldWrapper.append(label);

  return { field: label, fieldWrapper };
};

const FIELD_CREATOR_FUNCTIONS = {
  select: createSelect,
  heading: createHeading,
  plaintext: createPlaintext,
  'text-area': createTextArea,
  toggle: createToggle,
  submit: createSubmit,
  confirmation: createConfirmation,
  fieldset: createFieldset,
  checkbox: createCheckbox,
  radio: createRadio,
  'feedback-smiley': createFeedbackSmiley,
  recaptcha: createGoogleRecaptcha,
};

export default async function createField(fd, form) {
  fd.Id = fd.Id || generateFieldId(fd);
  const type = fd.Type.toLowerCase();
  const createFieldFunc = FIELD_CREATOR_FUNCTIONS[type] || createInput;
  const fieldElements = await createFieldFunc(fd, form);

  return fieldElements.fieldWrapper;
}

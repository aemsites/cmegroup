import { toClassName } from '../../scripts/aem.js';
import { createElement, i18n } from '../../scripts/utils.js';

function createFieldWrapper(fd) {
  const fieldWrapper = createElement('div');
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
  if (fd.ShowAfterSubmit) {
    fieldWrapper.dataset.showAfterSubmit = fd.ShowAfterSubmit;
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
  const label = createElement('label');
  label.id = generateFieldId(fd, '-label');
  label.textContent = fd.Label || fd.Name;
  label.setAttribute('for', fd.Id);
  if (fd.Mandatory?.toLowerCase() === 'true' || fd.Mandatory?.toLowerCase() === 'x') {
    label.dataset.required = true;
  } else if (fd.Mandatory?.toLowerCase() === 'false') {
    // adding optional text to the label
    const optional = createElement('i');
    optional.textContent = ' (Optional)';
    label.append(optional);
  }
  return label;
}

async function setCommonAttributes(field, fd) {
  field.id = fd.Id;
  field.name = fd.Name;
  field.required = fd.Mandatory?.toLowerCase() === 'true' || fd.Mandatory?.toLowerCase() === 'x';
  field.placeholder = fd.Placeholder;
  field.value = fd.Value;
  field.submitName = fd.SubmitName;
  field.prefillInput = fd.PrefillInput;
  field.prefillSelfInput = fd.PrefillSelfInput;
  if (fd.MinLength) field.minLength = fd.MinLength;
  if (fd.MaxLength) field.maxLength = fd.MaxLength;

  // default validation messages
  const [requiredText, shortText, longText] = await Promise.all([
    i18n('This field is required'),
    i18n('Text too short'),
    i18n('Text too long'),
  ]);

  const checkCustomValidity = () => {
    if (field.validity.valueMissing) {
      field.setCustomValidity(fd.ValidationMessage || requiredText);
    } else if (field.validity.tooShort) {
      field.setCustomValidity(fd.ShortErrorMessage || shortText);
    } else if (field.validity.tooLong) {
      field.setCustomValidity(fd.LongErrorMessage || longText);
    } else {
      field.setCustomValidity('');
    }
  };

  const handler = () => {
    field.setCustomValidity('');
    if (field.checkValidity()) {
      const wrapper = field.closest('.field-wrapper');
      const errorMsg = wrapper.querySelector('.error-message');
      errorMsg?.remove();
    }
  };

  // Set initial validation state
  checkCustomValidity();

  field.addEventListener('input', handler);
  field.addEventListener('change', handler);
  field.addEventListener('invalid', checkCustomValidity);
}

const createHeading = (fd) => {
  const fieldWrapper = createFieldWrapper(fd);

  const level = fd.Style?.includes('sub-heading') ? 'h3' : (fd.Style || 'h2');
  const heading = createElement(`${level}`);
  heading.textContent = fd.Value || fd.Label;
  heading.id = fd.Id;

  fieldWrapper.append(heading);
  fieldWrapper.classList.remove(level);

  return { field: heading, fieldWrapper };
};

const createPlaintext = (fd) => {
  const fieldWrapper = createFieldWrapper(fd);

  const text = createElement('p');
  text.innerHTML = fd.Value || fd.Label;
  text.id = fd.Id;

  fieldWrapper.append(text);

  return { field: text, fieldWrapper };
};

const createSelect = async (fd) => {
  const select = createElement('select');
  setCommonAttributes(select, fd);
  const addOption = ({ text, value }) => {
    const option = createElement('option');
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
  const button = createElement('button', { class: 'button' });
  button.textContent = fd.Label || fd.Name;
  button.type = 'submit';

  let buttonText = button.textContent;
  const bracketMatch = buttonText.match(/\[([^\]]+)\]/);

  if (bracketMatch) {
    const classes = bracketMatch[1]
      .split(',')
      .map((value) => value.trim());

    if (classes.length > 0) {
      button.classList.add(...classes);
    }

    buttonText = buttonText.replace(/\s*\[[^\]]*\]/, '');
    button.textContent = buttonText;
  }

  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.append(button);
  fieldWrapper.setAttribute('data-type', 'submit');
  fieldWrapper.setAttribute('data-action', fd.Action);
  fieldWrapper.setAttribute('data-submit-message', fd.Value);
  return { field: button, fieldWrapper };
};

const createTextArea = (fd) => {
  const field = createElement('textarea');
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
  const field = createElement('input');
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
  const field = createElement('fieldset');
  setCommonAttributes(field, fd);

  if (fd.Label) {
    const legend = createElement('legend');
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

  const toggleSwitch = createElement('div', { class: 'switch' });
  toggleSwitch.append(field);
  fieldWrapper.append(toggleSwitch);

  const slider = createElement('span', { class: 'slider' });
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

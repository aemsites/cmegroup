import createField from './form-fields.js';
import { createElement } from '../../scripts/utils.js';
import GoogleReCaptcha from './integrations/recaptcha.js';


async function loadChoices(form) {
  if (!window.Choices) {
    await import('./public/choices-js/choices.min.js');
  }
  form.querySelectorAll('select').forEach((select) => {
    new Choices(select, {
      searchEnabled: true,
      itemSelectText: '',
      shouldSort: true,
      placeholderValue: 'Please Select...',
      position: 'auto',
      sorter: (a, b) => {
        if (a.value === 'None') return -1;
        if (b.value === 'None') return 1;
        return a.label.localeCompare(b.label);
      }
    });
  });
}

async function createForm(formHref, submitHref) {
  const { pathname } = new URL(formHref);
  const resp = await fetch(pathname);
  const json = await resp.json();

  const form = document.createElement('form');
  form.dataset.action = submitHref;

  const fields = await Promise.all(json.data.map((fd) => createField(fd, form)));
  fields.forEach((field) => {
    if (field) {
      form.append(field);
    }
  });

  // group fields into fieldsets
  const fieldsets = form.querySelectorAll('fieldset');
  fieldsets.forEach((fieldset) => {
    form.querySelectorAll(`[data-fieldset="${fieldset.name}"`).forEach((field) => {
      fieldset.append(field);
    });
  });

  // Initialize Choices after form is created
  await loadChoices(form);

  return form;
}

function generatePayload(form, formId, formName) {
  const payload = {};

  [...form.elements].forEach((field) => {
    if (field.name && field.type !== 'submit' && !field.disabled) {
      if (field.type === 'radio') {
        if (field.checked) payload[field.name] = field.value;
      } else if (field.type === 'checkbox') {
        const fieldValue = field.checked ? 'true' : 'false';
        if (field.checked) payload[field.name] = payload[field.name] ? `${payload[field.name]},${fieldValue}` : fieldValue;
      } else {
        payload[field.name] = field.value;
      }
    }
  });

  payload.Form_ID__c = formId;
  payload.Form_Type__c = formName;
  payload.Page_URL__c = window.location.href;
  return payload;
}

async function handleSubmit(form, block) {
  if (form.getAttribute('data-submitting') === 'true') return;

  const submit = form.querySelector('button[type="submit"]');
  try {
    form.setAttribute('data-submitting', 'true');
    submit.disabled = true;

    const sitekey = block.querySelector('.recaptcha-disclaimer')?.dataset.sitekey;
    if (!sitekey) {
      throw new Error('No reCAPTCHA site key found');
    }

    const formName = block.getAttribute('form-name');
    const formId = block.getAttribute('form-id');

    const recaptcha = new GoogleReCaptcha({
      config: {
        siteKey: sitekey,
        version: 'v3',
      },
      id: formId,
      name: formName,
    });

    await recaptcha.loadCaptcha(form);
    const recaptchaToken = await recaptcha.getToken();

    const payload = generatePayload(form, formId, formName);

    const response = await fetch(form.dataset.action, {
      method: 'POST',
      body: JSON.stringify({
        ...payload
      }),
      headers: {
        'Content-Type': 'application/json',
        'G-Recaptcha-Response': recaptchaToken,
      },
    });
    if (response.ok) {
      if (form.dataset.confirmation) {
        window.location.href = form.dataset.confirmation;
      }
    } else {
      const error = await response.text();
      throw new Error(error);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  } finally {
    form.setAttribute('data-submitting', 'false');
    submit.disabled = false;
  }
}

function decorateLabels(form) {
  const labels = form.querySelectorAll('label');

  labels.forEach((label) => {
    const text = label.textContent;
    const linkPattern = /\[(.*?)\]\((.*?)\)/g;

    if (linkPattern.test(text)) {
      linkPattern.lastIndex = 0;
      let newText = text;
      Array.from(text.matchAll(linkPattern)).forEach((match) => {
        const [fullMatch, linkText, url] = match;
        const anchor = `<a href="${url}">${linkText}</a>`;
        newText = newText.replace(fullMatch, anchor);
      });
      label.innerHTML = newText;
    }
  });
}

function decorateRecaptchaDisclaimer(block) {
  const disclaimer = block.querySelector('.recaptcha-disclaimer');
  if (disclaimer) {
    const p = createElement('p', { class: 'recaptcha-disclaimer' });
    const label = disclaimer.querySelector('label');
    p.innerHTML = label.innerHTML;
    p.dataset.sitekey = label.dataset.sitekey;
    block.appendChild(p);
    disclaimer.remove();
  }
}

function getFormData(block) {
  const formData = {};
  const rows = [...block.children];
  rows.forEach((row) => {
    const key = row.querySelector('div:first-child')?.textContent?.trim()?.toLowerCase();
    const value = row.querySelector('div:last-child')?.textContent?.trim();
    if (key && value) {
      formData[key] = value;
    }
  });

  const formId = formData.id;
  block.setAttribute('form-id', formId);

  const formName = formData.name;
  block.setAttribute('form-name', formName);

  const formClass = formName.toLowerCase().replaceAll(' ', '-');
  block.classList.add(formClass);

  return formData;
}

export default async function decorate(block) {
  const formData = getFormData(block);
  const formLink = formData.source;
  const submitLink = formData.submit;

  if (!formLink || !submitLink) return;

  const form = await createForm(formLink, submitLink);
  decorateLabels(form);
  block.replaceChildren(form);
  decorateRecaptchaDisclaimer(block);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const valid = form.checkValidity();
    if (valid) {
      handleSubmit(form, block);
    } else {
      const firstInvalidEl = form.querySelector(':invalid:not(fieldset)');
      if (firstInvalidEl) {
        firstInvalidEl.focus();
        firstInvalidEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
}

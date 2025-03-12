import createField from './form-fields.js';
import { createElement } from '../../scripts/utils.js';
import { loadFragment } from '../fragment/fragment.js';
import { getUserInfo, postForm } from '../../scripts/api.js';

function createChoicesInstance(select) {
  // eslint-disable-next-line no-undef
  const choicesInstance = new Choices(select, {
    searchEnabled: true,
    itemSelectText: '',
    shouldSort: false, // sorting handled in form-fields.js
    position: 'auto',
  });
  select.choicesInstance = choicesInstance;
}

async function loadChoices(form, callback, ...args) {
  if (!window.Choices) {
    const script = document.createElement('script');
    script.src = '/aemedge/blocks/form/external/choices-js/choices.min.js';
    script.async = true;
    script.onload = async () => {
      form.querySelectorAll('select').forEach((select) => createChoicesInstance(select));
      await callback(...args);
    };
    document.head.appendChild(script);
  } else {
    form.querySelectorAll('select').forEach((select) => createChoicesInstance(select));
    await callback(...args);
  }
}

function setFieldValue(field, value) {
  if (field.type === 'select-one') {
    field.choicesInstance?.setChoiceByValue(value);
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new Event('invalid', { bubbles: true }));
  } else if (field.type === 'checkbox') {
    field.checked = (value === true);
    field.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

async function fetchForm(formHref) {
  const { pathname, searchParams } = new URL(formHref);
  const queryParams = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const resp = await fetch(pathname + queryParams);
  return resp.json();
}

/**
 * Replaces template variables like {{fieldName}} with actual field values while preserving HTML
 * @param {HTMLElement} form - The form element
 * @param {string|string[]} selectors - CSS selector(s) for elements to process
 */
function replaceTemplateVariables(form, selectors = ['label', 'p']) {
  const selectorString = Array.isArray(selectors) ? selectors.join(', ') : selectors;
  const elements = form.querySelectorAll(selectorString);

  elements.forEach((element) => {
    const html = element.innerHTML || '';
    const templatePattern = /\{\{([^}]+)\}\}/g;
    if (templatePattern.test(html)) {
      templatePattern.lastIndex = 0;
      let newHtml = html;
      const replacementPattern = /\{\{([^}]+)\}\}/g;
      let match;
      // eslint-disable-next-line no-cond-assign
      while (match = replacementPattern.exec(html)) {
        const fullMatch = match[0];
        const fieldName = match[1];
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (field) {
          const fieldValue = (field.value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
          newHtml = newHtml.replace(fullMatch, fieldValue);
        }
      }
      if (newHtml !== html) {
        element.innerHTML = newHtml;
      }
    }
  });
}

/**
 * Decorates text elements with links and bold formatting
 */
function applyRichTextFormat(container, selectors = ['label', 'p']) {
  const selectorString = Array.isArray(selectors) ? selectors.join(', ') : selectors;
  const elements = container.querySelectorAll(selectorString);

  elements.forEach((element) => {
    if (element.classList.contains('rich-text')) return;
    element.classList.add('rich-text');
    const text = element.textContent;
    const linkPattern = /\[(.*?)\]\((.*?)\)/g;
    const boldPattern = /\*\*(.*?)\*\*/g;
    let newText = text;

    if (linkPattern.test(text)) {
      linkPattern.lastIndex = 0;
      Array.from(text.matchAll(linkPattern)).forEach((match) => {
        const [fullMatch, linkText, url] = match;
        const anchor = `<a href="${url}">${linkText}</a>`;
        newText = newText.replace(fullMatch, anchor);
      });
    }

    if (boldPattern.test(text)) {
      boldPattern.lastIndex = 0;
      Array.from(text.matchAll(boldPattern)).forEach((match) => {
        const [fullMatch, boldText] = match;
        const bold = `<strong>${boldText}</strong>`;
        newText = newText.replace(fullMatch, bold);
      });
    }

    if (newText !== text) {
      element.innerHTML = newText;
    }
  });
}

function populateUserInfoInContactUsForm(form, userInfo) {
  Object.entries(userInfo).forEach(([key, value]) => {
    const field = form.querySelector(`[name="${key}"]`);
    if (field) {
      setFieldValue(field, value);
    }
  });
  replaceTemplateVariables(form);
}

async function decorateContactUsForm(form, formData, block) {
  const isContactUsVariant = block.classList.contains('contact-us');
  if (!isContactUsVariant) return;

  form.classList.add('user-info');
  const isLoggedIn = formData.mock === 'LoggedIn';
  if (isLoggedIn) {
    const userInfo = await getUserInfo();
    form.classList.remove('user-info');
    form.classList.add('collapsed-user-info');

    const sheetData = await fetchForm(`${formData.source}?sheet=logged-in`);
    const fields = await Promise.all(sheetData.data.map(async (field) => {
      const fieldElement = await createField(field, form);
      fieldElement.classList.add('logged-in');
      return fieldElement;
    }));

    if (fields.length > 0) {
      form.prepend(...fields);
      applyRichTextFormat(form, ['label', 'p']);
      const editAccountInformation = form.querySelector('a');

      if (editAccountInformation) {
        editAccountInformation.addEventListener('click', (e) => {
          e.preventDefault();
          form.classList.remove('collapsed-user-info');
          form.classList.add('user-info');
        });
      }
    }

    populateUserInfoInContactUsForm(form, userInfo);
  }
}

function decodeHtmlEntities(text) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

function addListnersForDefaultHideFields(form) {
  const fields = form.querySelectorAll('.field-wrapper');
  fields.forEach((field) => {
    if (field.dataset.visibleExpression) {
      const decodedExpression = decodeHtmlEntities(field.dataset.visibleExpression);
      const match = decodedExpression.match(/([^=]+)=(?:"([^"]*)"|([\w.]+))/);
      if (!match) return;
      const fieldName = match[1].trim();
      const expectedValue = match[2] || match[3];
      const conditionalField = form.querySelector(`[name="${fieldName}"]`);
      if (conditionalField) {
        conditionalField.addEventListener('change', () => {
          const fieldValue = conditionalField.value;
          field.classList.toggle('hide', fieldValue.toLowerCase() !== expectedValue.toLowerCase());
        });
      }
    }
  });
}

async function createForm(formData, block) {
  const json = await fetchForm(formData.source);

  const form = document.createElement('form');
  form.setAttribute('novalidate', '');

  const fields = await Promise.all(json.data.map((fd) => createField(fd, form)));
  fields.forEach((field) => {
    if (field) {
      if (field.dataset.type === 'submit') {
        form.dataset.action = field.dataset.action;
      }
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

  loadChoices(form, decorateContactUsForm, form, formData, block);
  applyRichTextFormat(form, ['label', 'p']);
  addListnersForDefaultHideFields(form);
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
      } else if (field.value) {
        payload[field.name] = field.value;
      }
      if (field.submitName && payload[field.name]) {
        payload[field.submitName] = payload[field.name];
        payload[field.name] = '';
      }
    }
  });

  payload.Form_ID__c = formId;
  payload.Form_Type__c = formName;
  payload.Page_URL__c = window.location.href;
  return payload;
}

function updatePostSubmitUi(form, block) {
  const submitValue = form.querySelector('.field-wrapper:has(button[type="submit"])')?.dataset.submitMessage;
  if (submitValue) {
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach((input) => {
      if (input.type === 'radio') {
        input.checked = false;
      } else {
        input.value = '';
      }
    });
    const submitDiv = block.querySelector('.post-submit');
    submitDiv.classList.remove('hide');
    setTimeout(() => {
      submitDiv.classList.add('hide');
    }, 5000);
  } else {
    form.style.display = 'none';
    if (form.classList.contains('logged-in')) {
      const submitLoggedIn = block.querySelector('.post-submit.logged-in');
      submitLoggedIn.classList.remove('hide');
    } else {
      const submitLoggedOut = block.querySelector('.post-submit.logged-out');
      submitLoggedOut.classList.remove('hide');
    }
  }
}

function hasRecaptchaIntegration(block) {
  return block.querySelector('.recaptcha-disclaimer') !== null;
}

async function handleSubmit(form, block) {
  if (form.getAttribute('data-submitting') === 'true') return;

  const submit = form.querySelector('button[type="submit"]');
  try {
    form.setAttribute('data-submitting', 'true');
    submit.disabled = true;
    if (form.classList.contains('contact-us')) {
      form.style.display = 'none';
      block.querySelector('.recaptcha-disclaimer').style.display = 'none';
      document.body.classList.add('loading');
    }

    const sitekey = block.querySelector('.recaptcha-disclaimer')?.dataset.sitekey;
    if (!sitekey) {
      throw new Error('No reCAPTCHA site key found');
    }

    const formName = block.getAttribute('form-name');
    const formId = block.getAttribute('form-id');
    const payload = generatePayload(form, formId, formName);
    let config = {};
    if (hasRecaptchaIntegration(block)) {
      config = {
        recaptcha: true,
        siteKey: sitekey,
        formId,
        formName,
      };
    }
    const response = await postForm(form, {
      config,
      payload,
    });

    if (response.success) {
      if (form.dataset.confirmation) {
        window.location.href = form.dataset.confirmation;
      }
      updatePostSubmitUi(form, block);
    } else {
      throw new Error(response.error?.message);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Form submission error:', e);
  } finally {
    form.setAttribute('data-submitting', 'false');
    submit.disabled = false;
    document.body.classList.remove('loading');
  }
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
    const key = row.querySelector('div:first-child')
      ?.textContent?.trim()?.toLowerCase()
      .replaceAll(' ', '_');
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

async function decoratePostSubmitUi(formData, block) {
  const submitWrapper = block.querySelector('.field-wrapper:has(button[type="submit"])');
  const submitMessage = submitWrapper?.dataset.submitMessage;
  if (submitMessage) {
    const customStyles = Array.from(submitWrapper.classList).filter((style) => style.startsWith('custom-'));
    const submitMsgDiv = createElement('div', { class: ['post-submit', 'hide', ...customStyles].join(' ') });
    submitMsgDiv.innerHTML = submitMessage;
    block.append(submitMsgDiv);
  } else {
    const submitLoggedIn = createElement('div', { class: 'post-submit logged-in hide' });
    const submitLoggedOut = createElement('div', { class: 'post-submit logged-out hide' });
    const loggedInFragment = await loadFragment(formData.submit_logged_in);
    const loggedOutFragment = await loadFragment(formData.submit_logged_out);
    submitLoggedIn.innerHTML = loggedInFragment.innerHTML;
    submitLoggedOut.innerHTML = loggedOutFragment.innerHTML;
    block.append(submitLoggedIn, submitLoggedOut);
  }
}

export default async function decorate(block) {
  const formData = getFormData(block);
  const formLink = formData.source;

  if (!formLink) {
    // eslint-disable-next-line no-console
    console.error('No form link found');
    return;
  }

  const form = await createForm(formData, block);
  block.replaceChildren(form);
  decorateRecaptchaDisclaimer(block);
  await decoratePostSubmitUi(formData, block);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.classList.add('attempted-submit');

    const visibleFields = [...form.elements].filter((field) => {
      const wrapper = field.closest('.field-wrapper');
      if (!wrapper) return false;
      const computedStyle = window.getComputedStyle(wrapper);
      return computedStyle.display !== 'none' && !wrapper.classList.contains('hide');
    });
    const valid = visibleFields.every((field) => field.checkValidity());

    if (valid) {
      handleSubmit(form, block);
    } else {
      // Show custom error messages only for visible fields
      const invalidFields = form.querySelectorAll(':invalid');
      invalidFields.forEach((field) => {
        const wrapper = field.closest('.field-wrapper:not(.hide)');
        if (!wrapper.querySelector('.error-message')) {
          const errorMsg = document.createElement('div');
          errorMsg.className = 'error-message';
          errorMsg.textContent = field.validationMessage || 'This field is required';
          wrapper.appendChild(errorMsg);
        }
      });

      const firstInvalidEl = [...invalidFields].find((field) => {
        const wrapper = field.closest('.field-wrapper');
        if (!wrapper) return false;
        const computedStyle = window.getComputedStyle(wrapper);
        return computedStyle.display !== 'none' && !wrapper.classList.contains('hide');
      });
      if (firstInvalidEl) {
        firstInvalidEl.focus();
        firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });
}

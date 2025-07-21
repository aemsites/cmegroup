import createField from './form-fields.js';
import { createElement, toStartCase } from '../../scripts/utils.js';
import { loadFragment } from '../fragment/fragment.js';
import { getUserInfo, postForm } from '../../scripts/api.js';
import { authentication } from '../../scripts/modules/Authentication.js';
import { URIUtil } from '../../scripts/utils/index.js';

const uriUtil = new URIUtil('', URIUtil.ARRAY_COMMA_ENCODE);

function getUrlPath(url) {
  try {
    const { pathname, searchParams } = new URL(url);
    const queryParams = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return pathname + queryParams;
  } catch (error) {
    return url || '/';
  }
}

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

async function loadChoices(form) {
  if (!window.Choices) {
    const script = createElement('script');
    script.src = '/aemedge/blocks/form/external/choices-js/choices.min.js';
    script.async = true;
    script.onload = async () => {
      form.querySelectorAll('select').forEach((select) => createChoicesInstance(select));
    };
    document.head.appendChild(script);
  } else {
    form.querySelectorAll('select').forEach((select) => createChoicesInstance(select));
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

async function createLoggedInFields(form, formData) {
  const sheetData = await fetchForm(`${formData.source}?sheet=logged-in`);
  const fields = await Promise.all(sheetData.data.map(async (field) => {
    const fieldElement = await createField(field, form);
    fieldElement.classList.add('logged-in');
    if (fieldElement.dataset?.type === 'submit') {
      form.dataset.action = fieldElement.dataset.action;
    }
    return fieldElement;
  }));
  if (fields.length > 0) {
    form.prepend(...fields);
    applyRichTextFormat(form, ['label', 'p']);
  }
  return fields;
}

function updateFieldsAfterSubmit(form, block) {
  const formFields = form.querySelectorAll('.field-wrapper');
  const blockFields = block?.children || [];
  [...formFields, ...blockFields].forEach((field) => {
    const { showAfterSubmit } = field.dataset;
    if (showAfterSubmit) {
      field.classList.toggle('hide', showAfterSubmit !== 'true');
    }
  });
}

function buildOneClickFormCookie(block, element) {
  const { isLoggedIn } = authentication.authenticationData;
  if (isLoggedIn) {
    return;
  }
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 30);
  window.CookieUtil?.set(
    'oneClickFormCookie',
    {
      location: element.href,
      formId: block.getAttribute('form-id'),
    },
    {
      expires,
    },
  );
  //  noActivationPrompt used in registration url
  element.setAttribute('data-no-activation-prompt', 'true');
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
  const loggedIn = formData.mock === 'LoggedIn';
  if (loggedIn) {
    const userInfo = await getUserInfo();
    form.classList.remove('user-info');
    form.classList.add('collapsed-user-info');

    const fields = await createLoggedInFields(form, formData);
    if (fields.length > 0) {
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

async function decorateOneClickForm(form, formData, block) {
  if (!block.classList.contains('one-click')) return;

  const subscriptionsData = await fetchForm(`${formData.source}?sheet=subscriptions`);
  const subscriptions = await Promise.all(subscriptionsData.data.map(async (field) => field));
  form.dataset.subscriptions = JSON.stringify(subscriptions);
  let subscribed = false;

  const { isLoggedIn } = authentication.authenticationData;
  if (isLoggedIn) {
    form.classList.add('logged-in');
    await createLoggedInFields(form, formData);
    const userInfo = window.LocalStorageUtil?.get('userInfo', true);
    subscribed = subscriptions.every(
      (subs) => userInfo[subs.Name] === (subs.Value === 'true'),
    );
    if (subscribed) {
      const subscribedMsg = form.querySelector('#form-subscribedmessage');
      subscribedMsg?.parentElement?.classList.toggle('hide', false);
      updateFieldsAfterSubmit(form, block);
    }
  } else {
    form.classList.add('logged-out');
    const register = form.querySelector('#form-register');
    register?.addEventListener('click', async (event) => {
      buildOneClickFormCookie(block, event.target);
      authentication.registration();
    });
    const login = form.querySelector('#form-login');
    login?.addEventListener('click', async (event) => {
      buildOneClickFormCookie(block, event.target);
      authentication.login();
    });
  }
}

function decodeHtmlEntities(text) {
  const textarea = createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

function addListenersForDefaultHideFields(form) {
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
  const form = createElement('form', { novalidate: '' });

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

  await loadChoices(form);
  await decorateContactUsForm(form, formData, block);
  await decorateOneClickForm(form, formData, block);
  applyRichTextFormat(form, ['label', 'p']);
  addListenersForDefaultHideFields(form);
  return form;
}

function generatePayload(form, formId, formName, formHighValue) {
  let payload = {};

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
  payload.Auto_Create_MQL__c = formHighValue ? 'Web - Hand Raise' : null;

  if (form.dataset.subscriptions) {
    const fieldsToUpdate = JSON.parse(form.dataset.subscriptions)
      .map(({ Name, Value }) => `${Name}=${Value}`)
      .join('&');
    payload.Fields_to_Update__c = fieldsToUpdate;
  }

  let userData = [];
  const { isLoggedIn } = authentication.authenticationData;
  if (isLoggedIn) {
    //  required user form fields
    const userInfo = window.LocalStorageUtil?.get('userInfo', true);
    userData = {
      Email__c: payload.Email__c || userInfo.Email,
      First_Name__c: payload.First_Name__c || userInfo.FirstName,
      Last_Name__c: payload.Last_Name__c || userInfo.FirstName,
      Country_Code__c: payload.Country_Code__c || userInfo.Country_Code__c,
      Job_Role__c: payload.Job_Role__c || userInfo.Job_Role__c,
      Company_Name__c: payload.Company_Name__c || userInfo.Company,
      Company_Type__c: payload.Company_Type__c || userInfo.Segment__c,
      Phone_Number__c: payload.Phone_Number__c || userInfo.Phone,
    };
    payload = { ...payload, ...userData };
  }
  if (!payload.Company_Name__c) {
    payload.Company_Name__c = 'Unknown';
  }
  if (!payload.Email__c && uriUtil.hasQuery('email')) {
    //  one-click SSO flow (registration with no activation prompt),
    //  the email is appended in url when returns to the page
    payload.Email__c = uriUtil.getQuery('email', '');
  }
  return payload;
}

function updatePostSubmitUi(form, block) {
  const submitValue = form.querySelector('.field-wrapper:has(button[type="submit"])')?.dataset.submitMessage;
  if (submitValue) {
    //  show temporally submit message
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
    const submitLoggedIn = block.querySelector('.post-submit.logged-in');
    const submitLoggedOut = block.querySelector('.post-submit.logged-out');
    if (submitLoggedIn && submitLoggedOut) {
      //  hides the form and show fragments for logged-in/out status
      form.style.display = 'none';
      if (form.classList.contains('logged-in')) {
        submitLoggedIn.classList.remove('hide');
      } else {
        submitLoggedOut.classList.remove('hide');
      }
    } else {
      updateFieldsAfterSubmit(form, block);
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
    const formHighValue = block.getAttribute('form-high-value') === 'true';
    const payload = generatePayload(form, formId, formName, formHighValue);
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
    p.dataset.showAfterSubmit = disclaimer.dataset.showAfterSubmit;
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

  const formName = block.classList[block.classList.length > 1 ? 1 : 0];
  block.setAttribute('form-name', toStartCase(formName));

  const formHighValue = formData.high_value;
  block.setAttribute('form-high-value', formHighValue);

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
    if (formData.submit_logged_in) {
      const submitLoggedIn = createElement('div', { class: 'post-submit logged-in hide' });
      const loggedInFragment = await loadFragment(getUrlPath(formData.submit_logged_in));
      submitLoggedIn.innerHTML = loggedInFragment.innerHTML;
      block.append(submitLoggedIn);
    }
    if (formData.submit_logged_out) {
      const submitLoggedOut = createElement('div', { class: 'post-submit logged-out hide' });
      const loggedOutFragment = await loadFragment(getUrlPath(formData.submit_logged_out));
      submitLoggedOut.innerHTML = loggedOutFragment.innerHTML;
      block.append(submitLoggedOut);
    }
  }
}

async function checkOneClickFormCookie(form, block) {
  //  auto submit if cookie is present for this form (login/registration flow)
  const formId = block.getAttribute('form-id');
  const oneClickCookie = window.CookieUtil?.get('oneClickFormCookie', true);
  if (formId.toString() === oneClickCookie?.formId) {
    await handleSubmit(form, block);
    window.CookieUtil?.remove('oneClickFormCookie');
  }
}

async function decorateForm(formData, block) {
  const form = await createForm(formData, block);
  block.replaceChildren(form);
  decorateRecaptchaDisclaimer(block);
  await decoratePostSubmitUi(formData, block);
  await checkOneClickFormCookie(form, block);

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
          const errorMsg = createElement('div', { class: 'error-message' });
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

export default async function decorate(block) {
  const formData = getFormData(block);
  const formLink = formData.source;

  if (!formLink) {
    // eslint-disable-next-line no-console
    console.error('No form link found');
    return;
  }

  const { authenticationData } = authentication;
  authenticationData.loginPromise.then(async () => {
    decorateForm(formData, block);
  });
}

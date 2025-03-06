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
    script.src = '/blocks/form/external/choices-js/choices.min.js';
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

function handleOtherFieldVisibility(form, selectField, otherFieldName) {
  const otherFieldWrapper = form.querySelector(`.field-wrapper:has([name="${otherFieldName}"])`);
  if (otherFieldWrapper) {
    const { choicesInstance } = selectField;
    const selectedValue = choicesInstance ? choicesInstance.getValue(true) : selectField.value;
    const isOthersSelected = selectedValue?.toLowerCase() === 'other';

    otherFieldWrapper.classList.toggle('hide', !isOthersSelected);
    const otherField = otherFieldWrapper.querySelector(`[name="${otherFieldName}"]`);
    otherField.required = isOthersSelected;
  }
}

function handleContactUsFormOtherFields(form) {
  const jobRoleSelect = form.querySelector('[name="Job_Role__c"]');
  const companyTypeSelect = form.querySelector('[name="Company_Type__c"]');

  if (jobRoleSelect) {
    jobRoleSelect.choicesInstance.passedElement.element.addEventListener('change', () => {
      handleOtherFieldVisibility(form, jobRoleSelect, 'Other_Job_Role__c');
    });
  }

  if (companyTypeSelect) {
    companyTypeSelect.choicesInstance.passedElement.element.addEventListener('change', () => {
      handleOtherFieldVisibility(form, companyTypeSelect, 'Other_Company_Type__c');
    });
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

function addCollapsedUserInfo(userEmail, form) {
  const savedBusinessEmail = createElement('div', { class: 'saved-business-email' });
  savedBusinessEmail.innerHTML = `
    <span>Business Email: </span>
    <span class='email-address'>${userEmail}</span>
    `;
  const editAccountInformation = createElement('div', { class: 'edit-account-information' });
  editAccountInformation.innerHTML = '<a>Edit Account Information</a>';
  form.prepend(editAccountInformation);
  form.prepend(savedBusinessEmail);
  return editAccountInformation;
}

function populateUserInfoInContactUsForm(form, userInfo) {
  Object.entries(userInfo).forEach(([key, value]) => {
    const field = form.querySelector(`[name="${key}"]`);
    if (field) {
      setFieldValue(field, value);
    }
  });
}

async function decorateContactUsLoggedInForm(form, formData, block) {
  const isContactUsVariant = block.classList.contains('contact-us');
  if (!isContactUsVariant || formData.mock !== 'LoggedIn') return;

  form.classList.remove('user-info');
  form.classList.add('collapsed-user-info');
  const userInfo = await getUserInfo();
  const editAccountInformation = addCollapsedUserInfo(userInfo.Email__c, form);

  editAccountInformation.addEventListener('click', (e) => {
    e.preventDefault();
    form.classList.remove('collapsed-user-info');
    form.classList.add('user-info');
  });

  populateUserInfoInContactUsForm(form, userInfo);
}

async function decorateContactUsForm(form, formData, block) {
  const isContactUsVariant = block.classList.contains('contact-us');
  if (!isContactUsVariant) return;

  form.classList.add('user-info');
  handleContactUsFormOtherFields(form);
  await decorateContactUsLoggedInForm(form, formData, block);
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

function decorateFeedbackSmileys(form, block) {
  const isFeedbackVariant = block.classList.contains('feedback');
  if (!isFeedbackVariant) return;

  const smileyContainer = createElement('div', { class: 'smiley-container' });
  const emailWrapper = form.querySelector('.email-wrapper');
  emailWrapper.after(smileyContainer);
  const smileys = form.querySelectorAll('.feedback-smiley-wrapper');
  smileys.forEach((smiley) => {
    smileyContainer.append(smiley);
  });
}

async function createForm(formData, block) {
  const formHref = formData.source;
  const { pathname } = new URL(formHref);
  const resp = await fetch(pathname);
  const json = await resp.json();

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

  decorateLabels(form);
  decorateFeedbackSmileys(form, block);
  loadChoices(form, decorateContactUsForm, form, formData, block);
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
    }
  });

  payload.Form_ID__c = formId;
  payload.Form_Type__c = formName;
  payload.Page_URL__c = window.location.href;
  return payload;
}

function updatePostSubmitUi(form, block) {
  // const submitLoggedIn = block.querySelector('.post-submit.logged-in');
  // submitLoggedIn.classList.remove('hide');
  form.style.display = 'none';
  const submitLoggedOut = block.querySelector('.post-submit.logged-out');
  submitLoggedOut.classList.remove('hide');
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
    form.style.display = 'none';
    block.querySelector('.recaptcha-disclaimer').style.display = 'none';
    document.body.classList.add('loading');

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
  const submitLoggedIn = createElement('div', { class: 'post-submit logged-in hide' });
  const submitLoggedOut = createElement('div', { class: 'post-submit logged-out hide' });
  const loggedInFragment = await loadFragment(formData.submit_logged_in);
  const loggedOutFragment = await loadFragment(formData.submit_logged_out);
  submitLoggedIn.append(loggedInFragment.querySelector('main'));
  submitLoggedOut.append(loggedOutFragment.querySelector('main'));
  block.append(submitLoggedIn, submitLoggedOut);
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

      // Scroll to first visible invalid field
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

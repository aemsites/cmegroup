import createField from './form-fields.js';

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

  return form;
}

function generatePayload(form) {
  const payload = {};

  [...form.elements].forEach((field) => {
    if (field.name && field.type !== 'submit' && !field.disabled) {
      if (field.type === 'radio') {
        if (field.checked) payload[field.name] = field.value;
      } else if (field.type === 'checkbox') {
        if (field.checked) payload[field.name] = payload[field.name] ? `${payload[field.name]},${field.value}` : field.value;
      } else {
        payload[field.name] = field.value;
      }
    }
  });
  return payload;
}

async function executeRecaptcha() {
  try {
    // Replace YOUR_SITE_KEY with your actual reCAPTCHA site key
    const token = await window.grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit' });
    return token;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('reCAPTCHA execution failed:', error);
    return null;
  }
}

async function handleSubmit(form) {
  if (form.getAttribute('data-submitting') === 'true') return;

  const submit = form.querySelector('button[type="submit"]');
  try {
    form.setAttribute('data-submitting', 'true');
    submit.disabled = true;

    // Get reCAPTCHA token
    const recaptchaToken = await executeRecaptcha();
    if (!recaptchaToken) {
      throw new Error('Failed to execute reCAPTCHA');
    }

    // create payload
    const payload = generatePayload(form);
    // Add reCAPTCHA token to payload
    payload.recaptchaToken = recaptchaToken;

    const response = await fetch(form.dataset.action, {
      method: 'POST',
      body: JSON.stringify({ data: payload }),
      headers: {
        'Content-Type': 'application/json',
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

export default async function decorate(block) {
  const links = [...block.querySelectorAll(':scope > div:first-child a')].map((a) => a.href);
  const formLink = links.find((link) => link.startsWith(window.location.origin) && link.endsWith('.json'));
  const submitLink = links.find((link) => link !== formLink);
  if (!formLink || !submitLink) return;

  const form = await createForm(formLink, submitLink);
  decorateLabels(form);
  block.replaceChildren(form);

  // Add reCAPTCHA disclaimer
  const disclaimer = document.createElement('p');
  disclaimer.classList.add('recaptcha-disclaimer');
  disclaimer.innerHTML = `This site is protected by reCAPTCHA and the Google 
    <a href="https://policies.google.com/privacy" target="_blank">Privacy Policy</a> and 
    <a href="https://policies.google.com/terms" target="_blank">Terms of Service</a> apply.`;
  block.appendChild(disclaimer);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const valid = form.checkValidity();
    if (valid) {
      handleSubmit(form);
    } else {
      const firstInvalidEl = form.querySelector(':invalid:not(fieldset)');
      if (firstInvalidEl) {
        firstInvalidEl.focus();
        firstInvalidEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
}

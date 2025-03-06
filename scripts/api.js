import GoogleReCaptcha from './recaptcha.js';

function validatePostFormOptions(form, options) {
  if (!form) {
    throw new Error('Form element is required');
  }

  if (!form.dataset.action) {
    throw new Error('Form action URL is missing');
  }

  if (!options.payload) {
    throw new Error('Form payload is required');
  }

  if (options.config?.recaptcha && !options.config.siteKey) {
    throw new Error('Recaptcha site key is required');
  }
}

async function getRecaptchaToken(form, { config }) {
  const { siteKey, formId, formName } = config;
  const recaptcha = new GoogleReCaptcha({
    config: {
      siteKey,
      version: 'v3',
    },
    id: formId,
    name: formName,
  });

  await recaptcha.loadCaptcha(form);
  return recaptcha.getToken();
}

async function getUserInfo() {
  return new Promise((resolve) => {
    resolve({
      First_Name__c: 'John',
      Last_Name__c: 'Doe',
      Email__c: 'john.doe@example.com',
      Country_Code__c: 'US',
      Job_Role__c: 'Technology',
      Company_Type__c: 'FinTech',
      Company_Name__c: 'Example Inc',
      Message__c: 'This is a test message',
      Privacy_Policy__c: true,
      Terms_of_Service__c: true,
      Receive_Communications__c: true,
    });
  });
}

async function fetchWithErrorHandling(url, method, options) {
  const { headers, body, payload } = options;
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body || JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
      try {
        data = JSON.parse(data);
      } catch {
        // Empty catch is intentional - non-JSON responses are handled below
      }
    }

    const transformResponse = {
      ok: response.ok,
      success: response.ok && response.status >= 200 && response.status < 300,
      status: response.status,
    };

    if (transformResponse.success) {
      transformResponse.data = data;
    } else if (data) {
      transformResponse.error = typeof data === 'string' ? { message: data } : data;
    } else {
      transformResponse.error = response.error || {};
    }

    if (transformResponse.error && !transformResponse.error.message) {
      const { title, description } = transformResponse.error;
      let errorMessage = title;
      if (description) errorMessage += ` - ${description}`;
      transformResponse.error.message = errorMessage
        || 'An error occurred while submitting the form. Please try again.';
    }

    if (!transformResponse.success) {
      // eslint-disable-next-line no-console
      console.error(`Error fetching data from ${url} - ${transformResponse.error}`);
    }

    return transformResponse;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error sending request to ${url} - ${error}`);
    return {
      ok: false,
      success: false,
      status: 500,
      error,
    };
  }
}

async function postFeedback(form, options = {}) {
  const { config, payload } = options;
  const url = form.dataset.action;
  options.headers = options.headers || {};
  options.headers['Content-Type'] = 'application/x-www-form-urlencoded';

  const urlSearchParams = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    urlSearchParams.append(key, value);
  });

  if (config?.recaptcha) {
    const recaptchaToken = await getRecaptchaToken(form, options);
    urlSearchParams.append('g-recaptcha-response', recaptchaToken);
  }

  const otherParams = {
    cmeFeedbackURL: window.location.href,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    flashVersion: 'No Flash',
  };

  Object.entries(otherParams).forEach(([key, value]) => {
    urlSearchParams.append(key, value);
  });

  options.body = urlSearchParams.toString();
  return fetchWithErrorHandling(url, 'POST', options);
}

async function postForm(form, options = {}) {
  try {
    validatePostFormOptions(form, options);
    const url = form.dataset.action;
    const path = new URL(url).pathname;

    if (path === '/CmeWS/mvc/Feedback/Submit/V3') {
      return postFeedback(form, options);
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (options.config?.recaptcha) {
      const recaptchaToken = await getRecaptchaToken(form, options);
      headers['G-Recaptcha-Response'] = recaptchaToken;
    }

    options.headers = headers;
    return fetchWithErrorHandling(url, 'POST', options);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Form submission failed:', error);
    return {
      ok: false,
      success: false,
      status: 500,
      error,
    };
  }
}

export {
  getUserInfo,
  postForm,
  fetchWithErrorHandling,
};

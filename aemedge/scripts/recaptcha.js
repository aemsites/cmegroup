/* eslint-disable */
export default class GoogleReCaptcha {
  id;

  name;

  config;

  formName;

  grecaptcha;

  constructor({ config, id, name, formName }) {
    this.config = config;
    this.name = name;
    this.id = id;
    this.formName = formName;
  }

  #loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => resolve(window.grecaptcha);
      script.onerror = () => reject(new Error(`Failed to load script ${url}`));
      document.head.append(script);
    });
  }

  async loadCaptcha(form) {
    if (!form || !this.config.siteKey) {
      throw new Error('Captcha configuration missing');
    }

    const submit = form.querySelector('button[type="submit"]');
    if (!submit) {
      throw new Error('Submit button is missing');
    }

    const { siteKey } = this.config;
    const url = this.config.version === 'enterprise' 
      ? `${this.config.uri}?render=${siteKey}`
      : `https://www.google.com/recaptcha/api.js?render=${siteKey}`;

    await this.#loadScript(url);
    
    // Wait for grecaptcha to be ready
    return new Promise((resolve) => {
      window.grecaptcha.ready(() => {
        this.grecaptcha = window.grecaptcha;
        resolve(this.grecaptcha);
      });
    });
  }

  async getToken() {
    if (!this.grecaptcha) {
      throw new Error('ReCAPTCHA not initialized');
    }

    if (this.config.version === 'enterprise') {
      const submitAction = `submit_${this.formName}_${this.name}`;
      return this.grecaptcha.enterprise.execute(this.config.siteKey, { action: submitAction });
    }

    return this.grecaptcha.execute(this.config.siteKey, { action: 'submit' });
  }
}
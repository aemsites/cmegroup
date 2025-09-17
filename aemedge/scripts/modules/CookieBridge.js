export class CookieBridge {
  static BRIDGE_ACTIONS = {
    TRANSFER: 'transfer',
    DELETE: 'delete',
  };

  constructor(targetDomain) {
    this.targetDomain = targetDomain;
    this.iframe = null;
    this.messageHandlers = new Map();
    this.isReady = false;
  }

  createIframe() {
    return new Promise((resolve, reject) => {
      if (this.iframe) {
        this.iframe.remove();
      }

      this.iframe = document.createElement('iframe');
      this.iframe.src = `${this.targetDomain}/cookie-bridge.html`;

      this.iframe.onload = () => {
        this.isReady = true;
        this.setupMessageListener();
        resolve();
      };

      this.iframe.onerror = () => {
        reject(new Error(`Failed to load iframe from ${this.targetDomain}`));
      };

      document.body.appendChild(this.iframe);

      setTimeout(() => {
        if (!this.isReady) {
          reject(new Error('Iframe load timeout'));
        }
      }, 1e4);
    });
  }

  setupMessageListener() {
    window.addEventListener('message', (event) => {
      if (event.origin !== this.targetDomain) {
        return;
      }

      if (event.data.requestId) {
        const handler = this.messageHandlers.get(event.data.requestId);
        if (handler) {
          this.messageHandlers.delete(event.data.requestId);
          if (event.data.error) {
            handler.reject(new Error(event.data.error));
          } else {
            handler.resolve(event.data.result);
          }
        }
      }
    });
  }

  async sendMessage(action, data) {
    return new Promise((resolve, reject) => {
      if (!this.isReady) {
        reject(new Error('Iframe not ready'));
        return;
      }

      const requestId = Date.now() + Math.random();
      const message = {
        namespace: 'cookieBridge',
        requestId,
        action,
        data,
      };

      this.messageHandlers.set(requestId, { resolve, reject });

      try {
        this.iframe.contentWindow.postMessage(message, {
          targetOrigin: this.targetDomain,
        });
      } catch (error) {
        this.messageHandlers.delete(requestId);
        reject(error);
      }

      setTimeout(() => {
        if (this.messageHandlers.has(requestId)) {
          this.messageHandlers.delete(requestId);
          reject(new Error('Message timeout'));
        }
      }, 2e4);
    });
  }

  destroy() {
    try {
      if (this.iframe) {
        this.iframe.remove();
        this.iframe = null;
      }
      this.messageHandlers.clear();
      this.isReady = false;
      return true;
    } catch (e) {
      return false;
    }
  }
}

async function createAndExecuteBridge(hostname, action, data) {
  const bridge = new CookieBridge(hostname);

  try {
    // eslint-disable-next-line no-console
    console.log('Creating iframe bridge...');
    await bridge.createIframe();

    // eslint-disable-next-line no-console
    console.log('Executing action on cookies...');
    await bridge.sendMessage(action, data);

    // eslint-disable-next-line no-console
    console.log('Destroying bridge...');
    return bridge.destroy();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Bridge initialization failed:', error);
    return false;
  }
}

function validateCookiesData(cookiesData) {
  if (!Object.keys(cookiesData).length) {
    throw new Error('No cookies data set');
  }
}

function validateCookiesArray(cookiesNames) {
  if (!(Array.isArray(cookiesNames) && cookiesNames.length)) {
    throw new Error('No cookies names set');
  }
}

export async function transferCookies(hostname, cookiesData = {}) {
  validateCookiesData(cookiesData);
  await createAndExecuteBridge(hostname, CookieBridge.BRIDGE_ACTIONS.TRANSFER, cookiesData);
}

export async function deleteCookies(hostname, cookiesNames = []) {
  validateCookiesArray(cookiesNames);
  await createAndExecuteBridge(hostname, CookieBridge.BRIDGE_ACTIONS.DELETE, cookiesNames);
}

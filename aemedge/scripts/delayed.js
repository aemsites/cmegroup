import { sampleRUM, loadScript } from './aem.js';
import { getEnvType } from './utils.js';
import { BlockableUtils } from './blockable-utils/blockable-utils.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

function loadShareThis() {
  loadScript('https://platform-api.sharethis.com/js/sharethis.js#property=644646a57ac381001a304496&product=sticky-share-buttons&source=platform');
}

async function loadOneTrust() {
  if (getEnvType() !== 'prod') {
    return Promise.resolve();
  }

  const ONETRUST_CONFIG = {
    stubScript: {
      url: 'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js',
      options: {
        type: 'text/javascript',
        charset: 'UTF-8',
      },
    },
    mainScript: {
      url: 'https://cdn.cookielaw.org/consent/f42915b0-68e5-491a-a7f7-1db0d962ddff/OtAutoBlock.js',
      options: {
        type: 'text/javascript',
        charset: 'UTF-8',
        'data-domain-script': 'f42915b0-68e5-491a-a7f7-1db0d962ddff',
      },
    },
  };

  try {
    await loadScript(ONETRUST_CONFIG.stubScript.url, ONETRUST_CONFIG.stubScript.options);
    await loadScript(ONETRUST_CONFIG.mainScript.url, ONETRUST_CONFIG.mainScript.options);
    if (!window.OneTrust) {
      throw new Error('OneTrust failed to initialize');
    }
    return Promise.resolve();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('OneTrust loading failed:', error);
    return Promise.resolve();
  }
}

function loadPage() {
  BlockableUtils.init();
  loadShareThis();
  loadOneTrust();
}

loadPage();

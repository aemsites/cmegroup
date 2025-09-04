import { sampleRUM, getMetadata } from './aem.js';
import loadSitewidePopups from './popups/popups.js';
import { isFeatureToggled, loadScript } from './utils.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

function loadShareThis() {
  loadScript('https://platform-api.sharethis.com/js/sharethis.js#property=644646a57ac381001a304496&product=sticky-share-buttons&source=platform');
}

async function loadOneTrust() {
  const ONETRUST_CONFIG = {
    stubScript: {
      url: 'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js',
      options: {
        type: 'text/javascript',
        charset: 'UTF-8',
        'data-domain-script': 'f42915b0-68e5-491a-a7f7-1db0d962ddff',
      },
    },
  };

  try {
    await loadScript(ONETRUST_CONFIG.stubScript.url, ONETRUST_CONFIG.stubScript.options);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('OneTrust init failed:', error);
  }

  return Promise.resolve();
}

async function showLoginPopup() {
  const visibility = getMetadata('protected');
  if (visibility && visibility === 'true') {
    const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
    openModal('/fragments/login');
  }
}

function loadPage() {
  if (!isFeatureToggled('educationIframe')) {
    loadSitewidePopups();
  }

  if (!isFeatureToggled('hideAddThisExt')) {
    loadShareThis();
  }

  loadOneTrust();
  showLoginPopup();
}

loadPage();

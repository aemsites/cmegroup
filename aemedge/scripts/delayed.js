import { sampleRUM, loadScript } from './aem.js';
import loadSitewidePopups from './popups/popups.js';
import { isFeatureToggled } from './utils.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

function loadShareThis() {
  loadScript('https://platform-api.sharethis.com/js/sharethis.js#property=644646a57ac381001a304496&product=sticky-share-buttons&source=platform');
}

function loadPage() {
  if (!isFeatureToggled('hideEducationIframe')) {
    loadSitewidePopups();
  }

  if (!isFeatureToggled('hideAddThisExt')) {
    loadShareThis();
  }
}

loadPage();

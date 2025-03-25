import { loadScript } from './aem.js';

// add delayed functionality here
function loadShareThis() {
  loadScript('https://platform-api.sharethis.com/js/sharethis.js#property=644646a57ac381001a304496&product=sticky-share-buttons&source=platform');
}

function loadPage() {
  loadShareThis();
}

loadPage();

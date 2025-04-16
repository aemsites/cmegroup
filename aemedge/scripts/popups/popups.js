import { getMetadata } from '../aem.js';
import { getSitewidePopups } from '../legacy-api.js';
import { createElement } from '../utils.js';

const CACHE_KEY = 'popups_cache';
const CACHE_DURATION = 15 * 60 * 1000;
const popupsEndpoint = getSitewidePopups();
let popupsPromise = null;

function closePopup(popupId) {
  const cookie = {
    popupId,
    date: Date.now(),
  };
  const existingCookies = window.CookieUtil?.get('popupsCme', true) || [];
  const allCookies = [...existingCookies, cookie];
  window.CookieUtil?.set('popupsCme', allCookies);
  const popup = document.querySelector('.sitewide-popup');
  popup.remove();
}

function insertPopupIntoDOM(popup) {
  const container = document.querySelector('footer');
  if (!container) return null;

  const popupDiv = createElement('div', { class: 'sitewide-popup' });

  if (popup.location === 'centered') {
    const darknessSection = createElement('section', { class: 'darkness' });
    popupDiv.appendChild(darknessSection);
  }

  const popupSection = createElement('section', {
    class: `popup ${popup.location} ${popup.location !== 'centered' ? 'slide-top' : ''}`,
  });
  if (popup.backgroundType === 'COLOR') {
    popupSection.style.backgroundColor = `${popup.backgroundColor}`;
  }
  if (popup.backgroundType === 'IMAGE') {
    popupSection.style.backgroundImage = `url("${popup.urlBackgroundImage}")`;
    popupSection.style.backgroundRepeat = 'no-repeat';
    popupSection.style.backgroundSize = 'cover';
  }

  const closePopupIcon = createElement('span', {
    class: `${popup.reverse ? 'reverse' : ''} icon-menu-close`,
  });
  closePopupIcon.addEventListener('click', () => {
    closePopup(popup.id);
  });
  const popupContent = createElement('div', { class: 'popup-content' });
  const popupTitle = createElement('span', {
    class: `title ${popup.titleSize} ${popup.reverse ? 'reverse' : ''}`,
  });
  popupTitle.innerHTML = popup.title;
  const popupText = createElement('span', {
    class: `popup-description ${popup.reverse ? 'reverse' : ''}`,
  });
  popupText.innerHTML = popup.description;
  const button = createElement('a', {
    class: `popup-button button ${popup.buttonStyle}`,
    href: `${popup.linkUrl}`,
    target: `${popup.linkTarget}`,
    download: `${popup.linkDownload}`,
    rel: `${popup.linkNoFollow}`,
    type: 'button',
  });
  const buttonText = createElement('span', { class: 'text' });
  buttonText.textContent = popup.buttonText;
  button.addEventListener('click', () => {
    closePopup(popup.id);
  });
  button.appendChild(buttonText);

  popupContent.appendChild(popupTitle);
  popupContent.appendChild(popupText);
  popupContent.appendChild(button);
  popupSection.appendChild(closePopupIcon);
  popupSection.appendChild(popupContent);
  popupDiv.appendChild(popupSection);
  container.prepend(popupDiv);
  return popupDiv;
}

function setOffsetTrustBanner(element) {
  const onetrustBanner = document.querySelector('#onetrust-banner-sdk');
  if (!onetrustBanner) {
    return;
  }
  element.style.bottom = `${onetrustBanner.offsetHeight}px`;
  const handleConsentChange = () => {
    setTimeout(() => {
      if (onetrustBanner && onetrustBanner.style.display === 'none') {
        element.style.bottom = `${onetrustBanner.offsetHeight}px`;
      }
    }, 500);
  };
  window.Optanon?.OnConsentChanged(handleConsentChange);
}
function setOffsetHeight(popupElement) {
  setOffsetTrustBanner(popupElement);
  window.OptanonWrapper = () => {
    setOffsetTrustBanner(popupElement);
  };
}

function showPopup(popup) {
  const popupElement = insertPopupIntoDOM(popup);
  setOffsetHeight(popupElement.firstElementChild);
}

function triggerPopup(popup) {
  if (!popup) {
    return;
  }
  switch (popup.trigger) {
    case 'delay': {
      let delayTimeout;
      clearTimeout(delayTimeout);
      setTimeout(() => {
        showPopup(popup);
      }, popup.delay * 1000);
      break;
    }
    case 'scroll': {
      let scrollTimeout;
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const height = document.documentElement?.scrollHeight || 0;
          const scrolled = document.documentElement?.scrollTop || 0;
          const currentScroll = Math.round((scrolled * 100) / (height - 1000));
          if (currentScroll >= popup.scroll) {
            showPopup(popup);
          }
        }, 100);
      });
      break;
    }
    case 'immediately':
      showPopup(popup);
      break;
    default:
  }
}

function checkCookieYearPassed(allCookies, popupId) {
  const now = new Date();
  const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  let result = true;
  // eslint-disable-next-line no-restricted-syntax
  for (const cookie of allCookies) {
    if (cookie.popupId === popupId) {
      result = yearAgo.getTime() - cookie.date > 0;
    }
  }
  return result;
}

function filterPopups(popups, personalizedPopup) {
  const currentPath = window.location.pathname;

  let filtered = popups.filter((popup) => {
    if (!popup.enabled) return false;
    if (popup.scope) {
      const cleanedScope = popup.scope.split(',').map((scope) => {
        let cleaned = scope.replace('/content/cmegroup/en', '');
        [cleaned] = cleaned.split('\\?');
        return cleaned || '/';
      });
      if (!cleanedScope.some((scope) => currentPath.startsWith(scope))) return false;
    }
    if (popup.excludedPages) {
      const cleanedExcludedPages = popup.excludedPages.split(',').map((excluded) => excluded.replace('/content/cmegroup/en', ''));
      if (cleanedExcludedPages.some((excluded) => currentPath.startsWith(excluded))) {
        return false;
      }
    }
    if (popup.templates) {
      if (!popup.templates.split(',').includes(getMetadata('template'))) {
        return false;
      }
    }
    return true;
  });

  if (personalizedPopup) {
    filtered = [filtered.find((popup) => popup.id === personalizedPopup)];
  } else {
    filtered = filtered.filter((popup) => !popup.personalized);
  }
  const cookies = window.CookieUtil?.get('popupsCme', true);
  if (cookies) {
    filtered = filtered.filter((popup) => checkCookieYearPassed(cookies, popup.id));
  }
  return filtered;
}

async function fetchPopups() {
  try {
    const response = await fetch(popupsEndpoint);
    if (!response.ok) {
      throw new Error(`fail to load popups: ${response.statusText}`);
    }
    const { results: data } = await response.json();
    return data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('fail to load popups:', error);
    throw error;
  }
}

function loadPopups(personalizedPopup) {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed.timestamp && parsed.popups && Date.now() - parsed.timestamp < CACHE_DURATION) {
      return Promise.resolve(filterPopups(parsed.popups, personalizedPopup));
    }
  }
  if (!popupsPromise) {
    popupsPromise = new Promise((resolve, reject) => {
      fetchPopups()
        .then((data) => {
          const popups = data.map((p) => p.content).filter((popup) => popup.enabled);
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            popups,
          }));
          resolve(filterPopups(popups, personalizedPopup));
        })
        .catch((error) => {
          reject(error);
        })
        .finally(() => {
          popupsPromise = null;
        });
    });
  }
  return popupsPromise;
}

export default async function loadSitewidePopups() {
  try {
    const popups = await loadPopups();
    if (popups.length) {
      triggerPopup(popups[0]);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('fail to load alerts:', error);
  }
  return Promise.resolve();
}

async function displayPopup(displayPopupId) {
  if (!displayPopupId) {
    return;
  }
  const popups = await loadPopups(displayPopupId);
  if (popups.length) {
    triggerPopup(popups[0]);
  }
}
window.displayPopup = displayPopup;

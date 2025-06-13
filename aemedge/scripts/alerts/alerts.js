/**
 * Alerts
 */

import { getMetadata } from '../aem.js';
import { getBrowserName, formatToCentralTime } from '../utils.js';
import { getLegacyAlerts } from '../legacy-api.js';
import { store } from '../store/store.js';
import { addFloatingElement, updateFloatingElements } from '../actions/floatingElements.js';

const CACHE_KEY = 'alerts_cache';
const CACHE_DURATION = 15 * 60 * 1000;
const alertsEndpoint = getLegacyAlerts();
let alertsPromise = null;

function decodeHTML(html) {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

function insertAlertsIntoDOM(items) {
  const container = document.querySelector('main');

  if (!container) return;

  const alertsContainer = document.createElement('div');
  alertsContainer.id = 'alerts-container';
  alertsContainer.className = 'alerts';

  const classMap = {
    cmeStandardAlertPrimaryMessage: 'standard-primary',
    cmeStandardAlertSecondaryMessage: 'standard-secondary',
    cmeNonSeriousAlertMessage: 'non-serious',
    cmeSeriousAlertMessage: 'serious',
    cmeGCCSeriousAlertMessage: 'gcc-serious',
  };

  items.forEach((item) => {
    const alertDiv = document.createElement('div');
    const newClass = classMap[item.content.style] || 'default-alert';
    alertDiv.className = `alert-item ${newClass}`;

    const textContainer = document.createElement('div');
    textContainer.className = 'container';

    if (newClass === 'gcc-serious') {
      const alertContent = document.createElement('div');

      const alertIcon = document.createElement('div');
      alertIcon.className = 'alert-icon';

      const alertGccContainer = document.createElement('div');
      alertGccContainer.className = 'alert-gcc-container';

      const alertTitle = document.createElement('div');
      alertTitle.className = 'alert-title';
      alertTitle.textContent = item.content.redAlertTitle;

      const alertText = document.createElement('div');
      alertText.className = 'alert-text cmp-text';
      alertText.innerHTML = decodeHTML(item.content.text);

      const alertTime = document.createElement('div');
      alertTime.className = 'alert-time';
      alertTime.textContent = formatToCentralTime(item.content.redAlertDate, false, false);

      alertGccContainer.appendChild(alertTitle);
      alertGccContainer.appendChild(alertText);
      alertGccContainer.appendChild(alertTime);

      alertContent.appendChild(alertIcon);
      alertContent.appendChild(alertGccContainer);

      textContainer.appendChild(alertContent);
    } else {
      const alertText = document.createElement('div');
      alertText.className = 'alert-text cmp-text';
      alertText.innerHTML = decodeHTML(item.content.text);

      textContainer.appendChild(alertText);
    }

    alertDiv.appendChild(textContainer);
    alertsContainer.appendChild(alertDiv);
  });

  container.prepend(alertsContainer);
}

async function fetchAlerts() {
  try {
    const response = await fetch(alertsEndpoint);
    if (!response.ok) {
      throw new Error(`fail to load alerts: ${response.statusText}`);
    }
    const { results: data } = await response.json();
    return data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('fail to load alerts:', error);
    throw error;
  }
}

function filterAlerts(alerts) {
  const currentPath = window.location.pathname;

  return alerts.filter((alert) => {
    const alertContent = alert.content;
    if (alertContent.enabled !== 'true') return false;

    const cleanedScope = alertContent.scope.split(',').map((scope) => {
      if (scope === '/content/cmegroup/en') {
        return '/';
      }
      if (scope.startsWith('/content/cmegroup/en')) {
        return scope.replace('/content/cmegroup/en', '');
      }
      return scope;
    }).filter((scope) => !!scope);

    if (cleanedScope.length
      && !cleanedScope.some((scope) => currentPath.startsWith(scope))) return false;

    const cleanedExcludedPages = alertContent.excludedPages.split(',').map((excluded) => {
      if (excluded.startsWith('/content/cmegroup/en')) {
        return excluded.replace('/content/cmegroup/en', '');
      }
      return excluded;
    }).filter((excluded) => !!excluded);

    if (cleanedExcludedPages.length
        && cleanedExcludedPages.some((excluded) => currentPath.startsWith(excluded))) {
      return false;
    }

    if (alertContent.browsers && !alertContent.browsers.split(',').includes(getBrowserName())) {
      return false;
    }

    if (alertContent.templates && !alertContent.templates.split(',').includes(getMetadata('template'))) {
      return false;
    }

    return true;
  });
}

function loadAlerts() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed.timestamp && parsed.alerts && Date.now() - parsed.timestamp < CACHE_DURATION) {
      return Promise.resolve(filterAlerts(parsed.alerts));
    }
  }

  if (!alertsPromise) {
    alertsPromise = new Promise((resolve, reject) => {
      fetchAlerts()
        .then((data) => {
          const cacheableAlerts = data.filter((alert) => alert.content.enabled);
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            alerts: cacheableAlerts,
          }));
          resolve(filterAlerts(cacheableAlerts));
        })
        .catch((error) => {
          reject(error);
        })
        .finally(() => {
          alertsPromise = null;
        });
    });
  }

  return alertsPromise;
}

export default async function initFloatingElements(doc, header) {
  let alertsFetched = [];
  try {
    alertsFetched = await loadAlerts();
    insertAlertsIntoDOM(alertsFetched);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('fail to load alerts:', error);
  }

  const main = doc.querySelector('main');
  const alerts = doc.querySelectorAll('.alert-item');

  if (alertsFetched.length) {
    const updatePositions = () => {
      const visibleAlertsHeight = Array.from(alerts).reduce(
        (total, alert) => total + (alert.classList.contains('hidden') ? 0 : alert.offsetHeight),
        0,
      );

      const offsetTop = visibleAlertsHeight + header.offsetHeight;

      header.style.top = `${visibleAlertsHeight - 1}px`;
      main.style.paddingTop = `${offsetTop}px`;

      const navMenus = doc.querySelectorAll('.nav-nav-item-menu');
      navMenus.forEach((menu) => {
        if (menu.closest('.nav-nav-item.has-menu.is-open')) {
          menu.style.top = `${offsetTop}px`;
        } else {
          menu.style.top = '-312.5rem';
        }
      });
      const menuOpen = doc.querySelector('.nav-curtain.is-open');
      if (menuOpen) {
        menuOpen.style.top = `${offsetTop}px`;
      }
    };

    const observer = new MutationObserver(updatePositions);
    observer.observe(header, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    window.addEventListener('resize', () => {
      updatePositions();
    });

    updatePositions();
  }

  const resizeObserver = new ResizeObserver(() => {
    store.dispatch(updateFloatingElements());
  });
  resizeObserver.observe(header);
  const mutationObserver = new MutationObserver(() => {
    store.dispatch(updateFloatingElements());
  });
  mutationObserver.observe(header, {
    attributes: true,
  });

  store.dispatch(addFloatingElement(header, (element) => (element.classList.contains('hidden') ? 0 : element.offsetHeight)));
  Array.from(alerts).forEach((elem) => {
    store.dispatch(addFloatingElement(elem));
    resizeObserver.observe(elem);
  });
  store.dispatch(updateFloatingElements());

  return Promise.resolve();
}

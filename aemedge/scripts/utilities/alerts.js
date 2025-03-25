/**
 * Alerts
 */

import { getMetadata } from '../aem.js';
import ffetch from '../ffetch.js';
import getBrowserName from './browser.js';

const alertsEndpoint = '/eds-config/sitewide-alerts.json';
let alertsPromise = null;

function insertAlertsIntoDOM(alerts) {
  const container = document.getElementsByClassName('hero-container')[0];

  const alertsContainer = document.createElement('div');
  alertsContainer.id = 'alerts-container';
  alertsContainer.className = 'alerts';

  alerts.forEach((alert) => {
    const alertDiv = document.createElement('div');
    alertDiv.className = `${alert.style} alert-item`;

    alertDiv.innerHTML = `
      <div class="container">
        <div class="alert-text cmp-text">${alert.text}</div>
      </div>
    `;

    alertsContainer.appendChild(alertDiv);
  });

  container.parentNode.insertBefore(alertsContainer, container);
}

function loadAlerts() {
  if (!alertsPromise) {
    alertsPromise = new Promise((resolve, reject) => {
      (async () => {
        try {
          const currentPath = window.location.pathname;
          const alertsJson = await ffetch(`${alertsEndpoint}`).all();

          const alerts = alertsJson.filter((alert) => {
            if (!alert.enabled) return false;
            if (!alert.scope.split(',').some((scope) => scope.startsWith(currentPath))) return false;
            if (alert.excludedPages.split(',').some((excluded) => excluded.startsWith(currentPath))) return false;
            if (alert.browsers && alert.browsers.length > 0
              && !alert.browsers.split(',').includes(getBrowserName())) {
              return false;
            }
            if (alert.templates && alert.templates.length > 0
              && !alert.templates.split(',').includes(getMetadata('template'))) {
              return false;
            }
            return true;
          });

          resolve(alerts);
        } catch (e) {
          reject(e);
        }
      })();
    });
  }
  return alertsPromise;
}

export default async function initFloatingElements(doc) {
  const alertsFetched = await loadAlerts();
  insertAlertsIntoDOM(alertsFetched);

  let lastScrollTop = 0;
  const header = doc.querySelector('.header');
  const alertsContainer = doc.querySelector('.alerts');
  const alerts = doc.querySelectorAll('.alert-item');

  function updatePositions() {
    const visibleAlertsHeight = Array.from(alerts).reduce(
      (total, alert) => total + (alert.classList.contains('hidden') ? 0 : alert.offsetHeight),
      0,
    );

    header.style.top = `${visibleAlertsHeight}px`;
  }

  const observer = new MutationObserver(updatePositions);
  observer.observe(alertsContainer, {
    attributes: true,
    childList: true,
    subtree: true,
  });

  updatePositions();

  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || doc.documentElement.scrollTop;
    if (scrollTop > lastScrollTop) {
      header.classList.add('hidden');
    } else {
      header.classList.remove('hidden');
    }
    lastScrollTop = scrollTop;
  });

  window.addEventListener('resize', () => {
    updatePositions();
  });

  return null;
}

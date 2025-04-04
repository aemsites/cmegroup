/**
 * Econoday Event
 */
const eventDataEndpoint = '/aemedge/templates/event/mock/event.json'; // TODO: refer the endpoint
let eventDataPromise = null;

function getFeedId() {
  const url = window.location.pathname;
  const segments = url.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  return lastSegment === 'econoday' ? '' : lastSegment.replace('feed', '') || null;
}

function fetchEventData() {
  if (!eventDataPromise) {
    eventDataPromise = new Promise((resolve, reject) => {
      (async () => {
        try {
          const response = await fetch(`${eventDataEndpoint}?feedId=${getFeedId()}`);
          if (!response.ok) {
            window.location.replace('/404');
            reject();
          }
          const eventDataJson = await response.json();
          resolve(eventDataJson);
        } catch (e) {
          reject(e);
        }
      })();
    });
  }
  return eventDataPromise;
}

/**
 * Returns an econoday event report
 * @returns Report data
 */
export async function getEventReport(report) {
  const response = await fetch(`/aemedge/templates/event/mock/${report}.html`); // TODO: refer the endpoint
  if (response.ok) {
    const text = await response.text();
    return text;
  }
  return '';
}

/**
 * Returns the econoday event data based on the ID of the url
 * @returns {Promise} Object containing the event data
 */
export default function getEventData() {
  return fetchEventData();
}

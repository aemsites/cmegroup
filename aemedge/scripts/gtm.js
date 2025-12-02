export function fireGTMTracking(trackingType, trackingParameters) {
  if (typeof window.dataLayer !== 'undefined') {
    const {
      event, eventCategory, eventAction, eventLabel, eventValue,
    } = trackingParameters;
    switch (trackingType) {
      case 'event':
        window.dataLayer.push({
          event,
          eventCategory,
          eventAction,
          eventLabel,
          eventValue,
        });
        break;
      case 'page':
        window.dataLayer.push({
          PageInformation: event,
        });
        break;
      case 'custom':
        window.dataLayer.push({
          ...trackingParameters,
        });
        break;
      default:
        // eslint-disable-next-line no-console
        console.log(`GTM: ${trackingType} is not valid tracking type.`);
        break;
    }
  }
}

export function setTracking(
  eventType,
  event,
  eventCategory,
) {
  return (detail, status, value) => fireGTMTracking(eventType, {
    event, eventCategory, status, detail, value,
  });
}

export async function trackGA4Event(
  origin,
  eventName,
  details = {},
) {
  try {
    const params = new URLSearchParams({
      event: eventName,
      ...details,
    });
    const response = await fetch(`${origin}/ga-hit.html?${params.toString()}`);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('Tracking error:', error);
  }
}

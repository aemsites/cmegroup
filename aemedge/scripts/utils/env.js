export function getEnv() {
  let { location: { hostname } } = window;
  if (!hostname && window.parent && window.parent !== window) {
    ({ parent: { location: { hostname } = {} } } = window);
  }
  return hostname.match(/(?:^|--)([^-]+)(?:-www)?(?:--|\.)(?:cmegroup|aem)/)?.[1] ?? 'www';
}

export function isCMEEnv() {
  const { location: { hostname } } = window;
  return !!hostname.match(/\.cmegroup\.com/)?.at(0);
}

export function getEnvType() {
  return getEnv() === 'www' ? 'prod' : 'stage';
}

export function urlByEnvType(options = {}) {
  const { schemaless = false } = options;
  return `${!schemaless ? 'https://' : ''}${getEnv()}.cmegroup.com`;
}

/**
 * Extract segments from a URL in EDS
 * @param {string} url - URL format: https://branch--repo--org.aem.live
 * @param {'branch'|'repo'|'org'} segment - Segment to extract
 * @returns {string|null} Requested segment or null if none is found
 */
export function getEDSSegment(url, segment) {
  try {
    const regex = /https?:\/\/([^-]+(?:--[^-]+)?)--([^-]+)--([^.]+)\.aem\.(live|page)/;
    const match = url.match(regex);

    if (!match) {
      // eslint-disable-next-line no-console
      console.warn('URL not matching expected format:', url);
      return null;
    }

    const segmentMap = {
      branch: match[1],
      repo: match[2],
      org: match[3],
      domain: match[4],
    };

    if (!Object.prototype.hasOwnProperty.call(segmentMap, segment)) {
      // eslint-disable-next-line no-console
      console.warn(`Segment '${segment}' invalid. Use: branch, repo, org`);
      return null;
    }

    return segmentMap[segment];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error while parsing URL:', error);
    return null;
  }
}

/**
 * Returns the true origin of the current page in the browser.
 * If the page is running in a iframe with srcdoc, the ancestor origin is returned.
 * @returns {String} The true origin
 */
export function getOrigin() {
  const { location } = window;
  return location.href === 'about:srcdoc' ? window.parent.location.origin : location.origin;
}

/**
 * Returns the true of the current page in the browser.mac
 * If the page is running in a iframe with srcdoc,
 * the ancestor origin + the path query param is returned.
 * @returns {String} The href of the current page or the href of the block running in the library
 */
export function getHref() {
  if (window.location.href !== 'about:srcdoc') return window.location.href;

  const { location: parentLocation } = window.parent;
  const urlParams = new URLSearchParams(parentLocation.search);
  return `${parentLocation.origin}${urlParams.get('path')}`;
}

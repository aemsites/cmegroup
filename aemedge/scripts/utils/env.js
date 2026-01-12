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
 * Parse an AEM EDS URL and returns all segments
 * @param {string} url - URL format: https://branch--repo--org.aem.live
 * @returns {Object|null} Object with branch, repo, org, domain or null
 */
export function parseEDSUrl(url) {
  const regex = /https?:\/\/(.+?)--(.+?)--([^.]+)\.aem\.(live|page)/;
  const match = url.match(regex);

  if (!match) {
    // eslint-disable-next-line no-console
    console.warn('URL not matching expected format:', url);
    return null;
  }

  return {
    branch: match[1],
    repo: match[2],
    org: match[3],
    domain: match[4],
    full: match[0],
  };
}

/**
 * Extract a specific segment from an AEM EDS URL
 * @param {string} url - URL format: https://branch--repo--org.aem.live
 * @param {'branch'|'repo'|'org'|'domain'} segment - Segment type
 * @returns {string|null} Requested segment
 */
export function getEDSSegment(url, segment) {
  const parsed = parseEDSUrl(url);
  return parsed ? parsed[segment] || null : null;
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

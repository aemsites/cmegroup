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

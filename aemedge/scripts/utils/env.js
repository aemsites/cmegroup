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

export function urlByEnvType() {
  // Once we deploy new services in prod we will have to make www hit prod, not beta
  const env = getEnv();
  let subdom;
  switch (env) {
    case 'preview':
      subdom = 'preview';
      break;
    case 'beta':
    case 'www':
      subdom = 'beta';
      break;
    default:
      subdom = 'www';
      break;
  }
  return `https://${subdom}.cmegroup.com`;
}

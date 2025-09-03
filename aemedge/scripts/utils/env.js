export function getEnv() {
  const { location: { hostname } } = window;
  return hostname.match(/(preview|beta|www)(-www|\.cmegroup)?/)?.[1] ?? 'www';
}

export function getEnvType() {
  return getEnv() === 'www' ? 'prod' : 'stage';
}

export function urlByEnvType() {
  return `https://${getEnv()}.cmegroup.com`;
}

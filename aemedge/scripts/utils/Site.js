export function getAbsoluteUrl(
  path,
  onlyForExternals = true,
) {
  const [, subdomain] = window.location.host.match(/([^.]+)\.(.+)/) || [];
  let newPath = onlyForExternals || !subdomain
    ? path
    : `https://${subdomain}.cmegroup.com${path}`;
  if (window.loader) {
    const { env: envLoader, host } = window.loader;
    newPath = `https://${envLoader}.${host}${path}`;
  }
  return newPath;
}

export function getGlobalConfig(prop, defaultValue = '') {
  return prop
    ? window.globalConfig?.[prop] ?? defaultValue
    : window.globalConfig || {};
}

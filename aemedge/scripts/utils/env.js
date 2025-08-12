export function getEnvType() {
  const prodEnvs = [
    'cmegroup.com',
    'www.cmegroup.com',
    'main--cmegroup--aemsites.aem.page',
    'main--cmegroup--aemsites.aem.live',
  ];
  const type = prodEnvs.includes(window.location.hostname) ? 'prod' : 'stage';
  return type;
}

export function urlByEnvType() {
  return `https://${getEnvType() !== 'prod' ? 'beta' : 'www'}.cmegroup.com`;
}

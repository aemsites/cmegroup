export function getEnvType() {
  const prodEnvs = [
    'preview.cmegroup.com',
    'preview.cmegroup.com',
    'main--cmegroup--aemsites.aem.page',
    'main--cmegroup--aemsites.aem.live',
  ];
  const type = prodEnvs.includes(window.location.hostname) ? 'prod' : 'stage';
  return type;
}

export function urlByEnvType() {
  //
  return `https://${getEnvType() !== 'prod' ? 'beta' : 'www'}.cmegroup.com`;
}

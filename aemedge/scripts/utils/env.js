export function getEnvType() {
  const prodEnvs = [
    'preview.cmegroup.com',
    'preview.cmegroup.com',
    'main--cmegroup--aemsites.aem.page',
    'main--cmegroup--aemsites.aem.live',
  ];
  const type = prodEnvs.includes(window.location.hostname) ? 'preview' : 'stage';
  return type;
}

export function urlByEnvType() {
  //
  return `https://${getEnvType() !== 'preview' ? 'beta' : 'preview'}.cmegroup.com`;
}

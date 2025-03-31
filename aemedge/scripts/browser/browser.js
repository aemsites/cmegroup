export default function getBrowserName() {
  const { userAgent } = navigator;

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg') && !userAgent.includes('OPR')) {
    return 'Chrome';
  } if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'Safari';
  } if (userAgent.includes('Firefox')) {
    return 'Firefox';
  } if (userAgent.includes('Edg')) {
    return 'Edge';
  } if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
    return 'Opera';
  } if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
    return 'Internet Explorer';
  }
  return '';
}

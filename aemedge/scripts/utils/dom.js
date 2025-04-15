// eslint-disable-next-line import/prefer-default-export
export function openHiddenIframe(src) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    // eslint-disable-next-line func-names
    iframe.onload = function () {
      iframe.parentNode?.removeChild(iframe);
      resolve();
    };
    // eslint-disable-next-line func-names
    iframe.onerror = function () {
      reject();
    };
    iframe.src = src;
    document.body?.appendChild(iframe);
  });
}

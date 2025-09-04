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

/**
 * Wraps images in links in a container.
 * @param {HTMLElement} container The container to wrap images in links
 * Handles 2 use cases
 * 1) <picture><br/><a>
 * 2) <p><picture></p><p><a></p>
 */
export function wrapImgsInLinks(container) {
  const pictures = container.querySelectorAll('picture');
  pictures.forEach((pic) => {
    if (pic.nextElementSibling && pic.nextElementSibling.tagName === 'BR'
      && pic.nextElementSibling.nextElementSibling && pic.nextElementSibling.nextElementSibling.tagName === 'A') {
      const link = pic.nextElementSibling.nextElementSibling;
      if (link.textContent.includes(link.getAttribute('href'))) {
        pic.nextElementSibling.remove();
        link.innerHTML = pic.outerHTML;
        pic.replaceWith(link);
        return;
      }
    }

    const parent = pic.parentNode;
    if (!parent.nextElementSibling) {
      // eslint-disable-next-line no-console
      console.warn('no next element');
      return;
    }
    const nextSibling = parent.nextElementSibling;
    if (parent.tagName !== 'P' || nextSibling.tagName !== 'P' || nextSibling.children.length > 1) {
      // eslint-disable-next-line no-console
      console.warn('next element not viable link container');
      return;
    }
    const link = nextSibling.querySelector('a');
    if (link && link.textContent.includes(link.getAttribute('href'))) {
      link.parentElement.remove();
      link.innerHTML = pic.outerHTML;
      pic.replaceWith(link);
    }
  });
}

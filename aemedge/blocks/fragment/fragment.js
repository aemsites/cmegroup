/*
 * Fragment Block
 * Include content on a page as a fragment.
 * https://www.aem.live/developer/block-collection/fragment
 */

// eslint-disable-next-line import/no-cycle
import {
  decorateMain,
} from '../../scripts/scripts.js';

import {
  loadSections,
  loadCSS,
  loadScript,
} from '../../scripts/aem.js';

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {HTMLElement} The root element of the fragment
 */
export async function loadFragment(path) {
  const resp = await fetch(`${path}${path.endsWith('.html') ? '' : '.plain.html'}`);
  if (resp.ok) {
    const main = document.createElement('main');
    main.innerHTML = await resp.text();

    // reset base path for media to fragment base
    const resetAttributeBase = (tag, attr) => {
      main.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
        try {
          elem[attr] = new URL(elem.getAttribute(attr), new URL(path, window.location)).href;
        } catch (error) {
          // Fallback if URL construction fails (eg. in sidekick shadow root)
          elem[attr] = `${path}/${elem.getAttribute(attr).replace('./', '')}`;
        }
      });
    };
    resetAttributeBase('img', 'src');
    resetAttributeBase('source', 'srcset');

    decorateMain(main);
    await loadSections(main);
    return main;
  }
  return null;
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.textContent.trim();
  if (path && path.startsWith('/')) {
    if (path.endsWith('.css')) {
      block.innerText = '';
      loadCSS(`${path}`);
    } else if (path.endsWith('.js')) {
      block.innerText = '';
      loadScript(`${path}`);
    } else {
      const fragment = await loadFragment(path);
      if (fragment) {
        const fragmentSection = fragment.querySelector(':scope .section');
        if (fragmentSection) {
          block.closest('.section')?.classList.add(...fragmentSection.classList);
          block.closest('.fragment')?.replaceWith(...fragment.childNodes);
        }
      }
    }
  }
}

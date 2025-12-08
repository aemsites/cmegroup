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
  getMetadata,
} from '../../scripts/aem.js';

import { readBlockConfig } from '../../scripts/utils.js';
import { computeAssetClass } from '../../scripts/utils/product.js';

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {HTMLElement} The root element of the fragment
 */
export async function loadFragment(path) {
  if (path && path.startsWith('/')) {
    const resp = await fetch(`${path}.plain.html`);
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
  }
  return null;
}

/**
 * Resolve fragment path for shared variant
 * @param {object} config Block config with type and content
 * @returns {string} Resolved fragment path
 */
function resolveSharedFragmentPath(config) {
  const type = config.type || '';
  const content = config.content || '';
  if (!type) return null;

  switch (type) {
    case 'asset-class': {
      // No content needed - derived from URL
      const assetClass = computeAssetClass(window.location.pathname);
      return assetClass ? `/fragments/shared/markets/${assetClass}/${assetClass}` : null;
    }
    case 'template': {
      if (!content) return null;
      const template = getMetadata('template');
      return template ? `/fragments/shared/${template}/${content}` : null;
    }
    default:
      return content ? `/fragments/shared/${type}/${content}` : null;
  }
}

export default async function decorate(block) {
  let path;
  const isShared = block.classList.contains('shared');

  // Shared variant: resolve path from block config
  if (isShared) {
    const config = readBlockConfig(block);
    path = resolveSharedFragmentPath(config);
    if (!path) return;
    block.textContent = '';
  } else {
    // Standard variant: get path from link or text
    const link = block.querySelector('a');
    path = link ? link.getAttribute('href') : block.textContent.trim();
  }

  const fragment = await loadFragment(path);
  if (fragment) {
    const fragmentSection = fragment.querySelector(':scope .section');
    if (fragmentSection) {
      block.closest('.section')?.classList.add(...fragmentSection.classList);

      if (isShared) {
        // Auto variant: append directly since block was cleared
        block.append(...fragment.childNodes);
      } else {
        // Standard variant: replace inner div
        block.closest('.fragment')?.querySelector('div')?.replaceWith(...fragment.childNodes);
      }
    }
  }
}

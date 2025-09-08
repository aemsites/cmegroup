/*
 * Login Teaser Block
 * Loads a fragment for login teaser content
 */
import { loadFragment } from '../fragment/fragment.js';

export default async function decorate(block) {
  // Simply look for an anchor link in the block
  const anchor = block.querySelector('a[href]');
  if (!anchor) {
    return;
  }

  let fragmentPath = anchor.getAttribute('href');

  // Convert absolute URL to path if needed
  if (fragmentPath.startsWith('http')) {
    fragmentPath = new URL(fragmentPath).pathname;
  }

  // Load the fragment
  const fragment = await loadFragment(fragmentPath);

  if (fragment) {
    // Replace block content with fragment content
    const fragmentSection = fragment.querySelector(':scope .section');
    if (fragmentSection) {
      // Copy any classes from the fragment section to the current section
      block.closest('.section')?.classList.add(...fragmentSection.classList);
      // Replace the entire login-teaser block with the fragment content
      block.replaceWith(...fragment.childNodes);
    }
  }
}

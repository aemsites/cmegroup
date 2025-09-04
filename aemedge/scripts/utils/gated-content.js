/* eslint-disable import/no-cycle */
/**
 * Gated content protection system
 *
 * Architecture:
 * - Edge: Akamai EdgeWorker handles protection in production
 * - Client: Simple fallback + author preview functionality
 *
 * Author Preview Environments:
 * - localhost + .aem.page + .aem.reviews: Always show toggle
 * - .aem.live: Only show toggle when ?dapreview=on
 *
 * Usage:
 * - ?auth=true  = Show full content (authenticated view)
 * - ?auth=false = Show teasers (anonymous view)
 * - ?dapreview=on = Enable toggle on .aem.live
 *
 * Protection Levels:
 * 1. Page-level (protected=true + teaser=path in meta)
 * 2. Section-level (protected=true in section metadata)
 * 3. Block-level (protected class + teaser path)
 */

import { createElement, checkDomain } from '../utils.js';
import { loadFragment } from '../../blocks/fragment/fragment.js';
import { loadCSS } from '../aem.js';

/**
 * Check if we should show author preview functionality
 * @returns {boolean} True if auth toggle should be displayed
 */
function isAuthorPreviewMode() {
  const domainInfo = checkDomain(window.location);
  const urlParams = new URLSearchParams(window.location.search);
  const isDAPreview = urlParams.get('dapreview') === 'on';

  if (domainInfo.isPreview || domainInfo.isReviews) {
    return true;
  }

  if (domainInfo.isLive) {
    return isDAPreview;
  }

  return false;
}

/**
 * Get the authentication state from query parameters
 * @returns {boolean} True if authenticated user, false for anonymous user
 */
function getAuthState() {
  const urlParams = new URLSearchParams(window.location.search);
  const authValue = urlParams.get('auth');

  // If no auth parameter, default to authenticated (show full content)
  if (!authValue) {
    return true;
  }

  if (authValue === 'false') {
    return false;
  }

  // default to authenticated (show full content)
  return true;
}

/**
 * Check for page-level protection metadata (performance gate + page protection)
 * Page-level protection requires BOTH protected=true AND teaser=path
 * @returns {Object} Protection metadata with isPageProtected and teaserPath
 */
function checkPageLevelProtection() {
  const protectedMeta = document.querySelector('meta[name="protected"]');
  const pageTeaserMeta = document.querySelector('meta[name="teaser"]');
  const isProtected = protectedMeta && protectedMeta.getAttribute('content') === 'true';
  const teaserContent = pageTeaserMeta?.getAttribute('content');
  const hasTeaser = pageTeaserMeta && teaserContent && teaserContent.trim();
  const isPageProtected = isProtected && hasTeaser;

  return {
    isPageProtected,
    teaserPath: teaserContent,
    hasAnyProtection: isProtected,
  };
}

/**
 * Normalize fragment path to ensure it starts with /
 * @param {string} teaserPath - Path to teaser fragment
 * @returns {string|null} Normalized path or null if invalid
 */
function normalizeFragmentPath(teaserPath) {
  if (!teaserPath) return null;
  if (teaserPath.startsWith('/')) return teaserPath;

  try {
    return new URL(teaserPath).pathname;
  } catch {
    return `/${teaserPath}`;
  }
}

/**
 * Apply page-level protection by replacing main content with teaser
 * @param {string} teaserPath - Path to teaser fragment
 */
async function applyPageLevelProtection(teaserPath) {
  const main = document.querySelector('main');
  if (!main) return;

  const normalizedPath = normalizeFragmentPath(teaserPath);
  const fragmentElement = await loadFragment(normalizedPath);
  if (fragmentElement) {
    main.replaceWith(fragmentElement);
  }
}

function getText(element) {
  return element.textContent?.trim() || '';
}

/**
 * Check if a metadata container has protected=true
 * @param {Element} metadataEl - Metadata container element
 * @returns {boolean} True if protected=true is found
 */
function isProtectedMetadata(metadataEl) {
  const rows = metadataEl.querySelectorAll(':scope > div');
  // eslint-disable-next-line no-restricted-syntax
  for (const row of rows) {
    const cells = row.querySelectorAll(':scope > div');
    if (cells.length === 2) {
      const keyText = getText(cells[0]);
      const valueText = getText(cells[1]);
      if (keyText === 'protected' && valueText === 'true') {
        return true;
      }
    }
  }
  return false;
}

/**
 * Fetch the .plain.html version of the current page to get original block structure
 * @returns {Promise<Document|null>} Parsed plain HTML document or null if fetch fails
 */
async function fetchPlainHtml() {
  try {
    const plainUrl = `${window.location.pathname}.plain.html`;
    const response = await fetch(plainUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch plain HTML: ${response.status}`);
    }
    const plainHtml = await response.text();
    const parser = new DOMParser();
    return parser.parseFromString(plainHtml, 'text/html');
  } catch (error) {
    return null;
  }
}

/**
 * Extract teaser path from a generic key-value structure using native DOM
 * @param {Element} container - Container element with key-value structure
 * @returns {string|null} Teaser path or null if not found
 */
function extractTeaserPath(container) {
  const rows = container.querySelectorAll(':scope > div');

  // eslint-disable-next-line no-restricted-syntax
  for (const row of rows) {
    const cells = row.querySelectorAll(':scope > div');
    if (cells.length === 2) {
      const keyDiv = cells[0];
      const valueDiv = cells[1];

      if (keyDiv?.textContent.trim() === 'teaser') {
        const link = valueDiv.querySelector('a');
        return link ? link.getAttribute('href') : valueDiv.textContent.trim();
      }
    }
  }

  return null;
}

/**
 * Extract block type from class attribute
 * @param {string} classAttr - Class attribute value
 * @returns {string|null} Block type or null if not extractable
 */
function extractBlockType(classAttr) {
  const cleanClass = classAttr
    .replace(/\s*protected\s*/g, ' ')
    .replace(/\s*id-\d+\s*/g, ' ')
    .trim();

  const firstWord = cleanClass.split(/\s+/)[0];
  return firstWord || null;
}

/**
 * Parse teaser information from plain HTML for both blocks and sections using native DOM
 * @param {Document} doc - Parsed HTML document
 * @returns {Object} Object with block and section teaser data
 */
function parseTeasersFromPlainHtml(doc) {
  const blockTeasers = [];
  const sectionTeasers = [];

  const protectedBlocks = doc.querySelectorAll('[class*="protected"]');
  protectedBlocks.forEach((blockEl) => {
    const classAttr = blockEl.getAttribute('class') || '';
    const blockType = extractBlockType(classAttr);
    const teaserPath = extractTeaserPath(blockEl);

    if (blockType && teaserPath) {
      blockTeasers.push({ blockType, teaserPath, originalBlock: blockEl });
    }
  });

  const allSections = doc.body.querySelectorAll(':scope > div');
  allSections.forEach((section, sectionIndex) => {
    const metadataEl = section.querySelector('.section-metadata');
    if (metadataEl) {
      const teaserPath = extractTeaserPath(metadataEl);

      if (isProtectedMetadata(metadataEl) && teaserPath) {
        sectionTeasers.push({ index: sectionIndex, teaserPath, originalMetadata: metadataEl });
      }
    }
  });

  return { blockTeasers, sectionTeasers };
}

/**
 * Find matching decorated blocks in the current DOM for plain HTML teaser blocks
 * @param {Array} plainTeaserBlocks - Teaser blocks from plain HTML
 * @returns {Array} Array of matching decorated blocks with teaser info
 */
function findMatchingDecoratedBlocks(plainTeaserBlocks) {
  const matchingBlocks = [];

  plainTeaserBlocks.forEach((plainBlock) => {
    const selector = `.${plainBlock.blockType}.protected`;
    const decoratedBlocks = document.querySelectorAll(selector);

    decoratedBlocks.forEach((decoratedBlock) => {
      matchingBlocks.push({
        element: decoratedBlock,
        teaserPath: plainBlock.teaserPath,
        blockType: plainBlock.blockType,
      });
    });
  });

  return matchingBlocks;
}

/**
 * Check for section and block level protection
 * @param {boolean} isAuthenticated - Current auth state
 * @returns {Promise<Object>} Protection metadata with sections and teaser blocks
 */
async function checkSectionLevelProtection(isAuthenticated) {
  const protectedSections = [];
  let teaserBlocks = [];

  const sections = document.querySelectorAll('main > div');

  const plainDoc = await fetchPlainHtml();
  if (plainDoc) {
    const { blockTeasers, sectionTeasers } = parseTeasersFromPlainHtml(plainDoc);

    // Handle section-level protection - match plain HTML sections to actual DOM sections
    if (!isAuthenticated && sectionTeasers.length > 0) {
      sectionTeasers.forEach((sectionData) => {
        if (sections[sectionData.index]) {
          protectedSections.push({
            element: sections[sectionData.index],
            teaserPath: sectionData.teaserPath,
          });
        }
      });
    }

    if (blockTeasers.length > 0) {
      teaserBlocks = findMatchingDecoratedBlocks(blockTeasers);
    }
  }

  // Fallback: Check current DOM for section protection if no plain HTML sections found
  if (protectedSections.length === 0) {
    sections.forEach((section) => {
      const sectionMetadata = section.querySelector('.section-metadata');
      if (sectionMetadata && !isAuthenticated) {
        const teaserPath = extractTeaserPath(sectionMetadata);

        if (isProtectedMetadata(sectionMetadata)) {
          if (teaserPath) {
            protectedSections.push({
              element: section,
              teaserPath,
            });
          }
        }
      }
    });
  }

  // Always check for block pairs - they work independently of teaser blocks
  sections.forEach((section) => {
    checkBlockProtectionInSection(section, teaserBlocks, isAuthenticated);
  });

  const result = {
    isProtected: protectedSections.length > 0 || teaserBlocks.length > 0,
    sections: protectedSections,
    teaserBlocks,
  };

  return result;
}

/**
 * Check for block-level protection within a section
 * Handles two types of block protection:
 * 1. Teaser replacement: blocks with "protected" class and teaser paths
 * 2. Block pairs: two versions of same content with shared id-* identifier
 *    - Normal version (for anonymous users): class="blocktype id-identifier"
 *    - Protected version (for authenticated users): class="blocktype id-identifier protected"
 *
 * @param {Element} section - Section element to check
 * @param {Array} teaserBlocks - Array to collect teaser blocks
 * @param {boolean} isAuthenticated - Current auth state
 */
function checkBlockProtectionInSection(section, teaserBlocks, isAuthenticated) {
  if (!isAuthenticated) {
    const protectedDivsWithTeasers = Array.from(section.querySelectorAll('div[class*="protected"]'))
      .filter((el) => {
        const divs = el.querySelectorAll('div');

        let hasTeaserKeyword = false;
        let hasFragmentPath = false;

        divs.forEach((div) => {
          const text = div.textContent.trim();
          if (text === 'teaser') {
            hasTeaserKeyword = true;
          }
          if (text.includes('/fragments/') || text.includes('/teasers/') || (text.startsWith('/') && text.length > 1)) {
            hasFragmentPath = true;
          }
        });

        return hasTeaserKeyword && hasFragmentPath;
      });

    if (protectedDivsWithTeasers.length > 0) {
      protectedDivsWithTeasers.forEach((el) => {
        const lastDiv = el.querySelector('div:last-child');
        const teaserText = lastDiv?.textContent.trim();
        if (teaserText) {
          teaserBlocks.push({
            element: el,
            teaserPath: teaserText,
          });
        }
      });
      return;
    }
  }

  const blocks = {};

  const allDivs = section.querySelectorAll('div[class]');
  const blocksWithId = Array.from(allDivs).filter((div) => {
    const classAttr = div.getAttribute('class') || '';
    return /\bid-[^\s]+/.test(classAttr);
  });

  blocksWithId.forEach((blockEl) => {
    const classAttr = blockEl.getAttribute('class') || '';
    const idMatch = classAttr.match(/\bid-([^\s]+)/);
    const isProtected = classAttr.includes('protected');

    if (!idMatch) {
      return;
    }

    const blockId = idMatch[1];
    if (!blocks[blockId]) {
      blocks[blockId] = { normal: null, protected: null };
    }

    if (isProtected) {
      blocks[blockId].protected = blockEl;
    } else {
      blocks[blockId].normal = blockEl;
    }
  });

  if (Object.keys(blocks).length > 0) {
    Object.entries(blocks).forEach(([, blockPair]) => {
      if (blockPair.normal && blockPair.protected) {
        if (isAuthenticated) {
          // Authenticated users: show protected content, hide normal content
          blockPair.normal.remove();
          blockPair.protected.style.display = '';
        } else {
          // Anonymous users: show normal content, hide protected content
          blockPair.protected.remove();
          blockPair.normal.style.display = '';
        }
      }
    });
  }
}

/**
 * Apply section-level protection by replacing protected sections with teasers
 * @param {Object} protectionMetadata - Protection metadata from checkSectionLevelProtection
 */
async function applySectionLevelProtection(protectionMetadata) {
  await Promise.all(protectionMetadata.sections.map(async (sectionData) => {
    const normalizedPath = normalizeFragmentPath(sectionData.teaserPath);
    const fragmentElement = await loadFragment(normalizedPath);
    if (fragmentElement) {
      sectionData.element.replaceWith(...fragmentElement.children);
    }
  }));

  await Promise.all(protectionMetadata.teaserBlocks.map(async (blockData) => {
    const normalizedPath = normalizeFragmentPath(blockData.teaserPath);
    const fragmentElement = await loadFragment(normalizedPath);
    if (fragmentElement) {
      blockData.element.replaceWith(...fragmentElement.children);
    }
  }));
}

/**
 * Apply content protection for author preview
 * Simple: Only runs in preview environments for author testing
 * Production protection is handled by Akamai EdgeWorker
 */
async function applyContentProtection() {
  // Only apply client-side protection in preview environments
  if (!isAuthorPreviewMode()) {
    return;
  }

  const pageProtectionMetadata = checkPageLevelProtection();
  if (!pageProtectionMetadata.hasAnyProtection) {
    return;
  }

  const isAuthenticated = getAuthState();

  // Page-level protection (highest priority)
  if (pageProtectionMetadata.isPageProtected) {
    if (!isAuthenticated) {
      await applyPageLevelProtection(pageProtectionMetadata.teaserPath);
    }
    return;
  }

  // Section/Block-level protection
  const sectionProtectionMetadata = await checkSectionLevelProtection(isAuthenticated);
  if (sectionProtectionMetadata.isProtected && !isAuthenticated) {
    await applySectionLevelProtection(sectionProtectionMetadata);
  }
}

/**
 * Create and show the author preview toggle as a slide-out panel
 */
function createAuthorToggle() {
  if (!isAuthorPreviewMode()) return;

  loadCSS(`${window.hlx.codeBasePath}/styles/gated-content.css`);

  const currentState = getAuthState();
  let isExpanded = false;

  const toggle = createElement('div', {
    id: 'auth-preview-toggle',
    class: 'auth-preview-toggle',
  });

  const handleIcon = createElement('div', {
    class: 'auth-preview-handle-icon',
  }, 'AUTH TOGGLE');

  const handle = createElement('div', {
    class: 'auth-preview-handle',
  }, handleIcon);

  const headerText = createElement('span', {}, 'Auth Toggle');
  const closeBtn = createElement('button', {
    class: 'auth-preview-close',
    'aria-label': 'Close preview panel',
  }, '×');

  const header = createElement('div', {
    class: 'auth-preview-header',
  }, headerText, closeBtn);

  const stateClass = currentState ? 'authenticated' : 'anonymous';
  const stateText = currentState ? 'Authenticated' : 'Anonymous';
  const stateLabel = createElement('div', {
    class: `auth-preview-state ${stateClass}`,
  }, stateText);

  const buttonText = `Switch to ${currentState ? 'Anonymous' : 'Authenticated'}`;
  const button = createElement('button', {
    class: 'auth-preview-button',
  }, buttonText);

  function togglePanel() {
    isExpanded = !isExpanded;
    toggle.classList.toggle('expanded', isExpanded);
    handle.classList.toggle('hidden', isExpanded);

    if (isExpanded) {
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100); // Small delay to prevent immediate closure
    } else {
      document.removeEventListener('click', handleClickOutside);
    }
  }

  function handleClickOutside(event) {
    if (toggle.contains(event.target)) {
      return;
    }

    if (isExpanded) {
      togglePanel();
    }
  }

  handle.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);

  button.addEventListener('click', () => {
    const url = new URL(window.location);
    url.searchParams.set('auth', currentState ? 'false' : 'true');
    window.location.href = url.toString();
  });

  toggle.appendChild(handle);
  toggle.appendChild(header);
  toggle.appendChild(stateLabel);
  toggle.appendChild(button);

  function cleanup() {
    document.removeEventListener('click', handleClickOutside);
  }

  toggle.cleanup = cleanup;

  document.body.appendChild(toggle);

  setTimeout(() => {
    toggle.classList.add('visible');
    setTimeout(() => {
      handle.classList.add('bounce');
      setTimeout(() => {
        handle.classList.remove('bounce');
      }, 400);
    }, 500);
  }, 1000);
}

/**
 * Initialize content protection when DOM is ready
 */
function initContentProtection() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyContentProtection();
      createAuthorToggle();
    });
  } else {
    applyContentProtection();
    createAuthorToggle();
  }
}

export {
  isAuthorPreviewMode,
  getAuthState,
  applyContentProtection,
  initContentProtection,
};

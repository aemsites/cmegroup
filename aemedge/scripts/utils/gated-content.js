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
 * - ?auth=on  = Show full content (authenticated view)
 * - ?auth=off = Show teasers (anonymous view)
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
  // Show toggle based on environment:
  // - localhost, .aem.page, .aem.reviews: always show
  // - .aem.live: only show when ?dapreview=on
  const domainInfo = checkDomain(window.location);
  const urlParams = new URLSearchParams(window.location.search);
  const isDAPreview = urlParams.get('dapreview') === 'on';

  // Always show for non-live environments
  if (domainInfo.isPreview || domainInfo.isReviews) {
    return true;
  }

  // For .aem.live, only show when ?dapreview=on
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

  // Explicit auth parameter: 'on' = authenticated, 'off' = anonymous
  return authValue === 'on';
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
 * Apply page-level protection by replacing main content with teaser
 * @param {string} teaserPath - Path to teaser fragment
 */
function normalizeFragmentPath(teaserPath) {
  if (!teaserPath) return null;

  if (teaserPath.startsWith('/')) {
    return teaserPath;
  }

  try {
    const url = new URL(teaserPath);
    return url.pathname;
  } catch {
    return teaserPath.startsWith('/') ? teaserPath : `/${teaserPath}`;
  }
}

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

function createDOMParser(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  return {
    find: (selector) => doc.querySelectorAll(selector),
    document: doc,
  };
}

/**
 * Fetch the .plain.html version of the current page to get original block structure
 * @returns {Promise<Object|null>} Parsed plain HTML document or null if fetch fails
 */
async function fetchPlainHtml() {
  try {
    const plainUrl = `${window.location.pathname}.plain.html`;
    const response = await fetch(plainUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch plain HTML: ${response.status}`);
    }
    const plainHtml = await response.text();

    const domParser = createDOMParser(plainHtml);
    return { parser: domParser, type: 'dom' };
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
 * @param {Object} parserContext - Contains parser and type information
 * @param {Object} parserContext.parser - Native DOM parser with document property
 * @returns {Object} Object with block and section teaser data
 */
function parseTeasersFromPlainHtml(parserContext) {
  const { parser } = parserContext;
  const { document: doc } = parser;
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

      let isProtected = false;
      const rows = metadataEl.querySelectorAll(':scope > div');
      // eslint-disable-next-line no-restricted-syntax
      for (const row of rows) {
        const cells = row.querySelectorAll(':scope > div');
        if (cells.length === 2) {
          const keyText = getText(cells[0]);
          const valueText = getText(cells[1]);

          if (keyText === 'protected' && valueText === 'true') {
            isProtected = true;
            break;
          }
        }
      }

      if (isProtected && teaserPath) {
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

  // Get teaser information from plain HTML for both blocks and sections
  const parserContext = await fetchPlainHtml();
  if (parserContext) {
    const { blockTeasers, sectionTeasers } = parseTeasersFromPlainHtml(parserContext);

    // Handle section-level protection - match plain HTML sections to actual DOM sections
    if (!isAuthenticated && sectionTeasers.length > 0) {
      const sections = document.querySelectorAll('main > div');
      sectionTeasers.forEach((sectionData) => {
        if (sections[sectionData.index]) {
          protectedSections.push({
            element: sections[sectionData.index],
            teaserPath: sectionData.teaserPath,
          });
        }
      });
    }

    // Handle block-level protection - find matching decorated blocks
    if (blockTeasers.length > 0) {
      teaserBlocks = findMatchingDecoratedBlocks(blockTeasers);
    }
  }

  // Fallback: Check current DOM for section protection if no plain HTML sections found
  if (protectedSections.length === 0) {
    const sections = document.querySelectorAll('main > div');
    sections.forEach((section) => {
      const sectionMetadata = section.querySelector('.section-metadata');
      if (sectionMetadata && !isAuthenticated) {
        const teaserPath = extractTeaserPath(sectionMetadata);
        const isProtected = Array.from(sectionMetadata.querySelectorAll(':scope > div')).some((row) => {
          const cells = row.querySelectorAll(':scope > div');
          return cells.length === 2
            && cells[0]?.textContent.trim() === 'protected'
            && cells[1]?.textContent.trim() === 'true';
        });

        if (isProtected) {
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

  if (teaserBlocks.length === 0) {
    const sections = document.querySelectorAll('main > div');
    sections.forEach((section) => {
      checkBlockProtectionInSection(section, teaserBlocks, isAuthenticated);
    });
  }

  const result = {
    isProtected: protectedSections.length > 0 || teaserBlocks.length > 0,
    sections: protectedSections,
    teaserBlocks,
  };

  return result;
}

/**
 * Check for block-level protection within a section
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
  section.querySelectorAll('div[class*="id-"]').forEach((blockEl) => {
    const classAttr = blockEl.getAttribute('class') || '';
    const idMatch = classAttr.match(/id-([^\s]+)/);
    const isProtected = classAttr.includes('protected');

    if (!idMatch) return;
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
          blockPair.normal.remove();
        } else {
          blockPair.protected.remove();
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

  // Load the CSS file
  loadCSS(`${window.hlx.codeBasePath}/styles/gated-content.css`);

  const currentState = getAuthState();
  let isExpanded = false;

  // Create toggle container using createElement
  const toggle = createElement('div', {
    id: 'auth-preview-toggle',
    class: 'auth-preview-toggle',
  });

  // Create handle/tab for expanding
  const handleIcon = createElement('div', {
    class: 'auth-preview-handle-icon',
  }, 'AUTH TOGGLE');

  const handle = createElement('div', {
    class: 'auth-preview-handle',
  }, handleIcon);

  // Create header elements
  const headerText = createElement('span', {}, 'Auth Toggle');
  const closeBtn = createElement('button', {
    class: 'auth-preview-close',
    'aria-label': 'Close preview panel',
  }, '×');

  const header = createElement('div', {
    class: 'auth-preview-header',
  }, headerText, closeBtn);

  // Create state indicator
  const stateClass = currentState ? 'authenticated' : 'anonymous';
  const stateText = currentState ? 'Authenticated' : 'Anonymous';
  const stateLabel = createElement('div', {
    class: `auth-preview-state ${stateClass}`,
  }, stateText);

  // Create toggle button
  const buttonText = `Switch to ${currentState ? 'Anonymous' : 'Authenticated'}`;
  const button = createElement('button', {
    class: 'auth-preview-button',
  }, buttonText);

  // Event listeners
  function togglePanel() {
    isExpanded = !isExpanded;
    toggle.classList.toggle('expanded', isExpanded);
    handle.classList.toggle('hidden', isExpanded);

    // Add/remove click-outside listener
    if (isExpanded) {
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100); // Small delay to prevent immediate closure
    } else {
      document.removeEventListener('click', handleClickOutside);
    }
  }

  function handleClickOutside(event) {
    // Don't close if clicking inside the toggle
    if (toggle.contains(event.target)) {
      return;
    }

    // Close the panel
    if (isExpanded) {
      togglePanel();
    }
  }

  handle.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);

  button.addEventListener('click', () => {
    const url = new URL(window.location);
    url.searchParams.set('auth', currentState ? 'off' : 'on');
    window.location.href = url.toString();
  });

  // Assemble toggle
  toggle.appendChild(handle);
  toggle.appendChild(header);
  toggle.appendChild(stateLabel);
  toggle.appendChild(button);

  // Cleanup function for proper resource management
  function cleanup() {
    document.removeEventListener('click', handleClickOutside);
  }

  // Store cleanup function for potential future use
  toggle.cleanup = cleanup;

  // Add to page with animation
  document.body.appendChild(toggle);

  setTimeout(() => {
    toggle.classList.add('visible');
    // Show handle with a subtle bounce animation after delay
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

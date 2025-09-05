/* eslint-disable import/no-cycle */
/**
 * Gated content view restriction system for author preview
 * Production protection handled by Akamai EdgeWorker
 *
 * Gating System (case-insensitive):
 * - Page: gated=true + teaser (entire page protected with custom modal)
 *         gated=true without teaser (fallback to DEFAULT_LOGIN_TEASER_FRAGMENT)
 * - Section: view=logged-in/logged-out in metadata or data-view
 * - Block: logged-in/logged-out CSS classes
 *
 * Auth States: ?auth=true/false or no param (preview mode)
 */

import { createElement, checkDomain } from '../utils.js';
import { loadFragment } from '../../blocks/fragment/fragment.js';
import { loadCSS } from '../aem.js';

// Default login teaser fragment for gated pages without custom teaser
const DEFAULT_LOGIN_TEASER_FRAGMENT = '/fragments/teasers/login';

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
 * @returns {boolean|null} True = authenticated, false = anonymous, null = preview mode (show all)
 */
function getAuthState() {
  const urlParams = new URLSearchParams(window.location.search);
  const authValue = urlParams.get('auth');

  if (!authValue) {
    return null;
  }

  if (authValue === 'false') {
    return false;
  }

  return true;
}

/**
 * Check for page-level gating metadata
 * @returns {Object} Gating metadata with isPageGated, isGatedWithoutTeaser, and gatingType
 */
function checkPageLevelGating() {
  const gatedMeta = document.querySelector('meta[name="gated"]');
  const pageTeaserMeta = document.querySelector('meta[name="teaser"]');
  const gatedContent = gatedMeta?.getAttribute('content');
  const teaserContent = pageTeaserMeta?.getAttribute('content');
  const hasTeaser = pageTeaserMeta && teaserContent && teaserContent.trim();
  const isGatedTrue = gatedContent?.toLowerCase() === 'true';
  const isPageGated = isGatedTrue && hasTeaser;
  const isGatedWithoutTeaser = isGatedTrue && !hasTeaser;

  return {
    isPageGated,
    isGatedWithoutTeaser,
    teaserPath: teaserContent,
    hasAnyGating: isGatedTrue,
    gatingType: isGatedTrue ? 'logged-in' : null,
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
 * Show login modal with teaser fragment
 */
async function applyPageLevelProtection(teaserPath) {
  const { openModal } = await import('../../blocks/modal/modal.js');
  const normalizedPath = normalizeFragmentPath(teaserPath);
  openModal(normalizedPath);
}

function getText(element) {
  return element.textContent?.trim() || '';
}

/**
 * Get view restriction from metadata container (case-insensitive)
 * @param {Element} metadataEl - Metadata container element
 * @returns {string|null} View restriction ('logged-in', 'logged-out', or null)
 */
function getViewRestriction(metadataEl) {
  const rows = metadataEl.querySelectorAll(':scope > div');
  // eslint-disable-next-line no-restricted-syntax
  for (const row of rows) {
    const cells = row.querySelectorAll(':scope > div');
    if (cells.length === 2) {
      const keyText = getText(cells[0]);
      const valueText = getText(cells[1]);
      if (keyText === 'view') {
        return valueText.toLowerCase();
      }
    }
  }
  return null;
}

/**
 * Get view restriction from section data attributes (case-insensitive)
 * @param {Element} sectionEl - Section element
 * @returns {string|null} View restriction ('logged-in', 'logged-out', or null)
 */
function getSectionViewRestriction(sectionEl) {
  return sectionEl.dataset.view?.toLowerCase() || null;
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
 * Parse view-restricted content from plain HTML
 */
function parseTeasersFromPlainHtml(doc) {
  const sectionTeasers = [];
  const loggedInSections = [];
  const loggedOutSections = [];

  const allSections = doc.body.querySelectorAll(':scope > div');
  allSections.forEach((section, sectionIndex) => {
    const metadataEl = section.querySelector('.section-metadata');
    if (metadataEl) {
      const viewRestriction = getViewRestriction(metadataEl);
      const teaserPath = extractTeaserPath(metadataEl);

      if (viewRestriction === 'logged-in') {
        if (teaserPath) {
          sectionTeasers.push({ index: sectionIndex, teaserPath, originalMetadata: metadataEl });
        } else {
          loggedInSections.push({ index: sectionIndex, originalMetadata: metadataEl });
        }
      } else if (viewRestriction === 'logged-out') {
        loggedOutSections.push({ index: sectionIndex, originalMetadata: metadataEl });
      }
    }
  });

  return {
    sectionTeasers,
    loggedInSections,
    loggedOutSections,
  };
}

/**
 * Helper function to process section view restrictions consistently
 * @param {Element} section - Section element to check
 * @param {boolean} isAuthenticated - Current authentication state
 * @param {Array} sectionsWithTeasers - Array to collect sections with teasers
 * @param {Array} sectionsToRemove - Array to collect sections to remove
 */
function processSectionViewRestriction(
  section,
  isAuthenticated,
  sectionsWithTeasers,
  sectionsToRemove,
) {
  // Check both data attributes and metadata
  let viewRestriction = getSectionViewRestriction(section);
  let teaserPath = section.dataset.teaser;

  // If no data attributes, check section metadata
  if (!viewRestriction) {
    const sectionMetadata = section.querySelector('.section-metadata');
    if (sectionMetadata) {
      viewRestriction = getViewRestriction(sectionMetadata);
      teaserPath = teaserPath || extractTeaserPath(sectionMetadata);
    }
  }

  // Apply view restriction logic
  if (!isAuthenticated && viewRestriction === 'logged-in') {
    if (teaserPath) {
      const alreadyExists = sectionsWithTeasers.some((item) => item.element === section);
      if (!alreadyExists) {
        sectionsWithTeasers.push({ element: section, teaserPath });
      }
    } else {
      const alreadyExists = sectionsToRemove.some((item) => item.element === section);
      if (!alreadyExists) {
        sectionsToRemove.push({ element: section });
      }
    }
  } else if (isAuthenticated && viewRestriction === 'logged-out') {
    const alreadyExists = sectionsToRemove.some((item) => item.element === section);
    if (!alreadyExists) {
      sectionsToRemove.push({ element: section });
    }
  }
}

/**
 * Check section and block level view restrictions
 */
async function checkSectionLevelProtection(isAuthenticated) {
  const sectionsWithTeasers = [];
  const sectionsToRemove = [];

  const sections = document.querySelectorAll('main > div');

  const plainDoc = await fetchPlainHtml();
  if (plainDoc) {
    const {
      sectionTeasers,
      loggedInSections,
      loggedOutSections,
    } = parseTeasersFromPlainHtml(plainDoc);

    if (!isAuthenticated) {
      if (sectionTeasers.length > 0) {
        sectionTeasers.forEach((sectionData) => {
          if (sections[sectionData.index]) {
            sectionsWithTeasers.push({
              element: sections[sectionData.index],
              teaserPath: sectionData.teaserPath,
            });
          }
        });
      }

      if (loggedInSections.length > 0) {
        loggedInSections.forEach((sectionData) => {
          if (sections[sectionData.index]) {
            sectionsToRemove.push({
              element: sections[sectionData.index],
            });
          }
        });
      }
    }

    if (isAuthenticated && loggedOutSections.length > 0) {
      loggedOutSections.forEach((sectionData) => {
        if (sections[sectionData.index]) {
          sectionsToRemove.push({
            element: sections[sectionData.index],
          });
        }
      });
    }
  }

  // Process current page sections for view restrictions
  sections.forEach((section) => {
    processSectionViewRestriction(section, isAuthenticated, sectionsWithTeasers, sectionsToRemove);
  });

  sections.forEach((section) => {
    checkBlockProtectionInSection(section, isAuthenticated);
  });

  const result = {
    isProtected: sectionsWithTeasers.length > 0
      || sectionsToRemove.length > 0,
    sections: sectionsWithTeasers,
    sectionsToRemove,
  };

  return result;
}

/**
 * Check block-level view restrictions within a section
 */
function checkBlockProtectionInSection(section, isAuthenticated) {
  const allBlocks = section.querySelectorAll('[class]');
  const viewRestrictedBlocks = Array.from(allBlocks).filter((block) => {
    const classNames = Array.from(block.classList).map((c) => c.toLowerCase());
    return classNames.includes('logged-in') || classNames.includes('logged-out');
  });

  viewRestrictedBlocks.forEach((block) => {
    const classNames = Array.from(block.classList).map((c) => c.toLowerCase());
    if (!isAuthenticated && classNames.includes('logged-in')) {
      block.remove();
    } else if (isAuthenticated && classNames.includes('logged-out')) {
      block.remove();
    }
  });
}

/**
 * Apply section-level protection
 */
async function applySectionLevelProtection(protectionMetadata) {
  await Promise.all(protectionMetadata.sections.map(async (sectionData) => {
    const normalizedPath = normalizeFragmentPath(sectionData.teaserPath);
    const fragmentElement = await loadFragment(normalizedPath);
    if (fragmentElement) {
      sectionData.element.replaceWith(...fragmentElement.children);
    }
  }));

  protectionMetadata.sectionsToRemove.forEach((sectionData) => {
    sectionData.element.remove();
  });
}

/**
 * Apply content protection for author preview
 */
async function applyContentProtection() {
  if (!isAuthorPreviewMode()) {
    return;
  }

  const pageProtectionMetadata = checkPageLevelGating();

  const authState = getAuthState();

  if (authState === null) {
    return;
  }

  const isAuthenticated = authState;

  // Handle page-level protection
  if (pageProtectionMetadata.isPageGated) {
    const { gatingType, teaserPath } = pageProtectionMetadata;

    if (gatingType === 'logged-in' && !isAuthenticated) {
      await applyPageLevelProtection(teaserPath);
    }
  }

  // Handle gated=true but missing teaser (fallback to default login modal)
  if (pageProtectionMetadata.isGatedWithoutTeaser && !isAuthenticated) {
    await applyPageLevelProtection(DEFAULT_LOGIN_TEASER_FRAGMENT);
  }

  // ALWAYS apply section/block protection regardless of page-level protection
  // This ensures login-teaser blocks and other sensitive content is properly protected
  const sectionProtectionMetadata = await checkSectionLevelProtection(isAuthenticated);
  if (sectionProtectionMetadata.isProtected) {
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
    title: 'Click to expand or drag to move',
  }, handleIcon);

  const headerText = createElement('span', {}, 'Auth Toggle');
  const closeBtn = createElement('button', {
    class: 'auth-preview-close',
    'aria-label': 'Close preview panel',
  }, '×');

  const header = createElement('div', {
    class: 'auth-preview-header',
  }, headerText, closeBtn);

  // Handle three states: null (preview), true (authenticated), false (anonymous)
  let stateClass;
  let stateText;
  if (currentState === null) {
    stateClass = 'preview';
    stateText = 'Preview Mode';
  } else if (currentState === true) {
    stateClass = 'authenticated';
    stateText = 'Logged-In View';
  } else {
    stateClass = 'anonymous';
    stateText = 'Logged-Out View';
  }

  const stateLabel = createElement('div', {
    class: `auth-preview-state ${stateClass}`,
  }, stateText);

  // Create three option buttons
  const optionsContainer = createElement('div', {
    class: 'auth-preview-options',
  });

  const previewButton = createElement('button', {
    class: `auth-option-button ${currentState === null ? 'active' : ''}`,
    'data-auth-state': 'preview',
  }, 'Preview All');

  const authenticatedButton = createElement('button', {
    class: `auth-option-button ${currentState === true ? 'active' : ''}`,
    'data-auth-state': 'authenticated',
  }, 'Logged-In View');

  const anonymousButton = createElement('button', {
    class: `auth-option-button ${currentState === false ? 'active' : ''}`,
    'data-auth-state': 'anonymous',
  }, 'Logged-Out View');

  optionsContainer.append(previewButton, anonymousButton, authenticatedButton);

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

  // Drag functionality
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialX = 0;
  let initialY = 0;

  function startDrag(e) {
    e.preventDefault();
    isDragging = false; // Will be set to true if actually dragging

    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;

    dragStartX = clientX;
    dragStartY = clientY;

    const rect = toggle.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', onDrag);
    document.addEventListener('touchend', endDrag);
  }

  function onDrag(e) {
    e.preventDefault();

    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;

    const deltaX = clientX - dragStartX;
    const deltaY = clientY - dragStartY;

    if (!isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      isDragging = true;
      toggle.classList.add('dragging');
    }

    if (isDragging) {
      const newX = initialX + deltaX;
      const newY = initialY + deltaY;

      // Constrain to viewport
      const maxX = window.innerWidth - toggle.offsetWidth;
      const maxY = window.innerHeight - toggle.offsetHeight;

      const constrainedX = Math.max(0, Math.min(newX, maxX));
      const constrainedY = Math.max(0, Math.min(newY, maxY));

      toggle.style.left = `${constrainedX}px`;
      toggle.style.top = `${constrainedY}px`;
      toggle.style.right = 'auto';
    }
  }

  function endDrag() {
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('touchend', endDrag);

    if (isDragging) {
      toggle.classList.remove('dragging');
      isDragging = false;
    } else {
      togglePanel();
    }
  }

  handle.addEventListener('mousedown', startDrag);
  handle.addEventListener('touchstart', startDrag);
  closeBtn.addEventListener('click', togglePanel);

  function handleOptionClick(targetState) {
    const url = new URL(window.location);

    if (targetState === 'preview') {
      url.searchParams.delete('auth');
    } else if (targetState === 'authenticated') {
      url.searchParams.set('auth', 'true');
    } else if (targetState === 'anonymous') {
      url.searchParams.set('auth', 'false');
    }

    window.location.href = url.toString();
  }

  previewButton.addEventListener('click', () => handleOptionClick('preview'));
  authenticatedButton.addEventListener('click', () => handleOptionClick('authenticated'));
  anonymousButton.addEventListener('click', () => handleOptionClick('anonymous'));

  toggle.appendChild(handle);
  toggle.appendChild(header);
  toggle.appendChild(stateLabel);
  toggle.appendChild(optionsContainer);

  function cleanup() {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('touchend', endDrag);
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

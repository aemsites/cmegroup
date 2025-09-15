/* eslint-disable import/no-cycle */
/**
 * Client-side gated content system for author/development environments only.
 * Production protection handled by EdgeWorker.
 *
 * Gating: page gated=true flag, section view=logged-in/out, block CSS classes
 * Auth: ?auth=true (authenticated) or false/unset (anonymous)
 */

import { checkDomain } from '../utils.js';
import { createAuthToggle } from '../../blocks/auth-toggle/auth-toggle.js';

/**
 * @returns {boolean} True if author/development environment
 */
function isAuthorEnvironment() {
  const domainInfo = checkDomain(window.location);
  if (domainInfo.isPreview || domainInfo.isReviews) {
    return true;
  }

  return false;
}

/**
 * @returns {boolean} True = authenticated, false = anonymous
 */
function getAuthState() {
  const authValue = new URLSearchParams(window.location.search).get('auth');
  return authValue === 'true';
}

// Check for gated=true metadata flag
function hasGatedContent() {
  const gatedMeta = document.querySelector('meta[name="gated"]');
  const gatedContent = gatedMeta?.getAttribute('content');
  return gatedContent?.toLowerCase() === 'true';
}

function getSectionViewRestriction(sectionEl) {
  return sectionEl.dataset.view?.toLowerCase() || null;
}

function processSectionViewRestriction(
  section,
  isAuthenticated,
  sectionsToRemove,
) {
  const viewRestriction = getSectionViewRestriction(section);

  const shouldRemove = (
    (!isAuthenticated && viewRestriction === 'logged-in')
    || (isAuthenticated && viewRestriction === 'logged-out')
  );

  if (shouldRemove && !sectionsToRemove.some((item) => item.element === section)) {
    sectionsToRemove.push({ element: section });
  }
}

function checkSectionLevelProtection(isAuthenticated) {
  const sectionsToRemove = [];
  const sections = document.querySelectorAll('main > div');

  // Check data-view attributes (authoritative source after AEM processing)
  sections.forEach((section) => {
    processSectionViewRestriction(section, isAuthenticated, sectionsToRemove);
  });

  return { sectionsToRemove };
}

function checkBlockProtectionInSection(section, isAuthenticated) {
  const restrictedBlocks = section.querySelectorAll('.logged-in, .logged-out');

  restrictedBlocks.forEach((block) => {
    const hasLoggedIn = block.classList.contains('logged-in');
    const hasLoggedOut = block.classList.contains('logged-out');

    if ((!isAuthenticated && hasLoggedIn) || (isAuthenticated && hasLoggedOut)) {
      block.remove();
    }
  });
}

function applySectionLevelProtection(protectionMetadata, isAuthenticated) {
  // First remove restricted sections
  protectionMetadata.sectionsToRemove.forEach((sectionData) => {
    sectionData.element.remove();
  });

  // Then check blocks only in public sections (sections without view restrictions)
  const remainingSections = document.querySelectorAll('main > div');
  const publicSections = Array.from(remainingSections).filter((section) => {
    const viewRestriction = getSectionViewRestriction(section);
    // Only include sections with no view restriction (public sections)
    return viewRestriction === null;
  });

  publicSections.forEach((section) => {
    checkBlockProtectionInSection(section, isAuthenticated);
  });
}

/**
 * Apply content protection in author/dev environments only
 */
function applyContentProtection() {
  if (!isAuthorEnvironment()) {
    return;
  }

  if (!hasGatedContent()) {
    return;
  }

  const isAuthenticated = getAuthState();
  const sectionProtectionMetadata = checkSectionLevelProtection(isAuthenticated);

  // Always run section and block protection
  applySectionLevelProtection(sectionProtectionMetadata, isAuthenticated);
}

async function createAuthorToggle() {
  if (!isAuthorEnvironment()) return undefined;
  return createAuthToggle();
}

/**
 * Initialize content protection when DOM ready
 */
function initContentProtection() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      applyContentProtection();
      await createAuthorToggle();
    });
  } else {
    applyContentProtection();
    createAuthorToggle();
  }
}

export {
  isAuthorEnvironment,
  getAuthState,
  hasGatedContent,
  applyContentProtection,
  initContentProtection,
};

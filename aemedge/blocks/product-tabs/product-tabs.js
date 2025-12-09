/*
 * Product Tabs block
 * - Parses authored rows: Label | URL (anchor)
 * - Supports extensionless URLs and absolute links; uses anchor.pathname
 * - Auto-generates tabs using a canonical order if no rows are authored
 * - Renders a crawlable nav with real links and active-state highlighting
 */

import { toClassName } from '../../scripts/aem.js';
import { i18n } from '../../scripts/utils.js';
import { store } from '../../scripts/store/store.js';

const CANONICAL_ORDER = ['overview', 'quotes', 'settlements', 'volume', 'specs', 'margins', 'calendar'];

function stripTrailingSlash(pathname) {
  if (!pathname) return '';
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function normalizePath(pathname) {
  try {
    // Ensure we only compare paths; remove any trailing slash except for root
    return stripTrailingSlash(new URL(pathname, window.location.origin).pathname);
  } catch (e) {
    return stripTrailingSlash(pathname);
  }
}

function isEquivalentToTab(currentPath, linkPath) {
  // Check if current path matches the tab link or its variants
  const cur = normalizePath(currentPath);
  const link = normalizePath(linkPath);

  // Exact match
  if (cur === link) return true;

  // For overview tab: /corn/overview should also match /corn (root)
  if (link.endsWith('/overview')) {
    const root = stripTrailingSlash(link.replace(/\/overview$/, ''));
    return cur === root || cur === link;
  }

  // For other tabs: /corn/quotes should also match /corn/quotes/options
  return cur === normalizePath(`${link}/options`);
}

function computeProductRoot(pathname) {
  const path = normalizePath(pathname);
  const segs = path.split('/').filter((s) => s);
  if (segs.length === 0) return '/';
  // If on a tab page like /.../corn/quotes, product root is without the last segment
  // Otherwise if on product root already, keep as-is
  const last = segs[segs.length - 1];
  const isKnownTab = CANONICAL_ORDER.includes(toClassName(last));
  return `/${(isKnownTab ? segs.slice(0, -1) : segs).join('/')}`;
}

function parseAuthoredRows(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  const productRoot = computeProductRoot(window.location.pathname);

  const items = rows.map((row) => {
    const cols = row.children ? [...row.children] : [];
    const label = cols[0] ? cols[0].textContent.trim() : '';

    if (!label || !cols[1]) return null;

    // Get value from second column - could be anchor link or plain text
    const a = cols[1].querySelector('a');
    const rawValue = a ? (a.getAttribute('href') || a.textContent.trim()) : cols[1].textContent.trim();

    if (!rawValue) return null;

    // Determine if it's a relative path
    const isRelative = !rawValue.startsWith('/') && !rawValue.includes('://');

    let href = '';
    if (isRelative) {
      // Relative path like "quotes", "settlements", or "overview"
      const relativePath = toClassName(rawValue);
      // All tabs including overview get their own page path
      href = `${productRoot}/${relativePath}`;
    } else if (rawValue.includes('://')) {
      // Full URL - extract pathname
      try {
        href = new URL(rawValue).pathname;
      } catch (e) {
        href = rawValue;
      }
    } else {
      // Absolute path starting with /
      href = rawValue;
    }

    const key = toClassName(label);
    return label && href ? { key, label, href: normalizePath(href) } : null;
  }).filter(Boolean);
  return items;
}

async function buildFromCanonical(pathname) {
  const root = computeProductRoot(pathname);

  const [overview, quotes, settlements, volume, specs, margins, calendar] = await Promise.all([
    i18n('Overview'),
    i18n('Quotes'),
    i18n('Settlements'),
    i18n('Volume'),
    i18n('Contract Specs'),
    i18n('Margins'),
    i18n('Calendar'),
  ]);

  const labels = {
    overview, quotes, settlements, volume, specs, margins, calendar,
  };

  const items = CANONICAL_ORDER.map((key) => {
    // All tabs including overview should have their own page path
    const href = `${root}/${key}`;
    return { key, label: labels[key] || key, href: normalizePath(href) };
  });
  return items;
}

/**
 * Scrolls the active tab into view with smooth behavior
 * Positions the active tab to show 2-3 neighboring tabs on each side
 */
function scrollActiveTabIntoView(nav, callback) {
  const activeLink = nav.querySelector('.is-active');
  if (!activeLink) return;

  // Get measurements
  const navRect = nav.getBoundingClientRect();
  const linkRect = activeLink.getBoundingClientRect();

  // Get padding from the tabs list to account for it in scroll calculation
  const list = nav.querySelector('.product-tabs-list');
  const listStyles = window.getComputedStyle(list);
  const leftPadding = parseFloat(listStyles.paddingLeft) || 0;
  const rightPadding = parseFloat(listStyles.paddingRight) || 0;

  // Right gradient width (1rem = 16px)
  const rightGradientWidth = 16;

  // Calculate where the link currently is in the viewport
  const currentLinkLeft = linkRect.left - navRect.left;
  const currentLinkRight = linkRect.right - navRect.left;
  const linkWidth = linkRect.width;

  // Target: center the active tab's center at ~35% from the left edge
  // This shows 1-2 tabs on the left and 3-4 tabs on the right
  // Add left padding to ensure tabs don't get cut off by the padding
  const targetPosition = navRect.width * 0.35 + leftPadding;
  const linkCenter = currentLinkLeft + (linkWidth / 2);

  // Calculate how much we need to scroll
  let scrollOffset = linkCenter - targetPosition;

  // Check if the link would be too close to the right edge (gradient area)
  // If so, adjust scroll to keep it clear of the right gradient + padding
  const linkRightAfterScroll = currentLinkRight - scrollOffset;
  const rightEdgeClearance = navRect.width - rightGradientWidth - rightPadding;

  if (linkRightAfterScroll > rightEdgeClearance) {
    // Adjust scroll to keep the link's right edge clear of the gradient
    const excessOverlap = linkRightAfterScroll - rightEdgeClearance;
    scrollOffset += excessOverlap;
  }

  // Calculate target scroll position
  let targetScrollLeft = nav.scrollLeft + scrollOffset;

  // Clamp to valid scroll range
  const maxScrollLeft = nav.scrollWidth - nav.clientWidth;
  targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScrollLeft));

  // Only scroll if we're more than 10px away from target
  if (Math.abs(nav.scrollLeft - targetScrollLeft) > 10) {
    nav.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth',
    });

    // Wait for scroll animation to complete, then update indicators and force repaint
    // Use requestAnimationFrame to ensure the browser has updated the scroll position
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (callback) callback();
      });
    });
  } else if (callback) {
    // If no scroll needed, call callback immediately
    callback();
  }
}

/**
 * Updates CSS classes to show/hide gradient indicators based on scroll position
 * - .scrolled: Shows left gradient when scrolled away from start
 * - .scrolled-end: Hides right gradient when scrolled to end
 */
function updateScrollIndicators(nav) {
  const isScrolled = nav.scrollLeft > 10;
  const isScrolledEnd = (nav.scrollWidth - nav.scrollLeft - nav.clientWidth) < 10;

  nav.classList.toggle('scrolled', isScrolled);
  nav.classList.toggle('scrolled-end', isScrolledEnd);
}

function renderNav(block, items) {
  const currentPath = normalizePath(window.location.pathname);
  block.classList.add('container');
  const nav = document.createElement('nav');
  nav.className = 'product-tabs-nav';
  nav.setAttribute('aria-label', 'Product tabs');

  const list = document.createElement('ul');
  list.className = 'product-tabs-list';

  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'product-tabs-item';
    const a = document.createElement('a');
    a.href = item.href;
    a.textContent = item.label;

    const linkPath = normalizePath(item.href);
    const active = (currentPath === linkPath) || isEquivalentToTab(currentPath, linkPath);
    if (active) a.classList.add('is-active');

    li.appendChild(a);
    list.appendChild(li);
  });

  nav.appendChild(list);

  // Replace block content with nav
  // Safe because decorate() is protected by dataset.decorated check
  block.innerHTML = '';
  block.appendChild(nav);

  // Scroll active tab into view and setup scroll indicators
  // Use setTimeout to ensure DOM is fully rendered before scrolling
  setTimeout(() => {
    scrollActiveTabIntoView(nav, () => {
      // Force style recalculation and repaint after scroll completes
      updateScrollIndicators(nav);
      // Trigger reflow to ensure gradients are refreshed
      nav.offsetHeight; // eslint-disable-line no-unused-expressions
    });
    // Initial indicator update
    updateScrollIndicators(nav);
  }, 100);

  // Update gradient indicators on scroll
  nav.addEventListener('scroll', () => {
    updateScrollIndicators(nav);
  });

  // Listen for SPA navigation (URL changes without page reload)
  // Update active state and scroll position when navigating between tabs
  const handleNavigation = () => {
    const newPath = normalizePath(window.location.pathname);
    const links = nav.querySelectorAll('a');

    links.forEach((link) => {
      const linkPath = normalizePath(new URL(link.href).pathname);
      const active = (newPath === linkPath) || isEquivalentToTab(newPath, linkPath);
      if (active) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });

    // Scroll the newly active tab into view
    setTimeout(() => {
      scrollActiveTabIntoView(nav, () => {
        // Force style recalculation and repaint after scroll completes
        updateScrollIndicators(nav);
        // Trigger reflow to ensure gradients are refreshed
        nav.offsetHeight; // eslint-disable-line no-unused-expressions
      });
      // Initial indicator update
      updateScrollIndicators(nav);
    }, 50);
  };

  // Listen for browser back/forward navigation
  window.addEventListener('popstate', handleNavigation);

  // Listen for link clicks within the nav (for SPA navigation)
  nav.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) {
      // Wait for the SPA framework to update the URL and active state
      setTimeout(handleNavigation, 50);
    }
  });
}

export default async function decorate(block) {
  // Try authored rows first
  let items = parseAuthoredRows(block);
  if (!items.length) {
    items = await buildFromCanonical(window.location.pathname);
  }

  // If already rendered, just update active state and scroll
  const nav = block.querySelector('.product-tabs-nav');
  if (nav && block.dataset.decorated === 'true') {
    const currentPath = normalizePath(window.location.pathname);
    const links = nav.querySelectorAll('a');

    links.forEach((link) => {
      const linkPath = normalizePath(new URL(link.href).pathname);
      if (linkPath === currentPath) {
        link.classList.add('is-active');
        // Scroll active tab into view
        setTimeout(() => {
          scrollActiveTabIntoView(nav, () => {
            // Force style recalculation and repaint after scroll completes
            updateScrollIndicators(nav);
            // Trigger reflow to ensure gradients are refreshed
            nav.offsetHeight; // eslint-disable-line no-unused-expressions
          });
          // Initial indicator update
          updateScrollIndicators(nav);
        }, 100);
      } else {
        link.classList.remove('is-active');
      }
    });
    return;
  }

  // First time render
  store.subscribe(({ productData }) => productData, ({ loaded, productId, isActive }) => {
    if (loaded) {
      const newItems = items.filter(
        ({ key }) => (productId
          ? isActive || ['overview', 'specs', 'calendar'].includes(key)
          : key === 'overview'),
      );
      renderNav(block, newItems);
    }
  });
  store.subscribe(({ floatingElements }) => floatingElements, ({ height }) => {
    const container = block.closest('.product-tabs-container');
    container.style.top = `${height}px`;
  });

  // Mark as decorated
  block.dataset.decorated = 'true';
}

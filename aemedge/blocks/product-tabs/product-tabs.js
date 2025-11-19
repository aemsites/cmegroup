/*
 * Product Tabs block
 * - Parses authored rows: Label | URL (anchor)
 * - Supports extensionless URLs and absolute links; uses anchor.pathname
 * - Auto-generates tabs using a canonical order if no rows are authored
 * - Renders a crawlable nav with real links and active-state highlighting
 */

import { toClassName } from '../../scripts/aem.js';
import { i18n } from '../../scripts/utils.js';

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

function renderNav(block, items) {
  const currentPath = normalizePath(window.location.pathname);
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
}

export default async function decorate(block) {
  // Protect against multiple decoration calls
  if (block.dataset.decorated === 'true') {
    return;
  }

  // Try authored rows first
  let items = parseAuthoredRows(block);
  if (!items.length) {
    items = await buildFromCanonical(window.location.pathname);
  }

  renderNav(block, items);

  // Mark as decorated
  block.dataset.decorated = 'true';
}

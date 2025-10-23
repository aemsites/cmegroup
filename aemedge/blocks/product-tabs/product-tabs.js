/*
 * Product Tabs block
 * - Parses authored rows: Label | URL (anchor)
 * - Supports extensionless URLs and absolute links; uses anchor.pathname
 * - Auto-generates tabs using a canonical order if no rows are authored
 * - Renders a crawlable nav with real links and active-state highlighting
 */

import { toClassName } from '../../scripts/aem.js';

const CANONICAL_ORDER = ['overview', 'quotes', 'settlements', 'volume', 'specs', 'margins', 'calendar'];
const CANONICAL_LABELS = {
  overview: 'Overview',
  quotes: 'Quotes',
  settlements: 'Settlements',
  volume: 'Volume',
  specs: 'Contract Specs',
  margins: 'Margins',
  calendar: 'Calendar',
};

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
  // Treat /product, /product/overview, and /product/<tab>/options as active for the tab link
  const cur = normalizePath(currentPath);
  const link = normalizePath(linkPath);
  if (link.endsWith('/overview')) {
    const root = stripTrailingSlash(link.replace(/\/overview$/, ''));
    return cur === root || cur === link || cur === `${root}/options`;
  }
  const linkRoot = link;
  return cur === linkRoot
    || cur === normalizePath(`${linkRoot}/overview`)
    || cur === normalizePath(`${linkRoot}/options`);
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
  const items = rows.map((row) => {
    const cols = row.children ? [...row.children] : [];
    const label = cols[0] ? cols[0].textContent.trim() : '';
    const a = cols[1] ? cols[1].querySelector('a') : null;
    const href = a ? a.pathname : '';
    const key = toClassName(label);
    return label && href ? { key, label, href: normalizePath(href) } : null;
  }).filter(Boolean);
  return items;
}

function buildFromCanonical(pathname) {
  const root = computeProductRoot(pathname);
  const items = CANONICAL_ORDER.map((key) => {
    const href = key === 'overview' ? root : `${root}/${key}`;
    return { key, label: CANONICAL_LABELS[key] || key, href: normalizePath(href) };
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
  block.innerHTML = '';
  block.appendChild(nav);
}

export default async function decorate(block) {
  // Try authored rows first
  let items = parseAuthoredRows(block);
  if (!items.length) {
    items = buildFromCanonical(window.location.pathname);
  }
  renderNav(block, items);

  // SPA-like enhancement on product root for hash deep-links
  // No template-level behavior here; nav-only block.
}

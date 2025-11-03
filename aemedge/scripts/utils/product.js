import { getMetadata } from '../aem.js';

let PRODUCT_INDEX_CACHE = null;

export function normalizePath(pathname) {
  try {
    const url = new URL(pathname, window.location.origin);
    const p = url.pathname;
    return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
  } catch (e) {
    return pathname;
  }
}

export function computeProductRoot(pathname) {
  const path = normalizePath(pathname);
  const segs = path.split('/').filter((s) => s);
  if (!segs.length) return '/';
  let trimmed = [...segs];
  if ((trimmed[trimmed.length - 1] || '').toLowerCase() === 'options') {
    trimmed = trimmed.slice(0, -1);
  }
  const TABS = ['overview', 'quotes', 'settlements', 'volume', 'specs', 'margins', 'calendar'];
  if (TABS.includes((trimmed[trimmed.length - 1] || '').toLowerCase())) {
    trimmed = trimmed.slice(0, -1);
  }
  return `/${trimmed.join('/')}`;
}

export async function loadProductIndex() {
  if (PRODUCT_INDEX_CACHE) return PRODUCT_INDEX_CACHE;
  try {
    const resp = await fetch('/product-index.json');
    if (!resp.ok) return null;
    const json = await resp.json();
    PRODUCT_INDEX_CACHE = json;
    return PRODUCT_INDEX_CACHE;
  } catch (e) {
    return null;
  }
}

export async function getProductMetadata() {
  const context = {
    productId: getMetadata('product-id') || '',
    productName: getMetadata('product') || '',
    productSymbol: getMetadata('product-symbol') || '',
  };
  if (context.productId && context.productName) return context;

  const index = await loadProductIndex();
  if (!index || !Array.isArray(index.data)) return context;
  const productRoot = computeProductRoot(window.location.pathname);
  const row = index.data.find((r) => normalizePath(r.path) === normalizePath(productRoot));
  if (row) {
    context.productId = context.productId || row.productId || '';
    context.productName = context.productName || row.product || '';
    context.productSymbol = context.productSymbol || row.productSymbol || '';
  }
  return context;
}

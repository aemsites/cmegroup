import { getMetadata } from '../aem.js';
import { getIndexedContent } from '../indexing.js';

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

/**
 * Load product index using universal search API
 * Fetches all product pages dynamically instead of static JSON
 * Returns: { data: [{ path, productId, product, productSymbol }] }
 */
export async function loadProductIndex() {
  if (PRODUCT_INDEX_CACHE) return PRODUCT_INDEX_CACHE;
  
  try {
    // Query for all product pages using universal search API
    const indexFilter = {
      templates: ['Product'],
      basePaths: ['/markets'],
      limit: 1000,
      orderBy: 'path',
      sortDirection: 'asc',
    };
    
    const results = await getIndexedContent(indexFilter);
    
    // Transform search API response to match expected format
    const transformedData = {
      data: results.map((item) => ({
        path: item.path,
        productId: item.metadata?.['product-id'] || '',
        product: item.metadata?.product || item.title || '',
        // productSymbol not in search results - falls back to HTML meta tags
        productSymbol: item.metadata?.['product-symbol'] || '',
      })),
    };
    
    PRODUCT_INDEX_CACHE = transformedData;
    return PRODUCT_INDEX_CACHE;
  } catch (e) {
    // Silent fail - return null to allow fallback behavior
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

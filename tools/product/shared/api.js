/**
 * DA Admin API wrapper
 * Handles all API calls to DA Admin endpoints
 */

const API_BASE = {
  SOURCE: 'https://admin.da.live/source',
  COPY: 'https://admin.da.live/copy',
};

/**
 * Copy a folder or file from source to destination
 */
export async function copyResource(token, org, site, sourcePath, destinationPath) {
  const sourceUrl = `${API_BASE.COPY}/${org}/${site}/${sourcePath}`;
  const formData = new FormData();
  formData.append('destination', `/${org}/${site}/${destinationPath}`);

  const response = await fetch(sourceUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return response;
}

/**
 * Create or update HTML content via DA Source API
 */
export async function createOrUpdateHTML(token, org, site, path, htmlContent) {
  const sourceUrl = `${API_BASE.SOURCE}/${org}/${site}/${path}`;
  const formData = new FormData();
  formData.append('data', new Blob([htmlContent], { type: 'text/html' }));

  const response = await fetch(sourceUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return response;
}

/**
 * Get HTML content from DA Source API
 */
export async function getHTML(token, org, site, path) {
  const sourceUrl = `${API_BASE.SOURCE}/${org}/${site}/${path}`;

  const response = await fetch(sourceUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  return response.text();
}

/**
 * Check if a product exists at the given path
 * @param {string} token - DA authentication token
 * @param {string} org - Organization name
 * @param {string} site - Site/repo name
 * @param {string} productPath - Path to product (with or without .html)
 * @returns {Promise<boolean>} - True if product exists, false otherwise
 */
export async function checkProductExists(token, org, site, productPath) {
  try {
    const htmlPath = productPath.endsWith('.html') ? productPath : `${productPath}.html`;
    const cleanPath = htmlPath.startsWith('/') ? htmlPath.substring(1) : htmlPath;
    const sourceUrl = `${API_BASE.SOURCE}/${org}/${site}/${cleanPath}`;

    const response = await fetch(sourceUrl, {
      method: 'HEAD',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    // If there's an error, assume it doesn't exist
    return false;
  }
}

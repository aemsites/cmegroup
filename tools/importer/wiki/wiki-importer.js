/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* global WebImporter */
/* eslint-disable no-console, class-methods-use-this */

// Domains for link normalization
const WIKI_SRC_DOMAIN = 'https://cmegroupclientsite.atlassian.net';
const TARGET_DOMAIN = 'https://main--www--cmegroup.aem.page';
// Default hero image used for header and metadata Image field
const HERO_IMAGE = 'https://www.cmegroup.com/content/dam/cmegroup/education/images/2021/q4/education-leadspace-1400x500.jpg';

/**
 * Extract read time from the document
 * Looks for data-vc="read-time" markup
 * @param {Document} document
 * @returns {string|null} Read time (e.g., "3 min") or null if not found
 */
const extractReadTime = (document) => {
  const readTimeElement = document.querySelector('[data-vc="read-time"]');
  if (readTimeElement) {
    const spanText = readTimeElement.querySelector('span:last-child');
    if (spanText && spanText.textContent) {
      return spanText.textContent.trim();
    }
  }
  return null;
};

/**
 * Extract author from the document
 * Looks for data-testid="owner-with-contributors-dropdown-trigger" markup
 * @param {Document} document
 * @returns {string|null} Author name or null if not found
 */
const extractAuthor = (document) => {
  const authorButton = document.querySelector('[data-testid="owner-with-contributors-dropdown-trigger"]');
  if (authorButton) {
    const authorSpan = authorButton.querySelector('.css-11zoi7u');
    if (authorSpan && authorSpan.textContent) {
      // Remove "By " prefix if present
      return authorSpan.textContent.trim().replace(/^By\s+/i, '');
    }
  }
  return null;
};

/**
 * Extract and format date from the document
 * Looks for data-testid="lastEdited-action-container-without-separator" markup
 * @param {Document} document
 * @returns {string|null} ISO 8601 formatted date or null if not found
 */
const extractDate = (document) => {
  const dateContainer = document.querySelector('[data-testid="lastEdited-action-container-without-separator"]');
  if (!dateContainer) return null;

  const dateLink = dateContainer.querySelector('a');
  if (!dateLink || !dateLink.textContent) return null;

  const raw = dateLink.textContent.trim().replace(/^Updated\s+/i, '');

  // Support formats like: "Sep 25", "Sep 25, 2025", "September 25", "September 25, 2025"
  const months = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };

  // Extract parts
  const m = raw.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?$/);
  if (!m) {
    // Fallback: try native Date parsing
    const fallback = new Date(raw);
    if (!Number.isNaN(fallback.getTime())) return fallback.toISOString();
    return null;
  }

  const monthName = m[1].toLowerCase();
  const day = Number(m[2]);
  const month = months[monthName];
  if (month === undefined || Number.isNaN(day)) return null;

  // Use provided year or default to current year
  const year = m[3] ? Number(m[3]) : (new Date()).getUTCFullYear();
  if (Number.isNaN(year)) return null;

  // Normalize time to 04:00:00.000Z as requested
  const iso = new Date(Date.UTC(year, month, day, 4, 0, 0, 0)).toISOString();
  return iso;
};

/**
 * Sanitize wiki page title by removing site suffixes like:
 *  - " - CME Group Client Systems Wiki - Confluence"
 *  - " - Confluence"
 * @param {string} rawTitle
 * @returns {string}
 */
const sanitizeWikiTitle = (rawTitle) => {
  if (!rawTitle) return rawTitle;
  let title = rawTitle.trim();
  title = title.replace(/\s*-\s*CME Group Client Systems Wiki\s*-\s*Confluence\s*$/i, '');
  title = title.replace(/\s*-\s*Confluence\s*$/i, '');
  return title.trim();
};

/**
 * Set metadata for wiki pages
 * @param {Object} meta - Metadata object
 * @param {Document} document
 * @param {string} url - Page URL
 */
const setWikiMetadata = (meta, document) => {
  // Check if this is a Confluence wiki page
  const { body } = document;
  const isConfluencePage = body && body.id === 'com-atlassian-confluence';

  if (!isConfluencePage) {
    return;
  }

  // Extract title from <title> tag and sanitize
  const titleElement = document.querySelector('title');
  if (titleElement && titleElement.textContent) {
    const sanitized = sanitizeWikiTitle(titleElement.textContent);
    meta.Title = sanitized;
    // Per requirement: description should be the same as the title tag
    meta.Description = sanitized;
  }

  // Set template
  meta.Template = 'article';

  // Set sub template
  meta['Sub Template'] = 'text standard';

  // Set Image to the default hero image
  const imgAnchor = document.createElement('a');
  imgAnchor.href = HERO_IMAGE;
  imgAnchor.textContent = imgAnchor.href;
  meta.Image = imgAnchor;

  // Extract and set read time
  const readTime = extractReadTime(document);
  if (readTime) {
    meta['Read Time'] = readTime;
  }

  // Extract and set author
  const author = extractAuthor(document);
  if (author) {
    meta.Author = author;
  }

  // Extract and set date
  const date = extractDate(document);
  if (date) {
    meta.Date = date;
  }
};

/**
 * Remove wiki banners and related elements (cookie consent, spacers)
 * @param {Document} document
 */
const removeWikiBanners = (document) => {
  const selectors = [
    '#AkBanner',
    '[data-testid="cookie-consent-banner"]',
    '[data-testid="banner-spacer"]',
    '[data-vc="banner-container-component"]',
    '[data-vc="banner-spacer-CookiesConsentBanner"]',
  ].join(',');
  document.querySelectorAll(selectors).forEach((el) => el.remove());
};

/**
 * Insert a simple header section at the top: image link, page title, section metadata, HR
 * @param {Document} document
 * @param {Element} main
 * @param {Object} meta
 */
const addWikiSimpleHeader = (document, main, meta) => {
  const fragment = document.createDocumentFragment();

  // 1) Hardcoded hero image link
  const a = document.createElement('a');
  a.href = 'https://www.cmegroup.com/content/dam/cmegroup/education/images/2021/q4/education-leadspace-1400x500.jpg';
  a.textContent = a.href;
  fragment.appendChild(a);

  // 2) Page title (from metadata title)
  let headingEl;
  if (meta?.Title) {
    headingEl = document.createElement('h1');
    headingEl.textContent = meta.Title;
  }
  if (headingEl) fragment.appendChild(headingEl);

  // 3) Section Metadata table: style = full width
  const sectionCells = [['Section Metadata'], ['style', 'full width']];
  const sectionMetaTable = WebImporter.DOMUtils.createTable(sectionCells, document);
  // Prevent DA table decoration from wrapping this block table
  fragment.appendChild(sectionMetaTable);

  // 4) HR separator
  const hr = document.createElement('hr');
  fragment.appendChild(hr);

  // Insert at very top of main
  main.insertBefore(fragment, main.firstChild);
};

/**
 * Wrap every native table in a block table: a table within a table
 * @param {Document} document
 */
const decorateDATables = (document) => {
  const tables = document.querySelectorAll('table');
  if (!tables?.length) return;

  tables.forEach((table) => {
    // Skip header-only or chrome tables (no data cells): remove them
    if (!table.querySelector('td')) { table.remove(); return; }

    // Clone the table element to avoid circular reference
    const tableClone = table.cloneNode(true);

    // Create wrapper table with two rows: 'table' text in row 1, actual table in row 2
    const cells = [
      ['table'],
      [tableClone],
    ];
    const blockTable = WebImporter.DOMUtils.createTable(cells, document);

    table.replaceWith(blockTable);
  });
};

// (wiki image handler removed for now)

/**
 * Insert section-metadata for layout containers with layout/arrange fields.
 * Detects `.layout-section-container` blocks and reads two column widths from
 * `[data-layout-column="true"]` elements via `data-column-width` or inline style.
 * Example output:
 *  [ ['Section Metadata'], ['layout', '70-30'], ['arrange', '1-1'] ]
 * Adds an <hr> right after the metadata block.
 * @param {Document} document
 */
const createLayoutContainer = (document) => {
  const sections = document.querySelectorAll('[data-layout-section="true"][data-layout-columns="2"]');
  if (!sections?.length) return;

  sections.forEach((section) => {
    // If any of the two columns is effectively empty (only NBSP/whitespace and no media/content),
    // skip creating a 70-30 layout and keep content inline (drop the empty column).
    const cols = section.querySelectorAll('[data-layout-column="true"]');
    if (cols?.length === 2) {
      const isBlank = (col) => {
        const text = (col.textContent || '').replace(/\u00a0/g, '').trim();
        const hasContent = col.querySelector('img, table, iframe, video, audio, ul, ol, pre, code, figure, object, embed, a[href]');
        return !hasContent && text === '';
      };
      if (isBlank(cols[0]) || isBlank(cols[1])) {
        // KISS: if both blank, remove; otherwise keep the non-blank column content only
        if (isBlank(cols[0]) && isBlank(cols[1])) {
          section.remove();
        } else {
          const keepCol = isBlank(cols[0]) ? cols[1] : cols[0];
          const div = document.createElement('div');
          div.innerHTML = keepCol.innerHTML;
          section.replaceWith(div);
        }
        return; // next section
      }
    }

    const cells = [
      ['Section Metadata'],
      ['layout', '70-30'],
      ['arrange', '1-1'],
    ];

    const fragment = document.createDocumentFragment();

    const topHr = document.createElement('hr');
    fragment.appendChild(topHr);

    const contentWrapper = document.createElement('div');
    contentWrapper.innerHTML = section.innerHTML;
    fragment.appendChild(contentWrapper);

    const table = WebImporter.DOMUtils.createTable(cells, document);
    fragment.appendChild(table);

    const bottomHr = document.createElement('hr');
    fragment.appendChild(bottomHr);

    section.replaceWith(fragment);
  });
};

/**
 * Presence of Embed macros in the document.
 * @param {Document} document
 * @param {string} pageUrl
 */
const createEmbedBlock = (document) => {
  const embeds = document.querySelectorAll('[data-macro-name="gliffy"], [data-testid="ext-skeleton"]');

  embeds.forEach((node) => {
    const p = document.createElement('p');
    p.textContent = '[embed]';
    node.replaceWith(p);
  });
};

/**
 * Remove unwanted anchors like "back to top" and draft links that break downstream scripts.
 * - Any <a> whose text equals/contains "back to top" (case-insensitive, brackets ignored)
 * - Any <a> with href containing "/pages/resumedraft.action"
 * Removes the enclosing <p> if present; otherwise removes the anchor itself.
 * @param {Document} document
 */
const removeProblemAnchors = (document) => {
  document.querySelectorAll('a[href*="/pages/resumedraft.action"]').forEach((a) => {
    const p = a.closest('p');
    if (p) p.remove(); else a.remove();
  });
};

/**
 * Rewrite anchor hrefs to TARGET_DOMAIN.
 * - Relative and wiki-origin links are rewritten.
 * - Handles hash-only links by prefixing current page path.
 * - Skips mailto:, tel:, javascript:.
 */
const rewriteWikiLinks = (document, pageUrl) => {
  const anchors = document.querySelectorAll('a[href]');
  anchors.forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return;

    try {
      if (href.startsWith('#')) {
        const pagePath = new URL(pageUrl).pathname;
        const newHrefHash = `${TARGET_DOMAIN}${pagePath}${href}`;
        const oldHref = a.getAttribute('href');
        a.setAttribute('href', newHrefHash);
        if (a.textContent === oldHref) a.textContent = newHrefHash;
        return;
      }

      const abs = new URL(href, pageUrl);
      const isRelative = !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href) || href.startsWith('/');
      const isWiki = abs.origin === new URL(WIKI_SRC_DOMAIN).origin;
      if (isRelative || isWiki) {
        const newHref = `${TARGET_DOMAIN}${abs.pathname}${abs.search}${abs.hash}`;
        const oldHref = a.href;
        a.href = newHref;
        if (a.textContent === oldHref) {
          a.textContent = newHref;
        }
      }
    } catch (e) {
      // ignore
    }
  });
};

export default {
  /**
   * Apply DOM operations to the provided document and return
   * the root element to be then transformed to Markdown.
   * @param {HTMLDocument} document The document
   * @param {string} url The url of the page imported
   * @param {string} html The raw html (the document is cleaned up during preprocessing)
   * @param {object} params Object containing some parameters given by the import process.
   * @returns {HTMLElement} The root element to be transformed
   */
  transformDOM: ({
    // eslint-disable-next-line no-unused-vars
    document, url, html, params,
  }) => {
    // define the main element: the one that will be transformed to Markdown
    const main = document.body;

    WebImporter.DOMUtils.remove(main, [
      'header',
      '.header',
      'nav',
      '.nav',
      'footer',
      '.footer',
      'noscript',
      'style',
      '#ak-renderer-extension-overflow-container',
      '#breadcrumbs-space-name',
      '#breadcrumbs-separator',
      '#breadcrumbs-content-title',
      '[data-testid="page-layout-root--skip-links-container"]',
      '[data-testid="object-header-actions-container"]',
      '[data-fabric-macro="c71a9621-9b51-4dca-9210-5d174fb29926"]',
      '#highlight-actions-portal-container',
    ]);

    removeWikiBanners(document);

    // Create and set metadata
    const meta = WebImporter.Blocks.getMetadata(document);
    setWikiMetadata(meta, document);

    // Remove byline/title container after metadata extraction
    WebImporter.DOMUtils.remove(main, [
      '[data-testid="content-title-and-byline"]',
      '#confluence-server-performance',
      '[data-testid="object-sidebar-container"]',
      '#title-text',
      '[data-vc="footer-comments"]',
      '[data-vc="custom-header-footer"]',
      '[data-node-type="mediaInline"]',
      '.atlaskit-portal-container',
    ]);

    // Wrap native tables into block tables
    decorateDATables(document);

    // Remove problem anchors like draft links that break downstream scripts
    removeProblemAnchors(document);

    // Create layout container section metadata blocks
    createLayoutContainer(document);

    // Convert iframes to embed blocks
    createEmbedBlock(document, url);

    // Normalize links to TARGET_DOMAIN (handles hash-only too)
    rewriteWikiLinks(document, url);

    // Add simple header (image link, title, section metadata, hr)
    addWikiSimpleHeader(document, main, meta);

    // Apply standard WebImporter rules
    WebImporter.rules.transformBackgroundImages(main, document);
    // WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
    // WebImporter.rules.convertIcons(main, document);

    // Append metadata block to main
    const metadataBlock = WebImporter.Blocks.getMetadataBlock(document, meta);
    main.append(metadataBlock);

    return main;
  },

  /**
   * Return a path that describes the document being transformed (file name, nesting...).
   * The path is then used to create the corresponding Word document.
   * @param {HTMLDocument} document The document
   * @param {string} url The url of the page imported
   * @param {string} html The raw html (the document is cleaned up during preprocessing)
   * @param {object} params Object containing some parameters given by the import process.
   * @return {string} The path
   */
  generateDocumentPath: ({
    // eslint-disable-next-line no-unused-vars
    document, url, html, params,
  }) => {
    let p = new URL(url).pathname;
    if (p.endsWith('/')) {
      p = `${p}index`;
    }
    return decodeURIComponent(p)
      .toLowerCase()
      .replace(/\.html$/, '')
      .replace(/[^a-z0-9/]/gm, '-');
  },
};

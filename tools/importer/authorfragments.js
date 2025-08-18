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

const DOMAIN = 'https://www.cmegroup.com';

const generateAuthorSlug = (authorName) => {
  let slug = authorName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const maxLength = 50;
  if (slug.length > maxLength) {
    const words = slug.split('-');
    let shortSlug = '';
    words.some((word) => {
      if ((shortSlug ? `${shortSlug}-${word}` : word).length <= maxLength) {
        shortSlug = shortSlug ? `${shortSlug}-${word}` : word;
        return false;
      }
      return true;
    });
    slug = shortSlug || slug.substring(0, maxLength);
  }

  return slug;
};

const extractAuthorInfo = (document, authorInfo) => {
  const authorBio = authorInfo.querySelector('.author-bio');
  let authorTag = null;
  let useExistingTag = false;

  if (authorBio) {
    const authorTags = authorBio.getAttribute('data-author-tags');
    if (authorTags) {
      try {
        const [firstTag] = JSON.parse(authorTags);
        if (firstTag) {
          authorTag = firstTag;
          useExistingTag = true;
        }
      } catch (e) {
        // Silent error handling
      }
    }
  }

  const authorImage = authorInfo.querySelector('.author-image, img');
  let imageUrl = '';
  let imageAlt = '';

  if (authorImage) {
    imageUrl = authorImage.src || authorImage.getAttribute('src') || '';
    imageAlt = authorImage.alt || authorImage.getAttribute('alt') || '';

    if (imageUrl && imageUrl.startsWith('/')) {
      imageUrl = `${DOMAIN}${imageUrl}`;
    }
  }

  const authorEyebrow = authorInfo.querySelector('.author-eyebrow');
  let authorName = authorEyebrow ? authorEyebrow.textContent.trim() : imageAlt || 'Unknown Author';

  authorName = authorName.replace(/\s+/g, ' ').trim();

  if (!useExistingTag && (authorName.length > 50 || authorName.toLowerCase().includes('director') || authorName.toLowerCase().includes('manager'))) {
    const nameParts = authorName.split(/[,-]|director|manager|analyst|vice president|president|head of|chief/i);
    if (nameParts[0] && nameParts[0].trim().length > 0) {
      authorName = nameParts[0].trim();
    }
  }

  const bioContent = authorBio ? authorBio.innerHTML.trim() : '';

  const slug = useExistingTag ? authorTag : generateAuthorSlug(authorName);

  return {
    name: authorName,
    slug,
    useExistingTag,
    imageUrl,
    imageAlt,
    bioContent,
  };
};

const createAuthorFragment = (document, authorData) => {
  const cells = [['Columns (author-bio)']];

  let imageColumn = '';
  if (authorData.imageUrl) {
    let finalImageUrl = authorData.imageUrl;
    if (finalImageUrl.includes('localhost') || finalImageUrl.startsWith('/')) {
      const pathPart = finalImageUrl.replace(/^https?:\/\/[^/]+/, '').replace(/^\/+/, '/');
      finalImageUrl = `${DOMAIN}${pathPart}`;
    }
    imageColumn = `<p><a href="${finalImageUrl}">${finalImageUrl}</a></p>`;
  }

  let contentColumn = '';
  if (authorData.name && authorData.bioContent) {
    const cleanBio = authorData.bioContent.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '').trim();
    contentColumn = `<p><strong>${authorData.name}</strong> ${cleanBio}</p>`;
  } else if (authorData.name) {
    contentColumn = `<p><strong>${authorData.name}</strong></p>`;
  } else if (authorData.bioContent) {
    contentColumn = authorData.bioContent;
  }

  cells.push([imageColumn, contentColumn]);

  return WebImporter.DOMUtils.createTable(cells, document);
};

const processAuthorInfo = (document) => {
  const authorInfoElements = document.querySelectorAll('.author-info');

  if (!authorInfoElements.length) {
    return [];
  }

  const authorDataList = [];

  authorInfoElements.forEach((authorInfo) => {
    const authorData = extractAuthorInfo(document, authorInfo);

    if (authorData.name && authorData.name !== 'Unknown Author') {
      authorDataList.push(authorData);
    }
  });

  return authorDataList;
};

export default {
  transform: async ({
    document,
    // eslint-disable-next-line no-unused-vars
    url,
    // eslint-disable-next-line no-unused-vars
    html,
    // eslint-disable-next-line no-unused-vars
    params,
  }) => {
    const main = document.body;

    WebImporter.DOMUtils.remove(main, [
      'header', '.header', 'nav', '.nav', 'footer', '.footer', 'iframe', 'noscript',
      'script', 'style', '.breadcrumb', '.navigation', '.sidebar', '.social-share',
      '.related-content', '.comments', '#globalheader', '.sws-global-quicklinks',
      '.local-footer', '.gef-global-footer', '#onetrust-consent-sdk',
      '.grecaptcha-badge', '.article-featured-tag', '.st-sticky-share-buttons',
      '.sitewide-marketing-popup',
    ]);

    const authorInfoCheck = document.querySelector('.author-info');
    const authorEyebrowCheck = document.querySelector('.author-eyebrow');
    const authorBioCheck = document.querySelector('.author-bio');
    const authorImageCheck = document.querySelector('.author-image');

    if (!authorInfoCheck && !authorEyebrowCheck && !authorBioCheck) {
      return [{
        element: main,
        path: '/dev/null',
        report: { 'author-content': 'No author info found - no fragments created' },
      }];
    }

    let targetAuthorElement = authorInfoCheck;
    if (!targetAuthorElement && (authorEyebrowCheck || authorBioCheck)) {
      targetAuthorElement = document.createElement('div');
      targetAuthorElement.className = 'author-info';

      if (authorImageCheck) targetAuthorElement.appendChild(authorImageCheck.cloneNode(true));
      if (authorEyebrowCheck) targetAuthorElement.appendChild(authorEyebrowCheck.cloneNode(true));
      if (authorBioCheck) targetAuthorElement.appendChild(authorBioCheck.cloneNode(true));

      const insertPoint = authorEyebrowCheck || authorBioCheck || authorImageCheck;
      insertPoint.parentNode.insertBefore(targetAuthorElement, insertPoint);
    }

    const authorDataList = processAuthorInfo(document);

    if (!authorDataList.length) {
      return [{
        element: main,
        path: '/dev/null',
        report: { 'author-content': 'No author info found - no fragments created' },
      }];
    }

    const results = [];
    const reportItems = [];

    authorDataList.forEach((authorData) => {
      if (authorData.useExistingTag) {
        reportItems.push(`Fragment already exists: ${authorData.name} (${authorData.slug})`);
        return;
      }

      const authorFragment = createAuthorFragment(document, authorData);
      const fragmentHTML = authorFragment.outerHTML;

      document.body.innerHTML = '';

      const fragmentMain = document.createElement('main');
      fragmentMain.innerHTML = fragmentHTML;
      document.body.appendChild(fragmentMain);

      const fragmentPath = `/fragments/authors/${authorData.slug}`;

      results.push({
        element: fragmentMain.cloneNode(true),
        path: fragmentPath,
      });

      reportItems.push(`Created: ${authorData.name} -> ${fragmentPath}`);
    });

    if (results.length === 0) {
      return [{
        element: main,
        path: '/dev/null',
        report: { 'author-content': reportItems.join(' | ') },
      }];
    }

    results[0].report = { 'author-content': reportItems.join(' | ') };
    return results;
  },
};

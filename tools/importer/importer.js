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

import {
  threeColumnsArticleXS, generalColumns, generateEndColumns,
} from './case-study-article.js';
import { standardArticleInitialColumns } from './standard-article.js';
import { mapPodcast, podcastFragments } from './podcast.js';
import {
  fetchTemplate, SECTION_SELECTORS, EDS_DOMAIN, buildSectionMetadata,
} from './utils.js';
import { customReportElements } from './report.js';
import {
  removeCourseSpecificItem,
  moduleOrder,
  handleFragments,
  quizBlock,
  coursesColumnsBlock,
} from './course-lesson.js';
import {
  processEventPage,
  setEventMetadata,
} from './events.js';

const DOMAIN = 'https://www.cmegroup.com';

/**
 * Generate a slug from a string
 * @param {string} value - The string to convert to a slug
 * @returns {string} - A slug string
 */
function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/^\d+-+/, '');
}

/**
 * Handles content toggle elements by fetching their published content
 * @param {Document} document - The document to process
 */
// eslint-disable-next-line no-unused-vars
async function handleContentToggle(document, url, tempMeta) {
  const toggleElements = Array.from(document.querySelectorAll('.content-toggle'));
  const pathName = new URL(url).pathname.replace('.html', '');

  const processToggleElement = async (element) => {
    const dataPath = element.getAttribute('data-path');
    if (!dataPath.includes(pathName)) return;

    const toggleUrl = `${DOMAIN}${dataPath}.content-toggle-publish.html`;

    const response = await fetch(`http://localhost:4005/api/hello?url=${toggleUrl}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/html',
      },
    });

    const data = await response.json();
    const content = data?.gatedContentTest?.contentPreview;

    if (content) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      element.replaceWith(tempDiv);
      tempMeta.protected = true;
    }
  };

  await Promise.all(toggleElements.map(processToggleElement));
}

async function setMetadata(meta, document, url, tempMeta) {
  const readTime = document.querySelector('.article-time');
  const templates = {
    'cme-group-case-study-article-template': {
      template: 'article',
      tempSubTemplate: 'case-study',
    },
    'cme-group-faqs-article-template': {
      template: 'article',
      tempSubTemplate: 'faqs',
    },
    'cme-group-showcase-article-template': {
      template: 'article',
      tempSubTemplate: 'showcase',
    },
    'cme-group-lesson-template': {
      template: 'lesson',
    },
    'cme-group-course-template': {
      template: 'course',
    },
    'cme-group-standalone-lesson-template': {
      template: 'lesson-standalone',
    },
    'cme-group-video-article-template': {
      template: 'article',
      tempSubTemplate: 'video',
    },
    'cme-group-standard-article-template': {
      template: 'article',
      tempSubTemplate: 'standard',
    },
    'cme-group-podcast-article-template': {
      template: 'article',
      tempSubTemplate: 'podcast',
    },
    basepage: {
      template: 'chapter',
    },
  };

  const template = fetchTemplate(document);

  if (template && template.includes('eventContentTemplate')) {
    meta.Template = 'event';
  } else if (template && templates[template]) {
    meta.Template = templates[template].template;
    if (templates[template].subTemplate) {
      meta['Sub Template'] = templates[template].subTemplate;
    }
    if (templates[template].tempSubTemplate) {
      meta['Temp Sub Template'] = templates[template].tempSubTemplate;
    }
  }

  if (readTime) {
    readTime.remove();
  }

  document.querySelector('.authors')?.remove();

  const articleDate = document.querySelector('.article-date');
  if (articleDate?.textContent) {
    meta.Date = articleDate?.textContent?.trim();
    const date = new Date(meta.Date);
    meta.Date = date.toISOString();
    articleDate.remove();
  }

  const changedUrl = new URL(url).pathname.replace('.html', '/jcr:content.json');
  const jsonUrl = `${DOMAIN}${changedUrl}`;
  const jsonResponse = await fetch(jsonUrl);

  if (meta.Image) {
    const tempAnchor = document.createElement('a');
    tempAnchor.href = meta.Image.src;
    tempAnchor.textContent = tempAnchor.href;
    meta.Image = tempAnchor;
  }

  if (jsonResponse?.ok) {
    try {
      const jsonData = await jsonResponse.json();
      if (!meta['Sub Template'] && meta.Template === 'article') {
        const headerType = jsonData.headerType ? jsonData.headerType.split('-')[0] : '';
        const mediaType = jsonData.mediaType ? jsonData.mediaType.split('-')[0] : '';

        if (headerType && mediaType) {
          meta['Sub Template'] = `${mediaType} ${headerType}`;
        }
      }

      Object.keys(jsonData).forEach((key) => {
        const arr = [];
        if (key === 'primaryAuthors') {
          jsonData[key].forEach((author) => {
            arr.push(author.replace(/^.*:/, ''));
          });
          meta.Author = arr.join(',');
        } else if (key === 'cq:tags') {
          jsonData[key].forEach((tag) => {
            arr.push(tag.replace(/^.*:/, ''));
          });
          meta.tags = arr.join(',');
        } else if (key === 'primaryTopics') {
          meta['Primary Topic'] = [];
          jsonData[key].forEach((topic) => {
            arr.push(topic.replace(/^.*:/, ''));
          });

          meta['Primary Topic'] = arr.join(',');
        } else if (key === 'articleTime') {
          const readTimeTemp = jsonData[key];
          const [minutes, seconds] = readTimeTemp.split(':');
          const nearestMinute = Math.round(Number(minutes) + (Number(seconds) / 60));

          const hours = Math.floor(nearestMinute / 60);
          const remainingMinutes = nearestMinute % 60;

          // if hours and minutes is less than 10 then it should be like 08:07
          if (hours < 10 && remainingMinutes < 10) {
            meta['Read Time'] = `0${hours}:0${remainingMinutes}`;
          } else if (hours < 10) {
            meta['Read Time'] = `0${hours}:${remainingMinutes}`;
          } else if (remainingMinutes < 10) {
            meta['Read Time'] = `${hours}:0${remainingMinutes}`;
          } else {
            meta['Read Time'] = `${hours}:${remainingMinutes}`;
          }
        } else if (key === 'moduleId') {
          meta['Module ID'] = jsonData[key];
        } else if (key === 'hideCourseNavigation') {
          meta['Hide Course Navigation'] = Boolean(jsonData[key]);
        } else if (key === 'jcr:title') {
          meta.Title = jsonData[key];
          if (meta.Template === 'lesson' || meta.Template === 'course' || meta.Template === 'chapter' || meta.Template === 'lesson-standalone') {
            meta['Module Title'] = jsonData[key];
          }
        } else if (key === 'isPremium') {
          meta.isPremium = Boolean(jsonData[key]);
        } else if (key === 'effectiveDate') {
          const date = new Date(jsonData[key]);
          meta.Date = date.toISOString();
        }
      });
    } catch (error) {
      console.warn(`Failed to parse JSON: ${error.message}`);
    }
  }

  if (document.querySelector('.premium-label')) {
    meta.isPremium = true;
    document.querySelector('.premium-label').remove();
  }

  if (tempMeta.protected) {
    meta.protected = true;
  }

  // Handle event-specific metadata
  if (meta.Template === 'event') {
    await setEventMetadata(meta, document, url);
  }
}

const getIconName = (icon) => {
  if (icon === 'icon-chevron-right') {
    return ':chevron-right:';
  }
  if (icon === 'icon-chevron-left') {
    return ':chevron-left:';
  }
  if (icon === 'icon-chevron-down') {
    return ':chevron-down:';
  }
  if (icon === 'icon-chevron-up') {
    return ':chevron-up:';
  }
  if (icon === 'icon-lock') {
    return ':lock:';
  }
  if (icon === 'icon-bell') {
    return ':bell:';
  }
  if (icon === 'icon-arrow-right') {
    return ':arrow-right:';
  }
  if (icon === 'icon-arrow-left') {
    return ':arrow-left:';
  }
  if (icon === 'icon-arrow-down') {
    return ':arrow-down:';
  }
  if (icon === 'icon-arrow-up') {
    return ':arrow-up:';
  }
  if (icon === 'icon-document-pdf') {
    return ':download-pdf:';
  }
  return '';
};

const iconsDataButton = (anchor) => {
  let firstIcon = '';
  let secondIcon = '';
  let thirdIcon = '';
  const firstSpan = anchor.querySelector('span');
  const secondSpan = anchor.querySelectorAll('span')?.[1];
  const thirdSpan = anchor.querySelectorAll('span')?.[2];

  if (firstSpan && firstSpan.classList.contains('icon')) {
    firstIcon = Array.from(firstSpan.classList).find((cls) => cls.trim() !== 'icon');
    firstIcon = getIconName(firstIcon);
  }
  if (secondSpan && secondSpan.classList.contains('icon')) {
    secondIcon = Array.from(secondSpan.classList).find((cls) => cls.trim() !== 'icon');
    secondIcon = getIconName(secondIcon);
  }
  if (thirdSpan && thirdSpan.classList.contains('icon')) {
    thirdIcon = Array.from(thirdSpan.classList).find((cls) => cls.trim() !== 'icon');
    thirdIcon = getIconName(thirdIcon);
  }

  return {
    firstIcon,
    secondIcon,
    thirdIcon,
  };
};

const changeAnchors = (document) => {
  const anchors = document.querySelectorAll('a');
  anchors.forEach((anchor) => {
    if (anchor.classList.contains('btn')) {
      if (anchor.classList.contains('primary') || anchor.classList.contains('primary-alternate')) {
        // wrap anchor in strong
        const strong = document.createElement('strong');
        anchor.replaceWith(strong);
        strong.appendChild(anchor);

        const { firstIcon, secondIcon, thirdIcon } = iconsDataButton(anchor);

        let classes = [];
        if (anchor.classList.contains('link-bold')) {
          classes.push('link-bold');
        }
        if (anchor.classList.contains('disabled')) {
          classes.push('disabled');
        }
        if (anchor.classList.contains('primary-alternate')) {
          classes.push('alternate');
        }

        if (classes.length) {
          classes = `[${classes.join(',')}]`;
        }

        anchor.textContent = `${firstIcon} ${anchor.textContent} ${classes} ${secondIcon} ${thirdIcon}`;
        anchor.textContent = anchor.textContent.trim();
      } else if (anchor.classList.contains('secondary')
        || anchor.classList.contains('secondary-2')
        || anchor.classList.contains('secondary-3')
        || anchor.classList.contains('secondary-4')) {
        // wrap anchor in em
        if (anchor.classList.contains('secondary')) {
          const em = document.createElement('em');
          anchor.replaceWith(em);
          em.appendChild(anchor);
        }

        let classes = [];
        if (anchor.classList.contains('link-bold')) {
          classes.push('link-bold');
        }
        if (anchor.classList.contains('disabled')) {
          classes.push('disabled');
        }
        if (anchor.classList.contains('secondary-2')) {
          classes.push('secondary-2');
          classes.push('button');
        }
        if (anchor.classList.contains('secondary-3')) {
          classes.push('secondary-3');
          classes.push('button');
        }
        if (anchor.classList.contains('secondary-4')) {
          classes.push('secondary-4');
          classes.push('button');
        }

        if (classes.length) {
          classes = `[${classes.join(',')}]`;
        }

        const { firstIcon, secondIcon, thirdIcon } = iconsDataButton(anchor);
        anchor.textContent = `${firstIcon} ${anchor.textContent} ${classes} ${secondIcon} ${thirdIcon}`;
        anchor.textContent = anchor.textContent?.trim();
      } else {
        let classes = [];
        if (anchor.classList.contains('link-bold')) {
          classes.push('link-bold');
        }
        if (anchor.classList.contains('disabled')) {
          classes.push('disabled');
        }

        if (classes.length) {
          classes = `[${classes.join(',')}]`;
        }

        const { firstIcon, secondIcon, thirdIcon } = iconsDataButton(anchor);
        anchor.textContent = `${firstIcon} ${anchor.textContent} ${classes} ${secondIcon} ${thirdIcon}`;
        anchor.textContent = anchor.textContent?.trim();
      }
    } else {
      const aParent = anchor.parentElement;
      const { firstChild } = anchor;
      let classes = [];

      if (!anchor.querySelector('img')) {
        if ((aParent && aParent?.tagName === 'STRONG') || (firstChild && firstChild?.tagName === 'STRONG')) {
          classes.push('link-bold');
          if (classes.length) {
            classes = `[${classes.join(',')}]`;
          }
          anchor.textContent = `${anchor.textContent} ${classes}`;
          anchor.textContent = anchor.textContent?.trim();
        }
      }
    }
  });
};

/**
 * This function creates a block separator.
 * @returns {HTMLElement} - The block separator.
 */
export const blockSeparator = () => {
  const hr = document.createElement('hr');
  return hr;
};

/**
 * This function fetches the image from the element.
 * @param {HTMLElement} ele - The element to search.
 * @returns {string} - The image.
 */
const imageFetch = (ele) => {
  const bgImage = ele.style.backgroundImage;
  if (bgImage) {
    const imgUrl = bgImage.split('url(')[1].split(')')[0].trim().replace(/['"]/g, '');
    return `${DOMAIN}${imgUrl}`;
  }
  return null;
};

const getDeepestLastChild = (el) => {
  while (el?.lastElementChild) {
    // eslint-disable-next-line no-param-reassign
    el = el.lastElementChild;
  }
  return el;
};

const getDeepestFirstChild = (el) => {
  while (el?.firstElementChild) {
    // eslint-disable-next-line no-param-reassign
    el = el.firstElementChild;
  }
  return el;
};

/**
 * This function converts the sections to metadata.
 * @param {Document} document - The document to search.
 */
const convertSectionsToMetadata = (document) => {
  const sections = document.querySelectorAll('.section');
  sections.forEach((section, index) => {
    const style = [];
    const tempBlueSelectors = [
      '.blue1-background',
      '.blue2-background',
      '.blue3-background',
      '.blue4-background',
      '.blue5-background',
      '.blue6-background',
    ];

    SECTION_SELECTORS.forEach((selector) => {
      if (section.matches(selector)) {
        if (tempBlueSelectors.includes(selector)) {
          style.push('reverse');
        }
        style.push(selector.replace('.', '').replace('-', ' '));
      }
    });

    if (style.length) {
      const styles = ['Style', style.join(', ')];
      const tempArr = [styles];

      // read background-image from the style

      const backgroundImg = imageFetch(section);
      if (backgroundImg) {
        const anchor = document.createElement('a');
        anchor.href = backgroundImg;
        anchor.textContent = anchor.href;
        tempArr.push(['Background Image', anchor]);
      }

      const sectionMetadata = buildSectionMetadata(tempArr);
      section.after(sectionMetadata);
      if (index !== sections.length - 1) {
        const nextSibling = sectionMetadata.nextElementSibling;
        const deepest = getDeepestFirstChild(nextSibling);
        if (deepest?.tagName !== 'HR') {
          sectionMetadata.after(blockSeparator().cloneNode(true));
        }
      }
      if (index !== 0) {
        const prevSibling = section.previousElementSibling;
        const deepest = getDeepestLastChild(prevSibling);
        if (deepest?.tagName !== 'HR') {
          section.before(blockSeparator().cloneNode(true));
        }
      }
    }
  });
};

const mapRowsToSection = (document) => {
  const rows = document.querySelectorAll('.row');
  rows.forEach((row) => {
    const leftColumn = row.querySelector('.cme-article-left-column');
    const rightColumn = row.querySelector('.cme-article-right-column');

    if ((leftColumn?.textContent && leftColumn?.textContent.trim() !== '') || (rightColumn?.textContent && rightColumn?.textContent.trim() !== '')) {
      const separator = blockSeparator().cloneNode(true);

      const prevSibling = row.previousElementSibling;
      const deepest = getDeepestLastChild(prevSibling);

      if (deepest?.tagName !== 'HR') {
        row.before(separator);
      }

      const nextSibling = row.nextElementSibling;
      const deepestNext = getDeepestFirstChild(nextSibling);

      if (deepestNext?.tagName !== 'HR') {
        row.after(blockSeparator().cloneNode(true));
      }
    }
  });
};

/**
 * This function converts the sections to metadata.
 * @param {Document} document - The document to search.
 */
const convertSectionToMetadata = (section, index, total, cells) => {
  const style = [];

  SECTION_SELECTORS.forEach((selector) => {
    if (section.matches(selector)) {
      style.push(selector.replace('.', '').replace('-', ' '));
    }
  });

  if (style.length) {
    const styles = ['Style', style.join(', ')];
    const tempArr = [styles];

    // read background-image from the style
    const backgroundImg = imageFetch(section);
    if (backgroundImg) {
      const anchor = document.createElement('a');
      anchor.href = backgroundImg;
      anchor.textContent = anchor.href;
      tempArr.push(['Background Image', anchor]);
    }

    tempArr.push(...cells);
    const sectionMetadata = buildSectionMetadata(tempArr);

    section.after(sectionMetadata);
    if (index !== total - 1) {
      sectionMetadata.after(blockSeparator().cloneNode(true));
    }

    if (index !== 0) {
      section.before(blockSeparator().cloneNode(true));
    }
  } else {
    const tempArr = [];
    tempArr.push(...cells);
    const sectionMetadata = buildSectionMetadata(tempArr);
    section.after(sectionMetadata);

    if (index !== total - 1) {
      sectionMetadata.after(blockSeparator().cloneNode(true));
    }

    if (index !== 0) {
      section.before(blockSeparator().cloneNode(true));
    }
  }
};

/**
 * This function creates a hero block for the article.
 * @param {Document} document - The document to search.
 */
const articleHeroBlock = (document) => {
  const hero = document.querySelector('.article-header .article-background');
  if (hero) {
    const bgImage = hero.style.backgroundImage;
    const imgUrl = bgImage.split('url(')[1].split(')')[0].trim().replace(/['"]/g, '');
    const anchor = document.createElement('a');
    anchor.href = `https://www.cmegroup.com${imgUrl}`;
    anchor.textContent = anchor.href;

    const h1 = document.createElement('h1');
    h1.innerText = document.querySelector('h1')?.innerText || '';

    const div = document.createElement('div');
    div.appendChild(anchor);
    if (h1.innerText) {
      div.appendChild(h1);
      document.querySelector('h1').remove();
    }
    hero.after(buildSectionMetadata([['Style', 'Full Width']]), blockSeparator().cloneNode(true));
    hero.replaceWith(div);
  }
};

/**
 * This function creates a promo block for the document.
 * @param {Document} document - The document to search.
 */
const promoBlock = (document) => {
  const promos = document.querySelectorAll('.promo');

  const selectors = [
    '.primary',
    '.custom',
    '.secondary',
    '.toolbox',
  ];

  if (promos.length) {
    promos.forEach((promo) => {
      const theme = selectors.find((selector) => promo.matches(selector)).replace('.', '');

      const link = promo.querySelector('a')?.href || '';
      const url = new URL(link);
      const path = url.pathname + url.search;

      const imgSrc = imageFetch(promo);
      const promoChild = promo.querySelector('.promo-title')?.children || [];

      const initialSubtitle = promo.querySelector('.promo-subtitle')?.innerText || '';
      const title = promoChild.length ? promoChild[0].innerText : '';
      const description = initialSubtitle || (promoChild.length > 1 ? promoChild[1].innerText : '');
      const footerText = promo.querySelector('.promo-foot .cta-text')?.innerText || '';
      const iconSpan = promo.querySelector('.promo-foot span');
      const { backgroundColor } = promo.style.backgroundColor;

      let icon = '';
      if (iconSpan) {
        const iconClass = Array.from(iconSpan.classList).find((cls) => cls.startsWith('icon-'));
        if (iconClass) {
          icon = iconClass.replace('icon-', '');
        }
      }

      const cells = [[`CTA (Promo, ${theme})`]];
      if (link) {
        const tempAnchor = document.createElement('a');
        tempAnchor.href = `${DOMAIN}${path}`;
        tempAnchor.textContent = tempAnchor.href;
        cells.push(['URL', tempAnchor]);
      }
      if (imgSrc) {
        const anchor = document.createElement('a');
        anchor.href = imgSrc;
        anchor.textContent = anchor.href;
        cells.push(['Background', anchor]);
      }
      if (backgroundColor) {
        cells.push(['Background Color', backgroundColor]);
      }
      if (title) {
        cells.push(['Title', title]);
      }
      if (description) {
        cells.push(['Description', description]);
      }
      if (footerText) {
        cells.push(['Footer', `${footerText} ${icon ? `:${icon}:` : ''}`]);
      }

      const table = WebImporter.DOMUtils.createTable(cells, document);
      promo.replaceWith(table);
    });
  }
};

const moveDividerLine = (document) => {
  const dividers = document.querySelectorAll('.divider.line');
  if (dividers?.length) {
    dividers.forEach((divider) => {
      const parent = divider.parentElement;
      if (parent) {
        const sibling = parent.nextElementSibling;
        if (sibling?.classList?.contains('cme-article-right-column')
          && sibling.textContent && sibling.textContent.trim() !== ''
          && !sibling.textContent.trim().includes('article-date')) {
          // remove divider
          divider.remove();
          // add sibling to parent
          sibling.after(divider);
        }
      }
    });
  }
};

/**
 * This function creates a divider block for the document.
 * @param {Document} document - The document to search.
 */
const dividerBlock = (document, meta) => {
  const dividers = document.querySelectorAll('.divider.line');

  if (dividers?.length) {
    dividers.forEach((divider) => {
      if (!divider.closest('table') && !divider.closest('.cme-article-right-column') && !divider.closest('.cme-article-left-column')) {
        if (meta['Temp Sub Template'] !== 'faqs') {
          const styles = ['Style', 'Divider'];
          const sectionMetadata = buildSectionMetadata([styles]);
          divider.replaceWith(sectionMetadata);
          sectionMetadata.after(blockSeparator().cloneNode(true));
        }
      }
    });
  }
};

/**
 * This function creates a fragment block for the author bio.
 * @param {Document} document - The document to search.
 */
const authorBioBlock = (document) => {
  const authorBio = document.querySelector('.component.author-bio');
  if (authorBio && authorBio.textContent.trim() !== '') {
    let authorTags = authorBio.getAttribute('data-author-tags');
    authorTags = authorTags ? JSON.parse(authorTags) : [];

    const tempDiv = document.createElement('div');

    if (authorTags.length) {
      authorTags.forEach((tag) => {
        const link = `${EDS_DOMAIN}/fragments/authors/${tag}`;

        const anchor = document.createElement('a');
        anchor.href = link;
        anchor.textContent = anchor.href;
        const cells = [['Fragment'], [anchor]];

        const table = WebImporter.DOMUtils.createTable(cells, document);
        tempDiv.appendChild(table);
      });
    }

    authorBio.replaceWith(tempDiv);
  }
};

/**
 * This function creates a figcaption block for the document.
 * @param {Document} document - The document to search.
 */
const figCaptionEmphasize = (document) => {
  const figCaptions = document.querySelectorAll('figcaption');
  if (figCaptions.length) {
    figCaptions.forEach((figCaption) => {
      const em = document.createElement('em');
      em.textContent = figCaption.textContent;
      figCaption.replaceWith(em);
    });
  }
};

const faqBlock = (document, meta) => {
  if (meta['Temp Sub Template'] === 'faqs') {
    const tempOl = document.querySelectorAll('.article-info ol');
    const tempUl = document.querySelectorAll('.article-info ul');
    if (tempOl?.length) {
      tempOl.forEach((ol) => {
        const list = ol.querySelectorAll('li');
        if (list?.length) {
          list.forEach((li) => {
            const anchor = li.querySelector('a');
            anchor.href = `#${slug(anchor.textContent)}`;
          });
        }
      });
    } else if (tempUl?.length) {
      tempUl.forEach((ul) => {
        const list = ul.querySelectorAll('li');
        if (list?.length) {
          list.forEach((li) => {
            const anchor = li.querySelector('a');
            anchor.href = `#${slug(anchor.textContent)}`;
          });
        }
      });
    }
  }
};

const removeBackToTop = (document) => {
  const backToTop = document.querySelectorAll('a');
  if (backToTop.length) {
    backToTop.forEach((anchor) => {
      if (anchor.textContent.trim().toLowerCase() === 'back to top') {
        const tempTable = WebImporter.Blocks.createBlock(document, {
          name: 'Divider (Back to Top)',
          cells: [],
        });
        const cmpText = anchor.closest('.cmp-text');
        if (cmpText) {
          const dividerNext = cmpText.nextElementSibling?.classList.contains('divider') ? cmpText.nextElementSibling : null;
          if (dividerNext) {
            dividerNext.remove();
          }
        }
        anchor.replaceWith(tempTable);
      }
    });
  }
};

const accordionBlock = async (document) => {
  const accordions = document.querySelectorAll('.expand-collapse');
  if (accordions?.length) {
    const cells = [['Accordion (cards)']];

    // Process each accordion one by one to maintain order
    const accordionsArray = Array.from(accordions);
    for (let i = 0; i < accordionsArray.length; i += 1) {
      const accordion = accordionsArray[i];

      const title = accordion.getAttribute('data-component-title');
      if (title) {
        cells.push([title]);
      }

      const cardDataPath = accordion.querySelector('.cards')?.getAttribute('data-path');
      if (cardDataPath) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const cardData = await fetch(`${DOMAIN}${cardDataPath}.json`);
          // eslint-disable-next-line no-await-in-loop
          const cardDataJson = await cardData.json();
          let tags = cardDataJson.requiredTags;
          if (tags?.length) {
            tags = tags.map((tag) => tag.replace(/^.*:/, ''));
            cells.push(['tags', tags.join(',')]);
          }
        } catch (error) {
          console.error(`Error fetching card data: ${error}`);
        }
      }
    }

    const table = WebImporter.DOMUtils.createTable(cells, document);
    accordions[0].replaceWith(table);
    document.querySelectorAll('.expand-collapse').forEach((accordion) => {
      accordion.remove();
    });
  }
};

const removeExtraSectionBreak = (document) => {
  const paragraphs = document.querySelectorAll('hr');
  for (let i = 0; i < paragraphs.length - 1; i += 1) {
    const currentP = paragraphs[i];
    const nextP = paragraphs[i + 1];
    if (currentP.nextElementSibling === nextP) {
      if (currentP.tagName === 'HR' && nextP.tagName === 'HR') {
        nextP.remove();
      }
    }
  }

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    null,
  );

  let prevIsHR = false;
  let currentNode = walker.nextNode();

  while (currentNode) {
    if (currentNode.tagName === 'HR') {
      if (prevIsHR) {
        const toRemove = currentNode;
        currentNode = walker.nextNode(); // move ahead before removing
        toRemove.remove();
        // eslint-disable-next-line no-continue
        continue;
      }
      prevIsHR = true;
    } else {
      prevIsHR = false;
    }
    currentNode = walker.nextNode();
  }
};

const lightBoxGallery = async (document) => {
  const components = document.querySelectorAll('.component');
  if (components?.length) {
    for (let i = 0; i < components.length; i += 1) {
      const lightBox = components[i];
      const attribute = lightBox.getAttribute('data-img-style');
      if (attribute === 'lightbox-gallery' || attribute === 'lightbox') {
        const dataPath = lightBox.getAttribute('data-path');

        if (dataPath) {
          // eslint-disable-next-line no-await-in-loop
          const data = await fetch(`${DOMAIN}${dataPath}.json`);

          if (data?.ok) {
            // eslint-disable-next-line no-await-in-loop
            const dataJson = await data.json();

            if (dataJson?.fileReference) {
              const imgSrc = dataJson.fileReference;
              const anchor = document.createElement('a');
              anchor.href = `https://www.cmegroup.com${imgSrc}`;
              anchor.textContent = anchor.href;

              const tempStrong = document.createElement('strong');
              tempStrong.appendChild(anchor);
              lightBox.replaceWith(tempStrong);
            }
          }
        }
      }
    }
  }
};

const brightCoveVideo = (document) => {
  const videos = document.querySelectorAll('.brightcove-video');
  if (videos?.length) {
    for (let i = 0; i < videos.length; i += 1) {
      const video = videos[i];
      const grandParent = video.parentElement?.parentElement;
      if ((grandParent && (grandParent.style.display === 'none'
        || window.getComputedStyle(grandParent).display === 'none'
        || grandParent.classList.contains('hidePersonalized')
      )) || video.parentElement?.closest('.brightcove-video')) {
        video.remove();
        // eslint-disable-next-line no-continue
        continue;
      }
      const accountId = video.getAttribute('data-account-id') || video.querySelector('.brightcove-video')?.getAttribute('data-account-id');
      const playlistLocation = video.getAttribute('data-playlist-location') || video.querySelector('.brightcove-video')?.getAttribute('data-playlist-location');
      const videoId = video.getAttribute('data-video-id') || video.querySelector('.brightcove-video')?.getAttribute('data-video-id');
      const aspectRatio = video.getAttribute('data-aspect-ratio') || video.querySelector('.brightcove-video')?.getAttribute('data-aspect-ratio');

      const cells = [['Brightcove']];
      cells.push(['accountID', accountId]);
      cells.push(['videoID', videoId]);
      cells.push(['playlistID', '']);
      if (playlistLocation) {
        cells.push(['playlistLocation', playlistLocation]);
      }
      cells.push(['aspectRatio', aspectRatio]);

      cells.push(['cc', '']);
      cells.push(['language', '']);

      const img = video.querySelector('.vjs-poster')?.style.backgroundImage;
      const imgUrl = img?.split('url(')[1].split(')')[0].trim().replace(/['"]/g, '');
      if (imgUrl) {
        const anchor = document.createElement('a');
        anchor.href = imgUrl;
        anchor.textContent = anchor.href;
        cells.push(['placeholderImg', anchor]);
      }

      const table = WebImporter.DOMUtils.createTable(cells, document);
      video.replaceWith(table);
    }
  }
};

const createForm = (document) => {
  const forms = document.querySelectorAll('form');
  if (forms?.length) {
    forms.forEach((form) => {
      if (form?.parentElement?.classList.contains('mc-user-form')) {
        const dataFormId = form?.parentElement?.getAttribute('data-form-id');

        const cells = [['Form (Grid)']];
        cells.push(['Name', 'Contact Us']);
        cells.push(['Id', dataFormId]);
        cells.push(['Source', `${EDS_DOMAIN}/forms/contact-us.json`]);
        cells.push(['Submit Logged Out', '/fragments/contact-us-form-logged-out-submit']);
        cells.push(['Submit Logged In', '/fragments/contact-us-form-logged-in-submit']);

        const table = WebImporter.DOMUtils.createTable(cells, document);
        form?.parentElement?.replaceWith(table);
      } else {
        form?.parentElement?.remove();
      }
    });
  }
};

const tableBlock = (document) => {
  const tables = document.querySelectorAll('.table-wrapper');
  if (tables?.length) {
    tables.forEach((table) => {
      let tableText = 'Table';
      const innerTable = table.querySelector('table');
      const tempArr = [];
      const trs = innerTable.querySelectorAll('tr');
      trs.forEach((tr) => {
        if (!tr.textContent || tr.textContent === '') {
          tr.remove();
        }
      });

      if (!innerTable.querySelector('thead') && !innerTable.querySelector('th')) {
        tempArr.push('no-header');
      }

      if (innerTable.classList?.contains('collapsible')) {
        tempArr.push('collapsible');
      }

      if (innerTable.classList?.contains('cmeCompactTable') || innerTable.classList?.contains('compact')) {
        // compact class added
        tempArr.push('compact');
      }

      if (innerTable.querySelectorAll('tr').length) {
        let theadProcessed = false;
        innerTable.querySelectorAll('tr').forEach((innerRow, index) => {
          const rowClass = innerRow.classList;
          ['tertiary-row', 'secondary-row', 'primary-row'].forEach((row) => {
            if (rowClass.contains(row)) {
              const tempRowName = row.replace('-row', '');
              if (innerRow.closest('thead') && !theadProcessed) {
                tempArr.push(`r${index + 1}-${tempRowName}-header`);
                theadProcessed = true;
              } else if (innerRow.closest('tbody')) {
                tempArr.push(`r${index + 1}-${tempRowName}-group`);
              }
            }
          });
        });
      }

      if (innerTable.querySelectorAll('tbody tr>th').length) {
        // Check first row - all elements should be th
        const firstRow = innerTable.querySelector('tbody tr');
        const firstRowCells = firstRow?.children || [];

        // For first row, we need to check if all cells (accounting for colspan) are headers
        // let totalColumns = 0;
        const allFirstRowHeaders = Array.from(firstRowCells).every((cell) => cell.tagName === 'TH');

        // Check first column - all elements should be th
        const allRows = innerTable.querySelectorAll('tbody tr');
        let rowIndex = 0;
        const processedRows = new Set(); // Keep track of rows we've checked

        const allFirstColumnHeaders = Array.from(allRows).every((row) => {
          // Skip rows that are covered by previous rowspan
          if (processedRows.has(rowIndex)) {
            rowIndex += 1;
            return true;
          }

          const firstCell = row.children[0];
          if (!firstCell) return false;

          // If this cell has rowspan, mark those rows as processed
          const rowspan = parseInt(firstCell.getAttribute('rowspan') || '1', 10);
          if (rowspan > 1) {
            for (let i = rowIndex + 1; i < rowIndex + rowspan; i += 1) {
              processedRows.add(i);
            }
          }

          rowIndex += 1;
          return firstCell.tagName === 'TH';
        });

        if (tempArr.length) {
          // check of tempArr contains something like r1-*
          if (!tempArr.some((item) => item.startsWith('r1-'))) {
            if (allFirstRowHeaders) {
              tempArr.push('r1-primary-header');
            }
          }
          if (allFirstColumnHeaders) {
            tempArr.push('c1-primary-header');
          }
        } else {
          if (allFirstRowHeaders) {
            tempArr.push('r1-primary-header');
          }
          if (allFirstColumnHeaders) {
            tempArr.push('c1-primary-header');
          }
        }
      }

      innerTable.querySelectorAll('tbody tr').forEach((tr) => {
        const { children } = tr;
        const allThs = [...children].filter((child) => child.tagName === 'TH');

        if (allThs.length !== children.length) {
          tr.querySelectorAll('th').forEach((th) => {
            const td = document.createElement('td');
            td.textContent = th.textContent;

            // get attribute like rowspan or colspan
            const rowspan = th.getAttribute('rowspan');
            const colspan = th.getAttribute('colspan');
            if (rowspan) {
              td.setAttribute('rowspan', rowspan);
            }
            if (colspan) {
              td.setAttribute('colspan', colspan);
            }
            if (th.classList.value) {
              th.classList.forEach((cls) => {
                td.classList.add(cls);
              });
            }

            th.replaceWith(td);
          });
        }
      });

      const rgbToHex = (rgb) => {
        const result = rgb.match(/\d+/g).map(Number); // Extract numbers and convert to integers
        return (
          `#${result
            .map((val) => val.toString(16).padStart(2, '0')) // Convert to hex and pad if needed
            .join('')}`
        );
      };

      innerTable.querySelectorAll('td').forEach((td) => {
        const inlineStyle = td.getAttribute('style') || td.querySelector('p')?.getAttribute('style');
        if (inlineStyle) {
          const style = inlineStyle.split(';').map((s) => {
            let tempStyle = s.trim();
            if (tempStyle.startsWith('background-color:') || tempStyle.startsWith('color:')) {
              // only call rgbtohex if tempStyle.split(':')[1] is in rgb
              if (tempStyle.split(':')[1].match(/rgb/)) {
                tempStyle = `${tempStyle.split(':')[0]}: ${rgbToHex(tempStyle.split(':')[1])}`;
              }
            } else if (tempStyle.startsWith('text-align:')) {
              tempStyle = `${tempStyle.split(':')[0]}: ${tempStyle.split(':')[1]}`;
            } else {
              // not taken the other styles like width, height as they may break the UI
              tempStyle = '';
            }
            return tempStyle;
          }).filter((s) => s).join(',');
          if (style) {
            const p = document.createElement('p');
            p.innerHTML = td.innerHTML;

            const p2 = document.createElement('p');
            p2.textContent = `[${style}]`;
            td.textContent = '';

            td.appendChild(p);
            td.appendChild(p2);
          }
        }
      });

      if (tempArr.length) {
        tableText += ` (${tempArr.join(', ')})`;
      }

      const tempTable = WebImporter.Blocks.createBlock(document, {
        name: tableText,
        cells: [],
      });

      const row = tempTable.insertRow(1);
      if (table.querySelectorAll('thead').length > 1) {
        table.querySelectorAll('thead').forEach((thead, index) => {
          if (index !== 0) {
            thead.remove();
          }
        });
      }

      // remove thead and add that tr to body first tr
      const thead = table.querySelector('thead');
      if (thead) {
        const tr = thead.querySelector('tr');
        if (tr) {
          const tbody = table.querySelector('tbody');
          tbody.insertBefore(tr, tbody.firstChild);
        }
      }

      row.insertCell(0).innerHTML = table.innerHTML;
      table.replaceWith(tempTable);
    });
  }
};

const convertImagesToLinks = (document) => {
  const images = document.querySelectorAll('.component.image');

  images.forEach((image) => {
    if (image.querySelector('img')) {
      const div = document.createElement('div');
      let imgUrl = image.getAttribute('data-img-src');
      // check if imgUrl is absolute vs relative
      if (imgUrl?.startsWith('/')) {
        imgUrl = `${DOMAIN}${imgUrl}`;
      }

      const anchor = document.createElement('a');
      anchor.href = imgUrl;
      anchor.textContent = `${anchor.href}`;

      const dataImgStyle = image.getAttribute('data-img-style');
      const caption = image.querySelector('em');

      if (dataImgStyle === 'lightbox-gallery' || dataImgStyle === 'lightbox') {
        const tempStrong = document.createElement('strong');
        tempStrong.appendChild(anchor);
        div.appendChild(tempStrong);
      } else {
        div.appendChild(anchor);
      }

      div.appendChild(document.createElement('br'));
      if (caption) {
        div.appendChild(caption);
      }

      image.replaceWith(div);
    }
  });
};

/**
 * @param {*} document
 * @param {*} type
 */
const sidebarBlock = (document, type = 'left') => {
  const sidebars = document.querySelectorAll(`.section .row .cme-article-${type}-column`);

  if (sidebars?.length) {
    sidebars.forEach((sidebar) => {
      if (sidebar.textContent && sidebar.textContent.trim() !== '' && !sidebar.textContent.trim().includes('.article-date')) {
        const dividers = sidebar.querySelectorAll('.divider.line');
        let topDivider = false;
        let bottomDivider = false;

        if (dividers.length === 1) {
          const firstDiv = sidebar.querySelector(':scope>div:first-child');
          const lastDiv = sidebar.querySelector(':scope>div:last-child');

          if (lastDiv.classList.contains('divider')) {
            bottomDivider = true;
          } else if (!firstDiv?.classList.contains('title')) {
            topDivider = true;
          }
          dividers.forEach((divider) => {
            divider.remove();
          });
        } else if (dividers.length === 2) {
          const firstDiv = sidebar.querySelector(':scope>div:first-child');
          if (firstDiv.classList.contains('title')) {
            const h5 = document.createElement('h5');
            h5.textContent = '---';
            firstDiv.appendChild(h5);
            bottomDivider = true;
          } else {
            topDivider = true;
            bottomDivider = true;
          }
          dividers.forEach((divider) => {
            divider.remove();
          });
        } else if (dividers.length > 1) {
          topDivider = true;
          bottomDivider = true;

          dividers.forEach((divider, index) => {
            if (index === 0 || index === dividers.length - 1) {
              divider.remove();
            } else {
              const tempP = document.createElement('p');
              tempP.textContent = '---';
              divider.replaceWith(tempP);
            }
          });
        }

        let textContent = 'Sidebar';
        const tempArr = [type];

        if (topDivider) {
          tempArr.push('divider-top');
        }

        if (bottomDivider) {
          tempArr.push('divider-bottom');
        }
        if (tempArr.length) {
          textContent += ` (${tempArr.join(', ')})`;
        }

        const cells = [[textContent]];
        cells.push([sidebar.innerHTML]);
        const table = WebImporter.DOMUtils.createTable(cells, document);

        sidebar.replaceWith(table);
      }
    });
  }
};

const sideBarBlocks = (document) => {
  sidebarBlock(document, 'left');
  sidebarBlock(document, 'right');
};

const correctLinks = (document, meta) => {
  const links = document.querySelectorAll('a');

  for (let i = 0; i < links.length; i += 1) {
    const link = links[i];
    if (link?.href) {
      try {
        if (meta['Temp Sub Template'] === 'faqs' && link.href.includes('#')) {
          // eslint-disable-next-line
          continue;
        }

        const completeLink = new URL(link.href);
        const { pathname } = completeLink;
        const oldHref = link.href;

        if (pathname?.endsWith('.html')) {
          if (pathname.startsWith('/education/')) {
            link.href = link.href.replace('.html', '');
            if (link.href.startsWith('/')) {
              link.href = `${EDS_DOMAIN}${link.href}`;
            } else {
              completeLink.hostname = EDS_DOMAIN.replace('https://', '');
              completeLink.protocol = 'https';
              completeLink.port = '';
              link.href = completeLink.toString();
              link.href = link.href.replace('.html', '');
            }
          } else if (link.href.startsWith('/')) {
            // relative path
            link.href = `${DOMAIN}${link.href}`;
          } else {
            // absolute path domain changed
            completeLink.hostname = DOMAIN.replace('https://', '');
            completeLink.protocol = 'https';
            completeLink.port = '';
            if (link.href === link.textContent) {
              link.textContent = completeLink.toString();
            }
            link.href = completeLink.toString();
          }

          if (link.textContent === oldHref) {
            link.textContent = link.href;
          }
        } else if (pathname?.endsWith('.pdf')
          || pathname?.endsWith('.mp3')
          || pathname?.endsWith('.mp4')
          || pathname?.endsWith('.csv')
          || pathname?.endsWith('.xlsx')
          || pathname?.endsWith('.xls')
          || pathname?.endsWith('.pptx')
          || pathname?.endsWith('.ppt')
        ) {
          if (link.href.startsWith('/')) {
            // relative path
            link.href = `${DOMAIN}${link.href}`;
          } else {
            // eslint-disable-next-line
            if (link.href.includes(DOMAIN) || link.href.includes('localhost')) {
              completeLink.hostname = DOMAIN.replace('https://', '');
              completeLink.protocol = 'https';
              completeLink.port = '';

              if (link.href === link.textContent) {
                link.textContent = completeLink.toString();
              }
              link.href = completeLink.toString();
            }
          }
        }
      } catch (error) {
        console.log(`Error correcting links: ${error}, ${link.href}`);
      }
    }
  }
};

const tagsCloudBlock = (document) => {
  const tagsCloud = document.querySelector('.tag-cloud');
  if (tagsCloud) {
    const cells = [['Tags Cloud']];
    const table = WebImporter.DOMUtils.createTable(cells, document);
    tagsCloud.replaceWith(table);
  }
};

/**
 * Color map to section metadata
 * @param {*} document
 */
const colorMap = (document) => {
  const spans = document.querySelectorAll('span');
  const newSet = new Set();
  const sections = document.querySelectorAll('.row');
  const total = sections.length;

  spans.forEach((span) => {
    const classes = Array.from(span.classList);
    const colorClasses = classes.filter((cls) => cls.startsWith('bg-'));

    if (colorClasses.length) {
      const tempCode = document.createElement('code');
      tempCode.textContent = span.textContent;
      const section = span.closest('.row');
      const index = Array.from(sections).indexOf(section);
      span.replaceWith(tempCode);

      if (!newSet.has(index) && section) {
        newSet.add(index);
        convertSectionToMetadata(section, index, total, [['text-highlight', colorClasses[0]]]);
      }
    }
  });
};

const oneClickSubToFragment = (document) => {
  const oneClickSub = document.querySelectorAll('.one-click-subscription-form');
  if (oneClickSub?.length) {
    oneClickSub.forEach((form) => {
      // const cells = [['One Click Sub']];
      // const table = WebImporter.DOMUtils.createTable(cells, document);
      // const tempDiv = document.createElement('div');
      // const anchor = document.createElement('a');
      // anchor.href = `${EDS_DOMAIN}/fragments/one-click-subscription-form`;
      // anchor.textContent = anchor.href;
      // tempDiv.appendChild(anchor);
      form.remove(); // todo again revisit
    });
  }
};

const columnsBlock = (document) => {
  const rows = document.querySelectorAll('.row');
  if (!rows?.length) return;

  rows.forEach((row) => {
    const colSelectors = ['col-md-3', 'col-md-6', 'col-md-9', 'col-md-4'];
    let columns = [];

    // Collect all columns matching specified sizes
    colSelectors.forEach((selector) => {
      const directChildren = Array.from(row.children).filter((child) => child.tagName === 'DIV');
      columns = columns.concat(directChildren
        .filter((child) => child.classList.contains(selector)));
    });

    if (!columns.length) return;

    // Filter only immediate children to avoid nested column issues
    columns = columns.filter((col) => col.parentElement === row);

    // Get their column width from class name
    const colWidths = columns.map((col) => {
      const match = col.className.match(/col-md-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });

    const totalWidth = colWidths.reduce((sum, width) => sum + width, 0);

    // Only process rows with a valid total of 12
    if (totalWidth === 12) {
      const cells = [['Columns']];
      const tempArr = [];

      columns.forEach((column) => {
        tempArr.push(column.innerHTML);
      });

      cells.push(tempArr);
      const table = WebImporter.DOMUtils.createTable(cells, document);
      row.replaceWith(table);
    }
  });
};

const handleArticleFragments = (document) => {
  const fragments = document.querySelectorAll('.cq-dd-paragraph');
  if (fragments?.length) {
    fragments.forEach((fragment) => {
      if (fragment.textContent.includes('All examples in this report are hypothetical interpretations')) {
        const anchor = document.createElement('a');
        anchor.href = `${EDS_DOMAIN}/fragments/disclaimers/hypothetical-interpretation`;
        anchor.textContent = anchor.href;
        const cells = [['Fragment'], [anchor]];
        const table = WebImporter.DOMUtils.createTable(cells, document);
        fragment.replaceWith(table);
      } else if (fragment.textContent.includes('The information herein has been complied by CME Group for general informational and education purposes only and does not constitute trading advice or the solicitation of purchases or sale of futures, options, swaps, any other financial instrument, or financial service')) {
        const anchor = document.createElement('a');
        anchor.href = `${EDS_DOMAIN}/fragments/disclaimers/risk-notice`;
        anchor.textContent = anchor.href;
        const cells = [['Fragment'], [anchor]];
        const table = WebImporter.DOMUtils.createTable(cells, document);
        fragment.replaceWith(table);
      } else if (fragment.textContent.includes('The views expressed in this program are solely those of the host and speakers in their individual capacity')) {
        const anchor = document.createElement('a');
        anchor.href = `${EDS_DOMAIN}/fragments/disclaimers/speakers-views-statement`;
        anchor.textContent = anchor.href;
        const cells = [['Fragment'], [anchor]];
        const table = WebImporter.DOMUtils.createTable(cells, document);
        fragment.replaceWith(table);
      }
    });
  }
};

const mapBlueDesignBoxToCardsFactoid = (document) => {
  const blueDesignBoxes = document.querySelectorAll('.component.design-box.blue1-background');
  if (blueDesignBoxes?.length) {
    blueDesignBoxes.forEach((box) => {
      const table = WebImporter.Blocks.createBlock(document, {
        name: 'Cards (factoid)',
        cells: [[box.innerHTML]],
      });
      box.replaceWith(table);
    });
  }
};

const customBlocks = async (document, main, meta, url) => {
  moveDividerLine(document);
  changeAnchors(document);
  figCaptionEmphasize(document);
  convertImagesToLinks(document);
  mapRowsToSection(document);
  tableBlock(document);
  convertSectionsToMetadata(document, main);
  articleHeroBlock(document, meta);
  promoBlock(document);
  authorBioBlock(document);
  quizBlock(document, meta);
  tagsCloudBlock(document);
  await accordionBlock(document);
  await lightBoxGallery(document);
  sideBarBlocks(document);
  colorMap(document);
  oneClickSubToFragment(document);
  if (meta['Temp Sub Template'] === 'faqs') {
    removeBackToTop(document);
  }
  dividerBlock(document, meta);

  if (meta.Template === 'article') {
    handleArticleFragments(document);
  }

  if (meta['Temp Sub Template'] === 'case-study') {
    threeColumnsArticleXS(document);
    generalColumns(document);
    generateEndColumns(document);
    columnsBlock(document);
  } else if (meta['Temp Sub Template'] === 'standard') {
    standardArticleInitialColumns(document);
    columnsBlock(document);
  } else if (['lesson', 'course', 'lesson-standalone'].includes(meta.Template)) {
    await removeCourseSpecificItem(document, main, meta);
    handleFragments(document);
    coursesColumnsBlock(document);
  } else if (meta['Temp Sub Template'] === 'podcast') {
    mapPodcast(document);
    podcastFragments(document);
  } else if (meta['Temp Sub Template'] === 'faqs') {
    faqBlock(document, meta);
  } else if (meta.Template === 'event') {
    processEventPage(document, meta);
  }
  await moduleOrder(document, meta, url);
  document.querySelector('.course-nav')?.remove();

  brightCoveVideo(document);
  document.querySelector('.tag-cloud')?.remove();
  createForm(document);
  correctLinks(document, meta);
  mapBlueDesignBoxToCardsFactoid(document);
  delete meta['Temp Sub Template'];
  // TODO remove this as removing all forms as of now
  // document.querySelectorAll('form')?.forEach((form) => {
  //   form.remove();
  // });
};

const removeLinesEllipsis = (document) => {
  const linesEllipsis = document.querySelectorAll('.LinesEllipsis-canvas');
  linesEllipsis.forEach((line) => {
    line.remove();
  });
};

const removeVisuallyHidden = (document) => {
  const visuallyHidden = document.querySelectorAll('.visually-hidden');
  visuallyHidden.forEach((hidden) => {
    hidden.remove();
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
  transform: async ({
    // eslint-disable-next-line no-unused-vars
    document, url, html, params,
  }) => {
    // define the main element: the one that will be transformed to Markdown
    const main = document.body;
    const tempMeta = {};

    // Handle gated content and content toggles
    // todo below is the gated content part
    // await handleContentToggle(document, url, tempMeta);

    WebImporter.DOMUtils.remove(document, [
      'script[src*="https://solutions.invocacdn.com/js/invoca-latest.min.js"]',
    ]);

    // attempt to remove non-content elements
    WebImporter.DOMUtils.remove(main, [
      'header',
      '.header',
      'nav',
      '.nav',
      'footer',
      '.footer',
      'noscript',
      'script',
      '#globalheader',
      '.sws-global-quicklinks',
      '.sws-news-article-wrapper-sidebar',
      '.local-footer',
      '.local-footer-message',
      '.gef-global-footer',
      '.gef-copyright-print',
      '#goog-gt-tt',
      '.sws-content__side-nav',
      '#backtotop',
      '.footer-style',
      '.disclaimer-style',
      '#onetrust-consent-sdk',
      '.grecaptcha-badge',
      '.content-reference',
      '.save-text',
      '.article-featured-tag',
      '.education-language-selector',
      '.st-sticky-share-buttons',
      '.sitewide-marketing-popup',
      // '.course-nav',
      '.top-info',
      '.w-sm-auto',
      '.lateral-navigation',
      '.article-data',
      '.headline',
    ]);

    const results = [];
    const report = customReportElements(document);

    const meta = WebImporter.Blocks.getMetadata(document);
    await setMetadata(meta, document, url, tempMeta);
    await customBlocks(document, main, meta, url);

    const mdb = WebImporter.Blocks.getMetadataBlock(document, meta);
    main.append(mdb);

    let p = new URL(url).pathname;
    if (p.endsWith('/')) {
      p = `${p}index`;
    }

    const newPagePath = decodeURIComponent(p)
      .toLowerCase()
      .replace(/\.html$/, '')
      .replace(/[^a-z0-9/]/gm, '-')
      .replace(/-+/g, '-')
      .replace(/(^-|-$)/g, '');

    removeExtraSectionBreak(document);
    removeLinesEllipsis(document);
    removeVisuallyHidden(document);

    results.push({
      element: main,
      path: newPagePath,
      report,
    });

    return results;
  },
};

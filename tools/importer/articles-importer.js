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
import { fetchTemplate, SECTION_SELECTORS, EDS_DOMAIN } from './utils.js';
import { customReportElements } from './report.js';
import {
  removeCourseSpecificItem,
  moduleOrder,
  handleFragments,
  quizBlock,
  coursesColumnsBlock,
} from './course-lesson.js';

const DOMAIN = 'https://www.cmegroup.com';

export const buildSectionMetadata = (cells) => WebImporter.Blocks.createBlock(document, {
  name: 'Section Metadata',
  cells: [...cells],
});

async function setMetadata(meta, document, url) {
  const readTime = document.querySelector('.article-time');
  const templates = {
    'cme-group-case-study-article-template': {
      template: 'article',
      subTemplate: 'case-study',
    },
    'cme-group-faqs-article-template': {
      template: 'article',
      subTemplate: 'faqs',
    },
    'cme-group-showcase-article-template': {
      template: 'article',
      subTemplate: 'showcase',
    },
    'cme-group-lesson-template': {
      template: 'lesson',
    },
    'cme-group-course-template': {
      template: 'course',
    },
    'cme-group-standalone-lesson-template': {
      template: 'lesson',
      subTemplate: 'standalone',
    },
    'cme-group-video-article-template': {
      template: 'article',
      subTemplate: 'video',
    },
    'cme-group-standard-article-template': {
      template: 'article',
      subTemplate: 'standard',
    },
    'cme-group-podcast-article-template': {
      template: 'article',
      subTemplate: 'podcast',
    },
    basepage: {
      template: 'chapter',
    },
  };

  const template = fetchTemplate(document);
  if (template && templates[template]) {
    meta.Template = templates[template].template;
    if (templates[template].subTemplate) {
      meta['Sub Template'] = templates[template].subTemplate;
    }
  }

  if (readTime) {
    readTime.remove();
  }

  document.querySelector('.authors')?.remove();

  const articleDate = document.querySelector('.article-date');
  if (articleDate?.textContent) {
    meta.Date = articleDate?.textContent?.trim();
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
          const time = readTimeTemp?.trim().split(' ')[0].trim().toLowerCase();
          if (time.includes(':')) {
            const [minutes, seconds] = time.split(':');
            const nearestMinute = Math.round(Number(minutes) + (Number(seconds) / 60));
            meta['Read Time'] = `${nearestMinute}`;
          } else {
            meta['Read Time'] = `${time}`;
          }
        } else if (key === 'moduleId') {
          meta['Module ID'] = jsonData[key];
        } else if (key === 'hideCourseNavigation') {
          meta['Hide Course Navigation'] = Boolean(jsonData[key]);
        } else if (key === 'jcr:title' && (meta.Template === 'lesson' || meta.Template === 'course' || meta.Template === 'chapter')) {
          meta['Module Title'] = jsonData[key];
        } else if (key === 'isPremium') {
          meta.isPremium = Boolean(jsonData[key]);
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
}

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
const articleHeroBlock = (document, meta) => {
  const hero = document.querySelector('.article-header .article-background');
  if (hero) {
    const bgImage = hero.style.backgroundImage;
    const imgUrl = bgImage.split('url(')[1].split(')')[0].trim().replace(/['"]/g, '');
    let heroName = 'Hero (Article)';
    if (meta['Sub Template'] === 'faqs') {
      heroName = 'Hero (Article, faq)';
    } else if (meta['Sub Template'] === 'standard' || meta['Sub Template'] === 'video' || meta['Sub Template'] === 'podcast') {
      heroName = 'Hero (Article, Overlapping)'; // still pending
    }
    const cells = [[heroName]];

    const tempData = [];
    const anchor = document.createElement('a');
    anchor.href = `https://www.cmegroup.com${imgUrl}`;
    anchor.textContent = anchor.href;

    const h1 = document.createElement('h1');
    h1.innerText = hero.querySelector('h1')?.innerText || document.querySelector('h1')?.innerText || '';

    const div = document.createElement('div');
    div.appendChild(anchor);
    if (h1.innerText) {
      div.appendChild(h1);
      if (hero.querySelector('h1')) {
        hero.querySelector('h1').remove();
      } else if (document.querySelector('h1')) {
        document.querySelector('h1').remove();
      }
    }

    tempData.push(div);
    cells.push(tempData);
    const table = WebImporter.DOMUtils.createTable(cells, document);
    hero.after(buildSectionMetadata([['Style', 'Full Width']]), blockSeparator().cloneNode(true));
    hero.replaceWith(table);
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
        cells.push(['Background Image', anchor]);
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
        cells.push(['Footer Text', `${footerText} ${icon ? `:${icon}:` : ''}`]);
      }

      const table = WebImporter.DOMUtils.createTable(cells, document);
      promo.replaceWith(table);
    });
  }
};

/**
 * This function creates a divider block for the document.
 * @param {Document} document - The document to search.
 */
const dividerBlock = (document) => {
  const dividers = document.querySelectorAll('.divider.line');

  if (dividers?.length) {
    dividers.forEach((divider) => {
      if (!divider.closest('table')) {
        const cells = [['Divider']];
        const table = WebImporter.DOMUtils.createTable(cells, document);
        divider.replaceWith(table);
      }
    });
  }
};

/**
 * This function creates a fragment block for the author bio.
 * @param {Document} document - The document to search.
 */
const authorBioBlock = (document) => {
  const authorBio = document.querySelector('.author-bio');
  if (authorBio) {
    const authorTags = authorBio.getAttribute('data-author-tags');
    const authorTag = authorTags ? JSON.parse(authorTags)[0] : '';

    if (authorTag) {
      const link = `${EDS_DOMAIN}/fragments/authors/${authorTag}`;

      const cells = [['Fragment']];
      cells.push([link]);

      const table = WebImporter.DOMUtils.createTable(cells, document);
      authorBio.replaceWith(table);
    }
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
  if (meta['Sub Template'] === 'faqs') {
    const components = document.querySelectorAll('.component');
    const cells = [['FAQ (Ordered)']];
    let componentIndex = 0;

    const olList = document.querySelectorAll('ol li');
    document.querySelector('ol')?.remove();

    for (let i = 0; i < components.length; i += 1) {
      const component = components[i];
      const h2s = component.querySelectorAll('h2');

      if (h2s?.length) {
        for (let j = 0; j < h2s.length; j += 1) {
          const h2 = h2s[j];
          const h2ParentSibling = h2?.parentElement?.nextElementSibling?.querySelector('.text').innerHTML;
          if (h2ParentSibling) {
            const newH2 = document.createElement('h2');
            newH2.textContent = olList[j].textContent;
            cells.push([newH2, h2ParentSibling]);
          }
        }

        componentIndex = i;
        break;
      }
    }

    const table = WebImporter.DOMUtils.createTable(cells, document);
    // Only replace the first component after we've found our h2s
    if (componentIndex) {
      components[componentIndex].replaceWith(table);
    }
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
      const accountId = video.getAttribute('data-account-id');
      const playlistLocation = video.getAttribute('data-playlist-location');
      const videoId = video.getAttribute('data-video-id');
      const aspectRatio = video.getAttribute('data-aspect-ratio');

      const cells = [['Brightcove']];
      cells.push(['accountID', accountId]);
      cells.push(['videoID', videoId]);
      cells.push(['playlistID', '']);
      cells.push(['playlistLocation', playlistLocation]);
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
        if (!tr.textContent || tr.textContent.trim() === '') {
          tr.remove();
        }
      });

      if (!innerTable.querySelector('thead') && !innerTable.querySelector('th')) {
        tempArr.push('no-header');
      }

      if (innerTable.querySelector('.collapsible')) {
        tempArr.push('collapsible');
      }

      if (innerTable.querySelectorAll('tr').length) {
        innerTable.querySelectorAll('tr').forEach((innerRow, index) => {
          const rowClass = innerRow.classList;
          ['tertiary-row', 'secondary-row', 'primary-row'].forEach((row) => {
            if (rowClass.contains(row)) {
              const tempRowName = row.replace('-row', '');
              if (innerRow.closest('thead')) {
                tempArr.push(`r${index + 1}-${tempRowName}-header`);
              } else if (innerRow.closest('tbody')) {
                tempArr.push(`r${index + 1}-${tempRowName}-group`);
              }
            }
          });
        });
      }

      if (tempArr.length) {
        tableText += ` (${tempArr.join(', ')})`;
      }

      const tempTable = WebImporter.Blocks.createBlock(document, {
        name: tableText,
        cells: [],
      });

      const row = tempTable.insertRow(1);
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
      if (sidebar.textContent && sidebar.textContent.trim() !== '') {
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

const correctLinks = (document) => {
  const links = document.querySelectorAll('a');
  links.forEach((link) => {
    if (link.href) {
      try {
        if (link?.href) {
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
          }
        }
      } catch (error) {
        console.log(`Error correcting links: ${error}, ${link.href}`);
      }
    }
  });
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

const customBlocks = async (document, main, meta, url) => {
  figCaptionEmphasize(document);
  convertImagesToLinks(document);
  mapRowsToSection(document);
  tableBlock(document);
  convertSectionsToMetadata(document, main);
  articleHeroBlock(document, meta);
  promoBlock(document);
  authorBioBlock(document);
  quizBlock(document);
  tagsCloudBlock(document);
  faqBlock(document, meta);
  await accordionBlock(document);
  await lightBoxGallery(document);
  sideBarBlocks(document);
  dividerBlock(document);
  colorMap(document);
  oneClickSubToFragment(document);

  if (meta['Sub Template'] === 'case-study') {
    threeColumnsArticleXS(document);
    generalColumns(document);
    generateEndColumns(document);
  } else if (meta['Sub Template'] === 'standard') {
    standardArticleInitialColumns(document);
  } else if (['lesson', 'course'].includes(meta.Template)) {
    await removeCourseSpecificItem(document, main, meta);
    handleFragments(document);
    coursesColumnsBlock(document);
  }
  await moduleOrder(document, meta, url);
  document.querySelector('.course-nav')?.remove();

  brightCoveVideo(document);
  document.querySelector('.tag-cloud')?.remove();
  createForm(document);
  correctLinks(document);
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
    ]);

    const results = [];
    const report = customReportElements(document);

    const meta = WebImporter.Blocks.getMetadata(document);
    await setMetadata(meta, document, url);
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

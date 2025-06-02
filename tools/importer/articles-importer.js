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
  };

  const template = fetchTemplate(document);
  if (template && templates[template]) {
    meta.Template = templates[template].template;
    if (templates[template].subTemplate) {
      meta['Sub Template'] = templates[template].subTemplate;
    }
  }

  if (readTime) {
    // const time = readTime?.textContent?.trim().split(' ')[0].trim().toLowerCase();
    // if (time.includes(':')) {
    //   const [minutes, seconds] = time.split(':');
    //   const totalSeconds = Number(minutes) * 60 + Number(seconds);
    //   const nearestMinute = Math.round(totalSeconds / 60);
    //   meta['Read Time'] = `${nearestMinute}`;
    // } else {
    //   meta['Read Time'] = `${time}`;
    // }
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
        } else if (key === 'jcr:title' && (meta.Template === 'lesson' || meta.Template === 'course')) {
          meta['Module Title'] = jsonData[key];
        }
      });
    } catch (error) {
      console.warn(`Failed to parse JSON: ${error.message}`);
    }
  }
}

/**
 * This function creates a block separator.
 * @returns {HTMLElement} - The block separator.
 */
export const blockSeparator = () => {
  const p = document.createElement('p');
  p.innerText = '---';
  return p;
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
        sectionMetadata.after(blockSeparator().cloneNode(true));
      }
      if (index !== 0) {
        section.before(blockSeparator().cloneNode(true));
      }
    }
  });
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
    if (meta['Sub Template'] === 'faqs' || meta['Sub Template'] === 'standard' || meta['Sub Template'] === 'video') {
      heroName = 'Hero (Article, Overlapping)'; // TODO inform team about this block variant
    }
    const cells = [[heroName]];

    const tempData = [];
    const anchor = document.createElement('a');
    anchor.href = `https://www.cmegroup.com${imgUrl}`;
    anchor.textContent = anchor.href;

    const h1 = document.createElement('h1');
    h1.innerText = hero.querySelector('h1')?.innerText || '';

    const div = document.createElement('div');
    div.appendChild(anchor);
    if (h1.innerText) {
      div.appendChild(h1);
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
        cells.push(['URL', `${DOMAIN}${path}`]);
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
      const cells = [['Divider']];
      const table = WebImporter.DOMUtils.createTable(cells, document);
      divider.replaceWith(table);
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

const quizBlock = (document) => {
  const quizzes = document.querySelectorAll('.quiz');
  if (quizzes) {
    quizzes.forEach((quiz) => {
      const cells = [['Quiz']];
      const questionText = quiz.querySelector('.question-text');
      if (questionText) {
        cells.push(['Question', questionText.innerText]);
      }
      cells.push(['Options']);

      const options = quiz.querySelectorAll('.option-item');
      options.forEach((option) => {
        const optionText = option.querySelector('.option-text');
        if (optionText) {
          cells.push([optionText.innerText]);
        }
      });

      const answersItems = quiz.querySelector('.quiz-item')?.getAttribute('data-answers-items');
      if (answersItems) {
        const answersItemsJson = JSON.parse(answersItems);
        answersItemsJson.forEach((answer, index) => {
          if (answer.correctAnswer) {
            cells.push(['Correct Answer', index + 1]);
            if (answer.answerSnip) {
              cells.push(['Answer Text', answer.answerSnip]);
            }
          }
        });
      }

      const table = WebImporter.DOMUtils.createTable(cells, document);
      quiz.replaceWith(table);
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
  const paragraphs = document.querySelectorAll('p');
  for (let i = 0; i < paragraphs.length - 1; i += 1) {
    const currentP = paragraphs[i];
    const nextP = paragraphs[i + 1];
    if (currentP.nextElementSibling === nextP) {
      if (currentP.textContent.trim() === '---' && nextP.textContent.trim() === '---') {
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
        const cells = [['Lightbox']];
        const dataPath = lightBox.getAttribute('data-path');

        if (dataPath) {
          // eslint-disable-next-line no-await-in-loop
          const data = await fetch(`${DOMAIN}${dataPath}.json`);
          // eslint-disable-next-line no-await-in-loop
          const dataJson = await data.json();

          if (dataJson?.fileReference) {
            const imgSrc = dataJson.fileReference;
            const figCaption = lightBox.querySelector('figcaption');
            const anchor = document.createElement('a');
            anchor.href = `https://www.cmegroup.com${imgSrc}`;
            anchor.textContent = anchor.href;

            if (figCaption) {
              cells.push([anchor], [figCaption.textContent]);
            } else {
              cells.push([anchor]);
            }
            const table = WebImporter.DOMUtils.createTable(cells, document);
            lightBox.replaceWith(table);
          }
        }
      }
    }
  }
};

const brightCoveVideo = (document) => {
  const videos = document.querySelectorAll('.brightcove-video');
  if (videos?.length) {
    videos.forEach((video) => {
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
    });
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
      const arr = [];
      if (arr.length) {
        tableText += ` (${arr.join(', ')})`;
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
  const images = document.querySelectorAll('img');
  images.forEach((image) => {
    const div = document.createElement('div');
    const imgUrl = image.getAttribute('src');
    const anchor = document.createElement('a');
    anchor.href = `${DOMAIN}${imgUrl}`;
    anchor.textContent = `${anchor.href}`;
    div.appendChild(anchor);
    div.appendChild(document.createElement('br'));
    image.replaceWith(div);
  });
};

const correctLinks = (document) => {
  const links = document.querySelectorAll('a');
  links.forEach((link) => {
    if (link.href) {
      try {
        if (link?.href.endsWith('.html')) {
          const { pathname } = new URL(link.href);
          if (pathname.startsWith('/education/')) {
            link.href = link.href.replace('.html', '');
          }
        }
      } catch (error) {
        console.log(`Error correcting links: ${error}, ${link.href}`);
      }
    }
  });
};

const customBlocks = async (document, main, meta, url) => {
  tableBlock(document);
  convertSectionsToMetadata(document, main);
  articleHeroBlock(document, meta);
  dividerBlock(document);
  promoBlock(document);
  authorBioBlock(document);
  quizBlock(document);
  faqBlock(document, meta);
  await accordionBlock(document);
  await lightBoxGallery(document);
  if (meta['Sub Template'] === 'case-study') {
    threeColumnsArticleXS(document);
    generalColumns(document);
    generateEndColumns(document);
  } else if (meta['Sub Template'] === 'standard') {
    standardArticleInitialColumns(document);
  } else if (['lesson', 'course'].includes(meta.Template)) {
    await removeCourseSpecificItem(document, main, url);
    handleFragments(document);
  }
  await moduleOrder(document, meta, url);
  document.querySelector('.course-nav')?.remove();

  brightCoveVideo(document);
  figCaptionEmphasize(document);
  document.querySelector('.tag-cloud')?.remove();
  createForm(document);
  convertImagesToLinks(document);
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
      '.slick-track',
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

    results.push({
      element: main,
      path: newPagePath,
      report,
    });

    return results;
  },
};

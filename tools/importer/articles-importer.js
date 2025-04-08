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

// Import the table detector module
// import { analyzeTablesForImporter } from './table-detector.js';

import { threeColumnsArticleXS, standardArticleInitialColumns, generalColumns } from './case-study-article.js';

const templateData = {};
const unique = true;

const SECTION_SELECTORS = [
  '.blue1-background',
  '.blue2-background',
  '.blue3-background',
  '.blue4-background',
  '.blue5-background',
  '.blue6-background',
  '.gray1-background',
  '.gray2-background',
  '.gray3-background',
  '.gray4-background',
  '.gray5-background',
  '.gray6-background',
  '.white-background',
  '.leadspace-fade',
  '.parallax',
  '.gradient-white-blue',
  '.gradient-blue-white-fifteen',
  '.gradient-blue-white-thirty',
  '.gradient-blue-white-fifty',
  '.gradient-blue-white-eighty',
  '.crpy-4',
];

const DOMAIN = 'https://www.cmegroup.com';
const EDS_DOMAIN = 'https://main--cmegroup--aemsites.aem.page';

const modifyMap = (map, outerKey, idOrClass = false) => {
  if (!unique) {
    if (map && Object.keys(map).length === 0) {
      return null;
    }

    return map;
  }

  if (map) {
    if (idOrClass) {
      if (templateData[outerKey]) {
        delete map[outerKey];
        return false;
      }
      templateData[outerKey] = true;
      return true;
    }

    Object.keys(map).forEach((key) => {
      if (templateData[outerKey]) {
        if (!templateData[outerKey][key]) {
          templateData[outerKey][key] = true;
        } else {
          delete map[key];
        }
      } else {
        templateData[outerKey] = {
          [key]: true,
        };
      }
    });
  }

  if (map && Object.keys(map).length === 0) {
    return null;
  }

  return map;
};

/**
 * This function fetches the template from the document.
 * @param {Document} document - The document to search.
 * @returns {string} - The template.
 */
const fetchTemplate = (document) => {
  if (document?.body?.classList?.length) {
    const template = document.head.querySelector('meta[name="template"]')?.getAttribute('content');
    return template || document.body.classList.toString();
  }
  return 'unknown';
};

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
      template: 'standalone-lesson',
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
    const time = readTime.textContent.split(' ')[0].trim().toLowerCase();
    const type = readTime.textContent.split(' ')[1]?.trim().toLowerCase();
    meta['Read Time'] = `${time} ${type}`;
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
          const time = jsonData[key].split(':');
          const minutes = Number(time[0]);
          const seconds = Number(time[1]);
          const nearestMinute = Math.round(minutes + seconds / 60);
          meta['Read Time'] = `${nearestMinute} min`;
        }
      });
    } catch (error) {
      console.warn(`Failed to parse JSON: ${error.message}`);
    }
  }
}

/**
 * This function fetches the forms from the document.
 * @param {Document} document - The document to search.
 * @returns {object} - The forms.
 */
const fetchForms = (document) => {
  const forms = document.querySelectorAll('form');
  let map = null;

  if (forms.length) {
    map = {};
    forms.forEach((form) => {
      const parent = form.parentElement;
      let flag = false;

      if (parent) {
        const classes = parent.classList;
        classes.forEach((cls) => {
          if (cls.toLowerCase().indexOf('form') !== -1) {
            map[cls] = true;
            flag = true;
          }
        });
      }

      if (!flag) {
        map.unknown = true;
      }
    });
  }

  return modifyMap(map, 'form');
};

/**
 * This function finds the product contract specs from the document.
 * @param {Document} document - The document to search.
 * @returns {object} - The product contract specs.
 */
const findProductContractSpecs = (document) => {
  const productContractSpecs = document.querySelectorAll('.product-contract-specs-widget');
  let map = null;

  if (productContractSpecs.length) {
    map = {};
    productContractSpecs.forEach((productContractSpec) => {
      const dataSource = productContractSpec.getAttribute('data-data-source');
      if (dataSource) {
        map[dataSource] = true;
      }
    });
  }

  return modifyMap(map, 'product-specs');
};

/**
 * This function finds an element by id.
 * @param {Document} document - The document to search.
 * @param {string} id - The id to search for.
 * @returns {boolean} - True if the element is found, false otherwise.
 */
const idFinder = (document, id) => {
  const element = document.getElementById(id);

  if (element) {
    return modifyMap({
      [id]: true,
    }, id, true);
  }
  return null;
};

/**
 * This function finds an element by class name.
 * @param {Document} document - The document to search.
 * @param {string} className - The class name to search for.
 * @returns {boolean} - True if the element is found, false otherwise.
 */
const classFinder = (document, className) => {
  const element = document.querySelector(`.${className}`);
  if (element) {
    return modifyMap({
      [className]: true,
    }, className, true);
  }
  return null;
};

/**
 * This function checks the current classes of an element.
 * @param {Document} document - The document to search.
 * @param {string} mainSelector - The main selector to search for.
 * @param {string[]} secondarySelectors - The secondary selectors to search for.
 * @returns {boolean} - True if the element is found, false otherwise.
 */
const currentClassesCheck = (document, mainSelector, secondarySelectors, skipUnknown = false) => {
  const mainElements = document.querySelectorAll(`${mainSelector}`);
  let map = null;

  if (mainElements.length) {
    map = {};
    mainElements.forEach((mainElement) => {
      let flag = false;
      secondarySelectors.forEach((selector) => {
        if (mainElement.matches(selector)) {
          map[selector] = true;
          flag = true;
        }
      });

      if (!flag && !skipUnknown) {
        map.unknown = true;
      }
    });
  }

  return modifyMap(map, mainSelector.replace('.', ''));
};

/**
 * This function fetches the tables from the document.
 * @param {Document} document - The document to search.
 * @returns {object} - The tables.
 */
const fetchTable = (document) => {
  const mainElements = document.querySelectorAll('table');
  let map = null;

  if (mainElements.length) {
    map = {};
    mainElements.forEach((mainElement) => {
      map[mainElement.classList.toString()] = true;
    });
  }

  return modifyMap(map, 'table');
};

/**
 * This function analyzes tables in detail using the table-detector module.
 * @param {Document} document - The document to search.
 * @returns {object} - Detailed table analysis.
 */
// const analyzeTablesDetailed = (document) => {
//   // try {
//   //   return analyzeTablesForImporter(document);
//   // } catch (error) {
//   //   console.error('Error analyzing tables:', error);
//   //   return null;
//   // }
// };

/**
 * This function checks the inline style of a design box.
 * @param {Document} document - The document to search.
 * @returns {boolean} - True if the element is found, false otherwise.
 */
const designBoxInlineStyleCheck = (document) => {
  const designBoxes = document.querySelectorAll('.design-box');
  let map = null;

  const secondarySelectors = [
    '.blue1-background',
    '.blue2-background',
    '.blue3-background',
    '.blue4-background',
    '.blue5-background',
    '.blue6-background',
    '.citron-background',
    '.gray1-background',
    '.gray2-background',
    '.gray3-background',
    '.gray4-background',
    '.gray5-background',
    '.gray6-background',
    '.asset-class-box',
    '.white-raised',
    '.white-raised-blue-gradient-sidebar',
    '.white-raised-blue-border',
    '.gradient-white-blue-shadow',
  ];

  if (designBoxes.length) {
    map = {};

    designBoxes.forEach((designBox) => {
      const inlineStyle = designBox.getAttribute('style');
      let flag = false;
      if (inlineStyle) {
        if (inlineStyle.includes('background-image')) {
          map['custom-bg-image'] = true;
          flag = true;
        } else if (inlineStyle.includes('background-color')) {
          map['custom-bg-color'] = true;
          flag = true;
        }
      }
      secondarySelectors.forEach((selector) => {
        if (designBox.matches(selector)) {
          map[selector] = true;
          flag = true;
        }
      });

      if (!flag) {
        map.unknown = true;
      }
    });
  }

  return modifyMap(map, 'design-box');
};

/**
 * This function checks the current and child elements of a design box.
 * @param {Document} document - The document to search.
 * @param {string} mainSelector - The main selector to search for.
 * @param {string[]} childSelectors - The child selectors to search for.
 * @returns {object} - The current and child elements.
 */
// const currentAndChildCheck = (document, mainSelector, childSelectors) => {
//   const mainElements = document.querySelectorAll(`${mainSelector}`);
//   let map = null;

//   if (mainElements.length) {
//     map = {};
//     mainElements.forEach((mainElement) => {
//       let flag = false;
//       childSelectors.forEach((selector) => {
//         if (mainElement.querySelector(selector)) {
//           map[selector] = true;
//           flag = true;
//         }
//       });

//       if (!flag) {
//         map.unknown = true;
//       }
//     });
//   }

//   return modifyMap(map, mainSelector.replace('.', ''));
// };

/**
 * This function checks the expand collapse from the document.
 * @param {Document} document - The document to search.
 * @returns {object} - The expand collapse.
 */
const expandCollapseCheck = (document) => {
  const expandCollapses = document.querySelectorAll('.expand-collapse');
  let map = null;

  if (expandCollapses.length) {
    map = {};
    expandCollapses.forEach((expandCollapse) => {
      const titleType = expandCollapse.getAttribute('data-title-type');
      if (titleType) {
        map[`${titleType}`] = true;
      }

      const listStyle = expandCollapse.getAttribute('data-list-style');
      const componentTitle = expandCollapse.getAttribute('data-component-title');

      if (listStyle && listStyle === 'default') {
        if (componentTitle) {
          map['only-title'] = true;
        }
      } else if (listStyle && listStyle === 'customText') {
        if (componentTitle) {
          map['title-and-customtext'] = true;
        } else {
          map.customtext = true;
        }
      }
    });
  }

  return modifyMap(map, 'expand-collapse');
};

/**
 * This function checks the icons from the document.
 * @param {Document} document - The document to search.
 * @returns {object} - The icons.
 */
const iconsCheck = (document) => {
  const icons = document.querySelectorAll('.icon');
  const map = {};

  if (icons.length) {
    icons.forEach((icon) => {
      map[icon.classList.toString()] = true;
    });
  } else {
    return null;
  }

  return modifyMap(map, 'icon');
};

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
        const img = document.createElement('img');
        img.src = backgroundImg;
        tempArr.push(['Background Image', img]);
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
    const img = document.createElement('img');
    img.src = `https://www.cmegroup.com${imgUrl}`;

    const h1 = document.createElement('h1');
    h1.innerText = hero.querySelector('h1')?.innerText || '';

    const div = document.createElement('div');
    div.appendChild(img);
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
 * This function checks the sections from the document.
 * @param {Document} document - The document to search.
 * @returns {object} - The sections.
 */
const sectionsCheck = (document) => {
  const mainElements = document.querySelectorAll('.section');
  const map = {};

  if (mainElements.length) {
    mainElements.forEach((mainElement) => {
      SECTION_SELECTORS.forEach((selector) => {
        if (mainElement.matches(selector)) {
          map[selector] = true;
        }
      });

      const inlineStyle = mainElement.getAttribute('style');
      if (inlineStyle && inlineStyle.includes('background-image')) {
        map['custom-bg-image'] = true;
      }
    });
  }

  return modifyMap(map, 'section');
};

/**
 * This function checks the data style from the document.
 * @param {Document} document - The document to search.
 * @param {string} type - The type to search for.
 * @returns {object} - The data style.
 */
const dataStyleCheck = (document, type) => {
  const dataStyleMap = document.querySelectorAll(`.${type}`);
  const map = {};

  if (dataStyleMap.length) {
    dataStyleMap.forEach((dataStyle) => {
      const style = dataStyle.getAttribute('data-style');
      if (style) {
        map[`${style}`] = true;
      }
    });
  }

  return modifyMap(map, type);
};

/*
This function checks the cards component and returns a map of the cards.
*/
const cardsComponentCheck = (document) => {
  const cards = document.querySelectorAll('.cards');
  const map = {};

  if (cards.length) {
    cards.forEach((card) => {
      const dataType = card.getAttribute('data-type');
      const dataStyle = card.getAttribute('data-style');
      const featuredCard = card.getAttribute('data-featured-card');
      const featureCardText = (featuredCard === 'none' || !featuredCard) ? '' : featuredCard;

      if (dataType && dataStyle) {
        map[`${dataType}-${dataStyle}-${featureCardText}`] = true;
      } else if (dataType) {
        map[`${dataType}-${featureCardText}`] = true;
      } else if (dataStyle) {
        map[`${dataStyle}-${featureCardText}`] = true;
      } else {
        map.unknown = true;
      }
    });
  }

  return modifyMap(map, 'cards');
};

const detectColumns = (document) => {
  const rows = document.querySelectorAll('.row');
  const map = {};

  if (!rows.length) {
    return null;
  }

  rows.forEach((row) => {
    const cols = row.children;
    const colCount = cols.length;
    let layout = '';

    // Handle different column counts
    if (colCount === 1) {
      const col = cols[0];
      if (col.classList.contains('text-center')) {
        layout = `${colCount} Column Center Aligned`;
      } else if (col.classList.contains('d-none')
        && (col.classList.contains('d-md-block') || col.classList.contains('d-lg-block') || col.classList.contains('d-xl-block'))) {
        layout = `${colCount} Column Show in Desktop Only (MD/LG/XL)`;
      } else if (col.classList.contains('d-md-none') || col.classList.contains('d-lg-none') || col.classList.contains('d-xl-none')) {
        layout = `${colCount} Column Show in Mobile Only (XS/SM)`;
      } else {
        layout = `${colCount} Column`;
      }
    } else if (colCount === 2) {
      const [col1, col2] = cols;
      if (col1.classList.contains('col-md-6') && col2.classList.contains('col-md-6')) {
        layout = `${colCount} Column 50% each`;
      } else if (col1.classList.contains('col-md-8') && col2.classList.contains('col-md-4')) {
        layout = `${colCount} Column 66% and 33%`;
      } else if (col1.classList.contains('col-md-4') && col2.classList.contains('col-md-8')) {
        layout = `${colCount} Column 33% and 66%`;
      } else if (col1.classList.contains('col-md-9') && col2.classList.contains('col-md-3')) {
        layout = `${colCount} Column 75% and 25%`;
      } else if (col1.classList.contains('col-md-3') && col2.classList.contains('col-md-9')) {
        layout = `${colCount} Column 25% and 75%`;
      } else if (col1.classList.contains('col-md-7') && col2.classList.contains('col-md-5')) {
        layout = `${colCount} Column 58% and 42%`;
      } else if (col1.classList.contains('col-md-5') && col2.classList.contains('col-md-7')) {
        layout = `${colCount} Column 42% and 58%`;
      } else {
        layout = `${colCount} Column Custom`;
      }
    } else if (colCount === 3) {
      const allCol4 = Array.from(cols).every((col) => col.classList.contains('col-md-4'));
      layout = allCol4 ? `${colCount} Column 33% each` : `${colCount} Column Custom`;
    } else if (colCount === 4) {
      if (Array.from(cols).every((col) => col.classList.contains('col-md-3'))) {
        layout = `${colCount} Column 25% each`;
      } else if (Array.from(cols).every((col) => col.classList.contains('col-3'))) {
        layout = `${colCount} Column No Collapse`;
      } else {
        layout = `${colCount} Column Custom`;
      }
    }

    // Check for mixed responsive classes
    const hasMixedClasses = Array.from(cols).some((col) => {
      const classes = col.classList;
      const hasDirectCol = Array.from(classes).some((cls) => /^col-(?!(?:md|sm|lg|xl)-)\d+$/.test(cls));
      return (classes.toString().includes('col-md-') && classes.toString().includes('col-sm-'))
        || (classes.toString().includes('col-md-') && hasDirectCol)
        || (classes.toString().includes('col-sm-') && hasDirectCol);
    });

    if (hasMixedClasses) {
      layout = `${colCount} Columns Combination of Collapsible and Non Collapsible`;
    }

    // Additional modifiers
    if (row.classList.contains('vcr')) {
      layout += ' With Vertical Divider';
    }
    if (row.classList.contains('justify-content-end')) {
      layout += ' Right Aligned';
    }
    if (row.classList.contains('justify-content-between')) {
      layout += ' Space Between';
    }
    if (row.classList.contains('justify-content-around')) {
      layout += ' Space Around';
    }
    if (row.classList.contains('big-gutters')) {
      layout += ' Big Gutter';
    }
    if (row.classList.contains('medium-gutters')) {
      layout += ' Medium Gutter';
    }
    if (row.classList.contains('small-gutters')) {
      layout += ' Small Gutter';
    }
    // Check for offset columns
    const hasOffset = Array.from(cols).some((col) => Array.from(col.classList).some((cls) => cls.startsWith('offset-md-')));
    if (hasOffset) {
      layout += ' Offset Columns';
    }

    map[layout] = true;
  });

  return modifyMap(map, 'columns');
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

      const cells = [[`CTA (Promo, ${theme}, Divider Line)`]];
      if (link) {
        cells.push(['URL', `${DOMAIN}${path}`]);
      }
      if (imgSrc) {
        const img = document.createElement('img');
        img.src = imgSrc;
        cells.push(['Background Image', img]);
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
  const dividers = document.querySelectorAll('.divider-line');

  if (dividers.length) {
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

/**
 * get all iframes
 * @param {*} document
 */
const iframeReport = (document) => {
  const iframes = document.querySelectorAll('iframe');
  let map = null;

  if (iframes.length) {
    map = {};

    iframes.forEach((iframe) => {
      const iframSrc = iframe.src;
      const iframeName = iframe.name;
      if (iframSrc && iframeName !== 'goog_topics_frame') {
        map[iframSrc] = true;
      }
    });
  }

  return modifyMap(map, 'iframes');
};

/**
 * This function creates a xf-content-height block for the document.
 * @param {Document} document - The document to search.
 * @returns {object} - The xf-content-height analysis.
 */
const xfContentHeight = (document) => {
  const contentHeights = document.querySelectorAll('.xf-content-height');
  let map = null;

  if (contentHeights.length) {
    map = {};
    contentHeights.forEach((item) => {
      // get first heading
      const firstHeading = item.querySelector('h1, h2, h3, h4, h5, h6');
      if (firstHeading) {
        // firstHeading.innerText trim it and replace starting and ending \n if any
        const heading = firstHeading.innerText.trim().replace(/^\n+|\n+$/g, '');

        map[`${heading}`] = true;
      } else {
        map['custom-fragment'] = true;
      }
    });
  }

  if (map && Object.keys(map).length === 0) {
    return null;
  }

  return map;
};

const getAssetCounts = (document) => {
  const assetMap = {};

  // Images (jpg, jpeg, png, gif, webp, svg)
  const images = document.querySelectorAll('img');
  images.forEach((img) => {
    const { src } = img;
    if (src) {
      const ext = src.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
        assetMap[ext] = (assetMap[ext] || 0) + 1;
      }
    }
  });

  // Background images in styles
  const elementsWithBg = document.querySelectorAll('[style*="background-image"]');
  elementsWithBg.forEach((el) => {
    const bgImage = el.style.backgroundImage;
    if (bgImage && bgImage.includes('url(')) {
      const url = bgImage.split('url(')[1].split(')')[0].replace(/['"]/g, '');
      const ext = url.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
        assetMap[ext] = (assetMap[ext] || 0) + 1;
      }
    }
  });

  // PDFs
  const pdfLinks = document.querySelectorAll('a[href$=".pdf"]');
  if (pdfLinks.length) {
    assetMap.pdf = pdfLinks.length;
  }

  // Videos
  const videos = document.querySelectorAll('video');
  videos.forEach((video) => {
    const sources = video.querySelectorAll('source');
    sources.forEach((source) => {
      const type = source.type?.toLowerCase() || '';
      if (type.includes('video/')) {
        const format = type.split('/')[1];
        assetMap[format] = (assetMap[format] || 0) + 1;
      }
    });
  });

  // Video iframes (YouTube, Vimeo, etc.)
  const videoIframes = document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="brightcove"]');
  if (videoIframes.length) {
    assetMap.embedded_videos = videoIframes.length;
  }

  // Audio
  const audioElements = document.querySelectorAll('audio');
  audioElements.forEach((audio) => {
    const sources = audio.querySelectorAll('source');
    sources.forEach((source) => {
      const type = source.type?.toLowerCase() || '';
      if (type.includes('audio/')) {
        const format = type.split('/')[1];
        assetMap[format] = (assetMap[format] || 0) + 1;
      }
    });
  });

  // Podcast links
  const podcastLinks = document.querySelectorAll('a[href$=".mp3"], a[href$=".wav"], a[href$=".ogg"]');
  podcastLinks.forEach((link) => {
    const ext = link.href.split('.').pop().toLowerCase();
    assetMap[ext] = (assetMap[ext] || 0) + 1;
  });

  return Object.keys(assetMap).length ? assetMap : null;
};

const customReportElements = (document) => {
  const report = {
    template: fetchTemplate(document),
    forms: fetchForms(document),
    'product-contract-specs-widget': findProductContractSpecs(document),
    'expand-collapse': expandCollapseCheck(document),
    'heat-map': dataStyleCheck(document, 'heat-map'),
    tabs: dataStyleCheck(document, 'tabs'),
    icons: iconsCheck(document),
    sections: sectionsCheck(document),
    cards: cardsComponentCheck(document),
    'design-box': designBoxInlineStyleCheck(document),
    columns: detectColumns(document),
    assets: getAssetCounts(document),
    iframes: iframeReport(document),
    // 'tables-detailed': analyzeTablesDetailed(document),
    fragments: xfContentHeight(document),
  };

  const currentClassesMap = {
    accordion: {
      val: [
        '.white-background-icon-raised',
        '.default',
      ],
      skipUnknown: true,
    },
    alert: {
      val: [
        '.alert-info',
        '.alert-info.alert-dismissible',
        '.alert-warning',
        '.alert-warning.alert-dismissible',
        '.alert-error',
        '.alert-errorws',
        '.alert-dismissible',
      ],
    },
    dropdown: {
      val: [
        '.dropdown-link-dropdown',
        '.language-selector-dropdown',
      ],
    },
    promo: {
      val: [
        '.primary',
        '.custom',
        '.secondary',
        '.toolbox',
        '.no-cta-text',
        '.with-cta-text',
      ],
    },
    'title-text': {
      val: [
        '.citron',
        '.gray4',
        '.gray3',
        '.green',
        '.forest',
      ],
      skipUnknown: true,
    },
    'brightcove-player': {
      val: [
        '.display-block',
        '.playlist-right-sidekick',
      ],
    },
    btn: {
      val: [
        '.primary',
        '.new-window',
        '.primary-alternate',
        '.secondary',
        '.secondary-2',
        '.secondary-3',
        '.secondary-4',
        '.disabled',
        '.link',
        '.link-bold',
      ],
      skipUnknown: true,
    },
    divider: {
      val: [
        '.line',
        '.pipe',
      ],
    },
  };

  Object.keys(currentClassesMap).forEach((key) => {
    const tempMap = currentClassesCheck(document, `.${key}`, currentClassesMap[key].val, currentClassesMap[key].skipUnknown);
    if (tempMap) {
      report[key] = tempMap;
    }
  });

  // const currentAndChildCheckMap = {
  //   divider: [
  //     '.line > .gray3',
  //     '.line > .blue5',
  //     '.line > .citron',
  //     '.line > .green',
  //     '.line > .xs',
  //     '.line > .s',
  //     '.line > .left',
  //     '.line > .right',
  //     '.line > .center',
  //     '.pipe > .gray3',
  //     '.pipe > .blue5',
  //     '.pipe > .citron',
  //     '.pipe > .green',
  //     '.pipe > .xs',
  //     '.pipe > .s',
  //     '.pipe > .left',
  //     '.pipe > .right',
  //     '.pipe > .center',
  //   ],
  // };

  // Object.keys(currentAndChildCheckMap).forEach((key) => {
  //   const tempMap = currentAndChildCheck(document, `.${key}`, currentAndChildCheckMap[key]);
  //   if (tempMap) {
  //     report[key] = tempMap;
  //   }
  // });

  const ids = ['countdownClock'];
  ids.forEach((id) => {
    const temp = idFinder(document, id);
    if (temp) {
      report[id] = temp;
    }
  });

  const classes = ['lds-ring', 'market-news', 'carousel', 'author-bio', 'tag-cloud', 'quiz', 'course-nav', 'lateral-navigation'];
  classes.forEach((className) => {
    const temp = classFinder(document, className);
    if (temp) {
      report[className] = temp;
    }
  });

  const tagMap = {
    table: [
      '.content-table',
      '.data-table',
      '.compact',
      '.no-column-header',
      '.no-zebra',
      '.content-table.compact',
      '.content-table.compact.no-column-header',
      '.data-table.compact.no-column-header',
      '.content-table.no-zebra',
      '.default',
      '.default.no-column-header',
      '.default.compact.no-zebra',
      '.content-table.compact.no-zebra.no-column-header',
    ],
  };

  Object.keys(tagMap).forEach((key) => {
    const tempMap = currentClassesCheck(document, key, tagMap[key]);
    if (tempMap) {
      report[key] = tempMap;
    }
  });

  const tableOccurences = fetchTable(document);
  if (tableOccurences) {
    report['table-classes'] = tableOccurences;
  }

  return report;
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

// TODO inform team about this block
const lightBoxGallery = (document) => {
  const components = document.querySelectorAll('.component');
  if (components?.length) {
    components.forEach((lightBox) => {
      const attribute = lightBox.getAttribute('data-img-style');
      if (attribute === 'lightbox-gallery' || attribute === 'lightbox') {
        const cells = [['Lightbox']];
        let imageSrc = lightBox.querySelector('img')?.src;
        const figCaption = lightBox.querySelector('figcaption');

        if (imageSrc) {
          // remove host from src
          const imgUrl = new URL(imageSrc);
          imageSrc = imgUrl.pathname;
          const img = document.createElement('img');
          img.src = `https://www.cmegroup.com${imageSrc}`;

          if (figCaption) {
            cells.push([img], [figCaption.textContent]);
          } else {
            cells.push([img]);
          }

          const table = WebImporter.DOMUtils.createTable(cells, document);
          lightBox.replaceWith(table);
        }
      }
    });
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
      console.log(video);

      const img = video.querySelector('.vjs-poster')?.style.backgroundImage;
      const imgUrl = img?.split('url(')[1].split(')')[0].trim().replace(/['"]/g, '');
      if (imgUrl) {
        const imgElement = document.createElement('img');
        imgElement.src = imgUrl;
        cells.push(['placeholderImg', imgElement]);
      }

      const table = WebImporter.DOMUtils.createTable(cells, document);
      video.replaceWith(table);
    });
  }
};

const createForm = (document) => {
  const forms = document.querySelectorAll('form');
  // console.log(forms, 3333);
  if (forms?.length) {
    forms.forEach((form) => {
      // console.log(form, 3333);
      console.log(form.parentElement, 444);
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
// const addColumnsBlock = (document) => {
//   const columns = document.querySelectorAll('.three-columns');
//   if (columns?.length) {
//     columns.forEach((column) => {
//       column.classList.add('columns');
//     });
//   }
// };

const customBlocks = async (document, main, meta) => {
  convertSectionsToMetadata(document, main);
  articleHeroBlock(document, meta);
  dividerBlock(document);
  promoBlock(document);
  authorBioBlock(document);
  quizBlock(document);
  faqBlock(document, meta);
  await accordionBlock(document);
  lightBoxGallery(document);
  if (meta['Sub Template'] === 'case-study') {
    threeColumnsArticleXS(document);
    generalColumns(document);
  } else if (meta['Sub Template'] === 'standard') {
    standardArticleInitialColumns(document);
  }
  brightCoveVideo(document);

  figCaptionEmphasize(document);
  document.querySelector('.tag-cloud')?.remove();
  createForm(document);
  // TODO remove this as removing all forms as of now
  // document.querySelectorAll('form')?.forEach((form) => {
  //   form.remove();
  // });
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
    ]);

    const results = [];
    const report = customReportElements(document);

    const meta = WebImporter.Blocks.getMetadata(document);
    await setMetadata(meta, document, url);

    const mdb = WebImporter.Blocks.getMetadataBlock(document, meta);
    main.append(mdb);

    await customBlocks(document, main, meta);

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

    results.push({
      element: main,
      path: newPagePath,
      report,
    });

    return results;
  },
};

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
  };

  const template = fetchTemplate(document);
  if (template && templates[template]) {
    meta.Template = templates[template].template;
    meta['Sub Template'] = templates[template].subTemplate;
  }
  if (readTime) {
    const time = readTime.textContent.split(' ')[0].trim().toLowerCase();
    const type = readTime.textContent.split(' ')[1]?.trim().toLowerCase();
    meta['Read Time'] = `${time} ${type}`;
    readTime.remove();
  }

  const articleDate = document.querySelector('.article-date');
  if (articleDate?.textContent) {
    meta.Date = articleDate?.textContent?.trim();
    articleDate.remove();
  }

  const jsonUrl = new URL(url).pathname.replace('.html', '/jcr:content.json');
  const jsonResponse = await fetch(jsonUrl);
  const jsonData = await jsonResponse.json();

  Object.keys(jsonData).forEach((key) => {
    const arr = [];
    if (key === 'primaryAuthors') {
      jsonData[key].forEach((author) => {
        arr.push(author.replace(/^.*:/, ''));
      });
      meta.authors = arr.join(',');
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
    }
  });
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

  return map;
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
  return map;
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
    return true;
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
    return true;
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

  if (map && Object.keys(map).length === 0) {
    map = null;
  }
  return map;
};

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
  return map;
};

/**
 * This function checks the current and child elements of a design box.
 * @param {Document} document - The document to search.
 * @param {string} mainSelector - The main selector to search for.
 * @param {string[]} childSelectors - The child selectors to search for.
 * @returns {object} - The current and child elements.
 */
const currentAndChildCheck = (document, mainSelector, childSelectors) => {
  const mainElements = document.querySelectorAll(`${mainSelector}`);
  let map = null;

  if (mainElements.length) {
    map = {};
    mainElements.forEach((mainElement) => {
      let flag = false;
      childSelectors.forEach((selector) => {
        if (mainElement.querySelector(selector)) {
          map[selector] = true;
          flag = true;
        }
      });

      if (!flag) {
        map.unknown = true;
      }
    });
  }

  return map;
};

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

  return map;
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

  return map;
};

/**
 * This function checks the sections from the document.
 * @param {Document} document - The document to search.
 * @returns {object} - The sections.
 */
const sectionsCheck = (document) => {
  const mainElements = document.querySelectorAll('.section');
  const map = {};
  const secondarySelectors = [
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

  if (mainElements.length) {
    mainElements.forEach((mainElement) => {
      secondarySelectors.forEach((selector) => {
        if (mainElement.matches(selector)) {
          map[selector] = true;
        }
      });

      const inlineStyle = mainElement.getAttribute('style');
      if (inlineStyle && inlineStyle.includes('background-image')) {
        map['custom-bg-image'] = true;
      }
    });
  } else {
    return null;
  }

  return map;
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
  } else {
    return null;
  }

  return map;
};

/*
This function checks the cards component and returns a map of the cards.
*/
const cardsComponentCheck = (document) => {
  const cards = document.querySelectorAll('.cards');
  let map = null;

  if (cards.length) {
    map = {};

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

  return map;
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
  };

  Object.keys(currentClassesMap).forEach((key) => {
    const tempMap = currentClassesCheck(document, `.${key}`, currentClassesMap[key].val, currentClassesMap[key].skipUnknown);
    if (tempMap) {
      report[key] = tempMap;
    }
  });

  const currentAndChildCheckMap = {
    divider: [
      '.line > .gray3',
      '.line > .blue5',
      '.line > .citron',
      '.line > .green',
      '.line > .xs',
      '.line > .s',
      '.line > .left',
      '.line > .right',
      '.line > .center',
      '.pipe > .gray3',
      '.pipe > .blue5',
      '.pipe > .citron',
      '.pipe > .green',
      '.pipe > .xs',
      '.pipe > .s',
      '.pipe > .left',
      '.pipe > .right',
      '.pipe > .center',
    ],
  };

  Object.keys(currentAndChildCheckMap).forEach((key) => {
    const tempMap = currentAndChildCheck(document, `.${key}`, currentAndChildCheckMap[key]);
    if (tempMap) {
      report[key] = tempMap;
    }
  });

  const ids = ['countdownClock'];
  ids.forEach((id) => {
    const temp = idFinder(document, id);
    if (temp) {
      report[id] = temp;
    }
  });

  const classes = ['lds-ring', 'market-news', 'carousel'];
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

  return report;
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
    ]);

    const results = [];

    const meta = WebImporter.Blocks.getMetadata(document);
    await setMetadata(meta, document, url);

    const mdb = WebImporter.Blocks.getMetadataBlock(document, meta);
    main.append(mdb);
    // const meta = WebImporter.Blocks.getMetadata(document);
    // const template = fetchTemplate(document);
    // const fetchTableClasses = fetchTable(main);

    // WebImporter.DOMUtils.remove(main, 'body');

    // const mdb = WebImporter.Blocks.getMetadataBlock(document, meta);
    // main.append(mdb);

    // WebImporter.rules.transformBackgroundImages(main, document);
    // WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
    // WebImporter.rules.convertIcons(main, document);

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

    results.push({
      element: main,
      path: newPagePath,
      report: customReportElements(document),
    });

    return results;
  },
};

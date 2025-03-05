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

const fetchTemplate = (document) => {
  if (document?.body?.classList?.length) {
    const template = document.head.querySelector('meta[name="template"]')?.getAttribute('content');
    return template || document.body.classList.toString();
  }
  return 'unknown';
};

// const fetchTable = (document) => {
//   const tables = document.querySelectorAll('table');
//   const allTablesClasses = [...tables].map(table => {
//     return table.classList.toString();
//   }).join(',');

//   return allTablesClasses;
// }

const fetchForms = (document) => {
  const forms = document.querySelectorAll('form');
  const map = {};

  if (forms.length) {
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

    return map;
  }
  return null;
};

const findProductContractSpecs = (document) => {
  const productContractSpecs = document.querySelectorAll('.product-contract-specs-widget');
  const map = {};

  if (productContractSpecs.length) {
    productContractSpecs.forEach((productContractSpec) => {
      console.log(productContractSpec);
      const dataSource = productContractSpec.getAttribute('data-data-source');
      if (dataSource) {
        map[dataSource] = true;
      }
    });

    return map;
  }
  return null;
};

const idFinder = (document, id) => {
  const element = document.getElementById(id);
  if (element) {
    return true;
  }
  return null;
};

const classFinder = (document, className) => {
  const elements = document.querySelector(`.${className}`);
  if (elements) {
    return true;
  }
  return null;
};

const currentAndClassesCheck = (document, mainSelector, secondarySelectors) => {
  const mainElements = document.querySelectorAll(`${mainSelector}`);
  const map = {};

  if (mainElements.length) {
    mainElements.forEach((mainElement) => {
      let flag = false;
      secondarySelectors.forEach((selector) => {
        if (mainElement.matches(selector)) {
          map[selector] = true;
          flag = true;
        }
      });

      if (!flag) {
        map.unknown = true;
      }
    });
  } else {
    return null;
  }

  return map;
};

const designBoxInlineStyleCheck = (document) => {
  const designBoxes = document.querySelectorAll('.design-box');
  const map = {};
  if (designBoxes.length) {
    designBoxes.forEach((designBox) => {
      const inlineStyle = designBox.getAttribute('style');
      if (inlineStyle) {
        if (inlineStyle.includes('background-image')) {
          map['custom-bg-image'] = true;
        } else if (inlineStyle.includes('background-color')) {
          map['custom-bg-color'] = true;
        }
      }
    });

    return map;
  }
  return null;
};

const currentAndChildCheck = (document, mainSelector, childSelectors) => {
  const mainElements = document.querySelectorAll(`${mainSelector}`);
  const map = {};

  if (mainElements.length) {
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
  } else {
    return null;
  }

  return map;
};

const expandCollapseCheck = (document) => {
  const expandCollapses = document.querySelectorAll('.expand-collapse');
  const map = {};

  if (expandCollapses.length) {
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
  } else {
    return null;
  }

  return map;
};

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

const customReportElements = (document) => {
  const map = {
    accordion: ['.white-background-icon-raised'],
    alert: [
      '.alert-info',
      // '.alert-info.alert-dismissible',
      '.alert-warning',
      // '.alert-warning.alert-dismissible',
      '.alert-error',
      '.alert-errorws',
      '.alert-dismissible',
    ],
    'design-box': [
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
    ],
    dropdown: [
      '.dropdown-link-dropdown',
      '.language-selector-dropdown',
    ],
    promo: [
      '.primary',
      '.custom',
      '.secondary',
      '.toolbox',
    ],
    'title-text': [
      '.citron',
      '.gray4',
      '.gray3',
      '.green',
      '.forest',
    ],
    'brightcove-player': [
      '.display-block',
      '.playlist-right-sidekick',
    ],
    btn: [
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
  };

  const ids = ['countdownClock'];

  const classes = ['lds-ring', 'market-news'];

  const report = {
    // 'table-types': fetchTable(document),
    template: fetchTemplate(document),
    forms: fetchForms(document),
    'product-contract-specs-widget': findProductContractSpecs(document),
    'expand-collapse': expandCollapseCheck(document),
    'heat-map': dataStyleCheck(document, 'heat-map'),
    tabs: dataStyleCheck(document, 'tabs'),
    icons: iconsCheck(document),
    sections: sectionsCheck(document),
  };

  Object.keys(map).forEach((key) => {
    const tempMap = currentAndClassesCheck(document, `.${key}`, map[key]);
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

  if (report['design-box']) {
    const designBoxes = designBoxInlineStyleCheck(document);
    if (designBoxes) {
      report['design-box'] = {
        ...report['design-box'],
        ...designBoxes,
      };
    }
  } else {
    const designBoxes = designBoxInlineStyleCheck(document);
    if (designBoxes) {
      report['design-box'] = designBoxes;
    }
  }

  ids.forEach((id) => {
    const temp = idFinder(document, id);
    if (temp) {
      report[id] = temp;
    }
  });

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
    const tempMap = currentAndClassesCheck(document, key, tagMap[key]);
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
  transform: ({
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
    ]);

    const results = [];
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
      // element: main,
      path: newPagePath,
      report: customReportElements(document),
    });

    return results;
  },
};

import { fetchTemplate, SECTION_SELECTORS } from './utils.js';

const templateData = {};
const unique = true;

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

export {
  // eslint-disable-next-line import/prefer-default-export
  customReportElements,
};

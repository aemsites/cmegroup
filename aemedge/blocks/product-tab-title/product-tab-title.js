import {
  getDisplayMode,
  normalizePath,
} from '../../scripts/utils/product.js';
import { createElement, i18n } from '../../scripts/utils.js';
import { store } from '../../scripts/store/store.js';

const PRODUCT_TAB_TITLES = {
  overview: 'Overview',
  quotes: 'Quotes',
  settlements: 'Settlements',
  volume: 'Volume & Open Interest',
  specs: 'Contract Specs',
  margins: 'Margins',
  calendar: 'Calendar',
};

export default function decorate(block) {
  const currentPath = normalizePath(window.location.pathname);
  const tabPath = currentPath.split('/options')[0];
  const currentTab = tabPath.split('/').pop();
  if (!currentTab) {
    return;
  }
  const tabTitle = PRODUCT_TAB_TITLES[currentTab];
  i18n(tabTitle).then((label) => {
    let rendered = false;
    store.subscribe(({ productData }) => productData, (productData) => {
      if (productData.loaded && !rendered) {
        rendered = true;
        const { optionsLabels, fullProductName } = productData;
        const { optionProductId } = getDisplayMode();
        let title = '';
        const option = optionsLabels?.find(
          ({ productId }) => productId === optionProductId,
        );
        if (option) {
          title = option.name;
        } else {
          title = fullProductName;
        }
        const fullTitle = title ? `${title} - ${label}` : '';
        const titleHtml = createElement('h2', { class: 'product-title' }, fullTitle);
        block.prepend(titleHtml);
      }
    });
  });
}

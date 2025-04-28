/* global WebImporter */
/* eslint-disable no-console, class-methods-use-this */

// Specifically for the success section
const standardArticleInitialColumns = (document) => {
  const columns = document.querySelector('.no-gutters.justify-content-start');
  if (columns) {
    const cells = [['Columns']];
    const arr = [];

    const imgSrc = columns.querySelector('img')?.src;
    if (imgSrc.indexOf('ribbon') !== -1) {
      [...columns.children].forEach((child, index) => {
        if (index === 0) {
          arr.push(':ribbon:');
        } else {
          arr.push(child.innerHTML);
        }
      });

      cells.push(arr);
      const table = WebImporter.DOMUtils.createTable(cells, document);
      columns.replaceWith(table);
    }
  }
};

export {
  // eslint-disable-next-line import/prefer-default-export
  standardArticleInitialColumns,
};

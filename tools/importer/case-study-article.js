/* global WebImporter */
/* eslint-disable no-console, class-methods-use-this */

// Columns(Article, spacing-xs)
export const threeColumnsArticleXS = (document) => {
  const threeColumns = document.querySelector('.vcr.medium-gutters');

  if (threeColumns) {
    const cells = [['Columns (Article, spacing-xs)']];
    const arr = [];

    [...threeColumns.children].forEach((child) => {
      arr.push(child.innerHTML);
    });

    cells.push(arr);

    const table = WebImporter.DOMUtils.createTable(cells, document);
    threeColumns.replaceWith(table);
  }
};

export default threeColumnsArticleXS;

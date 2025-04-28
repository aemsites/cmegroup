/* global WebImporter */
/* eslint-disable no-console, class-methods-use-this */

// Columns(Article, spacing-xs)
const threeColumnsArticleXS = (document) => {
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

const generalColumns = (document) => {
  const columns = document.querySelector('.vcr-white.justify-content-start');
  if (columns) {
    const cells = [['Columns']];
    const arr = [];

    [...columns.children].forEach((child) => {
      arr.push(child.innerHTML);
    });

    cells.push(arr);

    const table = WebImporter.DOMUtils.createTable(cells, document);
    columns.replaceWith(table);
  }
};

const generateEndColumns = (document) => {
  const rows = document.querySelectorAll('.row.justify-content-start');

  rows.forEach((row) => {
    if (row.querySelector(':scope > .col-md-6')) {
      const cells = [['Columns']];
      const arr = [];

      [...row.children].forEach((child) => {
        arr.push(child.innerHTML);
      });

      cells.push(arr);
      const table = WebImporter.DOMUtils.createTable(cells, document);
      row.replaceWith(table);
    }
  });
};

export {
  threeColumnsArticleXS,
  generalColumns,
  generateEndColumns,
};

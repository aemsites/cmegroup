import { store } from '../../scripts/store/store.js';

function buildCell(colspan = 1, rowspan = 1, header = false) {
  const cell = header ? document.createElement('th') : document.createElement('td');
  if (colspan > 1) cell.setAttribute('colspan', colspan);
  if (rowspan > 1) cell.setAttribute('rowspan', rowspan);
  return cell;
}

function initStyleMatrix(data) {
  const numberOfRows = data.children.length;
  let numberOfColumns = 0;
  if (numberOfRows > 0) {
    const firstRowCells = [...data.children[0].children];
    numberOfColumns = firstRowCells.reduce((total, cell) => {
      const colspan = parseInt(cell.getAttribute('colspan') || 1, 10);
      return total + colspan;
    }, 0);
  }

  return Array.from({ length: numberOfRows }, () => Array(numberOfColumns).fill('body'));
}

function parseRegexStyles(styleMatrix, blockClassList, numberOfColumns, numberOfRows) {
  let hasRegexStyle = false;
  blockClassList.forEach((className) => {
    // Match patterns: r2-style, c2-style, r1-header-primary, etc.
    const match = className.match(/^(r(\d+)?|c(\d+))-(.+)/);
    if (match) {
      hasRegexStyle = true;
      let row = null;
      let col = null;

      if (match[2]) {
        row = parseInt(match[2], 10) - 1;
      }

      if (match[3]) {
        col = parseInt(match[3], 10) - 1;
      }

      const style = match[4]; // Capture everything after the dash as the style

      if (row !== null) {
        // Full row: r2-style
        for (let c = 0; c < numberOfColumns; c += 1) {
          styleMatrix[row][c] = style;
        }
      } else if (col !== null) {
        // Full column: c2-style
        for (let r = 0; r < numberOfRows; r += 1) {
          styleMatrix[r][col] = style;
        }
      }
    }
  });

  return hasRegexStyle;
}

function setDefaultStyles(styleMatrix, data, header) {
  let firstHeaderEmpty;
  let count = 0;

  [...data.children].forEach((child, i) => {
    const cells = [...child.children];

    if (header && i === 0) {
      firstHeaderEmpty = cells[0]?.textContent.trim() === '';
    }

    cells.forEach((col, j) => {
      const rowspan = col.getAttribute('rowspan') || 1;
      if (header && i === 0) {
        styleMatrix[i][j] = 'primary-header';
      } else if (header && firstHeaderEmpty && j === 0) {
        if (count === 0) {
          styleMatrix[i][j] = 'primary-header';
          if (rowspan > 1) {
            count = rowspan - 1;
          }
        } else {
          count -= 1;
        }
      }
    });
  });
}

function populateStyleMatrix(data, blockClassList, header = false) {
  const styleMatrix = initStyleMatrix(data);
  const numberOfRows = data.children.length;
  const numberOfColumns = styleMatrix[0].length;

  // Parse block class list for styles
  const hasRegexStyle = parseRegexStyles(
    styleMatrix,
    blockClassList,
    numberOfColumns,
    numberOfRows,
  );

  if (!hasRegexStyle) {
    setDefaultStyles(styleMatrix, data, header);
  }

  return styleMatrix;
}

function moveHeadRows(block) {
  const table = block.querySelector('table');
  const thead = table.querySelector('thead');
  if (!thead) {
    return;
  }
  let tbody = table.querySelector('tbody');
  if (!tbody) {
    tbody = document.createElement('tbody');
    table.appendChild(tbody);
  }
  const rows = Array.from(thead.querySelectorAll('tr'));
  const firstRow = tbody.firstChild;
  rows.forEach((row) => {
    tbody.insertBefore(row, firstRow);
  });
  thead.remove();
}

export default async function decorate(block) {
  const containsHeader = block.classList.contains('contains-header');
  if (containsHeader) {
    moveHeadRows(block);
  }

  const data = block.querySelector('table tbody');
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const header = !block.classList.contains('no-header');
  if (header) table.append(thead);
  table.append(tbody);

  const styleMatrix = populateStyleMatrix(data, [...block.classList], header);

  const maxRowspan = header && data.children.length > 0
    ? Math.max(...[...data.children[0].children].map((cell) => parseInt(cell.getAttribute('rowspan') || 1, 10)))
    : 1;

  [...data.children].forEach((child, i) => {
    const row = document.createElement('tr');
    const isHeaderRow = header && i < maxRowspan;

    if (isHeaderRow) {
      thead.append(row);
    } else {
      tbody.append(row);
    }

    const cells = [...child.children];
    let colIndex = 0;

    cells.forEach((col) => {
      // skip slots already filled by earlier rowspan/colspan
      while (styleMatrix[i][colIndex] === 'occupied') {
        colIndex += 1;
      }

      const colspan = parseInt(col.getAttribute('colspan') || 1, 10);
      const rowspan = parseInt(col.getAttribute('rowspan') || 1, 10);

      const cell = buildCell(colspan, rowspan, isHeaderRow);
      cell.innerHTML = col.innerHTML === '[empty-cell]' ? '&nbsp;' : col.innerHTML || '&nbsp;';
      const inlineStyleCellMatch = cell.textContent.match(/\[(.*?)\]/);

      // Extract and apply inline styles from the last paragraph
      const paragraphs = cell.querySelectorAll('p');
      if (paragraphs.length > 0) {
        const lastParagraph = paragraphs[paragraphs.length - 1];
        const inlineStyleMatch = lastParagraph.textContent.match(/\[(.*?)\]/);
        if (inlineStyleMatch) {
          const styles = inlineStyleMatch[1].split(',').map((s) => s.trim());
          styles.forEach((style) => {
            const [property, value] = style.split(':').map((s) => s.trim());
            cell.style[property] = value;
          });
          // Remove the style definition from the paragraph content
          lastParagraph.textContent = lastParagraph.textContent.replace(inlineStyleMatch[0], '').trim();
        }
      } else if (inlineStyleCellMatch) {
        // Extract and apply inline styles from the cell (when not a p)
        const styles = inlineStyleCellMatch[1].split(',').map((s) => s.trim());
        styles.forEach((style) => {
          const [property, value] = style.split(':').map((s) => s.trim());
          cell.style[property] = value;
        });
        // Remove the style definition from the cell content
        cell.textContent = cell.textContent.replace(inlineStyleCellMatch[0], '').trim();
      }

      if (styleMatrix[i][colIndex] !== 'body') {
        cell.classList.add(styleMatrix[i][colIndex]);
      }

      // mark spanned slots so later cells skip them
      for (let r = 0; r < rowspan; r += 1) {
        for (let c = 0; c < colspan; c += 1) {
          if (r === 0 && c === 0) {
            // eslint-disable-next-line no-continue
            continue; // base cell
          }
          if (styleMatrix[i + r]) {
            styleMatrix[i + r][colIndex + c] = 'occupied';
          }
        }
      }

      row.append(cell);
      colIndex += colspan;
    });
  });

  block.innerHTML = '';
  block.append(table);

  if (block.classList.contains('collapsible')) {
    const rows = block.querySelectorAll('tbody tr');
    rows.forEach((row) => {
      const firstCell = row.querySelector('td:first-child');
      if (firstCell) {
        firstCell.addEventListener('click', () => {
          row.classList.toggle('expanded');
        });
      }
    });
  }
  store.subscribe(({ floatingElements }) => floatingElements, ({ height }) => {
    document.querySelectorAll('.table.fixed-row-header thead').forEach((headerSection) => {
      if (getComputedStyle(headerSection.closest('.table')).overflow === 'auto') {
        headerSection.style.top = '0';
      } else {
        headerSection.style.top = `${height}px`;
      }
    });
  });
}

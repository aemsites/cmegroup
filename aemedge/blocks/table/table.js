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
    // Match patterns: r2c3-style, r2-style, c2-style, r1-header-primary, etc.
    const match = className.match(/(?:r(\d+))?(?:c(\d+))?-(.+)/);
    if (match) {
      hasRegexStyle = true;
      const row = match[1] ? parseInt(match[1], 10) - 1 : null;
      const col = match[2] ? parseInt(match[2], 10) - 1 : null;
      const style = match[3]; // Capture everything after the dash as the style

      if (row !== null && col !== null) {
        // Specific cell: r2c3-style
        styleMatrix[row][col] = style;
      } else if (row !== null) {
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

export default async function decorate(block) {
  const data = block.querySelector('table tbody');
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const header = !block.classList.contains('no-header');
  if (header) table.append(thead);
  table.append(tbody);

  const styleMatrix = populateStyleMatrix(data, [...block.classList], header);

  [...data.children].forEach((child, i) => {
    const row = document.createElement('tr');
    if (header && i === 0) {
      thead.append(row);
    } else {
      tbody.append(row);
    }

    const cells = [...child.children];
    cells.forEach((col, j) => {
      const colspan = col.getAttribute('colspan') || 1;
      const rowspan = col.getAttribute('rowspan') || 1;

      const cell = buildCell(colspan, rowspan, i === 0 && header);
      cell.innerHTML = col.innerHTML;
      if (styleMatrix[i][j] !== 'body') {
        cell.classList.add(styleMatrix[i][j]);
      }
      row.append(cell);
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
}

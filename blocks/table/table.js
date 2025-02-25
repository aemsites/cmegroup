function buildCell(rowIndex, colspan = 1) {
  const cell = rowIndex ? document.createElement('td') : document.createElement('th');
  if (!rowIndex) {
      cell.setAttribute('scope', 'col');
      if (colspan > 1) cell.setAttribute('colspan', colspan);
  }
  return cell;
}

export default async function decorate(block) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const header = !block.classList.contains('no-header');
  if (header) table.append(thead);
  table.append(tbody);

  let maxColsCount = 0;
  let headerColsCount = 0;

  // Process rows and cells in the block
  [...block.children].forEach((child, i) => {
      const row = document.createElement('tr');
      if (header && i === 0) {
          thead.append(row);
      } else {
          tbody.append(row);
      }

      const cells = [...child.children];

      if (header && i === 0) {
          headerColsCount = cells.length; // Capture the number of columns in the header row
      } else {
          maxColsCount = Math.max(maxColsCount, cells.length); // Track max columns in tbody
      }

      // Process each column
      cells.forEach((col, index) => {
          const align = col.getAttribute('data-align');
          const valign = col.getAttribute('data-valign');
          const colspan = col.getAttribute('data-colspan') || 1;

          const cell = buildCell(header ? i : i + 1, colspan);

          if (align) cell.style.textAlign = align;
          if (valign) cell.style.verticalAlign = valign;
          cell.innerHTML = col.innerHTML;

          row.append(cell);
      });
  });

  // Adjust the header colspan if it's a single column header
  if (header && headerColsCount === 1) {
      const firstCell = thead.querySelector('th');
      if (firstCell) {
          firstCell.setAttribute('colspan', maxColsCount || 1);
      }
  }

  block.innerHTML = '';
  block.append(table);
}

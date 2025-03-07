function buildCell(rowIndex, colspan = 1, rowspan = 1) {
    const cell = rowIndex ? document.createElement('td') : document.createElement('th');
    if (colspan > 1) cell.setAttribute('colspan', colspan);
    if (rowspan > 1) cell.setAttribute('rowspan', rowspan);
    return cell;
  }
  
  export default async function decorate(block) {
    const data = block.querySelector('table tbody');
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
  
    const header = !block.classList.contains('no-header');
    if (header) table.append(thead);
    table.append(tbody);
  
    let firstHeaderEmpty = false;
    let count = 0;
  
    [...data.children].forEach((child, i) => {
        const row = document.createElement('tr');
        if (header && i === 0) {
            thead.append(row);
        } else {
            tbody.append(row);
        }
  
        const cells = [...child.children];
  
        if (header && i === 0) {
            firstHeaderEmpty = cells[0]?.textContent.trim() === '';
        }
  
        // Process each column
        cells.forEach((col, index) => {
            const colspan = col.getAttribute('colspan') || 1;
            const rowspan = col.getAttribute('rowspan') || 1;

            const cell = buildCell(header ? i : i + 1, colspan, rowspan);
            cell.innerHTML = col.innerHTML;
  
            if (firstHeaderEmpty && index === 0) {
                if(count === 0) {
                    cell.classList.add('header-style');
                    if(rowspan > 1) {
                        count = rowspan - 1;
                    }
                } else {
                    count--;
                }
            }
            row.append(cell);
        });
    });
  
    block.innerHTML = '';
    block.append(table);
  }
  
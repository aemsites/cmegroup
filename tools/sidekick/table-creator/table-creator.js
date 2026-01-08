document.addEventListener('DOMContentLoaded', () => {
  // --- ELEMENTS ---
  const editor = document.getElementById('editor');
  const stagingContainer = document.getElementById('staging-container');
  const clipboardBuffer = document.getElementById('clipboard-buffer');
  const metadataPreview = document.getElementById('metadata-preview');
  const cellStyleLog = document.getElementById('cell-style-log');

  // Buttons & Inputs
  const processBtn = document.getElementById('processBtn');
  const resetAllBtn = document.getElementById('resetAllBtn');
  const mergeBtn = document.getElementById('mergeBtn');
  const copyBtn = document.getElementById('copyBtn');
  const copyStatus = document.getElementById('copyStatus');
  const targetModeSelect = document.getElementById('targetMode');
  const blockSuffixSelect = document.getElementById('blockSuffix');

  // Tabs & Grid Picker (NEW)
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const gridPicker = document.getElementById('grid-picker');
  const gridDisplay = document.getElementById('grid-display');

  // Control Collections
  const blockLevelBtns = document.querySelectorAll('[data-level]');
  const cellStyleBtns = document.querySelectorAll('[data-cell-style]');
  const clearActionBtns = document.querySelectorAll('[data-action]');
  const tableOptionCheckboxes = document.querySelectorAll('.table-opt');

  // Color Inputs
  const textColorInput = document.getElementById('textColorInput');
  const applyTextColorBtn = document.getElementById('applyTextColor');
  const bgColorInput = document.getElementById('bgColorInput');
  const applyBgColorBtn = document.getElementById('applyBgColor');

  // --- STATE ---
  let currentTable = null;
  let activeSelection = null;
  let styleMap = { rows: {}, cols: {}, cells: {} };

  // --- 1. INITIALIZATION & EVENT LISTENERS ---

  // Tab Switching Logic
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Remove active class from all
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));

      // Add active to clicked
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // Initialize Grid Picker (10x10)
  if (gridPicker) {
    for (let r = 0; r < 10; r += 1) {
      for (let c = 0; c < 10; c += 1) {
        const square = document.createElement('div');
        square.classList.add('grid-square');
        square.dataset.r = r;
        square.dataset.c = c;

        // Hover Event
        square.addEventListener('mouseover', () => {
          highlightGridPicker(r, c);
          gridDisplay.textContent = `${r + 1} x ${c + 1} Table`;
        });

        // Click Event (Create Table)
        square.addEventListener('click', () => {
          createTableFromScratch(r + 1, c + 1);
        });

        gridPicker.appendChild(square);
      }
    }

    // Clear grid highlight on mouse leave
    gridPicker.addEventListener('mouseleave', () => {
      highlightGridPicker(-1, -1); // Clear all
      gridDisplay.textContent = '0 x 0 Table';
    });
  }

  if (processBtn) processBtn.addEventListener('click', loadTableFromEditor);

  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', () => {
      editor.innerHTML = '';
      tableOptionCheckboxes.forEach((cb) => {
        cb.checked = false;
      });
      textColorInput.value = '';
      bgColorInput.value = '';
      blockSuffixSelect.value = 'header';
      resetState();
    });
  }

  if (mergeBtn) mergeBtn.addEventListener('click', mergeSelection);

  blockLevelBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const { level } = e.target.dataset;
      const suffix = blockSuffixSelect.value;
      applyBlockStyle(`${level}-${suffix}`);
    });
  });

  cellStyleBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const [key, val] = e.target.dataset.cellStyle.split(':');
      applyCellStyle(key, val);
    });
  });

  if (applyTextColorBtn) {
    applyTextColorBtn.addEventListener('click', () => {
      const val = textColorInput.value.trim();
      if (val) applyCellStyle('color', val);
    });
  }

  if (applyBgColorBtn) {
    applyBgColorBtn.addEventListener('click', () => {
      const val = bgColorInput.value.trim();
      if (val) applyCellStyle('background-color', val);
    });
  }

  clearActionBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const { action } = e.target.dataset;
      if (action === 'clear-block') clearBlockStyle();
      if (action === 'clear-cell') clearCellStyle();
    });
  });

  tableOptionCheckboxes.forEach((cb) => {
    cb.addEventListener('change', () => {
      updateVisualPreviewFlags();
      renderHiddenOutput();
    });
  });

  if (copyBtn) copyBtn.addEventListener('click', copyToClipboard);

  // --- 2. CORE LOGIC ---

  function highlightGridPicker(maxR, maxC) {
    const squares = gridPicker.querySelectorAll('.grid-square');
    squares.forEach((sq) => {
      const r = parseInt(sq.dataset.r, 10);
      const c = parseInt(sq.dataset.c, 10);
      if (r <= maxR && c <= maxC) {
        sq.classList.add('active');
      } else {
        sq.classList.remove('active');
      }
    });
  }

  function createTableFromScratch(rows, cols) {
    // Create a clean table element
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');

    for (let r = 0; r < rows; r += 1) {
      const tr = document.createElement('tr');
      for (let c = 0; c < cols; c += 1) {
        const td = document.createElement('td');
        // Add some dummy content or placeholder
        td.textContent = 'Data';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    // Set this as current and render
    currentTable = table;
    styleMap = { rows: {}, cols: {}, cells: {} }; // Reset styles

    renderInteractiveTable();
    updateVisualPreviewFlags();
    renderHiddenOutput();
  }

  function resetState() {
    styleMap = { rows: {}, cols: {}, cells: {} };
    currentTable = null;
    activeSelection = null;
    stagingContainer.innerHTML = '<p class="placeholder-text">Waiting for input...</p>';
    stagingContainer.className = 'staging-box';
    renderHiddenOutput();
  }

  function loadTableFromEditor() {
    const rawTable = editor.querySelector('table');
    if (!rawTable) return alert('No table found in input! Please paste a table first.');

    currentTable = rawTable.cloneNode(true);
    sanitizeTable(currentTable);
    styleMap = { rows: {}, cols: {}, cells: {} };

    renderInteractiveTable();
    updateVisualPreviewFlags();
    renderHiddenOutput();
    return true;
  }

  function sanitizeTable(table) {
    while (table.attributes.length > 0) table.removeAttribute(table.attributes[0].name);
    table.querySelectorAll('*').forEach((el) => {
      while (el.attributes.length > 0) el.removeAttribute(el.attributes[0].name);
      if (el.tagName === 'P' && el.innerText.trim() === '') el.remove();
    });
    table.querySelectorAll('tr').forEach((row) => {
      if (row.innerText.trim() === '') row.remove();
    });
  }

  // --- 3. GRID HELPERS ---

  function getVirtualGrid(table) {
    const grid = [];
    const rows = table.querySelectorAll('tr');

    rows.forEach((tr, rIndex) => {
      if (!grid[rIndex]) grid[rIndex] = [];

      const cells = tr.querySelectorAll('td, th');
      let cIndex = 0;

      cells.forEach((cell) => {
        while (grid[rIndex][cIndex]) cIndex += 1;

        const rowspan = parseInt(cell.getAttribute('rowspan') || 1, 10);
        const colspan = parseInt(cell.getAttribute('colspan') || 1, 10);

        for (let r = 0; r < rowspan; r += 1) {
          for (let c = 0; c < colspan; c += 1) {
            if (!grid[rIndex + r]) grid[rIndex + r] = [];
            grid[rIndex + r][cIndex + c] = cell;
          }
        }
        cIndex += 1;
      });
    });
    return grid;
  }

  function getCellCoordinates(cell, table) {
    const grid = getVirtualGrid(table);
    for (let r = 0; r < grid.length; r += 1) {
      // eslint-disable-next-line no-continue
      if (!grid[r]) continue;
      for (let c = 0; c < grid[r].length; c += 1) {
        if (grid[r][c] === cell) return { r, c };
      }
    }
    return { r: 0, c: 0 };
  }

  // --- 4. INTERACTIVE STAGING ---

  function renderInteractiveTable() {
    stagingContainer.innerHTML = '';
    currentTable.classList.add('staging-table');

    const rows = currentTable.querySelectorAll('tr');
    rows.forEach((row) => {
      row.querySelectorAll('td, th').forEach((cell) => {
        cell.onclick = (e) => handleCellClick(cell, e);
        cell.style = '';
      });
    });

    applyVisualStylesToStaging();
    stagingContainer.appendChild(currentTable);
  }

  function handleCellClick(cell) {
    const mode = targetModeSelect.value;
    const coords = getCellCoordinates(cell, currentTable);

    if (mode === 'range') {
      if (!activeSelection || activeSelection.type !== 'range' || activeSelection.end) {
        activeSelection = { type: 'range', start: coords, end: null };
      } else {
        activeSelection.end = coords;
      }
    } else {
      activeSelection = { type: mode, rIndex: coords.r, cIndex: coords.c };
    }

    highlightSelectionInStaging();
  }

  function highlightSelectionInStaging() {
    currentTable.querySelectorAll('.highlight-select').forEach((el) => el.classList.remove('highlight-select'));
    if (!activeSelection) return;

    const grid = getVirtualGrid(currentTable);

    if (activeSelection.type === 'range') {
      const { start } = activeSelection;
      const end = activeSelection.end || start;
      const minR = Math.min(start.r, end.r);
      const maxR = Math.max(start.r, end.r);
      const minC = Math.min(start.c, end.c);
      const maxC = Math.max(start.c, end.c);

      for (let r = minR; r <= maxR; r += 1) {
        for (let c = minC; c <= maxC; c += 1) {
          if (grid[r] && grid[r][c]) grid[r][c].classList.add('highlight-select');
        }
      }
    } else if (activeSelection.type === 'cell') {
      if (grid[activeSelection.rIndex] && grid[activeSelection.rIndex][activeSelection.cIndex]) {
        grid[activeSelection.rIndex][activeSelection.cIndex].classList.add('highlight-select');
      }
    } else if (activeSelection.type === 'row') {
      if (grid[activeSelection.rIndex]) {
        grid[activeSelection.rIndex].forEach((c) => { if (c) c.classList.add('highlight-select'); });
      }
    } else if (activeSelection.type === 'col') {
      grid.forEach((row) => {
        if (row[activeSelection.cIndex]) row[activeSelection.cIndex].classList.add('highlight-select');
      });
    }
  }

  // --- 5. MERGING LOGIC ---

  function mergeSelection() {
    if (!activeSelection || activeSelection.type !== 'range' || !activeSelection.end) {
      return alert('Please select a Range (Start point and End point) to merge.');
    }

    const { start, end } = activeSelection;
    const minR = Math.min(start.r, end.r);
    const maxR = Math.max(start.r, end.r);
    const minC = Math.min(start.c, end.c);
    const maxC = Math.max(start.c, end.c);

    const grid = getVirtualGrid(currentTable);
    const survivor = grid[minR][minC];

    if (!survivor) return false;

    const totalRows = maxR - minR + 1;
    const totalCols = maxC - minC + 1;

    survivor.setAttribute('rowspan', totalRows);
    survivor.setAttribute('colspan', totalCols);

    const cellsToDelete = new Set();
    for (let r = minR; r <= maxR; r += 1) {
      for (let c = minC; c <= maxC; c += 1) {
        const cell = grid[r][c];
        if (cell && cell !== survivor) cellsToDelete.add(cell);
      }
    }

    cellsToDelete.forEach((c) => c.remove());
    activeSelection = null;
    renderInteractiveTable();
    renderHiddenOutput();

    return true;
  }

  // --- 6. APPLYING STYLES ---

  function applyBlockStyle(styleName) {
    if (!activeSelection) return alert('Select a target first.');

    const r = (activeSelection.type === 'range') ? activeSelection.start.r : activeSelection.rIndex;
    const c = (activeSelection.type === 'range') ? activeSelection.start.c : activeSelection.cIndex;

    if (activeSelection.type === 'col') styleMap.cols[c] = styleName;
    else styleMap.rows[r] = styleName;

    applyVisualStylesToStaging();
    renderHiddenOutput();

    return true;
  }

  function clearBlockStyle() {
    if (!activeSelection) return;
    const r = (activeSelection.type === 'range') ? activeSelection.start.r : activeSelection.rIndex;
    const c = (activeSelection.type === 'range') ? activeSelection.start.c : activeSelection.cIndex;

    if (activeSelection.type === 'col') delete styleMap.cols[c];
    else delete styleMap.rows[r];

    applyVisualStylesToStaging();
    renderHiddenOutput();
  }

  function applyCellStyle(key, value) {
    if (!activeSelection) return alert('Select a target first.');
    const grid = getVirtualGrid(currentTable);

    const setCell = (r, c) => {
      const id = `${r}:${c}`;
      if (!styleMap.cells[id]) styleMap.cells[id] = {};
      styleMap.cells[id][key] = value;
    };

    if (activeSelection.type === 'range') {
      const { start } = activeSelection;
      const end = activeSelection.end || start;
      const minR = Math.min(start.r, end.r);
      const maxR = Math.max(start.r, end.r);
      const minC = Math.min(start.c, end.c);
      const maxC = Math.max(start.c, end.c);
      for (let r = minR; r <= maxR; r += 1) {
        for (let c = minC; c <= maxC; c += 1) setCell(r, c);
      }
    } else if (activeSelection.type === 'cell') {
      setCell(activeSelection.rIndex, activeSelection.cIndex);
    } else if (activeSelection.type === 'row') {
      if (grid[activeSelection.rIndex]) {
        for (let c = 0; c < grid[activeSelection.rIndex].length; c += 1) {
          setCell(activeSelection.rIndex, c);
        }
      }
    } else if (activeSelection.type === 'col') {
      grid.forEach((row, r) => setCell(r, activeSelection.cIndex));
    }

    applyVisualStylesToStaging();
    renderHiddenOutput();

    return true;
  }

  function clearCellStyle() {
    if (!activeSelection) return;
    const grid = getVirtualGrid(currentTable);
    const clear = (r, c) => delete styleMap.cells[`${r}:${c}`];

    if (activeSelection.type === 'range') {
      const { start } = activeSelection;
      const end = activeSelection.end || start;
      const minR = Math.min(start.r, end.r);
      const maxR = Math.max(start.r, end.r);
      const minC = Math.min(start.c, end.c);
      const maxC = Math.max(start.c, end.c);
      for (let r = minR; r <= maxR; r += 1) {
        for (let c = minC; c <= maxC; c += 1) clear(r, c);
      }
    } else if (activeSelection.type === 'cell') {
      clear(activeSelection.rIndex, activeSelection.cIndex);
    } else if (activeSelection.type === 'row') {
      if (grid[activeSelection.rIndex]) {
        for (let c = 0; c < grid[activeSelection.rIndex].length; c += 1) {
          clear(activeSelection.rIndex, c);
        }
      }
    } else if (activeSelection.type === 'col') {
      grid.forEach((row, r) => clear(r, activeSelection.cIndex));
    }

    applyVisualStylesToStaging();
    renderHiddenOutput();
  }

  // --- 7. VISUALIZATION ---

  function applyVisualStylesToStaging() {
    const grid = getVirtualGrid(currentTable);

    currentTable.querySelectorAll('td, th').forEach((cell) => {
      const isSelected = cell.classList.contains('highlight-select');
      cell.className = isSelected ? 'highlight-select' : '';
      cell.style = '';
    });

    for (let r = 0; r < grid.length; r += 1) {
      // eslint-disable-next-line no-continue
      if (!grid[r]) continue;
      for (let c = 0; c < grid[r].length; c += 1) {
        const cell = grid[r][c];
        // eslint-disable-next-line no-continue
        if (!cell) continue;

        const cellKey = `${r}:${c}`;
        if (styleMap.cells[cellKey]) {
          const s = styleMap.cells[cellKey];
          if (s['text-align']) cell.style.textAlign = s['text-align'];
          if (s.color) cell.style.color = s.color;
          if (s['background-color']) cell.style.backgroundColor = s['background-color'];
        }

        if (styleMap.rows[r]) {
          const visualClass = styleMap.rows[r].includes('-group') ? styleMap.rows[r].replace('-group', '-header') : styleMap.rows[r];
          cell.classList.add(`style-${visualClass}`);
        }

        if (styleMap.cols[c]) {
          const visualClass = styleMap.cols[c].includes('-group') ? styleMap.cols[c].replace('-group', '-header') : styleMap.cols[c];
          cell.classList.add(`style-${visualClass}`);
        }
      }
    }
  }

  function updateVisualPreviewFlags() {
    stagingContainer.classList.remove('preview-dark', 'preview-compact');
    const isDark = Array.from(tableOptionCheckboxes).find((cb) => cb.value === 'dark' && cb.checked);
    const isCompact = Array.from(tableOptionCheckboxes).find((cb) => cb.value === 'compact' && cb.checked);
    if (isDark) stagingContainer.classList.add('preview-dark');
    if (isCompact) stagingContainer.classList.add('preview-compact');
  }

  // --- 8. OUTPUT GENERATION ---

  function renderHiddenOutput() {
    const configParts = [];
    Object.entries(styleMap.rows).forEach(([rIndex, style]) => {
      configParts.push(`r${parseInt(rIndex, 10) + 1}-${style}`);
    });
    Object.entries(styleMap.cols).forEach(([cIndex, style]) => {
      configParts.push(`c${parseInt(cIndex, 10) + 1}-${style}`);
    });
    tableOptionCheckboxes.forEach((cb) => { if (cb.checked) configParts.push(cb.value); });

    const metaString = configParts.length > 0 ? `table (${configParts.join(', ')})` : 'table';
    if (metadataPreview) metadataPreview.textContent = metaString;

    if (!currentTable) {
      if (cellStyleLog) cellStyleLog.innerHTML = '<span class="empty-log">None</span>';
      clipboardBuffer.innerHTML = '';
      return;
    }

    updateAuditLog();

    const helixTable = document.createElement('table');
    helixTable.classList.add('helix-block');
    const tbody = document.createElement('tbody');

    const tr1 = document.createElement('tr');
    const td1 = document.createElement('td');
    td1.textContent = metaString;
    td1.classList.add('helix-meta');
    tr1.appendChild(td1);

    const tr2 = document.createElement('tr');
    const td2 = document.createElement('td');

    const finalTable = currentTable.cloneNode(true);
    finalTable.className = '';
    finalTable.querySelectorAll('*').forEach((el) => { el.className = ''; el.style = ''; });

    const grid = getVirtualGrid(finalTable);
    const seen = new Set();

    for (let r = 0; r < grid.length; r += 1) {
      // eslint-disable-next-line no-continue
      if (!grid[r]) continue;
      for (let c = 0; c < grid[r].length; c += 1) {
        const cell = grid[r][c];
        // eslint-disable-next-line no-continue
        if (!cell || seen.has(cell)) continue;

        const cellKey = `${r}:${c}`;
        if (styleMap.cells[cellKey]) {
          const styles = styleMap.cells[cellKey];
          const stylePairs = Object.entries(styles).map(([k, v]) => `${k}:${v}`);
          if (stylePairs.length > 0) {
            cell.textContent = `${cell.textContent.trim()}[${stylePairs.join(',')}]`;
            seen.add(cell);
          }
        }
      }
    }

    td2.appendChild(finalTable);
    tr2.appendChild(td2);
    tbody.appendChild(tr1);
    tbody.appendChild(tr2);
    helixTable.appendChild(tbody);

    clipboardBuffer.innerHTML = '';
    clipboardBuffer.appendChild(helixTable);
  }

  function updateAuditLog() {
    const entries = Object.entries(styleMap.cells);
    cellStyleLog.innerHTML = '';
    if (entries.length === 0) {
      cellStyleLog.innerHTML = '<span class="empty-log">None</span>';
      return;
    }
    entries.forEach(([key, styles]) => {
      const [r, c] = key.split(':');
      const humanR = parseInt(r, 10) + 1;
      const humanC = parseInt(c, 10) + 1;
      const styleString = Object.entries(styles).map(([k, v]) => `${k}:${v}`).join(', ');

      const item = document.createElement('div');
      item.classList.add('log-item');
      item.innerHTML = `<strong>R${humanR}:C${humanC}:</strong> [${styleString}]`;
      cellStyleLog.appendChild(item);
    });
  }

  async function copyToClipboard() {
    const bufferHTML = clipboardBuffer.innerHTML;
    if (!bufferHTML) return alert('No table generated yet.');
    try {
      const blobInput = new Blob([bufferHTML], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({ 'text/html': blobInput });
      await navigator.clipboard.write([clipboardItem]);

      copyStatus.textContent = 'Copied!';
      copyStatus.style.color = 'var(--green-positive)';
      setTimeout(() => {
        copyStatus.textContent = '';
      }, 2000);
    } catch (err) {
      console.error(err);
      copyStatus.textContent = 'Error!';
    }

    return true;
  }
});

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
  const editContentBtn = document.getElementById('editContentBtn');

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

  // Context Menu
  const contextMenu = document.getElementById('context-menu');
  const contextMenuItems = document.querySelectorAll('.context-menu-item');

  // --- STATE ---
  let currentTable = null;
  let activeSelection = null;
  let styleMap = { rows: {}, cols: {}, cells: {} };

  // Drag selection state
  let isDragging = false;
  let dragStartCell = null;
  let dragStartCoords = null;
  let mouseDownPos = null;

  // Context menu state
  let contextMenuTargetCell = null;

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

  if (editContentBtn) {
    editContentBtn.addEventListener('click', () => {
      if (!activeSelection) return alert('Select a cell first.');

      const grid = getVirtualGrid(currentTable);
      let r;
      let c;

      if (activeSelection.type === 'multi') {
        // Edit the last cell in multi-selection
        const lastCell = activeSelection.cells[activeSelection.cells.length - 1];
        r = lastCell.r;
        c = lastCell.c;
      } else if (activeSelection.type === 'range') {
        r = activeSelection.start.r;
        c = activeSelection.start.c;
      } else {
        r = activeSelection.rIndex;
        c = activeSelection.cIndex;
      }

      if (grid[r] && grid[r][c]) {
        makeCellEditable(grid[r][c]);
      }

      return true;
    });
  }

  // Context Menu event listeners
  contextMenuItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      const { target: { dataset: { action } } } = e;
      if (!item.classList.contains('disabled')) {
        handleContextMenuAction(action);
      }
      hideContextMenu();
    });
  });

  // Close context menu on click outside
  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
      hideContextMenu();
    }
  });

  // Close context menu on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideContextMenu();
    }
  });

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
    stagingContainer.classList.add('staging-box', 'table');
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
        cell.onmousedown = (e) => handleMouseDown(cell, e);
        cell.ondblclick = (e) => {
          e.stopPropagation();
          makeCellEditable(cell);
        };
        cell.oncontextmenu = (e) => {
          e.preventDefault();
          showContextMenu(e, cell);
        };
        cell.style = '';
      });
    });

    applyVisualStylesToStaging();
    stagingContainer.appendChild(currentTable);
  }

  function handleMouseDown(cell, e) {
    // Don't interfere with text selection in editable cells
    if (cell.contentEditable === 'true') return;

    e.preventDefault();

    // Initialize drag tracking
    isDragging = false;
    dragStartCell = cell;
    dragStartCoords = getCellCoordinates(cell, currentTable);
    mouseDownPos = { x: e.clientX, y: e.clientY };

    // Add mousemove and mouseup listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e) {
    if (!dragStartCell) return;

    // Calculate distance from initial mousedown position
    const deltaX = Math.abs(e.clientX - mouseDownPos.x);
    const deltaY = Math.abs(e.clientY - mouseDownPos.y);
    const threshold = 3; // pixels

    // If mouse moved beyond threshold, start drag selection
    if (!isDragging && (deltaX > threshold || deltaY > threshold)) {
      isDragging = true;
    }

    if (isDragging) {
      // Get cell under current mouse position
      const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
      const currentCell = elementUnderMouse?.closest('td, th');

      if (currentCell && currentTable.contains(currentCell)) {
        const currentCoords = getCellCoordinates(currentCell, currentTable);

        // Update selection to show range from start to current cell
        activeSelection = {
          type: 'range',
          start: dragStartCoords,
          end: currentCoords,
        };

        highlightSelectionInStaging();
      }
    }
  }

  function handleMouseUp(e) {
    // Remove listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    if (isDragging) {
      // Drag completed - selection is already set in handleMouseMove
      // Just ensure the final highlight is applied
      highlightSelectionInStaging();
    } else {
      // Simple click - use normal click behavior based on TARGET mode
      // Pass the event to check for Ctrl/Cmd key
      handleCellClick(dragStartCell, e);
    }

    // Reset drag state
    isDragging = false;
    dragStartCell = null;
    dragStartCoords = null;
    mouseDownPos = null;
  }

  // --- MULTI-SELECT HELPERS ---

  function isSameCellCoords(c1, c2) {
    return c1.r === c2.r && c1.c === c2.c;
  }

  function convertSelectionToMulti(selection) {
    if (!selection) return [];

    const cells = [];
    const grid = getVirtualGrid(currentTable);

    if (selection.type === 'cell') {
      cells.push({ r: selection.rIndex, c: selection.cIndex });
    } else if (selection.type === 'range') {
      const { start } = selection;
      const end = selection.end || start;
      const minR = Math.min(start.r, end.r);
      const maxR = Math.max(start.r, end.r);
      const minC = Math.min(start.c, end.c);
      const maxC = Math.max(start.c, end.c);

      for (let r = minR; r <= maxR; r += 1) {
        for (let c = minC; c <= maxC; c += 1) {
          if (grid[r] && grid[r][c]) {
            cells.push({ r, c });
          }
        }
      }
    } else if (selection.type === 'row') {
      if (grid[selection.rIndex]) {
        for (let c = 0; c < grid[selection.rIndex].length; c += 1) {
          cells.push({ r: selection.rIndex, c });
        }
      }
    } else if (selection.type === 'col') {
      grid.forEach((row, r) => {
        if (row[selection.cIndex]) {
          cells.push({ r, c: selection.cIndex });
        }
      });
    } else if (selection.type === 'multi') {
      return [...selection.cells];
    }

    return cells;
  }

  function toggleCellInMulti(coords, cells) {
    const index = cells.findIndex((c) => isSameCellCoords(c, coords));

    if (index >= 0) {
      // Cell exists, remove it
      cells.splice(index, 1);
    } else {
      // Cell doesn't exist, add it
      cells.push(coords);
    }

    return cells;
  }

  function handleCellClick(cell, event) {
    const mode = targetModeSelect.value;
    const coords = getCellCoordinates(cell, currentTable);
    const isCtrlOrCmd = event && (event.ctrlKey || event.metaKey);

    // Ctrl/Cmd + Click for multi-select
    if (isCtrlOrCmd) {
      let cells = [];

      if (activeSelection) {
        // Convert existing selection to multi
        cells = convertSelectionToMulti(activeSelection);
      }

      // Toggle the clicked cell
      cells = toggleCellInMulti(coords, cells);

      // Update selection
      if (cells.length === 0) {
        activeSelection = null;
      } else if (cells.length === 1) {
        // Single cell, convert back to 'cell' type
        activeSelection = { type: 'cell', rIndex: cells[0].r, cIndex: cells[0].c };
      } else {
        activeSelection = { type: 'multi', cells };
      }

      highlightSelectionInStaging();
      return;
    }

    // Normal click behavior (without Ctrl/Cmd)
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
    } else if (activeSelection.type === 'multi') {
      activeSelection.cells.forEach(({ r, c }) => {
        if (grid[r] && grid[r][c]) {
          grid[r][c].classList.add('highlight-select');
        }
      });
    }
  }

  // --- 5. MERGING LOGIC ---

  function mergeSelection() {
    if (!activeSelection) {
      return alert('Please select a Range (Start point and End point) to merge.');
    }

    if (activeSelection.type === 'multi') {
      return alert('Cannot merge non-contiguous cells. Please use drag selection to select a contiguous range.');
    }

    if (activeSelection.type !== 'range' || !activeSelection.end) {
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

    // Handle multi-select with restrictions
    if (activeSelection.type === 'multi') {
      const { cells } = activeSelection;
      const allSameRow = cells.every((cell) => cell.r === cells[0].r);
      const allSameCol = cells.every((cell) => cell.c === cells[0].c);

      if (allSameRow) {
        // All cells in same row - apply row style
        styleMap.rows[cells[0].r] = styleName;
      } else if (allSameCol) {
        // All cells in same column - apply column style
        styleMap.cols[cells[0].c] = styleName;
      } else {
        return alert('Block styles can only be applied to multi-selections in the same row or column.');
      }

      applyVisualStylesToStaging();
      renderHiddenOutput();
      return true;
    }

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
    } else if (activeSelection.type === 'multi') {
      activeSelection.cells.forEach(({ r, c }) => setCell(r, c));
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
    } else if (activeSelection.type === 'multi') {
      activeSelection.cells.forEach(({ r, c }) => clear(r, c));
    }

    applyVisualStylesToStaging();
    renderHiddenOutput();
  }

  // --- 6.5. CELL EDITING ---

  function makeCellEditable(cell) {
    if (!cell) return;

    // Store original content in case we need to revert
    const originalContent = cell.textContent;

    // Make cell editable
    cell.contentEditable = 'true';
    cell.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(cell);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    // Declare functions first to avoid linting errors
    let saveAndExit;
    let handleKeydown;

    // Handle Enter key to save and exit
    handleKeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveAndExit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cell.textContent = originalContent;
        saveAndExit();
      }
    };

    // Function to save and exit edit mode
    saveAndExit = () => {
      cell.contentEditable = 'false';
      cell.blur();

      // Re-render output with new content
      renderHiddenOutput();

      // Remove listeners
      cell.removeEventListener('blur', saveAndExit);
      cell.removeEventListener('keydown', handleKeydown);
    };

    // Add listeners
    cell.addEventListener('blur', saveAndExit);
    cell.addEventListener('keydown', handleKeydown);
  }

  // --- 6.6. CONTEXT MENU ---

  function showContextMenu(event, cell) {
    contextMenuTargetCell = cell;
    const coords = getCellCoordinates(cell, currentTable);

    // Position menu at mouse cursor
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;
    contextMenu.classList.add('visible');

    // Check for merged cells and disable options if necessary
    const hasMergedCells = checkForMergedCells(coords.r, coords.c);

    contextMenuItems.forEach((item) => {
      if (hasMergedCells) {
        item.classList.add('disabled');
      } else {
        item.classList.remove('disabled');
      }
    });

    // Check if can delete (prevent deleting last row/column)
    const rowCount = currentTable.querySelectorAll('tr').length;
    const colCount = currentTable.querySelector('tr')?.querySelectorAll('td, th').length || 0;

    contextMenuItems.forEach((item) => {
      if (item.dataset.action === 'delete-row' && rowCount <= 1) {
        item.classList.add('disabled');
      }
      if (item.dataset.action === 'delete-col' && colCount <= 1) {
        item.classList.add('disabled');
      }
    });
  }

  function hideContextMenu() {
    contextMenu.classList.remove('visible');
    contextMenuTargetCell = null;
  }

  function checkForMergedCells(rowIndex, colIndex) {
    // Check if the row or column contains any merged cells
    const grid = getVirtualGrid(currentTable);

    // Check entire row
    if (grid[rowIndex]) {
      for (let c = 0; c < grid[rowIndex].length; c += 1) {
        const cell = grid[rowIndex][c];
        if (cell) {
          const rowspan = parseInt(cell.getAttribute('rowspan') || 1, 10);
          const colspan = parseInt(cell.getAttribute('colspan') || 1, 10);
          if (rowspan > 1 || colspan > 1) return true;
        }
      }
    }

    // Check entire column
    for (let r = 0; r < grid.length; r += 1) {
      if (grid[r] && grid[r][colIndex]) {
        const cell = grid[r][colIndex];
        const rowspan = parseInt(cell.getAttribute('rowspan') || 1, 10);
        const colspan = parseInt(cell.getAttribute('colspan') || 1, 10);
        if (rowspan > 1 || colspan > 1) return true;
      }
    }

    return false;
  }

  function handleContextMenuAction(action) {
    if (!contextMenuTargetCell || !currentTable) return;

    const coords = getCellCoordinates(contextMenuTargetCell, currentTable);

    switch (action) {
      case 'insert-row-above':
        insertRowAbove(coords.r);
        break;
      case 'insert-row-below':
        insertRowBelow(coords.r);
        break;
      case 'insert-col-before':
        insertColumnBefore(coords.c);
        break;
      case 'insert-col-after':
        insertColumnAfter(coords.c);
        break;
      case 'delete-row':
        deleteRow(coords.r);
        break;
      case 'delete-col':
        deleteColumn(coords.c);
        break;
      default:
        break;
    }
  }

  function insertRowAbove(rowIndex) {
    const rows = currentTable.querySelectorAll('tr');
    const targetRow = rows[rowIndex];
    const colCount = targetRow.querySelectorAll('td, th').length;

    const newRow = document.createElement('tr');
    for (let i = 0; i < colCount; i += 1) {
      const newCell = document.createElement('td');
      newCell.textContent = 'Data';
      newRow.appendChild(newCell);
    }

    targetRow.parentNode.insertBefore(newRow, targetRow);
    renderInteractiveTable();
    renderHiddenOutput();
  }

  function insertRowBelow(rowIndex) {
    const rows = currentTable.querySelectorAll('tr');
    const targetRow = rows[rowIndex];
    const colCount = targetRow.querySelectorAll('td, th').length;

    const newRow = document.createElement('tr');
    for (let i = 0; i < colCount; i += 1) {
      const newCell = document.createElement('td');
      newCell.textContent = 'Data';
      newRow.appendChild(newCell);
    }

    if (targetRow.nextSibling) {
      targetRow.parentNode.insertBefore(newRow, targetRow.nextSibling);
    } else {
      targetRow.parentNode.appendChild(newRow);
    }

    renderInteractiveTable();
    renderHiddenOutput();
  }

  function insertColumnBefore(colIndex) {
    const rows = currentTable.querySelectorAll('tr');

    rows.forEach((row) => {
      const cells = row.querySelectorAll('td, th');
      const targetCell = cells[colIndex];

      if (targetCell) {
        const newCell = document.createElement(targetCell.tagName);
        newCell.textContent = 'Data';
        row.insertBefore(newCell, targetCell);
      }
    });

    renderInteractiveTable();
    renderHiddenOutput();
  }

  function insertColumnAfter(colIndex) {
    const rows = currentTable.querySelectorAll('tr');

    rows.forEach((row) => {
      const cells = row.querySelectorAll('td, th');
      const targetCell = cells[colIndex];

      if (targetCell) {
        const newCell = document.createElement(targetCell.tagName);
        newCell.textContent = 'Data';

        if (targetCell.nextSibling) {
          row.insertBefore(newCell, targetCell.nextSibling);
        } else {
          row.appendChild(newCell);
        }
      }
    });

    renderInteractiveTable();
    renderHiddenOutput();
  }

  function deleteRow(rowIndex) {
    const rows = currentTable.querySelectorAll('tr');
    if (rows.length <= 1) return alert('Cannot delete the last row.');

    const rowToDelete = rows[rowIndex];
    rowToDelete.remove();

    renderInteractiveTable();
    renderHiddenOutput();

    return true;
  }

  function deleteColumn(colIndex) {
    const rows = currentTable.querySelectorAll('tr');
    const firstRowCells = rows[0]?.querySelectorAll('td, th');

    if (!firstRowCells || firstRowCells.length <= 1) {
      return alert('Cannot delete the last column.');
    }

    rows.forEach((row) => {
      const cells = row.querySelectorAll('td, th');
      if (cells[colIndex]) {
        cells[colIndex].remove();
      }
    });

    renderInteractiveTable();
    renderHiddenOutput();

    return true;
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
    stagingContainer.classList.remove('dark', 'compact', 'disable-row-banding', 'data', 'simple-first-row', 'no-header', 'collapsible', 'contains-header', 'fixed-row-header');
    const isDisableRowBanding = Array.from(tableOptionCheckboxes).find((cb) => cb.value === 'disable-row-banding' && cb.checked);
    const isDark = Array.from(tableOptionCheckboxes).find((cb) => cb.value === 'dark' && cb.checked);
    const isCompact = Array.from(tableOptionCheckboxes).find((cb) => cb.value === 'compact' && cb.checked);
    const isData = Array.from(tableOptionCheckboxes).find((cb) => cb.value === 'data' && cb.checked);
    const isSimpleFirstRow = Array.from(tableOptionCheckboxes).find((cb) => cb.value === 'simple-first-row' && cb.checked);
    const isNoHeader = Array.from(tableOptionCheckboxes).find((cb) => cb.value === 'no-header' && cb.checked);
    const isCollapsible = Array.from(tableOptionCheckboxes).find((cb) => cb.value === 'collapsible' && cb.checked);
    const isContainsHeader = Array.from(tableOptionCheckboxes).find((cb) => cb.value === 'contains-header' && cb.checked);
    const isFixedRowHeader = Array.from(tableOptionCheckboxes).find((cb) => cb.value === 'fixed-row-header' && cb.checked);
    if (isDisableRowBanding) stagingContainer.classList.add('disable-row-banding');
    if (isDark) stagingContainer.classList.add('dark');
    if (isCompact) stagingContainer.classList.add('compact');
    if (isData) stagingContainer.classList.add('data');
    if (isSimpleFirstRow) stagingContainer.classList.add('simple-first-row');
    if (isNoHeader) stagingContainer.classList.add('no-header');
    if (isCollapsible) stagingContainer.classList.add('collapsible');
    if (isContainsHeader) stagingContainer.classList.add('contains-header');
    if (isFixedRowHeader) stagingContainer.classList.add('fixed-row-header');
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

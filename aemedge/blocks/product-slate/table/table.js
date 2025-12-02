import { createElement, i18n } from '../../../scripts/utils.js';
import { createModal } from '../../modal/modal.js';

const [
  productNameText,
  clearingText,
  globexText,
  floorText,
  clearportText,
  exchangeText,
  assetClassText,
  productGroupText,
  categoryText,
  subCategoryText,
  clearedAsText,
  volumeText,
  openInterestText,
  noResultsText,
  tradeDateText,
  helpText,
  downloadDataText,
] = await Promise.all([
  i18n('Product Name'),
  i18n('Clearing'),
  i18n('Globex'),
  i18n('Floor'),
  i18n('Clearport'),
  i18n('Exch'),
  i18n('Asset Class'),
  i18n('Product Group'),
  i18n('Category'),
  i18n('Sub-Category'),
  i18n('Cleared As'),
  i18n('Volume'),
  i18n('Open Interest'),
  i18n('There are no matches for your search. Please try again.'),
  i18n('Trade Date'),
  i18n('Help'),
  i18n('Download data'),
]);

export async function createProductTable(options = {}) {
  const {
    products = [],
    columns = {},
    onSort = () => { },
    sortState = { sortField: 'oi', sortDirection: 'desc' },
    loading = false,
    voi = null,
    downloadExcelUrl = '',
  } = options;

  const prodTableWrapper = createElement('div', { class: 'product-table-wrapper' });
  const mainWrapper = createElement('div', { class: 'main-wrapper' });
  const tableWrapper = createElement('div', { class: 'table-wrapper' });
  const mainTableWrapper = createElement('div', { class: 'main-table-wrapper' });
  const fixedTableColumn = createElement('div', { class: 'fixed-table-column sticky-first-col' });
  const table = createElement('table', { class: 'product-slate-table' });
  const thead = createElement('thead', { class: 'sticky-header' });
  const headerRow = createElement('tr');

  function createSpinner() {
    const spinner = createElement('div', { class: 'spinner-cards' });
    spinner.innerHTML = `
    <div></div>
    <div></div>
    <div></div>
    <div></div>
  `;
    return spinner;
  }

  function handleScroll(event) {
    const el = event.target;

    const { scrollLeft, offsetWidth, scrollWidth } = el;

    if (scrollWidth > 0) {
      const endOfTable = scrollLeft + offsetWidth >= scrollWidth - 4;

      if (endOfTable) {
        el.classList.add('no-gradient');
      } else {
        el.classList.remove('no-gradient');
      }
    }
  }

  if (products.length === 0) {
    const noResults = createElement('div', { class: 'no-results' });
    noResults.textContent = noResultsText;
    prodTableWrapper.appendChild(noResults);
    return prodTableWrapper;
  }

  const isDesktop = window.innerWidth >= 769;
  window.addEventListener('resize', () => {
    if (isDesktop) {
      table.classList.remove('desktop');
    } else {
      table.classList.remove('desktop');
    }
  });

  const createSortableHeader = (field, label, className = '') => {
    const th = createElement('th');
    const button = createElement('a', {
      class: `sort-column ${className}`,
      'data-field': field,
    });
    const span = createElement('span');

    if (sortState.sortField === field) {
      button.classList.add('selected');
      span.classList.add(sortState.sortDirection);
    }

    button.innerHTML = label;
    button.appendChild(span);

    button.addEventListener('click', () => {
      let newDirection;
      if (sortState.sortField === field) {
        newDirection = sortState.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        newDirection = 'asc';
      }

      onSort(field, newDirection);
    });

    th.appendChild(button);
    return th;
  };

  if (columns.productName !== false) {
    headerRow.appendChild(createSortableHeader('name', productNameText, 'name-column'));
  }
  if (columns.clearing !== false) {
    headerRow.appendChild(createSortableHeader('clearing', clearingText));
  }
  if (columns.globex !== false) {
    headerRow.appendChild(createSortableHeader('globex', globexText));
  }
  if (columns.floor !== false) {
    headerRow.appendChild(createSortableHeader('floor', floorText));
  }
  if (columns.clearPort !== false) {
    headerRow.appendChild(createSortableHeader('cpc', clearportText));
  }
  if (columns.exchange !== false) {
    headerRow.appendChild(createSortableHeader('exch', exchangeText));
  }
  if (columns.assetClass !== false) {
    headerRow.appendChild(createSortableHeader('group', assetClassText));
  }
  if (columns.group !== false) {
    headerRow.appendChild(createSortableHeader('subGroup', productGroupText));
  }
  if (columns.category !== false) {
    headerRow.appendChild(createSortableHeader('category', categoryText));
  }
  if (columns.subCategory !== false) {
    headerRow.appendChild(createSortableHeader('subCategory', subCategoryText));
  }
  if (columns.clearedAs !== false) {
    headerRow.appendChild(createSortableHeader('cleared', clearedAsText));
  }
  if (columns.volume !== false) {
    headerRow.appendChild(createSortableHeader('volume', volumeText));
  }
  if (columns.openInterest !== false) {
    headerRow.appendChild(createSortableHeader('oi', openInterestText));
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = createElement('tbody');

  if (loading) {
    const spinner = createSpinner();
    table.appendChild(spinner);

    table.appendChild(thead);
    table.appendChild(tbody);
    mainTableWrapper.appendChild(table);
    tableWrapper.appendChild(mainTableWrapper);
    mainWrapper.appendChild(tableWrapper);
    prodTableWrapper.appendChild(mainWrapper);

    return prodTableWrapper;
  }

  products.forEach((product, index) => {
    const row = createElement('tr');
    row.setAttribute('data-row-index', index);

    if (columns.productName !== false) {
      const td = createElement('td', { class: 'link text-left' });
      if (product.url) {
        const link = createElement('a', {
          href: product.url,
          target: '_blank',
          rel: 'noopener noreferrer',
        });
        link.textContent = product.name || '';
        td.appendChild(link);
      } else {
        td.textContent = product.name || '';
      }
      row.appendChild(td);
    }

    if (columns.clearing !== false) {
      const td = createElement('td', { class: 'text-center' });
      td.textContent = product.clearing || '-';
      row.appendChild(td);
    }

    if (columns.globex !== false) {
      const td = createElement('td', { class: 'text-center' });
      td.textContent = !product.globexTraded ? '-' : (product.globex || '-');
      row.appendChild(td);
    }

    if (columns.floor !== false) {
      const td = createElement('td', { class: 'text-center' });
      td.textContent = !product.floorTraded ? '-' : (product.floor || '-');
      row.appendChild(td);
    }

    if (columns.clearPort !== false) {
      const td = createElement('td', { class: 'text-center' });
      td.textContent = product.cpc || '-';
      row.appendChild(td);
    }

    if (columns.exchange !== false) {
      const td = createElement('td', { class: 'text-center' });
      td.textContent = product.exch || '-';
      row.appendChild(td);
    }

    if (columns.assetClass !== false) {
      const td = createElement('td', { class: 'text-center' });
      td.textContent = product.group || '-';
      row.appendChild(td);
    }

    if (columns.group !== false) {
      const td = createElement('td', { class: 'text-center' });
      td.textContent = product.subGroup || '-';
      row.appendChild(td);
    }

    if (columns.category !== false) {
      const td = createElement('td', { class: 'text-center' });
      td.textContent = product.cat || '-';
      row.appendChild(td);
    }

    if (columns.subCategory !== false) {
      const td = createElement('td', { class: 'text-center' });
      td.textContent = product.subCat || '-';
      row.appendChild(td);
    }

    if (columns.clearedAs !== false) {
      const td = createElement('td', { class: 'text-center' });
      td.textContent = product.cleared || '-';
      row.appendChild(td);
    }

    if (columns.volume !== false) {
      const td = createElement('td', { class: 'text-right' });
      td.textContent = formatNumber(product.vol) || '0';
      row.appendChild(td);
    }

    if (columns.openInterest !== false) {
      const td = createElement('td', { class: 'text-right' });
      td.textContent = formatNumber(product.oi) || '0';
      row.appendChild(td);
    }

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  tableWrapper.addEventListener('scroll', handleScroll);
  mainTableWrapper.appendChild(table);
  tableWrapper.appendChild(fixedTableColumn);
  fixedTableColumn.appendChild(mainTableWrapper);
  mainWrapper.appendChild(tableWrapper);
  prodTableWrapper.appendChild(mainWrapper);

  const topContainer = createElement('div', { class: 'top-container' });
  const voiInfo = createElement('div', { class: 'voi-info' });

  if (voi && voi.tradeDate) {
    const tradeDate = new Date(voi.tradeDate.timestamp);
    const formattedDate = dayjs.utc(tradeDate).format('dddd DD MMM YYYY');

    voiInfo.innerHTML = `
      <span class="voi-label">${tradeDateText || 'Trade Date'}:</span>
      <span class="voi-date">${formattedDate}</span>
      <span class="voi-separator">-</span>
      <span class="voi-report-type">${voi.reportType || ''}</span>
    `;
  }

  const actionsContainer = createElement('div', { class: 'actions-container' });
  const MODAL_CONTENT = '';

  const helpButton = createElement('button', {
    type: 'button',
    class: 'report-links help',
  });
  helpButton.innerHTML = `${helpText || 'Help'}`;
  helpButton.addEventListener('click', async (e) => {
    e.preventDefault();
    const template = document.createElement('template');
    template.innerHTML = MODAL_CONTENT.trim();
    const contentNodes = Array.from(template.content.childNodes);
    const { showModal } = await createModal(contentNodes);
    showModal();
  });

  const authTooltipContainer = createElement('div', { class: 'auth-tooltip-container' });

  const downloadButton = createElement('a', {
    id: 'auth-tooltip-product-slate-download-button',
    class: 'report-links download',
    rel: 'noopener noreferrer',
    role: 'button',
  });
  downloadButton.innerHTML = `
    <span class="text">${downloadDataText || 'Download data'}</span>
  `;

  if (downloadExcelUrl) {
    downloadButton.href = downloadExcelUrl;
    downloadButton.addEventListener('click', (e) => {
      if (!downloadExcelUrl) {
        e.preventDefault();
      }
    });
  } else {
    downloadButton.classList.add('disabled');
    downloadButton.addEventListener('click', (e) => {
      e.preventDefault();
    });
  }

  authTooltipContainer.appendChild(downloadButton);
  actionsContainer.appendChild(helpButton);
  actionsContainer.appendChild(authTooltipContainer);

  topContainer.append(voiInfo);
  topContainer.append(actionsContainer);

  prodTableWrapper.insertBefore(topContainer, prodTableWrapper.firstChild);

  return prodTableWrapper;
}

function formatNumber(num) {
  if (!num && num !== 0) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export async function createManagedProductTable(container, columnConfig = {}, defaultSortField = 'oi', defaultSortDirection = 'desc') {
  let currentProducts = [];
  let currentSortState = { sortField: defaultSortField, sortDirection: defaultSortDirection };
  let currentColumns = columnConfig;
  let currentVoi = null;
  let tableElement = null;
  let loading = false;
  let downloadExcelUrl = '';

  const updateTable = async () => {
    const newTable = await createProductTable({
      products: currentProducts,
      columns: currentColumns,
      sortState: currentSortState,
      loading,
      voi: currentVoi,
      downloadExcelUrl,
      onSort: (field, direction) => {
        currentSortState = { sortField: field, sortDirection: direction };

        window.dispatchEvent(new CustomEvent('tableSortChanged', {
          detail: { sortField: field, sortDirection: direction },
        }));

        updateTable();
      },
    });

    if (tableElement) {
      container.replaceChild(newTable, tableElement);
    } else {
      container.appendChild(newTable);
    }

    tableElement = newTable;
  };

  window.addEventListener('tableDataUpdated', async (event) => {
    if (event.detail.data) {
      if (event.detail.data.products) {
        currentProducts = event.detail.data.products;
      }

      if (event.detail.data.props && event.detail.data.props.voi) {
        currentVoi = event.detail.data.props.voi;
      }

      if (event.detail.data.downloadExcelUrl) {
        downloadExcelUrl = event.detail.data.downloadExcelUrl;
      }

      loading = false;
      await updateTable();
    }
  });

  window.addEventListener('tableLoadingStart', async () => {
    loading = true;
    await updateTable();
  });

  window.addEventListener('tableDataError', async () => {
    loading = false;
    currentProducts = [];
    await updateTable();
  });

  await updateTable();

  return {
    updateProducts: (products) => {
      currentProducts = products;
      return updateTable();
    },
    setColumns: (columns) => {
      currentColumns = { ...currentColumns, ...columns };
      return updateTable();
    },
    setLoading: (isLoading) => {
      loading = isLoading;
      return updateTable();
    },
    setVoi: (voi) => {
      currentVoi = voi;
      return updateTable();
    },
    setDownloadUrl: (url) => {
      downloadExcelUrl = url;
      return updateTable();
    },
    getSortState: () => currentSortState,
    getProductCount: () => currentProducts.length,
    resetSort: (sortField, sortDirection) => {
      currentSortState = { sortField, sortDirection };
    },
  };
}

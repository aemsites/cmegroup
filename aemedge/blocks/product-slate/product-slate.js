import createFilter from './filter/product-slate-filter.js';
import getProductSlateData from '../../scripts/services/ProductSlateService.js';
import { createManagedProductTable } from './table/product-slate-table.js';
import { readBlockConfig } from '../../scripts/aem.js';
import { createElement } from '../../scripts/utils.js';

function parseConfig(config) {
  const defaultPageSize = parseInt(config['result-per-page'], 10) || 500;
  const defaultSortField = config['sort-field'] || 'oi';
  const defaultSortDirection = config['sort-direction'] || 'desc';
  const columnsToHide = config['columns-hiding']
    ? config['columns-hiding'].split(',').map((col) => col.trim())
    : [];
  const displayAsWidget = config['display-as-widget'] === 'true';
  const filtersToHide = config['hide-filters']
    ? config['hide-filters'].split(',').map((f) => f.trim())
    : [];

  return {
    defaultPageSize,
    defaultSortField,
    defaultSortDirection,
    columnsToHide,
    displayAsWidget,
    filtersToHide,
  };
}

function buildColumnConfig(columnsToHide) {
  return {
    productName: !columnsToHide.includes('name'),
    clearing: !columnsToHide.includes('clearing'),
    globex: !columnsToHide.includes('globex'),
    floor: !columnsToHide.includes('floor'),
    clearPort: !columnsToHide.includes('clearport'),
    exchange: !columnsToHide.includes('exch'),
    productGroup: !columnsToHide.includes('group'),
    subGroup: !columnsToHide.includes('subGroup'),
    category: !columnsToHide.includes('cat'),
    subCategory: !columnsToHide.includes('subCat'),
    clearedAs: !columnsToHide.includes('cleared'),
    volume: !columnsToHide.includes('vol'),
    openInterest: !columnsToHide.includes('oi'),
  };
}

function buildFilterConfig(filtersToHide) {
  return {
    group: !filtersToHide.includes('group'),
    venues: !filtersToHide.includes('venues'),
    exch: !filtersToHide.includes('exch'),
    cleared: !filtersToHide.includes('cleared'),
    search: !filtersToHide.includes('search'),
    tags: !filtersToHide.includes('tags'),
  };
}

function getInitialSortParams(defaultSortField, defaultSortDirection) {
  const urlParams = new URLSearchParams(window.location.search);
  const hasURLParams = urlParams.toString().length > 0;

  return {
    initialSortField: hasURLParams ? (urlParams.get('sortField') || defaultSortField) : defaultSortField,
    initialSortDirection: hasURLParams ? (urlParams.get('sortDirection') || defaultSortDirection) : defaultSortDirection,
  };
}

function buildServiceParams(
  filters,
  sortState,
  defaultSortField,
  defaultSortDirection,
  defaultPageSize,
  pageNumber = 1,
) {
  return {
    sortDirection: sortState.sortDirection || defaultSortDirection,
    sortField: sortState.sortField || defaultSortField,
    pageNumber,
    pageSize: defaultPageSize,
    groups: filters.group && filters.group.length > 0 ? filters.group.join(',') : '',
    subGroups: filters.subgroup && filters.subgroup.length > 0 ? filters.subgroup.join(',') : '',
    venues: filters.venues && filters.venues.length > 0 ? filters.venues.join(',') : '',
    exch: filters.exch && filters.exch.length > 0 ? filters.exch.join(',') : '',
    cleared: filters.cleared && filters.cleared.length > 0 ? filters.cleared.join(',') : '',
    cat: filters.cat && filters.cat.length > 0 ? filters.cat.join(',') : '',
    subCat: filters.subCat && filters.subCat.length > 0 ? filters.subCat.join(',') : '',
    search: filters.searchTerm || '',
    tags: filters.tags,
  };
}

function buildURLParams(filters, sortState, defaultSortField, defaultSortDirection) {
  const urlParamsArray = [];

  urlParamsArray.push(`sortField=${sortState.sortField || defaultSortField}`);
  urlParamsArray.push(`sortDirection=${sortState.sortDirection || defaultSortDirection}`);

  if (filters.group && filters.group.length > 0) {
    urlParamsArray.push(`groups=${filters.group.join(',')}`);
  }

  if (filters.subgroup && filters.subgroup.length > 0) {
    urlParamsArray.push(`subGroups=${filters.subgroup.join(',')}`);
  }

  if (filters.searchTerm) {
    urlParamsArray.push(`search=${encodeURIComponent(filters.searchTerm)}`);
  }

  if (filters.exch && filters.exch.length > 0) {
    urlParamsArray.push(`exch=${filters.exch.join(',')}`);
  }

  if (filters.venues && filters.venues.length > 0) {
    urlParamsArray.push(`venues=${filters.venues.join(',')}`);
  }

  if (filters.cleared && filters.cleared.length > 0) {
    urlParamsArray.push(`cleared=${filters.cleared.join(',')}`);
  }

  if (filters.cat && filters.cat.length > 0) {
    urlParamsArray.push(`cat=${filters.cat.join(',')}`);
  }

  if (filters.subCat && filters.subCat.length > 0) {
    urlParamsArray.push(`subCat=${filters.subCat.join(',')}`);
  }

  if (filters.tags === 1) {
    urlParamsArray.push('tags=1');
  }

  return `${window.location.pathname}?${urlParamsArray.join('&')}`;
}

function createFetchDataFunction(
  tableManager,
  defaultSortField,
  defaultSortDirection,
  defaultPageSize,
) {
  return (filters = {}, pageNumber = 1) => {
    window.dispatchEvent(new CustomEvent('tableLoadingStart'));

    const sortState = tableManager.getSortState();
    const serviceParams = buildServiceParams(
      filters,
      sortState,
      defaultSortField,
      defaultSortDirection,
      defaultPageSize,
      pageNumber,
    );
    const newURL = buildURLParams(filters, sortState, defaultSortField, defaultSortDirection);

    window.history.pushState({}, '', newURL);

    return getProductSlateData(serviceParams)
      .then((response) => {
        window.dispatchEvent(
          new CustomEvent('tableDataUpdated', {
            detail: {
              data: response,
              filters,
            },
          }),
        );
        return response;
      })
      .catch((error) => {
        window.dispatchEvent(
          new CustomEvent('tableDataError', {
            detail: { error, filters },
          }),
        );
        return null;
      });
  };
}

function createResetFunction(tableManager, config, defaultPageSize) {
  return () => {
    const resetSortField = config['sort-field'] || 'oi';
    const resetSortDirection = config['sort-direction'] || 'desc';

    tableManager.resetSort(resetSortField, resetSortDirection);

    const newURL = window.location.pathname;
    window.history.pushState({}, '', newURL);

    return tableManager.setLoading(true)
      .then(() => getProductSlateData({
        sortDirection: resetSortDirection,
        sortField: resetSortField,
        pageNumber: 1,
        pageSize: defaultPageSize,
        groups: '',
        subGroups: '',
        venues: '',
        exch: '',
        cleared: '',
        search: '',
        tags: '',
      }))
      .then((response) => {
        window.dispatchEvent(
          new CustomEvent('tableDataUpdated', {
            detail: {
              data: response,
              filters: {},
            },
          }),
        );
        return response;
      });
  };
}

function setupSortListener(block) {
  window.addEventListener('tableSortChanged', () => {
    const filterElement = block.querySelector('.product-slate-filter');
    if (filterElement && filterElement.getFilters) {
      const currentFilters = filterElement.getFilters();
      window.fetchProductSlateData(currentFilters);
    }
  });
}

function fetchInitialData(initialSortField, initialSortDirection, defaultPageSize) {
  const urlParams = new URLSearchParams(window.location.search);

  return getProductSlateData({
    sortDirection: initialSortDirection,
    sortField: initialSortField,
    pageNumber: 1,
    pageSize: defaultPageSize,
    groups: urlParams.get('groups') || '',
    subGroups: urlParams.get('subGroups') || '',
    venues: urlParams.get('venues') || '',
    exch: urlParams.get('exch') || '',
    cleared: urlParams.get('cleared') || '',
    search: urlParams.get('search') || '',
    tags: urlParams.get('tags') || '',
  });
}

function initializeTable(tableManager, initialData) {
  return tableManager.updateProducts(initialData.products)
    .then(() => {
      if (initialData.props && initialData.props.voi) {
        return tableManager.setVoi(initialData.props.voi);
      }
      return Promise.resolve();
    })
    .then(() => {
      if (initialData.downloadExcelUrl) {
        return tableManager.setDownloadUrl(initialData.downloadExcelUrl);
      }
      return Promise.resolve();
    });
}

function createSpinner() {
  const spinner = createElement('div', { class: 'component-spinner' });
  spinner.innerHTML = `
    <div></div>
    <div></div>
    <div></div>
    <div></div>
  `;
  return spinner;
}

export default function decorate(block) {
  const config = readBlockConfig(block);
  block.textContent = '';
  block.append(createSpinner());

  const parsedConfig = parseConfig(config);
  const columnConfig = buildColumnConfig(parsedConfig.columnsToHide);
  const filterConfig = buildFilterConfig(parsedConfig.filtersToHide);
  const { initialSortField, initialSortDirection } = getInitialSortParams(
    parsedConfig.defaultSortField,
    parsedConfig.defaultSortDirection,
  );

  const tableContainer = document.createElement('div');
  tableContainer.className = 'product-slate-table-container';

  setupSortListener(block);

  Promise.all([
    createManagedProductTable(
      tableContainer,
      columnConfig,
      initialSortField,
      initialSortDirection,
    ),
    fetchInitialData(
      initialSortField,
      initialSortDirection,
      parsedConfig.defaultPageSize,
    ),
  ]).then(([tableManager, initialData]) => {
    block.textContent = '';

    window.fetchProductSlateData = createFetchDataFunction(
      tableManager,
      parsedConfig.defaultSortField,
      parsedConfig.defaultSortDirection,
      parsedConfig.defaultPageSize,
    );

    window.resetProductSlate = createResetFunction(
      tableManager,
      config,
      parsedConfig.defaultPageSize,
    );

    window.dispatchEvent(
      new CustomEvent('tableDataUpdated', {
        detail: {
          data: initialData,
          filters: {},
        },
      }),
    );

    const filter = createFilter(initialData.filters, filterConfig);

    if (!parsedConfig.displayAsWidget) {
      block.append(filter);
    }

    block.append(tableContainer);

    if (initialData.props && initialData.props.pageTotal) {
      tableManager.setTotalPages(initialData.props.pageTotal);
    }
    if (initialData.props && initialData.props.pageNumber) {
      tableManager.setCurrentPage(initialData.props.pageNumber);
    }

    initializeTable(tableManager, initialData);
  });
}

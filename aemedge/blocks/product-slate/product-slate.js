import createFilter from './filter/filter.js';
import getProductSlateData from '../../scripts/services/ProductSlateService.js';
import { createManagedProductTable } from './table/table.js';
import { readBlockConfig } from '../../scripts/aem.js';

export default async function decorate(block) {
  const config = readBlockConfig(block);
  block.textContent = '';

  const defaultPageSize = parseInt(config['result-per-page'], 10) || 500;
  const defaultSortField = config['sort-field'] || 'oi';
  const defaultSortDirection = config['sort-direction'] || 'desc';
  const columnsToHide = config['columns-hiding']
    ? config['columns-hiding'].split(',').map((col) => col.trim())
    : [];
  const displayAsWidget = config['display-as-widget'] === 'true';

  const columnConfig = {
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

  const filtersToHide = config['hide-filters']
    ? config['hide-filters'].split(',').map((f) => f.trim())
    : [];

  const filterConfig = {
    group: !filtersToHide.includes('group'),
    venues: !filtersToHide.includes('venues'),
    exch: !filtersToHide.includes('exch'),
    cleared: !filtersToHide.includes('cleared'),
    search: !filtersToHide.includes('search'),
    tags: !filtersToHide.includes('tags'),
  };

  const urlParams = new URLSearchParams(window.location.search);
  const hasURLParams = urlParams.toString().length > 0;
  const initialSortField = hasURLParams ? (urlParams.get('sortField') || defaultSortField) : defaultSortField;
  const initialSortDirection = hasURLParams ? (urlParams.get('sortDirection') || defaultSortDirection) : defaultSortDirection;

  const tableContainer = document.createElement('div');
  tableContainer.className = 'product-slate-table-container';

  const tableManager = await createManagedProductTable(
    tableContainer,
    columnConfig,
    initialSortField,
    initialSortDirection,
  );

  window.fetchProductSlateData = async (filters = {}) => {
    try {
      window.dispatchEvent(new CustomEvent('tableLoadingStart'));

      const sortState = tableManager.getSortState();

      const serviceParams = {
        sortDirection: sortState.sortDirection || defaultSortDirection,
        sortField: sortState.sortField || defaultSortField,
        pageNumber: 1,
        pageSize: defaultPageSize,
        groups: filters.group && filters.group.length > 0 ? filters.group.join(',') : '',
        subGroups: filters.subgroup && filters.subgroup.length > 0 ? filters.subgroup.join(',') : '',
        venues: filters.venues && filters.venues.length > 0 ? filters.venues.join(',') : '',
        exch: filters.exch && filters.exch.length > 0 ? filters.exch.join(',') : '',
        cleared: filters.cleared && filters.cleared.length > 0 ? filters.cleared.join(',') : '',
        search: filters.searchTerm || '',
        tags: filters.tags,
        exactMatchFirst: true,
      };

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

      if (filters.tags === 1) {
        urlParamsArray.push('tags=1');
      }

      const newURL = `${window.location.pathname}?${urlParamsArray.join('&')}`;
      window.history.pushState({}, '', newURL);

      const response = await getProductSlateData(serviceParams);

      window.dispatchEvent(
        new CustomEvent('tableDataUpdated', {
          detail: {
            data: response,
            filters,
          },
        }),
      );

      return response;
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('tableDataError', {
          detail: { error, filters },
        }),
      );
      return null;
    }
  };

  window.resetProductSlate = async () => {
    const resetSortField = config['sort-field'] || 'oi';
    const resetSortDirection = config['sort-direction'] || 'desc';

    tableManager.resetSort(resetSortField, resetSortDirection);

    const newURL = window.location.pathname;
    window.history.pushState({}, '', newURL);

    await tableManager.setLoading(true);

    const response = await getProductSlateData({
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
      exactMatchFirst: true,
    });

    window.dispatchEvent(
      new CustomEvent('tableDataUpdated', {
        detail: {
          data: response,
          filters: {},
        },
      }),
    );
  };

  window.addEventListener('tableSortChanged', async () => {
    const filterElement = block.querySelector('.product-slate-filter');
    if (filterElement && filterElement.getFilters) {
      const currentFilters = filterElement.getFilters();
      await window.fetchProductSlateData(currentFilters);
    }
  });

  const initialData = await getProductSlateData({
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
    exactMatchFirst: true,
  });

  const filter = createFilter(initialData.filters, filterConfig);

  if (!displayAsWidget) {
    block.append(filter);
  }

  block.append(tableContainer);

  await tableManager.updateProducts(initialData.products);
  if (initialData.props && initialData.props.voi) {
    await tableManager.setVoi(initialData.props.voi);
  }
  if (initialData.downloadExcelUrl) {
    await tableManager.setDownloadUrl(initialData.downloadExcelUrl);
  }
}

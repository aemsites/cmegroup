import { createFilter } from './filter/filter.js';
import getProductSlateData from '../../scripts/services/ProductSlateService.js';
import { createManagedProductTable } from './table/table.js';
import { readBlockConfig } from '../../scripts/aem.js';

export default async function decorate(block) {
  const config = readBlockConfig(block);
  block.textContent = '';
  const urlParams = new URLSearchParams(window.location.search);

  const defaultPageSize = parseInt(config['result-per-page'], 10) || 500;
  const defaultSortField = config['sort-field'] || 'oi';
  const defaultSortDirection = config['sort-direction'] || 'desc';

  const columnsToHide = config['columns-hiding']
    ? config['columns-hiding'].split(',').map((col) => col.trim())
    : [];

  const columnConfig = {
    productName: !columnsToHide.includes('productName'),
    clearing: !columnsToHide.includes('clearing'),
    globex: !columnsToHide.includes('globex'),
    floor: !columnsToHide.includes('floor'),
    clearPort: !columnsToHide.includes('clearport'),
    exchange: !columnsToHide.includes('exchange'),
    assetClass: !columnsToHide.includes('group'),
    group: !columnsToHide.includes('subGroup'),
    category: !columnsToHide.includes('category'),
    subCategory: !columnsToHide.includes('subCategory'),
    clearedAs: !columnsToHide.includes('cleared'),
    volume: !columnsToHide.includes('volume'),
    openInterest: !columnsToHide.includes('oi'),
  };

  const urlSortField = urlParams.get('sortField') || defaultSortField;
  const urlSortDirection = urlParams.get('sortDirection') || defaultSortDirection;

  const tableContainer = document.createElement('div');
  tableContainer.className = 'product-slate-table-container';

  const tableManager = await createManagedProductTable(
    tableContainer,
    columnConfig,
    urlSortField,
    urlSortDirection,
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

      const currentUrlParams = new URLSearchParams(window.location.search);
      currentUrlParams.set('sortField', sortState.sortField || defaultSortField);
      currentUrlParams.set('sortDirection', sortState.sortDirection || defaultSortDirection);

      if (filters.group && filters.group.length > 0) {
        currentUrlParams.set('groups', filters.group.join(','));
      } else {
        currentUrlParams.delete('groups');
      }

      if (filters.subgroup && filters.subgroup.length > 0) {
        currentUrlParams.set('subGroups', filters.subgroup.join(','));
      } else {
        currentUrlParams.delete('subGroups');
      }

      if (filters.searchTerm) {
        currentUrlParams.set('search', filters.searchTerm);
      } else {
        currentUrlParams.delete('search');
      }

      if (filters.exch && filters.exch.length > 0) {
        currentUrlParams.set('exch', filters.exch.join(','));
      } else {
        currentUrlParams.delete('exch');
      }

      if (filters.venues && filters.venues.length > 0) {
        currentUrlParams.set('venues', filters.venues.join(','));
      } else {
        currentUrlParams.delete('venues');
      }

      if (filters.cleared && filters.cleared.length > 0) {
        currentUrlParams.set('cleared', filters.cleared.join(','));
      } else {
        currentUrlParams.delete('cleared');
      }

      if (filters.tags === 1) {
        currentUrlParams.set('tags', '1');
      } else {
        currentUrlParams.delete('tags');
      }

      const newURL = `${window.location.pathname}?${currentUrlParams.toString()}`;
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

    window.dispatchEvent(new CustomEvent('tableLoadingStart'));

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
    sortDirection: urlSortDirection,
    sortField: urlSortField,
    pageNumber: 1,
    pageSize: defaultPageSize,
    groups: '',
    subGroups: '',
    venues: '',
    exch: '',
    cleared: '',
    exactMatchFirst: true,
  });

  const filter = createFilter(initialData.filters);
  block.append(filter);

  block.append(tableContainer);

  window.dispatchEvent(
    new CustomEvent('tableDataUpdated', {
      detail: {
        data: initialData,
        filters: {},
      },
    }),
  );
}

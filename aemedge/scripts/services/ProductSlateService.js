import {
  apiGet,
  apiPost,
  getResponseData,
  urlByEnvType,
} from '../utils/index.js';

export async function getProductSlateData({
  pageNumber,
  pageSize,
  sortField,
  sortDirection,
  subGroups,
  venues,
  exch,
  cleared,
  groups,
  tags,
  cat,
  subCat,
  search,
  excludeColumns,
  id,
  exactMatchFirst,
}: any): any {
  const query = [];

  if (sortDirection)
    query.push('sortAsc=' + Boolean(sortDirection === 'asc').toString());
  if (sortField) query.push('sortField=' + sortField);

  if (pageNumber) {
    query.push('pageNumber=' + pageNumber);
  } else {
    query.push('pageNumber=1');
  }

  if (pageSize) query.push('pageSize=' + pageSize.toString());

  if (groups) {
    query.push('group=' + groups);
  } else {
    query.push('group=');
  }

  if (subGroups?.length) {
    query.push('subGroup=' + subGroups);
  } else {
    query.push('subGroup=');
  }

  if (venues) {
    query.push('venues=' + venues);
  } else {
    query.push('venues=');
  }

  if (exch?.length) {
    query.push('exch=' + exch);
  } else {
    query.push('exch=');
  }

  if (cleared?.length) {
    query.push('cleared=' + cleared);
  } else {
    query.push('cleared=');
  }

  if (tags) query.push('tags=' + tags);
  if (cat && cat.length) query.push('cat=' + cat);
  if (subCat && subCat.length) query.push('subCat=' + subCat);
  if (search) query.push(`searchString=${encodeURIComponent(search)}`);
  if (excludeColumns && excludeColumns.length)
    query.push('excludeColumns=' + excludeColumns);
  if (exactMatchFirst) query.push(`exactMatchFirst=${exactMatchFirst}`);

  if (id) {
    query.push('id=' + id);
  }

  const endpoint =
    `${urlByEnvType()}/services/product-slate` + (query.length ? '?' + query.join('&') : '');
  const downloadExcelUrl =
    `${urlByEnvType()}/services/product-slate-download` +
    (query.length ? '?' + query.join('&') : '');

  try {
    const response = getResponseData(await apiGet(endpoint));
    return {
      ...response,
      downloadExcelUrl,
    };
  } catch (e) {
    console.error('ProductSlateService => getProductSlate error:', e);
    return {
      products: [],
      filters: [],
      props: {},
      error: true,
      downloadExcelUrl,
    };
  }
}

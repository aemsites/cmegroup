import {
  filter,
  some,
  every,
  get,
  sortBy,
  find,
} from './misc.js';

export function multiKeyIntersection(
  arr1,
  arr2,
  keys,
) {
  return filter(arr1, (item1) => some(arr2, (item2) =>
    // eslint-disable-next-line implicit-arrow-linebreak
    every(keys, (key) => get(item1, key) === get(item2, key))));
}

export function sortByReferenceOrder(
  arrToSort,
  orderArray,
  key,
) {
  return sortBy(arrToSort, (item) => {
    const orderItem = find(orderArray, [key, item[key]]);
    return orderItem ? orderArray.indexOf(orderItem) : Number.POSITIVE_INFINITY;
  });
}

export function arrayIncludes(arr1, arr2) {
  return arr1.some((v) => arr2.includes(v));
}

export function arrayWrap(data) {
  return Array.isArray(data) ? data : [data];
}

export function arrayClone(items) {
  if (Array.isArray(items)) {
    return items.map((item) => arrayClone(item));
  }
  return items;
}

export function arrayMerge(x, y) {
  return y.reduce(
    (acc, cur, i) => {
      if (!acc[i]) {
        acc[i] = arrayClone(cur);
      } else if (Array.isArray(acc[i]) && Array.isArray(cur)) {
        acc[i] = arrayMerge(acc[i], cur);
      } else if (Array.isArray(acc[i])) {
        if (acc[i].indexOf(cur) === -1) {
          acc[i] = [...arrayClone(acc[i]), cur];
        }
      } else if (Array.isArray(cur)) {
        if (cur.indexOf(acc[i]) === -1) {
          acc[i] = [...arrayClone(cur), acc[i]];
        }
      } else if (acc.indexOf(cur) === -1) {
        return [...arrayClone(acc), cur];
      }
      return acc;
    },
    [...x],
  );
}

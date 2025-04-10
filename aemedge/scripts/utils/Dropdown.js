import { arrayMerge } from './Array.js';

export const dropdownMapItems = (
  data,
  format,
) => data.map((item) => (typeof format === 'function'
  ? format(item)
  : {
    label: item[format.label] || '',
    text: item[format.text] || '',
    items: item[format.items]
      ? dropdownMapItems(item[format.items], format)
      : undefined,
  }));

export const dropdownFilterMapItems = (
  data,
  format,
  checked,
  _level = 0,
) => data.map((item) => (typeof format === 'function'
  ? format(item)
  : {
    label: item[format.label] || '',
    text: item[format.text] || '',
    checked:
            typeof checked === 'function'
              ? checked(item, _level)
              : item[format.checked] || !!checked,
    items: item[format.items]
      ? dropdownFilterMapItems(
        item[format.items],
        format,
        checked,
        _level + 1,
      )
      : undefined,
    icon: item[format.icon] || undefined,
  }));

export const dropdownFilterFind = (
  items,
  ids,
  _parent,
) => {
  // eslint-disable-next-line no-underscore-dangle
  let _ids = ids;
  if (typeof ids === 'string') {
    _ids = ids.split('_');
  }
  if (_ids.length) {
    const id = _ids.shift();
    const selected = items.find(({ text, label }) => (text || label) === id);
    if (selected) {
      if (!ids.length) {
        return {
          ...selected,
          _parent,
        };
      }
      if (selected.items) {
        return dropdownFilterFind(selected.items, ids, selected);
      }
    }
  }
  return null;
};

export const dropdownFilterIsChecked = (ids) => {
  const selected = dropdownFilterFind(ids);
  if (selected) {
    return selected.checked;
  }
  return false;
};

export const dropdownFilterToggleAll = (
  items,
  checked = false,
) => items.map((item) => ({
  ...item,
  checked,
  items: item.items
    ? dropdownFilterToggleAll(item.items, checked)
    : undefined,
}));

export const dropdownFilterToggleCheck = (
  items,
  ids,
  checked = false,
  _level = 0,
  _shouldFind = true,
) => {
  // eslint-disable-next-line no-underscore-dangle
  let _ids = ids;
  if (typeof ids === 'string') {
    _ids = ids.split('_');
  }
  // eslint-disable-next-line no-underscore-dangle
  const id = Array.isArray(_ids) && _ids.length > _level ? _ids[_level] : NaN;
  return items.map((item) => {
    const { text, label, items: subItems } = item;
    let { checked: newChecked } = item;
    let shouldFind = _shouldFind;
    let changed = false;
    if (shouldFind && (text || label) !== id) {
      shouldFind = false;
    }
    if (shouldFind && _level + 1 === _ids.length) {
      newChecked = checked;
      changed = true;
    }
    const newItem = {
      ...item,
      checked: newChecked,
    };
    if (subItems) {
      newItem.items = changed
        ? dropdownFilterToggleAll(subItems, checked)
        : dropdownFilterToggleCheck(
          subItems,
          _ids,
          checked,
          _level + 1,
          shouldFind,
        );
      if (shouldFind && !changed) {
        newItem.checked = newItem.items.every(({ checked: c }) => c);
      }
    }
    return newItem;
  });
};

export const dropdownFilterGetCheckedByLevels = (
  items,
  prefix,
  _level = 0,
) => {
  let result = [];
  const ret = items
    .filter(({
      text, label, checked, items: subItems,
    }) => {
      if (subItems) {
        result = arrayMerge(
          result,
          dropdownFilterGetCheckedByLevels(
            subItems,
            `${prefix}_${text || label}`,
            _level + 1,
          ),
        );
      }
      return checked;
    })
    .map(({ text, label }) => ({
      label,
      text: `${prefix}_${text || label}`,
      id: text || label,
    }));
  // eslint-disable-next-line no-underscore-dangle
  result[_level] = ret;
  return result;
};

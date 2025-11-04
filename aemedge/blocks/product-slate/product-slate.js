/* eslint-disable no-console */
import { createFilter } from './filter/filter.js';
import fullService from './full-service.js';

export default function decorate(block) {
  fullService().then((fullData) => {
    const filter = createFilter(fullData.filters);
    block.append(filter);
  }).catch((error) => {
    console.error('Error loading full service data:', error);
  });
}

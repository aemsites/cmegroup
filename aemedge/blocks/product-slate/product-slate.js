/* eslint-disable no-console */
import { createFilter } from './filter/filter.js';
import fullService from './full-service.js';

export default async function decorate(block) {
  const fullData = await fullService();
  const filtro = await createFilter(fullData.filters);
  block.append(filtro);
}

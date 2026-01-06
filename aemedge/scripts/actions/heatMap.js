/* eslint-disable no-await-in-loop */
import { heatMapConstants } from '../constants/index.js';
import { chunk } from '../utils/array.js';

// eslint-disable-next-line import/prefer-default-export
export function addHeatMap(items) {
  return {
    type: heatMapConstants.HEAT_MAP_ADD,
    payload: {
      items,
    },
  };
}

export async function getAllQuotes(
  productIds = [],
  numContracts = [],
  quarterly = [],
) {
  const splitProductIds = chunk(productIds, 85);
  const splitNumContracts = chunk(numContracts, 85);
  const splitQuarterly = chunk(quarterly, 85);
  let resultQuotes = [];
  for (let i = 0; i < splitProductIds.length; i += 1) {
    const { getContractsByNumber } = await import('../utils/product.js');
    const quotes = await getContractsByNumber(
      splitProductIds[i],
      splitNumContracts[i],
      splitQuarterly[i],
    );
    if (quotes.length) {
      resultQuotes = resultQuotes.concat(quotes);
    }
  }
  return {
    type: heatMapConstants.HEAT_MAP_GET_ALL,
    payload: {
      quotes: resultQuotes,
    },
  };
}

/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import {
  apiGet,
  getResponseData,
  urlByEnvType,
} from '../utils/index.js';

export async function getRecommendationAi(size) {
  const sizeLimit = size && size > 0 ? `?size=${size}` : '';
  console.log(sizeLimit);
  const endpoint = `${urlByEnvType()}/services/recommendation-ai${sizeLimit}`;

  try {
    const response = await apiGet(endpoint);
    const data = getResponseData(response);
    return data.data;
  } catch (e) {
    console.error('RecommendationAiService => getRecommendationAi error:', e);
    return {};
  }
}

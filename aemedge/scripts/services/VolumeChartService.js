/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import {
  apiGet,
  getResponseData,
  urlByEnvType,
} from '../utils/index.js';

export async function getVolumeLastTotals(
  productId,
  days = 15,
  isOption = false,
) {
  const url = `${urlByEnvType()}/CmeWS/mvc/Volume/${isOption ? 'Total' : 'LastTotals'}/${productId}${days ? `?days=${days}` : ''}`;

  try {
    const response = await apiGet(url);
    const information = {
      data: getResponseData(response, 'vdate'),
      timeStamp: new Date(),
    };

    return information;
  } catch (e) {
    console.error('VolumeService => getVolumeLastTotals error:', e);
    return [];
  }
}

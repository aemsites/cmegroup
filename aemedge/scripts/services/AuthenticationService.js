import {
  apiGet,
  apiPost,
  getResponseData,
  urlByEnvType,
} from '../utils/index.js';
import { getLoginDataUrl } from '../legacy-api.js';

export async function getIsLoggedIn() {
  const isLoggedInService = `https://preview.cmegroup.com/services/login/validate`;
  try {
    const response = await apiGet(isLoggedInService);
    return getResponseData(response);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('AuthenticationService => getIsLoggedIn error:', e);
    return null;
  }
}

export async function getLoginData(fromUrl, fromUrlTitle) {
  const url = getLoginDataUrl(fromUrl, fromUrlTitle);
  try {
    const response = await apiGet(url);
    return getResponseData(response);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('AuthenticationService => getIsLoggedIn error:', e);
    return null;
  }
}

export async function getUserInfo(userInfo) {
  const url = `${urlByEnvType()}/CmeWS/mvc/secured/UserAccount/salesforce-userinfo`;
  const { userId, token } = userInfo;
  try {
    const response = await apiPost(url, {
      userId,
      token,
    });
    return getResponseData(response);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('AuthenticationService => getUserInfo error:', e);
    return null;
  }
}

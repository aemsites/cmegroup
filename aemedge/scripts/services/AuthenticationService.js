// @flow
import {
  apiGetAbsolute,
  apiPostAbsolute,
  getResponseData,
  getIsLoggedInUrl,
  getLoginDataUrl,
  getUserInfoUrl,
} from '../utils/index.js';

export async function getIsLoggedIn() {
  const isLoggedInService = getIsLoggedInUrl();
  try {
    const response = await apiGetAbsolute(isLoggedInService);
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
    const response = await apiGetAbsolute(url);
    return getResponseData(response);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('AuthenticationService => getIsLoggedIn error:', e);
    return null;
  }
}

export async function getUserInfo(userInfo) {
  const url = getUserInfoUrl();
  const { userId, token } = userInfo;
  try {
    const response = await apiPostAbsolute(url, {
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

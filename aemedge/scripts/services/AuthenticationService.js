import {
  apiPost,
  getResponseData,
  urlByEnvType,
} from '../utils/index.js';

export async function getIsLoggedIn(payload) {
  alert('Running Authentication Service')
  console.log('Running AuthenticationService - Beta');
  const isLoggedInService = `${urlByEnvType()}/services/login/validate`;
  try {
    const response = await apiPost(isLoggedInService, payload);
    return getResponseData(response);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('AuthenticationService => getIsLoggedIn error:', e);
    return null;
  }
}

export async function getLoginData(xAuthToken) {
  const url = `${urlByEnvType()}/services/login-confirm`;
  try {
    const response = await apiPost(url, {
      'X-Auth-Token': xAuthToken,
    });
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

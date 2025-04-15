import { AUTH_ACTIONS } from '../constants/index.js';

export function authLogin(loginInfo) {
  return {
    type: AUTH_ACTIONS.LOGIN,
    payload: loginInfo,
  };
}

export function authLogout() {
  return {
    type: AUTH_ACTIONS.LOGOUT,
  };
}

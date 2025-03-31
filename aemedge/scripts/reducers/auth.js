import { AUTH_ACTIONS } from '../constants/auth.js';

export const authInitState = {
  isLoggedIn: false,
  isLoginComplete: false,
  loginInfo: null,
};

// eslint-disable-next-line default-param-last
export const authReducer = (state = authInitState, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN:
      return {
        ...state,
        isLoggedIn: !!action.payload,
        isLoginComplete: true,
        loginInfo: action.payload,
      };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        isLoggedIn: false,
        loginInfo: null,
      };
    default:
      return state;
  }
};

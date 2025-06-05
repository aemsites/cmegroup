import { COURSE_ACTIONS } from '../constants/index.js';

export const courseInitState = null;

// eslint-disable-next-line default-param-last
export const courseReducer = (state = courseInitState, action) => {
  const { type, payload } = action;
  switch (type) {
    case COURSE_ACTIONS.DATA_CHANGED:
      return {
        ...state,
        ...payload,
      };
    default:
      return state;
  }
};

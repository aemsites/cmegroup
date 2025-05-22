import { FLOATING_ELEMENTS_ACTIONS } from '../constants/index.js';

export const floatingElementsInitState = {
  height: 0,
};

// eslint-disable-next-line default-param-last
export const floatingElementsReducer = (state = floatingElementsInitState, action) => {
  switch (action.type) {
    case FLOATING_ELEMENTS_ACTIONS.STACK:
      return {
        height: state.height + action.payload,
      };
    case FLOATING_ELEMENTS_ACTIONS.UNSTACK:
      return {
        height: state.height - action.payload,
      };
    default:
      return state;
  }
};

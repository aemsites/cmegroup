import { heatMapConstants } from '../constants/index.js';

export const heatMapInitState = {
  items: [],
  quotes: [],
};

// eslint-disable-next-line default-param-last
export const heatMapReducer = (state = heatMapInitState, action) => {
  const { type, payload } = action;
  switch (type) {
    case heatMapConstants.HEAT_MAP_ADD:
      return {
        ...state,
        items: [...state.items, ...payload.items],
      };
    case heatMapConstants.HEAT_MAP_GET_ALL:
      return {
        ...state,
        quotes: [...payload.quotes],
      };
    default:
      return state;
  }
};

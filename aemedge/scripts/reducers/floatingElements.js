import { FLOATING_ELEMENTS_ACTIONS } from '../constants/index.js';

export const floatingElementsInitState = {
  elements: [],
  callbacks: [],
  height: 0,
};

function calculateHeight(elements, callbacks) {
  return elements.reduce((sum, elem, index) => {
    const callback = callbacks[index];
    if (callback) {
      return sum + callback(elem);
    }
    return sum + elem.offsetHeight;
  }, 0);
}

// eslint-disable-next-line default-param-last
export const floatingElementsReducer = (state = floatingElementsInitState, action) => {
  switch (action.type) {
    case FLOATING_ELEMENTS_ACTIONS.UPDATE:
      return {
        elements: state.elements,
        callbacks: state.callbacks,
        height: calculateHeight(state.elements, state.callbacks),
      };
    case FLOATING_ELEMENTS_ACTIONS.ADD: {
      const newElements = [...state.elements, action.payload.element];
      const newCallbacks = [...state.callbacks, action.payload.callback];
      return {
        elements: newElements,
        callbacks: newCallbacks,
        height: calculateHeight(newElements, newCallbacks),
      };
    }
    default:
      return state;
  }
};

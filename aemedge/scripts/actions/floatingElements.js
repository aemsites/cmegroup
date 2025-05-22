import { FLOATING_ELEMENTS_ACTIONS } from '../constants/index.js';

export function stackFloatingElement(height) {
  return {
    type: FLOATING_ELEMENTS_ACTIONS.STACK,
    payload: height,
  };
}

export function unstackFloatingElement(height) {
  return {
    type: FLOATING_ELEMENTS_ACTIONS.UNSTACK,
    payload: height,
  };
}

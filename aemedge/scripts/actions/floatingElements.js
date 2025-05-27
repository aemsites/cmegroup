/* eslint-disable import/prefer-default-export */
import { FLOATING_ELEMENTS_ACTIONS } from '../constants/index.js';

export function updateFloatingElements() {
  return {
    type: FLOATING_ELEMENTS_ACTIONS.UPDATE,
  };
}

export function addFloatingElement(element, callback) {
  return {
    type: FLOATING_ELEMENTS_ACTIONS.ADD,
    payload: {
      element,
      callback,
    },
  };
}

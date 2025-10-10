import { QUIZ_ACTIONS } from '../constants/index.js';

export const quizInitState = {
  quizStatus: null,
  redo: false,
};

// eslint-disable-next-line default-param-last
export const quizReducer = (state = quizInitState, action) => {
  const { type, payload } = action;
  switch (type) {
    case QUIZ_ACTIONS.ANSWERED:
      return {
        ...state,
        quizStatus: payload,
      };
    case QUIZ_ACTIONS.REDO:
      return {
        ...state,
        redo: payload,
        quizStatus: null,
      };
    default:
      return state;
  }
};

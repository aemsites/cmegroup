import { QUIZ_ACTIONS } from '../constants/index.js';

export const quizInitState = {
  isCorrect: false,
  redo: false,
};

// eslint-disable-next-line default-param-last
export const quizReducer = (state = quizInitState, action) => {
  const { type, payload } = action;
  switch (type) {
    case QUIZ_ACTIONS.ANSWERED:
      return {
        ...state,
        isCorrect: payload,
      };
    case QUIZ_ACTIONS.REDO:
      return {
        ...state,
        redo: payload,
      };
    default:
      return state;
  }
};

import { QUIZ_ACTIONS } from '../constants/index.js';

// eslint-disable-next-line import/prefer-default-export
export function quizAnswered(isCorrect) {
  return {
    type: QUIZ_ACTIONS.ANSWERED,
    payload: isCorrect,
  };
}

import { QUIZ_ACTIONS } from '../constants/index.js';

// eslint-disable-next-line import/prefer-default-export
export function quizAnswered(quizStatus) {
  return {
    type: QUIZ_ACTIONS.ANSWERED,
    payload: quizStatus,
  };
}

export function quizRedo(redo) {
  return {
    type: QUIZ_ACTIONS.REDO,
    payload: redo,
  };
}

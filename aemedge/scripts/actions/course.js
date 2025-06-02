import { COURSE_ACTIONS } from '../constants/index.js';

// eslint-disable-next-line import/prefer-default-export
export function courseDataChange(courseData) {
  return {
    type: COURSE_ACTIONS.DATA_CHANGED,
    payload: courseData,
  };
}

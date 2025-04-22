import { createCourseBaseTemplate } from '../../scripts/course/course.js';
import { createElement } from '../../scripts/utils.js';

function addBeginCourseButton() {
  const main = document.querySelector('main');
  const beginCourseButton = createElement('a', { class: 'button primary' }, 'Begin Course');
  const buttonContainer = createElement('div', { class: 'button-container begin-course-button' }, beginCourseButton);
  main.querySelector('.section:last-child > div')?.appendChild(buttonContainer);
}

export default function courseTemplate() {
  createCourseBaseTemplate();
  addBeginCourseButton();
}

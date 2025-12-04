import {
  i18n,
} from '../utils.js';
import {
  h5, div, span,
} from '../dom-helpers.js';
import { createModal } from '../../blocks/modal/modal.js';
import { store } from '../store/store.js';
import { authentication } from '../modules/index.js';

async function createAuthModal() {
  const [
    title,
    loginLabel,
    accountLabel,
    saveProgressText,
  ] = await Promise.all([
    i18n('Track your progress for courses and lessons with CME Institute'),
    i18n('Login'),
    i18n('create an account'),
    i18n('to save and track your progress'),
  ]);

  const modalHeader = div({ class: 'modal-header' });
  modalHeader.appendChild(
    h5({ class: 'modal-title' }, `${title}.`),
  );

  const modalBody = div({ class: 'modal-body' });
  const login = span({ class: 'login-handler' }, loginLabel);
  login.addEventListener('click', async () => {
    authentication.login();
  });
  const account = span({ class: 'registration-handler' }, accountLabel);
  account.addEventListener('click', async () => {
    authentication.registration();
  });
  modalBody.appendChild(login);
  modalBody.appendChild(document.createTextNode(' or '));
  modalBody.appendChild(account);
  modalBody.appendChild(document.createTextNode(` ${saveProgressText}.`));

  const modal = await createModal([modalHeader, modalBody]);
  modal.block?.classList.add('course-auth-modal');
  return modal;
}

// eslint-disable-next-line import/prefer-default-export
export async function openAuthModal() {
  const { showModal } = await createAuthModal();
  showModal();
}

//  subscriber to show auth modal on courseData changes
store.subscribe(({ courseData }) => courseData, (courseData) => {
  if (!courseData) {
    return;
  }
  const authShowedKey = `authShowedCount_${courseData.moduleId}`;
  const authShowedCount = Number(localStorage.getItem(authShowedKey));

  //  first lesson completed or standalone module
  if ((courseData.completedLessons === 1 || courseData.isStandalone) && authShowedCount < 1) {
    openAuthModal();
    localStorage.setItem(authShowedKey, 1);
  //  course at 50%
  } else if (courseData.completedLessons === Math.round(courseData.totalLessons / 2)
      && authShowedCount < 50) {
    openAuthModal();
    localStorage.setItem(authShowedKey, 50);
  } else {
    //  open a lesson not chronologically
    const alreadyShowed = localStorage.getItem(`authAlreadyShowed_${courseData.moduleId}`);
    if (!alreadyShowed) {
      const currentPath = window.location.pathname;
      const lessons = [
        ...(courseData.chapters?.flatMap(({ lessons: chLessons }) => chLessons) || []),
        ...courseData.lessons || []];
      const lessonIndex = lessons.findIndex(({ path }) => currentPath === path);
      //  finding for a previous lesson that wasn't completed
      if (lessons.slice(0, lessonIndex).some(({ completed }) => !completed)) {
        openAuthModal();
        localStorage.setItem(`authAlreadyShowed_${courseData.moduleId}`, true);
      }
    }
  }
});

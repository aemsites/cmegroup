import { createElement } from '../../../scripts/utils.js';
import { addCourseCertificate } from '../../../scripts/course/certificate.js';
import { authentication } from '../../../scripts/modules/Authentication.js';

// eslint-disable-next-line import/prefer-default-export
export function createEducationCard(item, isLesson = false) {
  const {
    url, title, completed, updated, description,
  } = item;

  const lastLaunchedDate = new Date(updated).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const header = createElement(
    'div',
    { class: 'course-header' },
    createElement(
      'div',
      { class: 'labels' },
      createElement('span', {}, isLesson ? 'Lesson' : 'Course'),
    ),
  );

  let launchBtn;

  if (completed) {
    const container = createElement('div');
    launchBtn = container;

    const { authenticationData } = authentication;
    authenticationData.loginPromise.then(async () => {
      const { isLoggedIn, loginInfo } = authenticationData;
      const buttonContent = await addCourseCertificate({
        isLoggedIn,
        userName: loginInfo?.userName,
        moduleId: item?.courseId,
        lessonTitle: item?.title,
        completedModule: item?.endDate,
        container,
        isFromHistory: true,
      });

      if (typeof buttonContent === 'string') {
        launchBtn.innerHTML = buttonContent;
      } else if (buttonContent instanceof HTMLElement) {
        launchBtn.innerHTML = '';
        launchBtn.appendChild(buttonContent);
      }
    });
  } else {
    launchBtn = createElement(
      'a',
      { class: 'btn link', href: url },
      createElement('span', { class: 'text' }, isLesson ? 'Launch Lesson' : 'Launch Course'),
    );
  }

  const progressBar = createElement('div', {
    class: `progress-bar linear ${completed ? 'completed' : ''}`,
  }, createElement('div', { class: 'progress', style: 'width: 0' }));

  const descriptionElement = createElement(
    'span',
    { class: 'LinesEllipsis description' },
    description,
  );

  let totalLessons = 0;
  if (isLesson) {
    totalLessons = 1;
  } else if (item.lessons?.length) {
    totalLessons = item.lessons.length;
  }

  let lessonsCompleted = 0;
  if (item.lessons) {
    lessonsCompleted = item.lessons.filter((lesson) => lesson.completed).length;
  } else if (item.completed) {
    lessonsCompleted = 1;
  }

  const details = createElement(
    'div',
    { class: 'details' },
    createElement(
      'p',
      {},
      createElement('span', {}, 'Lessons completed'),
      createElement('br'),
      createElement('span', {}, `${lessonsCompleted} of ${totalLessons}`),
    ),
    createElement(
      'p',
      {},
      createElement('span', {}, 'Last Launched'),
      createElement('br'),
      createElement('span', {}, lastLaunchedDate),
    ),
  );

  const content = createElement(
    'div',
    { class: 'course-info' },
    // TO DO: add mobile link
    createElement('div', {}, createElement('h2', {}, title), descriptionElement),
    details,
  );

  let extra = null;
  if (!isLesson && item.lessons && item.lessons.length > 0) {
    const numberOfLesson = item.lessons.length;

    const collapse = createElement(
      'div',
      { class: 'collapse' },
      createElement(
        'div',
        { class: 'lessons-container' },
        ...item.lessons.map((lesson) => createElement(
          'div',
          { class: 'lesson-list-item' },
          createElement('i', {
            class: `circle-mark${lesson.completed ? ' completed' : ''}`,
          }),
          createElement(
            'a',
            { class: 'btn link', href: lesson.url },
            createElement('span', { class: 'text' }, lesson.title),
          ),
        )),
      ),
    );

    const expandBtn = createElement('button', {
      type: 'button',
      class: 'btn btn-secondary expand-collapse',
    }, createElement('i', { class: 'icon icon-plus' }));

    expandBtn.addEventListener('click', () => {
      const isExpanded = collapse.classList.contains('show');
      collapse.classList.toggle('show', !isExpanded);
      const icon = expandBtn.querySelector('.icon');
      icon.classList.toggle('icon-plus', isExpanded);
      icon.classList.toggle('icon-minus', !isExpanded);
    });

    extra = [
      createElement(
        'div',
        { class: 'lessons-div' },
        createElement('div', {}, launchBtn),
        createElement(
          'div',
          { class: 'expand-collapse-lessons' },
          createElement('span', {}, `${numberOfLesson} Lessons`),
          expandBtn,
        ),
      ),
      collapse,
    ];
  } else {
    extra = [createElement('div', { class: 'lessons-div' }, launchBtn)];
  }

  return createElement(
    'div',
    { class: 'course-card' },
    progressBar,
    header,
    content,
    ...extra,
  );
}

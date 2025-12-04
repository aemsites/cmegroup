import { createElement, i18n, getCdtDate } from '../../../scripts/utils.js';
import { addCourseCertificate } from '../../../scripts/course/certificate.js';
import { authentication } from '../../../scripts/modules/Authentication.js';

// eslint-disable-next-line import/prefer-default-export
export async function createEducationCard(item, isLesson = false) {
  const {
    launchUrl, title, completed, updated, description, template,
  } = item;
  const lastLaunchedDate = getCdtDate(updated);
  const isAssessment = isLesson && template === 'assessment';

  const [
    courseLabel,
    lessonLabel,
    launchCourseText,
    launchLessonText,
    lessonsCompletedLabel,
    lastLaunchedLabel,
    courseCompletedLabel,
    lessonCompletedLabel,
    lessonsText,
  ] = await Promise.all([
    i18n('Course'),
    i18n(isAssessment ? 'Assessment' : 'Lesson'),
    i18n('Launch Course'),
    i18n('Launch Lesson'),
    i18n('Lessons complete'),
    i18n('Last launched'),
    i18n('Course completed'),
    i18n('Lesson completed'),
    i18n('Lessons'),
  ]);

  const header = createElement(
    'div',
    { class: 'course-header' },
    createElement(
      'div',
      { class: 'labels' },
      createElement('span', {}, isLesson ? lessonLabel : courseLabel),
    ),
  );

  let launchBtn;

  if (completed) {
    if (!isLesson || isAssessment) {
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
          template,
        });

        if (typeof buttonContent === 'string') {
          launchBtn.innerHTML = buttonContent;
        } else if (buttonContent instanceof HTMLElement) {
          launchBtn.innerHTML = '';
          launchBtn.appendChild(buttonContent);
        }
      });
    }
  } else {
    launchBtn = createElement(
      'a',
      { class: 'btn link desktop-only', href: launchUrl },
      createElement('span', { class: 'text' }, isLesson ? launchLessonText : launchCourseText),
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

  const totalLessons = isLesson ? 1 : item.lessons?.length || 0;
  let lessonsCompleted = 0;

  if (item.lessons) {
    lessonsCompleted = item.completedLessons;
  } else if (item.completed) {
    lessonsCompleted = 1;
  }

  let labelText;
  if (!completed) {
    labelText = lastLaunchedLabel;
  } else if (isLesson) {
    labelText = lessonCompletedLabel;
  } else {
    labelText = courseCompletedLabel;
  }

  const details = createElement(
    'div',
    { class: 'details' },
    createElement(
      'p',
      {},
      createElement('span', {}, lessonsCompletedLabel),
      createElement('br'),
      createElement('span', {}, `${lessonsCompleted} of ${totalLessons}`),
    ),
    createElement(
      'p',
      {},
      createElement('span', {}, labelText),
      createElement('br'),
      createElement('span', {}, lastLaunchedDate.format('MMMM D, YYYY')),
    ),
  );

  const titleElementDesktop = createElement('h2', { class: 'desktop-only' }, title);
  const titleElementMobile = createElement(
    'a',
    { href: launchUrl, class: 'mobile-only' },
    createElement('h2', {}, title),
  );

  const content = createElement(
    'div',
    { class: 'course-info' },
    createElement('div', {}, titleElementDesktop, titleElementMobile, descriptionElement),
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
          createElement('span', {}, `${numberOfLesson} ${lessonsText}`),
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

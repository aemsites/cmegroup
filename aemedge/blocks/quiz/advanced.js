import {
  div, p, span, a, h3, h4, img, button,
} from '../../scripts/dom-helpers.js';
import { i18n } from '../../scripts/utils.js';

export function updateAdvancedNextDisabled(type, wrapper, currentIndex, questions, state, next) {
  let disable = false;
  if (type === 'activity') {
    const currentQuestion = wrapper.querySelectorAll(':scope > div')[currentIndex];
    const answered = currentQuestion.classList.contains('answered-correctly');
    disable = !answered && currentIndex < questions.length - 1;
  } else if (type === 'test') {
    const answered = state.answers[currentIndex] !== undefined;
    disable = !answered && currentIndex < questions.length - 1;
  }
  next.disabled = disable;
  next.classList.toggle('arrow-disabled', disable || currentIndex === questions.length - 1);
}

function addReviewQuestions(block, questionsMeta, questionsWrapper, state) {
  let reviewContainer = block.querySelector('.review-questions');
  if (reviewContainer) return;

  reviewContainer = div({ class: 'review-questions' });

  questionsMeta.forEach((q, idx) => {
    const isCorrect = state.answers[idx] !== undefined && q.answers[state.answers[idx]]?.correct;
    const isSelected = block.nav && block.nav.currentIndex === idx;

    const questionLink = a(
      {
        role: 'button',
        tabindex: '0',
        'data-index': idx,
        class: `question-link ${isCorrect ? ' correct' : ' incorrect'}${isSelected ? ' selected' : ''}`,
      },
      `Q${idx + 1}`,
    );

    questionLink.addEventListener('click', () => {
      if (block.nav) {
        block.nav.currentIndex = idx;
        block.updateNavigation?.();
      }
      reviewContainer.querySelectorAll('.question-link').forEach((link) => link.classList.remove('selected'));
      questionLink.classList.add('selected');
    });

    reviewContainer.appendChild(questionLink);
  });

  block.insertBefore(reviewContainer, questionsWrapper);
}

async function renderTestResult(
  block,
  questionsMeta,
  state,
  questionsWrapper,
  progressBar,
  navigation,
) {
  const correctCount = questionsMeta.reduce((acc, q, idx) => {
    const selectedIndex = state.answers[idx];
    return acc + (selectedIndex !== undefined && q.answers[selectedIndex]?.correct ? 1 : 0);
  }, 0);

  const total = questionsMeta.length;
  const percentage = Math.round((correctCount / total) * 100);
  const passed = percentage >= 70;

  const [
    congratsLabel,
    oopsLabel,
    passedMsg,
    failedMsg,
    nextLessonLabel,
    reviewLabel,
    redoLabel,
  ] = await Promise.all([
    i18n('Congratulations'),
    i18n('Oops'),
    i18n('You have passed!'),
    i18n('You did not pass'),
    i18n('Next Lesson'),
    i18n('Review your Answers'),
    i18n('Redo the Test'),
  ]);

  const container = div(
    { class: 'test-results-container' },
    h3({}, passed ? congratsLabel : oopsLabel),
    h4({}, passed ? passedMsg : failedMsg),
    div(
      { class: `progress-bar circular ${passed ? 'passed' : 'failed'}` },
      div(
        {
          innerHTML: `
        <svg width="190" height="190" viewBox="0 0 190 190">
          <circle class="background" cx="95" cy="95" r="91.5" stroke-width="7px"></circle>
          <text class="text" x="50%" y="50%" dy=".3em" text-anchor="middle">${percentage}%</text>
        </svg>
      `,
        },
      ),
    ),
    p({ class: 'results pt-4' }, passed
      ? `You answered ${correctCount} out of ${total} questions correctly`
      : `You answered ${total - correctCount} out of ${total} questions incorrectly`),
    button(
      { type: 'button', class: 'primary btn btn-' },
      span({ class: 'text' }, nextLessonLabel),
    ),
    (() => {
      const linksPara = p({ class: 'pt-4' });
      const reviewLink = a({ role: 'button', tabindex: '0', class: 'review-answers' }, reviewLabel);
      linksPara.appendChild(reviewLink);
      if (!passed) {
        linksPara.appendChild(document.createTextNode(' or '));
        linksPara.appendChild(a({ role: 'button', tabindex: '0', class: 'redo-quiz' }, redoLabel));
      }
      return linksPara;
    })(),
  );

  block.insertBefore(container, block.firstChild);
  block.classList.add('complete');

  if (questionsWrapper) questionsWrapper.style.display = 'none';
  if (navigation) navigation.style.display = 'none';
  if (progressBar) progressBar.style.display = 'none';

  const reviewLink = container.querySelector('.review-answers');
  reviewLink.addEventListener('click', () => {
    container.remove();
    if (!questionsWrapper) return;

    questionsWrapper.style.display = '';
    if (navigation) navigation.style.display = '';
    if (progressBar) progressBar.style.display = 'none';

    addReviewQuestions(block, questionsMeta, questionsWrapper, state);

    if (block.nav) {
      block.nav.currentIndex = 0;
      block.updateNavigation?.();
    }

    const firstLink = block.querySelector('.review-questions .question-link');
    if (firstLink) firstLink.classList.add('selected');

    const firstQuestion = questionsWrapper.querySelector(':scope > div');
    if (firstQuestion) firstQuestion.scrollIntoView({ behavior: 'smooth' });
  });
}

async function renderActivity(block, questionsMeta, questionsWrapper, progressBar, navigation) {
  if (block.querySelector('.congratulation-container')) return;

  if (questionsWrapper) questionsWrapper.style.display = 'none';
  if (navigation) navigation.style.display = 'none';
  if (progressBar) progressBar.style.display = 'none';

  const [congratsLabel, completedLabel, reviewLabel, continueLabel] = await Promise.all([
    i18n('Great Job!'),
    i18n('You have completed this activity'),
    i18n('Review your Answers'),
    i18n('Continue Lesson'),
  ]);

  const congratulationContainer = div(
    { class: 'congratulation-container' },
    h3({}, congratsLabel),
    h4({}, completedLabel),
    div(
      { class: 'badge-img-container' },
      img({ src: '/content/dam/cmegroup/quiz/Success-badge.svg', alt: 'Success Badge' }),
    ),
    p(
      {},
      `${continueLabel} `,
      a({ role: 'button', tabindex: '0', class: 'review-answers' }, reviewLabel),
    ),
  );

  block.insertBefore(congratulationContainer, block.firstChild);
  block.classList.add('complete');

  const questions = block.querySelectorAll('.options-wrapper');
  questions.forEach((question, index) => {
    question.parentElement?.classList.add('answered-correctly');
    const answers = question.querySelectorAll('.option-item');
    answers.forEach((answer, answerIndex) => {
      const { correct } = questionsMeta[index].answers[answerIndex];
      const contentAnswer = answer.querySelector('.option-content-answer');
      contentAnswer.classList.add('pressed', correct ? 'correct' : 'disabled');
    });
  });

  const reviewBtn = congratulationContainer.querySelector('.review-answers');
  reviewBtn.addEventListener('click', () => {
    congratulationContainer.remove();
    if (!questionsWrapper) return;

    questionsWrapper.style.display = '';
    if (navigation) navigation.style.display = '';
    if (progressBar) progressBar.style.display = 'none';

    const fakeState = {
      answers: questionsMeta.map((q) => q.answers.findIndex((ans) => ans.correct)),
    };
    addReviewQuestions(block, questionsMeta, questionsWrapper, fakeState);

    if (block.nav) {
      block.nav.currentIndex = 0;
      block.updateNavigation?.();
    }

    const firstLink = block.querySelector('.review-questions .question-link');
    if (firstLink) firstLink.classList.add('selected');

    const firstQuestion = questionsWrapper.querySelector(':scope > div');
    if (firstQuestion) firstQuestion.scrollIntoView({ behavior: 'smooth' });
  });
}

export async function markQuizCompletedAdvanced(block, questionsMeta, type, state) {
  const questionsWrapper = block.querySelector('.questions-wrapper');
  const progressBar = block.querySelector('.progress-bar');
  const navigation = block.querySelector('.quiz-navigation');

  if (type === 'activity') {
    await renderActivity(block, questionsMeta, questionsWrapper, progressBar, navigation);
  } else if (type === 'test') {
    await renderTestResult(block, questionsMeta, state, questionsWrapper, progressBar, navigation);
  }
}

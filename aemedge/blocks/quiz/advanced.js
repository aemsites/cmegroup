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
  if (reviewContainer) reviewContainer.remove();

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

function addResultsButton(
  block,
  questionsWrapper,
  progressBar,
  navigation,
  questionsMeta,
  state,
  type,
) {
  if (!navigation) return;

  if (type === 'test' && !block.classList.contains('in-review')) {
    return;
  }

  const existingReview = block.querySelector('.review-questions');
  if (existingReview) existingReview.remove();

  const existingResultsLink = block.querySelector('.results-link');
  if (existingResultsLink) existingResultsLink.remove();

  i18n('Exit to Results').then((exitToResultsLabel) => {
    const resultsLinkWrapper = p(
      { class: 'results-link' },
      a(
        { role: 'button', tabindex: '0', class: 'results' },
        `${exitToResultsLabel} `,
        span({ class: 'icon icon-positive' }),
      ),
    );
    navigation.insertAdjacentElement('afterend', resultsLinkWrapper);

    const resultsBtn = resultsLinkWrapper.querySelector('.results');
    resultsBtn.addEventListener('click', () => {
      resultsLinkWrapper.remove();
      if (questionsWrapper) questionsWrapper.style.display = 'none';
      if (navigation) navigation.style.display = 'none';
      if (progressBar) progressBar.style.display = 'none';

      block.classList.remove('in-review');
      block.classList.add('in-test-results');

      if (type === 'activity') {
        renderActivity(block, questionsMeta, questionsWrapper, progressBar, navigation);
      } else if (type === 'test') {
        renderTestResult(block, questionsMeta, state, questionsWrapper, progressBar, navigation);
      }
    });
  });
}

async function renderTestResult(
  block,
  questionsMeta,
  state,
  questionsWrapper,
  progressBar,
  navigation,
) {
  block.classList.add('in-test-results');
  block.classList.remove('in-review');

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

  const progressWrapper = div({ class: `progress-bar-wrapper ${passed ? 'passed' : 'failed'}` });

  const progressImg = img({
    src: passed
      ? '/aemedge/icons/progress-circular-passed.svg'
      : '/aemedge/icons/progress-circular-failed.svg',
    alt: 'Progress',
    class: 'progress-circular',
  });

  const percentageText = span({ class: 'progress-text' }, `${percentage}%`);

  progressWrapper.appendChild(progressImg);
  progressWrapper.appendChild(percentageText);

  const container = div(
    { class: 'test-results-container' },
    h3({}, passed ? congratsLabel : oopsLabel),
    h4({}, passed ? passedMsg : failedMsg),
    progressWrapper,
    p({ class: 'results pt-4' }, passed
      ? `You answered ${correctCount} out of ${total} questions correctly`
      : `You answered ${total - correctCount} out of ${total} questions incorrectly`),
    button({ type: 'button', class: 'primary btn btn-' }, span({ class: 'text' }, nextLessonLabel)),
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
  reviewLink.addEventListener('click', async () => {
    container.remove();
    block.classList.remove('in-test-results');
    block.classList.add('in-review');

    if (!questionsWrapper) return;

    questionsWrapper.style.display = '';
    block.classList.add('is-review');
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

    await addResultsButton(block, questionsWrapper, progressBar, navigation, questionsMeta, state, 'test');
  });
}

async function renderActivity(block, questionsMeta, questionsWrapper, progressBar, navigation) {
  if (block.querySelector('.congratulation-container')) return;

  if (questionsWrapper) questionsWrapper.style.display = 'none';
  if (navigation) navigation.style.display = 'none';
  if (progressBar) progressBar.style.display = 'none';

  const [
    congratsLabel,
    completedLabel,
    reviewLabel,
    continueLabel,
    clickHereLabel,
    orLabel,
  ] = await Promise.all([
    i18n('Great Job!'),
    i18n('You have completed this activity'),
    i18n('Review your Answers'),
    i18n('Continue Lesson'),
    i18n('Click here to'),
    i18n('or'),
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
      `${clickHereLabel} `,
      a({ role: 'button', tabindex: '0', class: 'review-answers' }, reviewLabel),
      ` ${orLabel} ${continueLabel}`,
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
  reviewBtn.addEventListener('click', async () => {
    congratulationContainer.remove();
    if (!questionsWrapper) return;

    questionsWrapper.style.display = '';
    block.classList.add('is-review');
    if (navigation) navigation.style.display = '';
    if (progressBar) progressBar.style.display = 'none';

    const questionsOptions = questionsWrapper.querySelectorAll('.options-wrapper');
    questionsOptions.forEach((question, index) => {
      question.parentElement?.classList.add('answered-correctly');

      const answers = question.querySelectorAll('.option-item');
      answers.forEach((answer, answerIndex) => {
        const contentAnswer = answer.querySelector('.option-content-answer');
        contentAnswer.classList.remove('pressed', 'correct', 'disabled', 'incorrect');

        const { correct } = questionsMeta[index].answers[answerIndex];
        if (correct) {
          contentAnswer.classList.add('pressed', 'correct');
        }
      });
    });

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

    await addResultsButton(block, questionsWrapper, progressBar, navigation, questionsMeta, fakeState, 'activity');
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

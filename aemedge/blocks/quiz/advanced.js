import {
  div, p, span, a, h3, h4, img, button,
} from '../../scripts/dom-helpers.js';
import { store } from '../../scripts/store/store.js';
import { quizRedo, quizAnswered } from '../../scripts/actions/quiz.js';
import { i18n } from '../../scripts/utils.js';

export function updateAdvancedNextDisabled(type, wrapper, currentIndex, questions, state, next) {
  let disable = false;

  if (type === 'activity') {
    const currentQuestion = wrapper.querySelectorAll(':scope > div')[currentIndex];
    const isAnsweredCorrectly = currentQuestion.classList.contains('answered-correctly');
    disable = !isAnsweredCorrectly && currentIndex < questions.length - 1;
  } else if (type === 'test') {
    const question = questions[currentIndex];
    const questionId = question?.uniqueId;

    const questionEntry = state?.questions?.find(
      (q) => q.questionElementId === questionId,
    );
    const isAnswered = !!(questionEntry && questionEntry.answers.length > 0);

    disable = !isAnswered && currentIndex < questions.length - 1;
  }

  next.disabled = disable;
  next.classList.toggle('arrow-disabled', disable || currentIndex === questions.length - 1);
}

function addResultsButton(
  block,
  questionsWrapper,
  progressBar,
  navigation,
  testPercentage,
  questionsMeta,
  state,
  type,
  showIndicatorsViaReviewMode,
  redoQuizLabel,
) {
  if (!navigation) return;

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
      const existingReview = block.querySelector('.review-questions');
      if (existingReview) existingReview.remove();
      resultsLinkWrapper.remove();
      if (questionsWrapper) questionsWrapper.style.display = 'none';
      if (navigation) navigation.style.display = 'none';
      if (progressBar) progressBar.style.display = 'none';

      const isReviewMode = block.classList.contains('is-review') || block.classList.contains('in-review');
      block.classList.remove('in-review', 'is-review');
      block.classList.add(type === 'activity' ? 'in-activity-results' : 'in-test-results');

      if (type === 'activity') {
        renderActivity(
          block,
          questionsMeta,
          questionsWrapper,
          progressBar,
          navigation,
          showIndicatorsViaReviewMode,
        );
      } else if (type === 'test') {
        renderTestResult(
          block,
          questionsMeta,
          state,
          questionsWrapper,
          progressBar,
          navigation,
          testPercentage,
          showIndicatorsViaReviewMode,
          redoQuizLabel,
          isReviewMode,
        );
      }
    });
  });
}

function addReviewQuestions(
  block,
  questionsMeta,
  questionsWrapper,
  state,
  showIndicatorsViaReviewMode,
) {
  let reviewContainer = block.querySelector('.review-questions');
  if (reviewContainer) reviewContainer.remove();

  reviewContainer = div({ class: 'review-questions' });

  const isTestMode = !!state.questions?.length;
  const answeredQuestions = isTestMode
    ? state.questions
    : state.answers || [];

  questionsMeta.forEach((question, idx) => {
    let isCorrect = false;
    let selectedIndexes = [];

    if (isTestMode) {
      const questionEntry = answeredQuestions.find(
        (ques) => ques.questionElementId === question.uniqueId,
      );
      const selectedIds = questionEntry?.answers?.map((ans) => ans.answerElementId) || [];

      selectedIndexes = question.answers
        .map((ans, index) => (selectedIds.includes(ans.uniqueId) ? index : null))
        .filter((index) => index !== null);

      isCorrect = questionEntry?.isCorrect === true;
    } else {
      selectedIndexes = answeredQuestions[idx] || [];
      isCorrect = question.answers
        .every((ans, index) => ans.correct === selectedIndexes.includes(index));
    }

    const isSelected = block.nav && block.nav.currentIndex === idx;

    const questionLink = a(
      {
        role: 'button',
        tabindex: '0',
        'data-index': idx,
        class: `question-link ${isCorrect ? 'correct' : 'incorrect'}${isSelected ? ' selected' : ''}`,
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

      const questionDiv = questionsWrapper.querySelectorAll(':scope > div')[idx];
      if (!questionDiv) return;

      questionDiv.querySelectorAll('.question-message').forEach((msg) => {
        msg.innerHTML = '';
        msg.classList.remove('showed', 'correct', 'incorrect');
      });

      const optionItems = questionDiv.querySelectorAll('.option-item');
      optionItems.forEach((optionItem, oIdx) => {
        const btn = optionItem.querySelector('.option-content-answer');
        const answer = question.answers[oIdx];

        btn.classList.remove('pressed', 'correct', 'incorrect');

        if (selectedIndexes.includes(oIdx)) {
          btn.classList.add('pressed');
        }

        if (selectedIndexes.includes(oIdx) || showIndicatorsViaReviewMode === 'true') {
          btn.classList.add(answer.correct ? 'correct' : 'incorrect');
        }
      });
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
  testPercentage,
  showIndicatorsViaReviewMode,
  redoQuizLabel,
  isReviewMode,
) {
  block.classList.add('in-test-results');
  block.classList.remove('in-review');

  const answeredQuestions = state?.questions || [];

  const correctCount = answeredQuestions.filter((question) => question.isCorrect === true).length;
  const total = questionsMeta.length;
  const percentage = Math.round((correctCount / total) * 100);
  const passed = percentage >= testPercentage;
  state.status = passed ? 'COMPLETED' : 'PROGRESS';
  state.result = percentage;
  if (!isReviewMode) {
    checkQuizAdvancedCompletion('test', state, false, passed);
  }

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
    i18n('Redo Test'),
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
        linksPara.appendChild(a({ role: 'button', tabindex: '0', class: 'redo-quiz' }, redoQuizLabel || redoLabel));
      }
      return linksPara;
    })(),
  );

  block.insertBefore(container, block.firstChild);
  block.classList.add('complete');

  if (questionsWrapper) questionsWrapper.style.display = 'none';
  if (navigation) navigation.style.display = 'none';
  if (progressBar) progressBar.style.display = 'none';

  const redoLink = container.querySelector('.redo-quiz');
  if (redoLink) {
    redoLink?.addEventListener('click', async () => {
      //  quiz redo event
      store.dispatch(quizRedo(true));
    });
  }
  store.dispatch(quizRedo(false));

  const reviewLink = container.querySelector('.review-answers');
  reviewLink.addEventListener('click', async () => {
    const existingReview = block.querySelector('.review-questions');
    if (existingReview) existingReview.remove();
    container.remove();
    block.classList.remove('in-test-results');
    block.classList.add('in-review');

    if (!questionsWrapper) return;

    questionsWrapper.style.display = '';
    block.classList.add('is-review');
    if (navigation) navigation.style.display = '';
    if (progressBar) progressBar.style.display = 'none';

    questionsWrapper.querySelectorAll(':scope > div').forEach((questionDiv, qIndex) => {
      const questionMeta = questionsMeta[qIndex];
      const questionEntry = answeredQuestions
        .find((question) => question.questionElementId === questionMeta.uniqueId);
      const selectedIds = questionEntry?.answers?.map((answer) => answer.answerElementId) || [];

      questionDiv.querySelectorAll('.option-item').forEach((optionItem, oIndex) => {
        const btn = optionItem.querySelector('.option-content-answer');
        const answer = questionMeta.answers[oIndex];

        btn.classList.remove('pressed', 'correct', 'incorrect', 'disabled');
        btn.removeAttribute('disabled');

        if (selectedIds.includes(answer.uniqueId)) {
          btn.classList.add('pressed');
        }

        if (selectedIds.includes(answer.uniqueId) || showIndicatorsViaReviewMode === 'true') {
          btn.classList.add(answer.correct ? 'correct' : 'incorrect');
        }

        btn.classList.add('disabled');
        btn.setAttribute('disabled', 'true');
      });

      const isCorrect = questionEntry?.isCorrect === true;
      if (!isCorrect && questionMeta.questionSnippet) {
        if (!questionDiv.querySelector('.question-snippet')) {
          const snippetDiv = div(
            { class: 'question-snippet' },
            span({ class: 'option-icon' }),
            span({ class: 'option-text' }, questionMeta.questionSnippet),
          );

          const selectInstruction = questionDiv.querySelector('.select-instruction');
          if (selectInstruction) {
            selectInstruction.insertAdjacentElement('afterend', snippetDiv);
          } else {
            const optionsWrapper = questionDiv.querySelector('.options-wrapper');
            if (optionsWrapper) {
              optionsWrapper.insertBefore(snippetDiv, optionsWrapper.firstChild);
            } else {
              questionDiv.appendChild(snippetDiv);
            }
          }
        }
      }
    });

    addReviewQuestions(block, questionsMeta, questionsWrapper, state, showIndicatorsViaReviewMode);

    if (block.nav) {
      block.nav.currentIndex = 0;
      block.updateNavigation?.();
    }

    const firstLink = block.querySelector('.review-questions .question-link');
    if (firstLink) firstLink.classList.add('selected');

    await addResultsButton(
      block,
      questionsWrapper,
      progressBar,
      navigation,
      testPercentage,
      questionsMeta,
      state,
      'test',
      showIndicatorsViaReviewMode,
      redoQuizLabel,
    );
  });
}

async function renderActivity(
  block,
  questionsMeta,
  questionsWrapper,
  progressBar,
  navigation,
  showIndicatorsViaReviewMode,
) {
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

    questionsWrapper.querySelectorAll('.questions-wrapper > div').forEach((question, index) => {
      question.querySelectorAll('.question-message, .snippet, .results').forEach((msg) => {
        msg.innerHTML = '';
        msg.classList.remove('showed', 'correct', 'incorrect', 'disabled');
      });
      question.querySelectorAll('.option-content-answer').forEach((answer, answerIndex) => {
        answer.classList.remove('pressed', 'correct', 'incorrect', 'disabled');
        const { correct } = questionsMeta[index].answers[answerIndex];
        if (correct) {
          answer.classList.add('pressed', 'correct');
        } else if (showIndicatorsViaReviewMode === 'true') {
          answer.classList.add('incorrect');
        }
      });
    });

    const fakeState = {
      answers: questionsMeta.map((question) => {
        const selectedIndexes = [];

        question.answers.forEach((ans, index) => {
          if (ans.correct) {
            selectedIndexes.push(index);
          }
        });

        return selectedIndexes;
      }),
    };

    addReviewQuestions(
      block,
      questionsMeta,
      questionsWrapper,
      fakeState,
      showIndicatorsViaReviewMode,
    );

    if (block.nav) {
      block.nav.currentIndex = 0;
      block.updateNavigation?.();
    }

    const firstLink = block.querySelector('.review-questions .question-link');
    if (firstLink) firstLink.classList.add('selected');

    await addResultsButton(block, questionsWrapper, progressBar, navigation, null, questionsMeta, fakeState, 'activity', showIndicatorsViaReviewMode);
  });
}

export function randomOrder(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function handleTestClick({
  questionDiv, optionButton, index, state, questionIndex, block, questions, multiCorrect,
}) {
  const question = questions[questionIndex];
  const answer = question.answers[index];
  const questionId = question.uniqueId;
  const answerId = answer.uniqueId;

  if (!state.questions) {
    state.type = 'TEST';
    state.status = 'PROGRESS';
    state.questions = [];
  }

  let questionEntry = state.questions
    .find((ques) => ques.questionElementId === questionId);
  if (!questionEntry) {
    questionEntry = {
      questionElementId: questionId,
      isCorrect: false,
      answers: [],
    };
    state.questions.push(questionEntry);
  }

  if (multiCorrect) {
    const answerAlreadySelected = questionEntry.answers
      .some((ans) => ans.answerElementId === answerId);

    if (answerAlreadySelected) {
      questionEntry.answers = questionEntry.answers
        .filter((ans) => ans.answerElementId !== answerId);
      optionButton.classList.remove('pressed');
    } else {
      questionEntry.answers.push({
        answerElementId: answerId,
        isCorrect: answer.correct,
      });
      optionButton.classList.add('pressed');
    }
  } else {
    const allButtons = questionDiv.querySelectorAll('.option-content-answer');
    allButtons.forEach((btn) => btn.classList.remove('pressed'));

    questionEntry.answers = [
      {
        answerElementId: answerId,
        isCorrect: answer.correct,
      },
    ];
    optionButton.classList.add('pressed');
  }

  const selectedIds = questionEntry.answers.map((ans) => ans.answerElementId);
  const correctIds = question.answers.filter((ans) => ans.correct).map((ans) => ans.uniqueId);

  questionEntry.isCorrect = selectedIds.length === correctIds.length
    && selectedIds.every((id) => correctIds.includes(id));

  questionDiv.classList.add('answered');

  const navNext = block.querySelector('.arrow-next');
  if (navNext) {
    const questionsWrapper = block.querySelector('.questions-wrapper');
    const currentIndex = [...questionsWrapper.children].indexOf(questionDiv);
    updateAdvancedNextDisabled('test', questionsWrapper, currentIndex, questions, state, navNext);
  }

  if (block.updateNavigation) block.updateNavigation();
}

export async function handleActivityClick({
  questionDiv,
  optionButton,
  correct,
  snippet,
  question,
  messageContainer,
  block,
  questions,
  state,
}) {
  if (questionDiv.classList.contains('answered-correctly')) return;

  state.status = 'COMPLETED';
  if (state.type !== 'ACTIVITY') {
    state.type = 'ACTIVITY';
    state.questions = [];
  }

  let questionEntry = state.questions.find(
    (ques) => ques.questionElementId === question.uniqueId,
  );
  if (!questionEntry) {
    questionEntry = {
      questionElementId: question.uniqueId,
      answers: [],
      isCorrect: false,
    };
    state.questions.push(questionEntry);
  }

  const index = parseInt(optionButton.getAttribute('data-index'), 10);
  const selectedAnswer = question.answers[index];
  const alreadySelected = questionEntry.answers.some(
    (ans) => ans.answerElementId === selectedAnswer.uniqueId,
  );

  if (!alreadySelected) {
    questionEntry.answers.push({
      answerElementId: selectedAnswer.uniqueId,
      isCorrect: !!selectedAnswer.correct,
    });
  }

  const allMessages = questionDiv.querySelectorAll('.question-message');
  allMessages.forEach((msg) => msg.classList.remove('correct', 'incorrect', 'showed'));
  optionButton.classList.add('pressed');

  if (correct) {
    const [correctLabel] = await Promise.all([i18n('Correct')]);
    optionButton.classList.add('correct');
    messageContainer.classList.add('correct', 'showed');
    messageContainer.innerHTML = '';
    messageContainer.appendChild(span({ class: 'result' }, correctLabel));
    messageContainer.appendChild(span({ class: 'snippet' }, snippet));

    const correctAnswers = question.answers
      .map((ans, ind) => (ans.correct ? ind : null))
      .filter((ind) => ind !== null);
    const pressed = [...questionDiv.querySelectorAll('.option-content-answer.correct.pressed')]
      .map((btn) => parseInt(btn.getAttribute('data-index'), 10));

    const allCorrect = correctAnswers.every((i) => pressed.includes(i));

    questionEntry.isCorrect = allCorrect;
    if (allCorrect) {
      questionDiv.classList.add('answered-correctly');
    }
  } else {
    const [incorrectLabel] = await Promise.all([i18n('Incorrect')]);
    optionButton.classList.add('incorrect');
    messageContainer.classList.add('incorrect', 'showed');
    messageContainer.innerHTML = '';
    messageContainer.appendChild(span({ class: 'result' }, incorrectLabel));
    messageContainer.appendChild(span({ class: 'snippet' }, snippet));
    questionEntry.isCorrect = false;
  }

  questionDiv.classList.add('answered');

  const navNext = block.querySelector('.arrow-next');
  if (navNext) {
    const questionsWrapper = block.querySelector('.questions-wrapper');
    const currentIndex = [...questionsWrapper.children].indexOf(questionDiv);
    updateAdvancedNextDisabled('activity', questionsWrapper, currentIndex, questions, state, navNext);
  }
  if (block.updateNavigation) block.updateNavigation();
}

export function createProgressBar() {
  const progressBar = div(
    { class: 'progress-bar linear' },
    div({ class: 'progress', style: 'width: 0%;' }),
  );
  return progressBar;
}

export function createSelectInstruction(title) {
  return h4({ class: 'select-instruction' }, title);
}

export function updateAdvancedNav(nav, wrapper, questions, type, state) {
  const lastSlider = nav.currentIndex === questions.length - 1;

  nav.next.style.display = lastSlider ? 'none' : 'flex';
  if (nav.finish) nav.finish.style.display = lastSlider ? 'block' : 'none';

  if (type === 'activity') {
    const currentQuestion = wrapper.querySelectorAll(':scope > div')[nav.currentIndex];
    const answeredCorrectly = currentQuestion.classList.contains('answered-correctly');
    if (lastSlider && nav.finish) {
      nav.finish.disabled = !answeredCorrectly;
      nav.finish.classList.toggle('arrow-disabled', !answeredCorrectly);
    }
  } else if (type === 'test') {
    const question = questions[nav.currentIndex];
    const questionId = question?.uniqueId;

    const questionEntry = state?.questions?.find(
      (ques) => ques.questionElementId === questionId,
    );

    const isAnswered = !!(questionEntry && questionEntry.answers.length > 0);

    if (lastSlider && nav.finish) {
      nav.finish.disabled = !isAnswered;
      nav.finish.classList.toggle('arrow-disabled', !isAnswered);
    }
  } else if (nav.finish) {
    nav.finish.disabled = false;
    nav.finish.classList.remove('arrow-disabled');
  }

  if (!lastSlider) {
    updateAdvancedNextDisabled(type, wrapper, nav.currentIndex, questions, state, nav.next);
  }
}

export function attachFinishClick(
  nav,
  block,
  questionsMeta,
  type,
  state,
  completeMessage,
  testPercentage,
  showIndicatorsViaReviewMode,
  redoQuizLabel,
) {
  nav.finish.addEventListener('click', async () => {
    if (!nav.finish.disabled) {
      const reviewContainer = block.querySelector('.review-questions');
      if (reviewContainer) reviewContainer.remove();

      const resultsLink = block.querySelector('.results-link');
      if (resultsLink) resultsLink.remove();

      block.classList.remove('is-review');

      const isReviewMode = block.classList.contains('is-review') || block.classList.contains('in-review');

      await markQuizCompletedAdvanced(
        block,
        questionsMeta,
        type,
        state,
        testPercentage,
        showIndicatorsViaReviewMode,
        redoQuizLabel,
        isReviewMode,
      );
    }
  });
}

export async function checkQuizAdvancedCompletion(
  type,
  state,
  doNotMarkLessonAsCompleted,
  passed = false,
) {
  //  quiz completion event
  store.dispatch(quizAnswered({ ...state, isCorrect: (type === 'test' ? passed && !doNotMarkLessonAsCompleted : true), type: type.toUpperCase() }));
}

async function markQuizCompletedAdvanced(
  block,
  questionsMeta,
  type,
  state,
  testPercentage,
  showIndicatorsViaReviewMode,
  redoQuizLabel,
) {
  const questionsWrapper = block.querySelector('.questions-wrapper');
  const progressBar = block.querySelector('.progress-bar');
  const navigation = block.querySelector('.quiz-navigation');

  const isReviewMode = block.classList.contains('is-review') || block.classList.contains('in-review');

  if (type === 'activity') {
    // checkQuizCompletion
    if (!isReviewMode) {
      checkQuizAdvancedCompletion(type, state, false);
    }
    await renderActivity(
      block,
      questionsMeta,
      questionsWrapper,
      progressBar,
      navigation,
      showIndicatorsViaReviewMode,
    );
  } else if (type === 'test') {
    await renderTestResult(
      block,
      questionsMeta,
      state,
      questionsWrapper,
      progressBar,
      navigation,
      testPercentage,
      showIndicatorsViaReviewMode,
      redoQuizLabel,
      isReviewMode,
    );
  }
}

import { i18n, readBlockConfig } from '../../scripts/utils.js';
import { store } from '../../scripts/store/store.js';
import { quizAnswered } from '../../scripts/actions/quiz.js';
import {
  updateAdvancedNextDisabled,
  markQuizCompletedAdvanced,
  randomOrder,
  handleTestClick,
  handleActivityClick,
  createProgressBar,
  updateAdvancedNav,
  attachFinishClick,
} from './advanced.js';
import {
  div,
  p,
  span,
  button,
  i as iEl,
} from '../../scripts/dom-helpers.js';

const testState = { answers: {} };

async function checkQuizCompletion(block, questions, doNotMarkLessonAsCompleted) {
  const answeredCorrectlyEls = block.querySelectorAll('.answered-correctly');
  const allAnsweredCorrectly = answeredCorrectlyEls.length === questions.length;
  if (allAnsweredCorrectly && !block.querySelector('.message') && doNotMarkLessonAsCompleted !== 'true') {
    //  quiz completion event
    store.dispatch(quizAnswered(true));
  }
}

function buildQuestions(rows) {
  const questions = [];
  let currentQuestion = null;

  rows.forEach((row) => {
    const firstChild = row.children[0];
    const hasQuestion = firstChild && firstChild.querySelector('p');
    const answerText = row.children[1]?.textContent.trim() || '';
    const correctText = row.children[2]?.textContent.trim() || '';
    const snippetText = row.children[3]?.textContent.trim() || '';

    if (hasQuestion) {
      currentQuestion = { question: firstChild.textContent.trim(), answers: [] };
      questions.push(currentQuestion);
    }

    if (currentQuestion) {
      currentQuestion.answers.push({
        answer: answerText,
        correct: correctText === 'true',
        snippet: snippetText,
      });
    }
  });

  return questions;
}

function renderQuestions(questions, block, doNotMarkLessonAsCompleted, type, state) {
  if (type !== 'traditional') {
    const progressBar = createProgressBar();
    block.appendChild(progressBar);
  }

  const wrapper = div({ class: `questions-wrapper ${type}` });

  questions.forEach((q, questionIndex) => {
    const optionsWrapper = div({ class: 'options-wrapper' });
    const questionDiv = div(
      {},
      p({ class: 'question-text' }, q.question),
      optionsWrapper,
    );

    const multiCorrect = q.answers.filter((ans) => ans.correct).length > 1;
    if (multiCorrect) questionDiv.classList.add('multi-correct');

    q.answers.forEach(({ answer, correct, snippet }, index) => {
      const messageContainer = span({ class: 'question-message' });

      const optionButton = button(
        { type: 'button', class: 'option-content-answer', 'data-index': index },
        span({ class: 'option-text' }, answer),
        span({ class: 'option-icon' }),
      );

      const optionItem = div(
        { class: 'option-item' },
        div({ class: 'option-content' }, optionButton),
        messageContainer,
      );

      optionButton.addEventListener('click', async () => {
        if (type === 'test') {
          return handleTestClick({
            questionDiv, optionButton, index, state, questionIndex, block, questions, multiCorrect,
          });
        }

        if (type === 'activity') {
          return handleActivityClick({
            questionDiv,
            optionButton,
            correct,
            snippet,
            q,
            messageContainer,
            block,
            questions,
            state,
          });
        }

        if (questionDiv.classList.contains('answered-correctly')) return undefined;

        const allButtons = questionDiv.querySelectorAll('.option-content-answer');
        const allMessages = questionDiv.querySelectorAll('.question-message');
        allMessages.forEach((msg) => msg.classList.remove('correct', 'incorrect', 'showed'));
        allButtons.forEach((btn) => btn.classList.remove('pressed', 'incorrect', 'correct'));
        optionButton.classList.add('pressed');

        if (correct) {
          const [correctLabel] = await Promise.all([i18n('Correct')]);
          optionButton.classList.add('correct');
          questionDiv.classList.add('answered-correctly');
          messageContainer.classList.add('correct', 'showed');
          messageContainer.innerHTML = '';
          messageContainer.appendChild(span({ class: 'result' }, correctLabel));
          messageContainer.appendChild(span({ class: 'snippet' }, snippet));

          if (type === 'traditional') checkQuizCompletion(block, questions, doNotMarkLessonAsCompleted);

          const navNext = block.querySelector('.arrow-next');
          if (navNext) {
            const questionsWrapper = block.querySelector('.questions-wrapper');
            const currentIndex = [...questionsWrapper.children].indexOf(questionDiv);
            updateAdvancedNextDisabled(
              type,
              questionsWrapper,
              currentIndex,
              questions,
              state,
              navNext,
            );
          }
          if (block.updateNavigation) block.updateNavigation();
        } else {
          const [incorrectLabel] = await Promise.all([i18n('Incorrect')]);
          optionButton.classList.add('incorrect');
          messageContainer.classList.add('incorrect', 'showed');
          messageContainer.innerHTML = '';
          messageContainer.appendChild(span({ class: 'result' }, incorrectLabel));
          messageContainer.appendChild(span({ class: 'snippet' }, snippet));
        }

        return undefined;
      });

      optionsWrapper.appendChild(optionItem);
    });

    wrapper.appendChild(questionDiv);
  });

  block.appendChild(wrapper);
  return wrapper;
}

function showQuestion(index, wrapper, prev, next, pag, total) {
  wrapper.style.transform = `translateX(-${index * 100}%)`;
  if (pag) pag.textContent = `${index + 1} OF ${total}`;
  const progress = wrapper.parentElement.querySelector('.progress-bar .progress');
  if (progress) {
    const percent = ((index + 1) / total) * 100;
    progress.style.width = `${percent}%`;
  }
}

async function addNavigation(
  questions,
  block,
  wrapper,
  type,
  completeMessage,
  testPercentage,
  showIndicatorsViaReviewMode,
) {
  const [finishLabel] = await Promise.all([i18n('Finish')]);
  const prev = button(
    { type: 'button', class: 'arrow arrow-prev' },
    type !== 'traditional' ? 'Prev' : '',
  );
  const next = button(
    { type: 'button', class: 'arrow arrow-next' },
    type !== 'traditional' ? 'Next' : '',
  );
  let finish = null;
  if (type !== 'traditional') finish = button({ type: 'button', class: 'arrow arrow-finish', style: 'display: none;' }, finishLabel);

  const nav = {
    prev, next, finish, pag: null, currentIndex: 0,
  };
  block.nav = nav;

  const pag = span({ class: 'custom-paging-counter' });
  nav.pag = pag;

  block.updateNavigation = function updateNavigation() {
    const lastSlider = nav.currentIndex === questions.length - 1;
    if (type === 'traditional') {
      prev.style.display = 'block';
      next.style.display = 'block';
      updateAdvancedNextDisabled(type, wrapper, nav.currentIndex, questions, testState, next);
      if (lastSlider) { next.disabled = true; next.classList.add('arrow-disabled'); }
    } else {
      updateAdvancedNav(nav, wrapper, questions, type, testState);
    }
    if (type !== 'traditional') {
      if (nav.currentIndex === 0) {
        nav.prev.style.display = 'none';
      } else {
        nav.prev.style.display = 'flex';
      }
    }
    nav.prev.classList.toggle('arrow-disabled', nav.currentIndex === 0);
    if (pag) pag.textContent = `${nav.currentIndex + 1} / ${questions.length}`;
    showQuestion(nav.currentIndex, wrapper, nav.prev, nav.next, pag, questions.length);
    const reviewContainer = block.querySelector('.review-questions');
    if (reviewContainer) {
      reviewContainer.querySelectorAll('.question-link').forEach((l) => l.classList.remove('selected'));
      const link = reviewContainer.querySelector(`.question-link[data-index="${nav.currentIndex}"]`);
      if (link) link.classList.add('selected');
    }
  };

  prev.addEventListener('click', () => { if (nav.currentIndex > 0) { nav.currentIndex -= 1; block.updateNavigation(); } });
  next.addEventListener('click', () => { if (nav.currentIndex < questions.length - 1) { nav.currentIndex += 1; block.updateNavigation(); } });
  if (finish) {
    attachFinishClick(
      nav,
      block,
      questions,
      type,
      completeMessage,
      testPercentage,
      showIndicatorsViaReviewMode,
      markQuizCompleted,
    );
  }

  const navContainer = div(
    { class: 'quiz-navigation' },
    ...(finish ? [prev, pag, next, finish] : [prev, pag, next]),
  );

  block.appendChild(navContainer);
  block.updateNavigation();
}

async function markQuizCompleted(
  block,
  questionsMeta,
  type,
  completeMessage,
  testPercentage,
  showIndicatorsViaReviewMode,
) {
  if (type === 'activity' || type === 'test') {
    await markQuizCompletedAdvanced(
      block,
      questionsMeta,
      type,
      testState,
      testPercentage,
      showIndicatorsViaReviewMode,
    );
    return;
  }

  const [quizLabel] = await Promise.all([i18n('Lesson complete')]);
  if (block.querySelector('.message')) return;

  const completionMessage = div(
    { class: 'message' },
    div({ class: 'message-label' }, iEl({ class: 'icon' })),
    div({ class: 'message-text' }, completeMessage || quizLabel),
  );
  block.insertBefore(completionMessage, block.firstChild);
  block.classList.add('complete');

  if (block.querySelectorAll('.answered-correctly').length) return;
  //  classes for already completed quizzes
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
}

export default async function decorate(block) {
  const {
    doNotMarkLessonAsCompleted,
    completeMessage,
    testPercentage = 70,
    randomizeOrder = 'false',
    showIndicatorsViaReviewMode = 'false',
  } = readBlockConfig(block, true);
  let type = 'traditional';
  if (block.classList.contains('activity')) {
    type = 'activity';
  } else if (block.classList.contains('test')) {
    type = 'test';
  }

  const rows = Array.from(block.querySelectorAll(':scope > div'));
  let startIndex = 0;

  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].children[0]?.textContent?.trim() === 'Questions') {
      startIndex = i + 1;
      break;
    }
  }

  const questions = buildQuestions(rows.slice(startIndex));
  if (randomizeOrder === 'true' && type !== 'traditional') {
    questions.forEach((q) => {
      q.answers = randomOrder(q.answers);
    });
    randomOrder(questions);
  }
  block.innerHTML = '';
  const wrapper = renderQuestions(questions, block, doNotMarkLessonAsCompleted, type, testState);
  showQuestion(0, wrapper, null, null, null, questions.length);

  if (questions.length > 1) {
    await addNavigation(
      questions,
      block,
      wrapper,
      type,
      completeMessage,
      testPercentage,
      showIndicatorsViaReviewMode,
    );
  }

  block.classList.add('showed');

  //  quiz completion event subscriber
  store.subscribe(({ quiz }) => quiz, async ({ isCorrect }) => {
    if (isCorrect && type === 'traditional') markQuizCompleted(block, questions, type, completeMessage);
  });
}

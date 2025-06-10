import { createElement, i18n } from '../../scripts/utils.js';
import { store } from '../../scripts/store/store.js';
import { quizAnswered } from '../../scripts/actions/quiz.js';

async function checkQuizCompletion(block, questions) {
  const answeredCorrectlyEls = block.querySelectorAll('.answered-correctly');
  const allAnsweredCorrectly = answeredCorrectlyEls.length === questions.length;

  if (allAnsweredCorrectly && !block.querySelector('.message')) {
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
      currentQuestion = {
        question: firstChild.textContent.trim(),
        answers: [],
      };
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

function showQuestion(index, wrapper, prev, next, pag, total) {
  wrapper.style.transform = `translateX(-${index * 100}%)`;
  if (prev) prev.classList.toggle('arrow-disabled', index === 0);
  if (next) next.classList.toggle('arrow-disabled', index === total - 1);
  if (pag) pag.textContent = `${index + 1} OF ${total}`;
}

function renderQuestions(questions, block) {
  const wrapper = createElement('div', { class: 'questions-wrapper' });

  questions.forEach((q) => {
    const questionDiv = createElement('div');
    const questionText = createElement('p', { class: 'question-text' }, q.question);
    const optionsWrapper = createElement('div', { class: 'options-wrapper' });

    q.answers.forEach(({ answer, correct, snippet }, index) => {
      const optionButton = createElement(
        'button',
        {
          type: 'button',
          class: 'option-content-answer',
          'data-index': index,
        },
        createElement('span', { class: 'option-text' }, answer),
        createElement('span', { class: 'option-icon' }),
      );

      const messageContainer = createElement('span', {
        class: 'question-message',
      });

      const optionItem = createElement(
        'div',
        { class: 'option-item' },
        createElement('div', { class: 'option-content' }, optionButton),
        messageContainer,
      );

      optionButton.addEventListener('click', async () => {
        if (questionDiv.classList.contains('answered-correctly')) return;

        const allButtons = questionDiv.querySelectorAll('.option-content-answer');
        const allMessages = questionDiv.querySelectorAll('.question-message');

        allMessages.forEach((msg) => {
          msg.classList.remove('correct', 'incorrect', 'showed');
        });

        allButtons.forEach((btn) => btn.classList.remove('pressed', 'incorrect', 'correct'));
        optionButton.classList.add('pressed');

        if (correct) {
          const [correctLabel] = await Promise.all([i18n('Correct')]);
          optionButton.classList.add('correct');
          questionDiv.classList.add('answered-correctly');
          messageContainer.classList.add('correct');
          messageContainer.innerHTML = `<span class="result">${correctLabel}</span><span class="snippet"></span>`;
          const snippetEl = messageContainer.querySelector('.snippet');
          snippetEl.textContent = snippet;
          messageContainer.classList.add('showed');
          checkQuizCompletion(block, questions);
        } else {
          const [incorrectLabel] = await Promise.all([i18n('Incorrect')]);
          optionButton.classList.add('incorrect');
          messageContainer.classList.add('incorrect');
          messageContainer.innerHTML = `<span class="result">${incorrectLabel}</span><span class="snippet"></span>`;
          const snippetEl = messageContainer.querySelector('.snippet');
          snippetEl.textContent = snippet;
          messageContainer.classList.add('showed');
        }
      });

      optionsWrapper.appendChild(optionItem);
    });

    questionDiv.appendChild(questionText);
    questionDiv.appendChild(optionsWrapper);
    wrapper.appendChild(questionDiv);
  });

  block.appendChild(wrapper);
  return wrapper;
}

async function addNavigation(questions, block, wrapper) {
  const [ofLabel] = await Promise.all([i18n('OF')]);
  let currentIndex = 0;

  const prev = createElement('button', {
    type: 'button',
    class: 'arrow arrow-prev',
    style: 'display: block;',
  });

  const next = createElement('button', {
    type: 'button',
    class: 'arrow arrow-next',
    style: 'display: block;',
  });

  const pag = createElement('span', { class: 'custom-paging-counter' });
  pag.textContent = `1 ${ofLabel} ${questions.length}`;

  prev.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex -= 1;
      showQuestion(currentIndex, wrapper, prev, next, pag, questions.length);
    }
  });

  next.addEventListener('click', () => {
    if (currentIndex < questions.length - 1) {
      currentIndex += 1;
      showQuestion(currentIndex, wrapper, prev, next, pag, questions.length);
    }
  });

  const nav = createElement('div', { class: 'quiz-navigation' }, prev, pag, next);
  block.appendChild(nav);
}

async function markQuizCompleted(block, questionsMeta) {
  const [quizLabel] = await Promise.all([i18n('Lesson complete')]);
  const completionMessage = createElement(
    'div',
    { class: 'message' },
    createElement('div', { class: 'message-label' }, createElement('i', { class: 'icon' })),
    createElement('div', { class: 'message-text' }, quizLabel),
  );
  block.insertBefore(completionMessage, block.firstChild);
  block.classList.add('complete');

  if (block.querySelectorAll('.answered-correctly').length) return;
  //  classes for already completed quizzes
  const questions = block.querySelectorAll('.options-wrapper');
  questions.forEach((question, index) => {
    const answers = question.querySelectorAll('.option-item');
    answers.forEach((answer, answerIndex) => {
      const { correct } = questionsMeta[index].answers[answerIndex];
      const contentAnswer = answer.querySelector('.option-content-answer');
      contentAnswer.classList.add('pressed', correct ? 'correct' : 'disabled');
    });
  });
}

export default async function decorate(block) {
  const rows = Array.from(block.querySelectorAll(':scope > div'));
  const questions = buildQuestions(rows);

  block.innerHTML = '';
  const wrapper = renderQuestions(questions, block);

  if (questions.length > 1) {
    await addNavigation(questions, block, wrapper);
  }

  block.classList.add('showed');

  //  quiz completion event subscriber
  store.subscribe(({ quiz }) => quiz, async ({ isCorrect }) => {
    if (isCorrect) {
      markQuizCompleted(block, questions);
    }
  });
}

import { createElement, i18n } from '../../scripts/utils.js';

async function checkQuizCompletion(block, questions) {
  const answeredCorrectlyEls = block.querySelectorAll('.answered-correctly');
  const allAnsweredCorrectly = answeredCorrectlyEls.length === questions.length;

  if (allAnsweredCorrectly && !block.querySelector('.message')) {
    const [quizLabel] = await Promise.all([
      i18n('Quiz complete!'),
    ]);
    const completionMessage = createElement(
      'div',
      { class: 'message' },
      createElement(
        'div',
        { class: 'message-label' },
        createElement('i', { class: 'icon' }),
      ),
      createElement('div', { class: 'message-text' }, quizLabel),
    );
    block.insertBefore(completionMessage, block.firstChild);
    block.classList.add('complete');
  }
}

function showQuestion(index, questionsWrapper, prevButton, nextButton, pag, questionsLength) {
  questionsWrapper.style.transform = `translateX(-${index * 100}%)`;

  if (prevButton) {
    prevButton.classList.toggle('arrow-disabled', index === 0);
  }
  if (nextButton) {
    nextButton.classList.toggle('arrow-disabled', index === questionsLength - 1);
  }
  if (pag) {
    pag.textContent = `${index + 1} OF ${questionsLength}`;
  }
}

export default async function decorate(block) {
  const rows = Array.from(block.querySelectorAll(':scope > div'));

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

      currentQuestion.answers.push({
        answer: answerText,
        correct: correctText === 'true',
        snippet: snippetText,
      });
    } else if (currentQuestion) {
      currentQuestion.answers.push({
        answer: answerText,
        correct: correctText === 'true',
        snippet: snippetText,
      });
    }
  });

  let currentIndex = 0;

  let prevButton;
  let nextButton;
  let pag;

  const questionsWrapper = createElement('div', { class: 'questions-wrapper' });

  questions.forEach((q) => {
    const questionDiv = createElement('div');

    const questionText = createElement('p', { class: 'question-text' }, q.question);
    const optionsWrapper = createElement('div', { class: 'options-wrapper' });

    q.answers.forEach((answerObj, answerIndex) => {
      const { answer, correct: isCorrect, snippet } = answerObj;

      const optionButton = createElement(
        'button',
        {
          type: 'button',
          class: 'option-content-answer',
          'data-index': answerIndex,
        },
        createElement('span', { class: 'option-text' }, answer),
        createElement('span', { class: 'option-icon' }),
      );

      const messageContainer = createElement('span', {
        class: 'question-message',
        style: 'display: none;',
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
          msg.style.display = 'none';
          msg.classList.remove('correct', 'incorrect');
        });

        allButtons.forEach((btn) => btn.classList.remove('pressed', 'incorrect', 'correct'));

        optionButton.classList.add('pressed');

        if (isCorrect) {
          const [correctLabel] = await Promise.all([i18n('Correct')]);
          optionButton.classList.add('correct');
          questionDiv.classList.add('answered-correctly');

          allButtons.forEach((btn) => (btn.disabled));

          messageContainer.classList.add('correct');
          messageContainer.innerHTML = `<span class="result">${correctLabel}</span><span class="snippet">${snippet}</span>`;
          messageContainer.style.display = 'block';

          checkQuizCompletion(block, questions);
        } else {
          const [incorrectLabel] = await Promise.all([i18n('Incorrect')]);
          optionButton.classList.add('incorrect');
          messageContainer.classList.add('incorrect');
          messageContainer.innerHTML = `<span class="result">${incorrectLabel}</span><span class="snippet">${snippet}</span>`;
          messageContainer.style.display = 'block';
        }
      });

      optionsWrapper.appendChild(optionItem);
    });

    questionDiv.appendChild(questionText);
    questionDiv.appendChild(optionsWrapper);
    questionsWrapper.appendChild(questionDiv);
  });

  block.innerHTML = '';
  block.appendChild(questionsWrapper);

  if (questions.length > 1) {
    const [
      ofLabel,
    ] = await Promise.all([
      i18n('OF'),
    ]);

    prevButton = createElement('button', {
      type: 'button',
      'data-role': 'none',
      class: 'arrow arrow-prev',
      style: 'display: block;',
    });

    nextButton = createElement('button', {
      type: 'button',
      'data-role': 'none',
      class: 'arrow arrow-next',
      style: 'display: block;',
    });

    pag = createElement('span', { class: 'custom-paging-counter' });
    pag.textContent = `1 ${ofLabel} ${questions.length}`;

    prevButton.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex -= 1;
        showQuestion(currentIndex, questionsWrapper, prevButton, nextButton, pag, questions.length);
      }
    });

    nextButton.addEventListener('click', () => {
      if (currentIndex < questions.length - 1) {
        currentIndex += 1;
        showQuestion(currentIndex, questionsWrapper, prevButton, nextButton, pag, questions.length);
      }
    });

    const nav = createElement('div', { class: 'quiz-navigation' }, prevButton, pag, nextButton);
    block.appendChild(nav);
  }

  showQuestion(currentIndex, questionsWrapper, prevButton, nextButton, pag, questions.length);
  block.classList.add('showed');
}
